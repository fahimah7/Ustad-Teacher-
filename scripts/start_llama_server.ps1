# Starts the local llama.cpp server for the tutor (loopback only — never exposed to the network).
# Usage: .\scripts\start_llama_server.ps1 [-Model e4b|e2b] [-Port 8080] [-Ctx 32768] [-Cpu]
#   e4b: the large teacher (Gemma 4 E4B, QAT 4-bit), e2b: the standard teacher (Gemma 4 E2B, QAT 4-bit).
#   -Cpu runs without the graphics card, like a laptop without one.
param(
    [ValidateSet("e4b", "e2b")] [string]$Model = "e4b",
    [int]$Port = 8080,
    [int]$Ctx = 32768,
    [switch]$Cpu
)

$llama = "D:\dev\llama-vulkan\llama-server.exe"
$models = @{
    e4b = "D:\ai-models\gemma-4\gemma-4-E4B-it-qat-UD-Q4_K_XL.gguf"
    e2b = "D:\ai-models\gemma-4\gemma-4-E2B-it-qat-UD-Q4_K_XL.gguf"
}

# Same choice as the app (UI Code/src-tauri/src/tutor.rs): the graphics card if there is one,
# filled as far as its memory allows; otherwise the CPU alone.
$gpu = & $llama --list-devices 2>&1 | Select-String "^\s*(Vulkan\d+): .*(NVIDIA|GeForce|RTX|Radeon RX|Arc\(TM\) A)" | Select-Object -First 1
$device = if ($Cpu -or -not $gpu) { @("--device", "none") } else { @("--device", $gpu.Matches[0].Groups[1].Value, "--fit", "on") }

& $llama `
    --model $models[$Model] `
    --host 127.0.0.1 --port $Port `
    --ctx-size $Ctx `
    --parallel 1 `
    --load-mode none `
    @device `
    --flash-attn auto `
    --jinja `
    --no-webui
