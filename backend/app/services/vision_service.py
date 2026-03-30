import base64
import hashlib
import io
import json
from typing import List, Tuple

from cachetools import TTLCache
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from PIL import Image

from app.core.config import get_settings
from app.services.token_router import TaskComplexity, token_router


class VisionService:
    def __init__(self) -> None:
        self.settings = get_settings()
        # Cache keyed by image SHA-256; TTL = 1 hour to avoid re-billing identical uploads
        self.cache = TTLCache(maxsize=128, ttl=3600)

    # ------------------------------------------------------------------
    # Image helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _compress_image(image_bytes: bytes, max_size: int = 1024, quality: int = 80) -> bytes:
        """Resize to max_size px on the longest edge and re-encode as JPEG to reduce input tokens."""
        try:
            with Image.open(io.BytesIO(image_bytes)) as img:
                img = img.convert("RGB")
                w, h = img.size
                if max(w, h) > max_size:
                    ratio = max_size / max(w, h)
                    img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=quality, optimize=True)
                return buf.getvalue()
        except Exception:
            return image_bytes  # fall back to original if PIL fails

    @staticmethod
    def _detect_mime(image_bytes: bytes) -> str:
        h = image_bytes[:12]
        if h[:4] in (b"\xff\xd8\xff\xe0", b"\xff\xd8\xff\xe1", b"\xff\xd8\xff\xdb"):
            return "image/jpeg"
        if h[:8] == b"\x89PNG\r\n\x1a\n":
            return "image/png"
        if h[:6] in (b"GIF87a", b"GIF89a"):
            return "image/gif"
        if h[:4] == b"RIFF" and h[8:12] == b"WEBP":
            return "image/webp"
        return "image/jpeg"

    def _to_data_url(self, image_bytes: bytes) -> str:
        mime = self._detect_mime(image_bytes)
        b64 = base64.b64encode(image_bytes).decode("utf-8")
        return f"data:{mime};base64,{b64}"

    def diagnose(self, image_bytes: bytes, filename: str) -> Tuple[str, str, List[str], str, bool, int, float]:
        cache_key = hashlib.sha256(image_bytes).hexdigest()
        if cache_key in self.cache:
            payload = self.cache[cache_key]
            return payload["summary"], payload["severity"], payload["parts"], payload["model"], True, payload.get("estimated_days", 0), payload.get("estimated_cost", 0.0)

        complexity = TaskComplexity.VISION
        model_name = "gemini-2.0-flash"  # Gemini-only: vision endpoint
        compressed = self._compress_image(image_bytes)
        data_url = self._to_data_url(compressed)

        prompt = (
            "You are a certified automotive damage inspector following the TP-AS-001/2569 Thai standard. "
            "Analyze this vehicle damage photo and return ONLY a valid JSON object with these exact keys: "
            "severity (string: L1=minor/cosmetic only, M2=moderate/structural+cosmetic, H3=severe/safety-critical), "
            "estimated_days (integer: estimated repair days — L1:1-3, M2:5-10, H3:14-30), "
            "suggested_parts (array of strings: parts requiring repair or replacement), "
            "estimated_cost (float: estimated total repair cost in Thai Baht), "
            "summary (string: 2-3 sentence Thai-language damage description). "
            "Return ONLY the raw JSON object. No markdown code blocks, no extra text."
        )

        llm = ChatGoogleGenerativeAI(
            model=model_name,
            temperature=0,
            max_output_tokens=token_router.max_tokens(complexity),
            google_api_key=self.settings.gemini_api_key,
        )

        message = HumanMessage(content=[
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": data_url}},
        ])
        try:
            response = llm.invoke([message])
        except Exception as exc:
            exc_str = str(exc)
            if "429" in exc_str or "quota" in exc_str.lower() or "ResourceExhausted" in exc_str:
                # Try lighter model on separate quota before fully giving up
                try:
                    lite_llm = ChatGoogleGenerativeAI(
                        model="gemini-2.0-flash-lite",
                        temperature=0,
                        max_output_tokens=token_router.max_tokens(complexity),
                        google_api_key=self.settings.gemini_api_key,
                    )
                    response = lite_llm.invoke([message])
                    model_name = "gemini-2.0-flash-lite"
                except Exception:
                    return (
                        "ขณะนี้ระบบ Vision AI มีการใช้งานสูง กรุณารอสักครู่แล้วลองใหม่อีกครั้ง",
                        "medium",
                        ["manual-inspection-required"],
                        model_name,
                        False,
                        0,
                        0.0,
                    )
            else:
                raise
        raw_text = response.content if isinstance(response.content, str) else str(response.content)
        # Strip markdown code fences Gemini sometimes adds despite instructions
        stripped = raw_text.strip()
        if stripped.startswith("```"):
            stripped = stripped.split("\n", 1)[-1]
            stripped = stripped.rsplit("```", 1)[0].strip()
        raw_text = stripped
        summary = raw_text
        severity = "medium"
        parts: List[str] = ["front-bumper"]
        estimated_days = 0
        estimated_cost = 0.0

        _severity_map = {"L1": "low", "M2": "medium", "H3": "high", "LOW": "low", "MEDIUM": "medium", "HIGH": "high"}
        try:
            parsed = json.loads(raw_text)
            summary = str(parsed.get("summary", raw_text))
            raw_sev = str(parsed.get("severity", "M2")).upper()
            severity = _severity_map.get(raw_sev, "medium")
            parsed_parts = parsed.get("suggested_parts", parsed.get("estimated_parts", []))
            parts = [str(p) for p in parsed_parts] if isinstance(parsed_parts, list) else ["unknown"]
            estimated_days = int(parsed.get("estimated_days", 0))
            estimated_cost = float(parsed.get("estimated_cost", 0.0))
        except Exception:
            pass

        token_router.update_usage(len(prompt) // 4, len(summary) // 4, model_name=model_name)

        self.cache[cache_key] = {
            "summary": summary,
            "severity": severity,
            "parts": parts,
            "model": model_name,
            "estimated_days": estimated_days,
            "estimated_cost": estimated_cost,
        }

        return summary, severity, parts, model_name, False, estimated_days, estimated_cost


vision_service = VisionService()
