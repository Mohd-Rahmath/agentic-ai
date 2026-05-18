$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "Starting backend (new window)..."
Start-Process powershell -ArgumentList "-NoExit", "-File", "$root\start-backend.ps1" -WorkingDirectory $root

Set-Location $root\frontend
if (-not (Test-Path node_modules)) {
    npm install
} else {
    npm install --silent
}
Write-Host "Frontend: http://localhost:5173 (Ctrl+C to stop)"
npm run dev
