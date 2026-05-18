# RAG Image Recognition Agent

An agentic application that uses **Retrieval-Augmented Generation (RAG)** + an **OpenRouter** vision model to analyze images and recall similar past analyses.

## Architecture

```
frontend (React + Vite :5173)
        │
        │  HTTP / REST
        ▼
backend (FastAPI :8000)
        │
        ├── OpenRouter (OpenAI-compatible API)   ← image analysis (vision)
        └── ChromaDB          ← vector store for past analyses
```

The default model is set in `backend/main.py` (`MODEL`).

### RAG Flow
1. User uploads image
2. The vision model generates a quick one-sentence description → used as RAG query
3. ChromaDB retrieves the 3 most similar past analyses
4. The vision model performs full analysis using retrieved context
5. New analysis is embedded and stored in ChromaDB

## Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- An [OpenRouter](https://openrouter.ai/) API key

The backend uses a **local virtual environment** at `backend/.venv/` (created automatically by the start scripts). It is gitignored.

### Quick Start

Put your key in `backend/.env`:

```
OPENROUTER_API_KEY=sk-or-v1-...
```

**Windows (PowerShell), from the `application` folder:**

```powershell
.\start.ps1
```

If running scripts is blocked, allow them for your user once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

Opens the API in a second window and runs the Vite dev server in the current window.

**Backend only (Windows):**

```powershell
.\start-backend.ps1
```

**macOS / Linux / Git Bash:**

```bash
chmod +x start.sh
./start.sh
```

Then open **http://localhost:5173**

### Manual Setup

**Backend (with venv):**

```bash
cd backend
python -m venv .venv
```

Activate:

- **Windows (PowerShell):** `.\.venv\Scripts\Activate.ps1`
- **Windows (Command Prompt / cmd):** `.venv\Scripts\activate.bat` (use `\`, not `/`, and include `.bat`)
- **macOS / Linux:** `source .venv/bin/activate`

Then:

```bash
pip install -r requirements.txt
# ensure backend/.env contains OPENROUTER_API_KEY=...
python main.py
# same as: uvicorn main:app --reload --host 0.0.0.0 --port 8000
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
