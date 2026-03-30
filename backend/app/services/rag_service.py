import hashlib
from pathlib import Path
from typing import List, Optional, Tuple

from cachetools import TTLCache
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document
from langchain_groq import ChatGroq

from app.core.config import get_settings
from app.services.token_router import TaskComplexity, token_router


class RagService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.collection_name = "technical_service_manuals"
        self.embeddings: Optional[HuggingFaceEmbeddings] = None
        self.vector_store: Optional[Chroma] = None
        self.cache = TTLCache(maxsize=256, ttl=300)
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=850,
            chunk_overlap=120,
            separators=["\n\n", "\n", ". ", " "],
        )

    def _ensure_vector_store(self) -> Chroma:
        if self.vector_store is not None:
            return self.vector_store

        self.embeddings = HuggingFaceEmbeddings(
            model_name="all-MiniLM-L6-v2",
        )
        self.vector_store = Chroma(
            collection_name=self.collection_name,
            embedding_function=self.embeddings,
            persist_directory=self.settings.chroma_persist_dir,
        )
        return self.vector_store

    def _load_file_documents(self, file_path: Path) -> List[Document]:
        suffix = file_path.suffix.lower()
        if suffix == ".pdf":
            loader = PyPDFLoader(str(file_path))
        else:
            loader = TextLoader(str(file_path), encoding="utf-8")
        return loader.load()

    def ingest(self, file_paths: List[Path]) -> Tuple[int, int, str]:
        if not file_paths:
            return 0, 0, self.collection_name

        vector_store = self._ensure_vector_store()
        all_docs: List[Document] = []
        for file_path in file_paths:
            docs = self._load_file_documents(file_path)
            for doc in docs:
                doc.metadata["source"] = file_path.name
            all_docs.extend(docs)

        chunks = self.text_splitter.split_documents(all_docs)
        if chunks:
            vector_store.add_documents(chunks)

        return len(file_paths), len(chunks), self.collection_name

    def is_empty(self) -> bool:
        vector_store = self._ensure_vector_store()
        data = vector_store.get(limit=1)
        ids = data.get("ids", []) if isinstance(data, dict) else []
        return len(ids) == 0

    def get_ingested_sources(self) -> List[str]:
        """Return unique source filenames that have been ingested into the vector store."""
        vector_store = self._ensure_vector_store()
        try:
            data = vector_store.get(include=["metadatas"])
            metadatas = data.get("metadatas", []) if isinstance(data, dict) else []
            seen: set = set()
            sources: List[str] = []
            for meta in metadatas:
                source = (meta or {}).get("source", "")
                if source and source not in seen:
                    seen.add(source)
                    sources.append(source)
            return sources
        except Exception:
            return []

    def seed_from_texts(self, texts: List[str], source: str = "seed") -> int:
        if not texts:
            return 0

        vector_store = self._ensure_vector_store()
        docs = [Document(page_content=text, metadata={"source": source}) for text in texts]
        chunks = self.text_splitter.split_documents(docs)
        if chunks:
            vector_store.add_documents(chunks)
        return len(chunks)

    def ingest_feedback(self, feedback_dir: Path) -> int:
        """Re-ingest admin correction feedback files into the vector store."""
        import json as _json

        if not feedback_dir.exists():
            return 0
        files = list(feedback_dir.glob("*.json"))
        if not files:
            return 0
        texts: List[str] = []
        for f in files:
            try:
                data = _json.loads(f.read_text(encoding="utf-8"))
                text = (
                    f"Claim correction: {data.get('claim_id', '')} — "
                    f"corrected_damage: {data.get('corrected_damage', '')} — "
                    f"notes: {data.get('notes', '')}"
                )
                texts.append(text)
            except Exception:
                pass
        if texts:
            return self.seed_from_texts(texts, source="feedback_loop")
        return 0

    def answer(self, question: str) -> Tuple[str, List[str], str, bool]:
        vector_store = self._ensure_vector_store()
        question_key = hashlib.sha256(question.encode("utf-8")).hexdigest()
        if question_key in self.cache:
            cached = self.cache[question_key]
            return cached["answer"], cached["sources"], cached["model"], True

        complexity = TaskComplexity.RAG
        model_name = "llama-3.3-70b-versatile"
        llm = ChatGroq(
            model=model_name,
            temperature=0,
            max_tokens=token_router.max_tokens(complexity),
            api_key=self.settings.groq_api_key,
        )

        retriever = vector_store.as_retriever(search_kwargs={"k": 4})
        docs = retriever.invoke(question)

        context = "\n\n".join(
            [f"Source: {d.metadata.get('source', 'unknown')}\n{d.page_content}" for d in docs]
        )
        context = context[:7000]
        prompt = (
            "คุณคือผู้ช่วยบริการลูกค้า TP Insurance ตอบสั้น กระชับ ตรงประเด็น ใช้ภาษาไทยสุภาพ ลงท้าย 'ค่ะ'\n"
            "กฎเหล็ก: ใช้ข้อมูลจาก Context เท่านั้น ห้ามเติมเอง ถ้าไม่มีข้อมูลให้บอกตรงๆ ว่า 'ไม่มีข้อมูลส่วนนี้ค่ะ'\n"
            "รูปแบบคำตอบ: 1-3 ประโยคเท่านั้น ใส่แหล่งอ้างอิงในวงเล็บต่อท้าย เช่น (คู่มือบริการ ข้อ 2)\n\n"
            f"คำถาม: {question}\n\nContext:\n{context}"
        )

        response = llm.invoke(prompt)
        answer = response.content if isinstance(response.content, str) else str(response.content)
        sources = list({d.metadata.get("source", "unknown") for d in docs})

        # Coarse token estimation fallback.
        approx_prompt = len(prompt) // 4
        approx_completion = len(answer) // 4
        token_router.update_usage(approx_prompt, approx_completion, model_name=model_name)

        self.cache[question_key] = {
            "answer": answer,
            "sources": sources,
            "model": model_name,
        }
        return answer, sources, model_name, False


rag_service = RagService()
