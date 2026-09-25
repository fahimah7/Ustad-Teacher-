# Starts the local llama.cpp server for the tutor (loopback only — never exposed to the network).
# Usage: .\scripts\start_llama_server.ps1 [-Model e2b|e4b] [-Port 8080] [-Ctx 8192]
param(
    [ValidateSet("e2b", "e4b")] [string]$Model = "e2b",
    [int]$Port = 8080,
    [int]$Ctx = 8192
)

$llama = "D:\dev\llama.cpp\llama-server.exe"
$models = @{
    # Prefer the SSD copy on C: (loads in seconds); D: is a slow HDD.
    e2b = @("C:\ai-models\gemma-4\gemma-4-E2B-it-Q4_K_M.gguf", "D:\ai-models\gemma-4\gemma-4-E2B-it-Q4_K_M.gguf") |
          Where-Object { Test-Path $_ } | Select-Object -First 1
    e4b = "D:\ai-models\gemma-4\gemma-4-E4B-it-Q4_K_M.gguf"
}

# ggml-cuda.dll needs the CUDA runtime/cuBLAS DLLs from the installed toolkit.
$cudaBin = "C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.8\bin"
if (Test-Path $cudaBin) { $env:PATH = "$cudaBin;$env:PATH" }

# E2B fits entirely in a 4 GB GPU. E4B does not, so let llama.cpp's --fit split it between GPU and CPU.
$gpuArgs = if ($Model -eq "e2b") { @("--n-gpu-layers", "99") } else { @("--fit", "on") }

& $llama `
    --model $models[$Model] `
    --host 127.0.0.1 --port $Port `
    --ctx-size $Ctx `
    @gpuArgs `
    --flash-attn on `
    --jinja `
    --no-webui
