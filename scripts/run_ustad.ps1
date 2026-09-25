# Runs Ustad: the React UI ("UI Code") in its Tauri window, with the local teacher model.
# The app starts llama-server itself (127.0.0.1 only) and stops it when the window closes.
# Usage: powershell -ExecutionPolicy Bypass -File scripts\run_ustad.ps1
# Build caches live on D: because C: is nearly full.
$env:PATH = "D:\dev\node22;$env:PATH"            # Vite 8 needs Node 20.19+; the system Node is older
$env:CARGO_HOME = "D:\dev\cargo-home"
$env:CARGO_TARGET_DIR = "D:\dev\ustad-target"
$env:CARGO_PROFILE_DEV_DEBUG = "0"               # smaller, faster debug builds
$env:CARGO_BUILD_JOBS = "2"                      # the first build runs out of memory with more jobs
Set-Location (Join-Path $PSScriptRoot "..\UI Code")
if (-not (Test-Path "node_modules\.bin\tauri.cmd")) { npm install --cache "D:\dev\npm-cache" }
npx tauri dev
