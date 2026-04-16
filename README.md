# ✨ TP-Automate: AI-Powered Agentic Platform

## 🎯 Goals    

**TP-Automate** transforms how automotive enterprises handle service claims and customer support using cutting-edge AI:

### 👥 For Customers
- **📸 Smart Claims** — Upload 2 photos → AI extracts vehicle info & damage assessment instantly
- **💬 AI Concierge** — Ask anything about services in Thai/English → Instant answers from knowledge base
- **📅 Smart Booking** — Let AI find the best appointment slot with intelligent alternatives

### 👨‍💼 For Admin & Staff  
- **📋 Operations Dashboard** — Review AI-analyzed claims with confidence scores
- **📚 Brain Studio** — Upload manuals → Auto-indexed for instant RAG queries
- **📊 Intelligence Panel** — Track token usage, API costs, system latency in real-time

---

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    🎨 Frontend Layer                        │
│  Next.js 14  │ TypeScript  │ Tailwind  │ Real-time WebS   │
└─────────────────────────┬──────────────────────────────────┘
                          │ HTTP/WebSocket APIs
┌─────────────────────────▼──────────────────────────────────┐
│                    🧠 AI Service Layer                      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  🖼️ Vision   │  │  🔍 RAG      │  │  🤖 Agent    │     │
│  │ Gemini 1.5   │  │ ChromaDB +   │  │ LangGraph    │     │
│  │ (Image AI)   │  │ HuggingFace  │  │ (Reasoning)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌────────────────────────────────────┐                    │
│  │  🔐 Auth + 📊 Token + 🛠️ Tools   │                    │
│  └────────────────────────────────────┘                    │
└─────────────────────────┬──────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
┌───────▼────────────┐        ┌────────────▼────────┐
│  🗄️  PostgreSQL   │        │ 🔵 ChromaDB        │
│  (Business Data)   │        │ (Vector Store)     │
└────────────────────┘        └────────────────────┘
```

**Core Intelligence Stack:**
- 🚀 **Groq API** — Ultra-fast LLM inference (Llama 70B, 8B)
- 👁️ **Google Gemini** — Vision AI for image analysis
- 🧬 **HuggingFace** — Local semantic embeddings (free)
- 📦 **ChromaDB** — Vector database for RAG
- ⚡ **LangGraph** — Agentic reasoning & orchestration

---

## 🎬 How It Works — 3 Core Flows

### 📸 **Smart Claim** — 30 seconds from photo to analysis
```
Customer
  ↓ Upload 2 photos
Gemini Vision AI
  ↓ Extract VIN + Damage
Admin Dashboard
  ↓ AI confidence score
Approval ✓
```
*The system instantly extracts vehicle info and damage severity — staff just confirms or corrects.*

---

### 💬 **AI Support** — Always answer from your docs
```
Customer asks (Thai/English)
  ↓ Search your knowledge base
ChromaDB + HuggingFace
  ↓ Semantic match
Groq LLM
  ↓ Generate with citations
Instant answer ✓
```
*No external knowledge leaks — answers only from documents you uploaded.*

---

### 📅 **Smart Booking** — Find best time slots
```
"Book oil change Tuesday?"
  ↓ Check availability
LangGraph Agent
  ↓ No Tuesday? Suggest Wed + Thu
AI Alternatives
  ↓ Customer picks one
Booked ✓
```
*Agent proposes smart alternatives when preferred time is unavailable.*

---

## 🛠️ Built With Enterprise-Grade AI

| Component | Technology | Why We Chose It |
|-----------|-----------|-----------------|
| **LLM** | Groq (Llama 70B) | Fastest inference globally, 500+ tokens/sec |
| **Vision** | Google Gemini 1.5 | Best-in-class image understanding |
| **Embeddings** | HuggingFace all-MiniLM | Fast, free, runs locally (no API calls) |
| **Vector DB** | ChromaDB | Lightweight, perfect for knowledge base |
| **Reasoning** | LangGraph | Agentic AI with tool use & planning |
| **Backend** | FastAPI | Modern, fast, scales effortlessly |
| **Frontend** | Next.js 14 | Real-time by default, TypeScript strict |
| **Database** | PostgreSQL | Trusted, proven, scales infinitely |

---

## 👥 Who's Using This

- **Automotive service centers** — Fast claims processing
- **Warranty departments** — Intelligent document search
- **Customer support teams** — 24/7 AI assistant
- **Operations teams** — Real-time analytics dashboard
- **Inventory managers** — Smart parts recommendations

---

## 🎯 What Makes This Different

| Feature | Typical System | TP-Automate |
|---------|---|---|
| **Damage Assessment** | Manual review | Instant AI analysis + confidence score |
| **Support Answers** | Generic FAQ | Semantic search from YOUR documents |
| **Booking** | Fixed slots | AI-proposed alternatives |
| **Knowledge Base** | External APIs | Local ChromaDB (your data stays yours) |
| **Speed** | Seconds → Minutes | Milliseconds for most operations |
| **Cost** | Per-request APIs | Groq batch pricing, local embeddings |
| **Privacy** | Cloud-dependent | On-premises capable |

---

## 🌟 Enterprise Features

```
✓ 20+ REST endpoints
✓ Token usage tracking & cost analytics
✓ WebSocket real-time updates
✓ Multi-tenant ready architecture
✓ PostgreSQL persistence
✓ Docker-ready deployment
✓ CORS-enabled for any frontend
```

---

## 💡 Vision
- Customers self-serve instantly
- Staff saves hours on repetitive work
- Operations see real-time intelligence
- Costs are transparent and optimized
