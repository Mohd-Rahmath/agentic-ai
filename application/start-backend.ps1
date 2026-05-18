$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\backend

if (-not (Test-Path .venv\Scripts\python.exe)) {
    Write-Host "Creating virtual environment (.venv)..."
    python -m venv .venv
}

& .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt -q

if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "Created backend/.env — set OPENROUTER_API_KEY"
}

Write-Host "API: http://localhost:8000 (Ctrl+C to stop)"
python main.py
