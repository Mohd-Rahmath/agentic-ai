# RAG Image Recognition Agent

An agentic application that uses **Retrieval-Augmented Generation (RAG)** + **Claude Vision** to analyze images and recall similar past analyses.

## Architecture

```
frontend (React + Vite :5173)
        │
        │  HTTP / REST
        ▼
backend (FastAPI :8000)
        │
        ├── Claude claude-sonnet-4-6   ← image analysis (vision)
        └── ChromaDB          ← vector store for past analyses
```

### RAG Flow
1. User uploads image
2. Claude generates a quick one-sentence description → used as RAG query
3. ChromaDB retrieves the 3 most similar past analyses
4. Claude performs full analysis using retrieved context
5. New analysis is embedded and stored in ChromaDB

## Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- An Anthropic API key

### Quick Start

```bash
# 1. Clone / navigate to this folder
cd application

# 2. Add your API key
echo "ANTHROPIC_API_KEY=sk-ant-..." > backend/.env

# 3. Run everything
chmod +x start.sh
./start.sh
```

Then open **http://localhost:5173**

### Manual Setup

**Backend:**
```bash
cd backend
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/analyze` | Upload image → returns analysis + similar past analyses |
| GET | `/history` | List all past analyses |
| GET | `/health` | Health check |
