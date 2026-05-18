#!/usr/bin/env bash
set -e

echo "=== RAG Image Recognition Agent ==="

# Backend
echo "[1/2] Starting Python backend..."
cd backend
if [ ! -d .venv ]; then
  echo "  -> Creating Python virtual environment (.venv)..."
  python3 -m venv .venv 2>/dev/null || python -m venv .venv
fi
if [ -f .venv/bin/activate ]; then
  # shellcheck source=/dev/null
  . .venv/bin/activate
elif [ -f .venv/Scripts/activate ]; then
  # shellcheck source=/dev/null
  . .venv/Scripts/activate
else
  echo "  -> ERROR: Could not activate .venv (missing activate script)" >&2
  exit 1
fi
if [ ! -f .env ]; then
  cp .env.example .env
  echo "  -> Created .env — set your OPENROUTER_API_KEY inside it"
fi
pip install -r requirements.txt -q
export $(grep -v '^#' .env | xargs) 2>/dev/null || true
python main.py &
BACKEND_PID=$!
echo "  -> Backend running at http://localhost:8000 (PID $BACKEND_PID)"

# Frontend
echo "[2/2] Starting React frontend..."
cd ../frontend
npm install --silent
npm run dev &
FRONTEND_PID=$!
echo "  -> Frontend running at http://localhost:5173 (PID $FRONTEND_PID)"

echo ""
echo "App is live at: http://localhost:5173"
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" SIGINT SIGTERM
wait
