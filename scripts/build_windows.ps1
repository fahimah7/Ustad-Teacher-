# Builds the Windows installer: Ustad.exe (release), the books, the teacher model and its runtime,
# staged in D:\ustad-release\stage, then packed by Inno Setup into D:\ustad-release\out.
# Usage: powershell -ExecutionPolicy Bypass -File scripts\build_windows.ps1 [-Version 1.0.0] [-SkipApp] [-SkipStage]
# Needs: Node 22 (D:\dev\node22), Rust, Inno Setup 6 (D:\dev\innosetup), the llama.cpp CUDA build
# (D:\dev\llama.cpp), the CUDA 12 toolkit (for its runtime DLLs), and the model in C:\ai-models or D:\ai-models.
param([string]$Version = "1.0.0", [switch]$SkipApp, [switch]$SkipStage)
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$stage = "D:\ustad-release\stage"
$out = "D:\ustad-release\out"
$env:PATH = "D:\dev\node22;$env:PATH"
$env:CARGO_HOME = "D:\dev\cargo-home"
$env:CARGO_TARGET_DIR = "D:\dev\ustad-target"
$env:CARGO_BUILD_JOBS = "2"
# Packing ~5 GB: keep temporary files off the (small) C: drive.
New-Item -ItemType Directory -Force "D:\ustad-release\tmp" | Out-Null
$env:TEMP = "D:\ustad-release\tmp"; $env:TMP = "D:\ustad-release\tmp"

# 1. The app itself (release build, no bundle: Inno Setup does the packaging).
if (-not $SkipApp) {
  Push-Location (Join-Path $root "UI Code")
  npx tauri build --no-bundle
  if ($LASTEXITCODE -ne 0) { throw "tauri build failed" }
  Pop-Location
}
$exe = "D:\dev\ustad-target\release\ustad.exe"
if (-not (Test-Path $exe)) { throw "missing $exe" }

# 2. Stage.
if (-not $SkipStage) {
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Force "$stage\llama", "$stage\models", "$stage\webview2", "$stage\content", $out | Out-Null
Copy-Item (Join-Path $root "UI Code\src-tauri\icons\icon.ico") "$stage\ustad.ico"
Copy-Item (Join-Path $root "installer\THIRD_PARTY_NOTICES.txt") $stage

# Books: every book whose book.json has chapters (pages may be a link to D:, robocopy follows it).
foreach ($book in Get-ChildItem (Join-Path $root "content") -Directory) {
  $meta = Get-Content (Join-Path $book.FullName "book.json") -Raw -Encoding UTF8 | ConvertFrom-Json
  if (-not $meta.chapters) { Write-Host "skip $($book.Name): not set up"; continue }
  robocopy $book.FullName "$stage\content\$($book.Name)" /E /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "copy failed: $($book.Name)" }
}

# Teacher runtime: llama-server and the ggml libraries (CPU variants + CUDA), plus the CUDA runtime.
$llama = "D:\dev\llama.cpp"
$want = @("llama-server.exe", "llama-server-impl.dll", "llama-common.dll", "llama.dll", "mtmd.dll", "ggml.dll", "ggml-base.dll", "ggml-rpc.dll", "libomp.dll", "LICENSE-LLVM-OpenMP")
foreach ($f in $want) { Copy-Item (Join-Path $llama $f) "$stage\llama\" }
Copy-Item (Join-Path $llama "ggml-cpu-*.dll") "$stage\llama\"
Copy-Item (Join-Path $llama "ggml-cuda.dll") "$stage\llama\"
$cuda = "C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.8\bin"
foreach ($f in "cudart64_12.dll", "cublas64_12.dll", "cublasLt64_12.dll") { Copy-Item (Join-Path $cuda $f) "$stage\llama\" }

# The teacher model.
$model = @("C:\ai-models\gemma-4\gemma-4-E2B-it-Q4_K_M.gguf", "D:\ai-models\gemma-4\gemma-4-E2B-it-Q4_K_M.gguf") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $model) { throw "teacher model not found" }
Copy-Item $model "$stage\models\tutor.gguf"

# WebView2 offline installer (run by setup only where Windows lacks WebView2).
Copy-Item "D:\dev\downloads\MicrosoftEdgeWebView2RuntimeInstallerX64.exe" "$stage\webview2\"
}
# The app is always refreshed, so -SkipStage can repack a new build without copying 4 GB again.
Copy-Item $exe "$stage\Ustad.exe" -Force

# 3. Pack.
New-Item -ItemType Directory -Force $out | Out-Null
Get-ChildItem $out -Filter "Ustad-Setup-$Version*" | Remove-Item -Force
$num = (($Version -split "[^0-9.]")[0].Split(".") + @("0", "0", "0", "0"))[0..3] -join "."
& "D:\dev\innosetup\ISCC.exe" "/DStage=$stage" "/DOutDir=$out" "/DAppVersion=$Version" "/DNumVersion=$num" (Join-Path $root "installer\ustad.iss")
if ($LASTEXITCODE -ne 0) { throw "Inno Setup failed" }

# 4. Fingerprints for the website ("check the SHA-256 fingerprints").
$sums = Get-ChildItem $out -Filter "Ustad-Setup-$Version*" | Sort-Object Name | ForEach-Object { "{0}  {1}" -f (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLower(), $_.Name }
$sums | Set-Content "$out\SHA256SUMS-windows-$Version.txt" -Encoding ascii
$sums
Get-ChildItem $out | Select-Object Name, @{n = "MB"; e = { [int]($_.Length / 1MB) } } | Format-Table -AutoSize
