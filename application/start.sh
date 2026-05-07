#!/usr/bin/env bash
set -e

echo "=== RAG Image Recognition Agent ==="

# Backend
echo "[1/2] Starting Python backend..."
cd backend
if [ ! -f .env ]; then
  cp .env.example .env
  echo "  -> Created .env — set your ANTHROPIC_API_KEY inside it"
fi
pip install -r requirements.txt -q
export $(grep -v '^#' .env | xargs) 2>/dev/null || true
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
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
