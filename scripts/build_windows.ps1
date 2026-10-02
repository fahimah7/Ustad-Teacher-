# Builds the Windows installer: one setup file (Ustad.exe, the books, the teacher's runtime) that
# downloads the teacher model during installation, plus the two teachers split into parts for that
# download. Upload each teacher's parts to the GitHub release named by its tag.
#   Large teacher:    Gemma 4 E4B (QAT, 4-bit), for computers with 12 GB of memory or more.
#   Standard teacher: Gemma 4 E2B (QAT, 4-bit), for computers with 8 GB.
# Usage: powershell -ExecutionPolicy Bypass -File scripts\build_windows.ps1 [-Version 1.1.0] [-SkipApp] [-SkipStage]
# Needs: Node 22 (D:\dev\node22), Rust, Inno Setup 6 (D:\dev\innosetup), the llama.cpp Vulkan build
# (D:\dev\llama-vulkan), the WebView2 bootstrapper (D:\dev\downloads) and the model files.
#
# Code signing (removes Windows' "unknown publisher / Run anyway" warning once the certificate has
# reputation): set USTAD_SIGN_CMD to a signing command with $f where the file goes, e.g. for Azure
# Artifact Signing:
#   signtool sign /v /fd SHA256 /tr http://timestamp.acs.microsoft.com /td SHA256 /dlib <path>\Azure.CodeSigning.Dlib.dll /dmdf <path>\metadata.json $f
# or for a certificate file: signtool sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 /f cert.pfx /p <password> $f
param(
  [string]$Version = "1.1.0",
  [string]$LargeModel = "D:\ai-models\gemma-4\gemma-4-E4B-it-qat-UD-Q4_K_XL.gguf",
  [string]$LargeTag = "teacher-gemma4-e4b",
  [string]$StandardModel = "D:\ai-models\gemma-4\gemma-4-E2B-it-qat-UD-Q4_K_XL.gguf",
  [string]$StandardTag = "teacher-gemma4-e2b",
  [string]$ModelRepo = "47-P/ustadschool-website",
  # For testing: download the teachers from here instead (e.g. http://127.0.0.1:8765/), <tag>/ appended.
  [string]$ModelBaseUrl = "",
  [switch]$SkipApp,
  [switch]$SkipStage
)
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$stage = "D:\ustad-release\stage"
$out = "D:\ustad-release\out"
$llama = "D:\dev\llama-vulkan"
$env:PATH = "D:\dev\node22;$env:PATH"
$env:CARGO_HOME = "D:\dev\cargo-home"
$env:CARGO_TARGET_DIR = "D:\dev\ustad-target"
$env:CARGO_BUILD_JOBS = "2"
# Keep temporary files off the (small) C: drive.
New-Item -ItemType Directory -Force "D:\ustad-release\tmp" | Out-Null
$env:TEMP = "D:\ustad-release\tmp"; $env:TMP = "D:\ustad-release\tmp"
$sign = $env:USTAD_SIGN_CMD

function Sign-File([string]$path) {
  if (-not $sign) { return }
  $cmd = $sign.Replace('$f', "`"$path`"")
  cmd /c $cmd
  if ($LASTEXITCODE -ne 0) { throw "signing failed: $path" }
}

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
  New-Item -ItemType Directory -Force "$stage\llama", "$stage\webview2", "$stage\content", $out | Out-Null
  Copy-Item (Join-Path $root "UI Code\src-tauri\icons\icon.ico") "$stage\ustad.ico"
  Copy-Item (Join-Path $root "installer\THIRD_PARTY_NOTICES.txt") $stage

  # Books: every book whose book.json has chapters (pages may be a link to D:, robocopy follows it).
  foreach ($book in Get-ChildItem (Join-Path $root "content") -Directory) {
    $meta = Get-Content (Join-Path $book.FullName "book.json") -Raw -Encoding UTF8 | ConvertFrom-Json
    if (-not $meta.chapters) { Write-Host "skip $($book.Name): not set up"; continue }
    robocopy $book.FullName "$stage\content\$($book.Name)" /E /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "copy failed: $($book.Name)" }
  }

  # Teacher runtime: llama-server with the Vulkan backend (NVIDIA, AMD and Intel graphics) and the
  # CPU backends it falls back to.
  $want = @("llama-server.exe", "llama-server-impl.dll", "llama-common.dll", "llama.dll", "mtmd.dll", "ggml.dll", "ggml-base.dll", "ggml-rpc.dll", "ggml-vulkan.dll", "libomp.dll", "LICENSE-LLVM-OpenMP")
  foreach ($f in $want) { Copy-Item (Join-Path $llama $f) "$stage\llama\" }
  Copy-Item (Join-Path $llama "ggml-cpu-*.dll") "$stage\llama\"

  # WebView2 bootstrapper (run by setup only where Windows lacks WebView2).
  Copy-Item "D:\dev\downloads\MicrosoftEdgeWebview2Setup.exe" "$stage\webview2\"
}
# The app is always refreshed, so -SkipStage can repack a new build quickly.
Copy-Item $exe "$stage\Ustad.exe" -Force

# 3. The teachers, split into parts of about 700 MB (one large table that cannot be split makes a
#    part of up to ~1.6 GB): a dropped connection during setup then costs
#    at most one part, and every part stays far below GitHub's 2 GB limit per file.
function Prepare-Teacher([string]$model, [string]$tag) {
  if (-not (Test-Path $model)) { throw "teacher model not found: $model" }
  $dir = "D:\ustad-release\model\$tag"
  if (-not (Test-Path "$dir\tutor-00001-of-*.gguf")) {
    New-Item -ItemType Directory -Force $dir | Out-Null
    & (Join-Path $llama "llama-gguf-split.exe") --split --split-max-size 700M $model "$dir\tutor"
    if ($LASTEXITCODE -ne 0) { throw "gguf-split failed: $model" }
  }
  $files = @(Get-ChildItem $dir -Filter "*.gguf" | Sort-Object Name)
  $list = foreach ($f in $files) {
    [pscustomobject]@{ Name = $f.Name; Size = $f.Length; Sha = (Get-FileHash $f.FullName -Algorithm SHA256).Hash.ToLower() }
  }
  $list | ForEach-Object { "{0}  {1}" -f $_.Sha, $_.Name } | Set-Content "$dir\SHA256SUMS.txt" -Encoding ascii
  [pscustomobject]@{ Tag = $tag; Dir = $dir; Files = $list; Total = ($list | Measure-Object Size -Sum).Sum }
}
$large = Prepare-Teacher $LargeModel $LargeTag
$standard = Prepare-Teacher $StandardModel $StandardTag

@(
  "#define ModelTotalBytes ""$([math]::Max($large.Total, $standard.Total))""",
  "#define LargeTotalMB ""$([int]($large.Total / 1MB))""",
  "#define StandardTotalMB ""$([int]($standard.Total / 1MB))"""
) | Set-Content "$stage\model_defines.iss" -Encoding ascii
function Pascal-Branch($t) {
  $n = $t.Files.Count
  $url = if ($ModelBaseUrl) { "$ModelBaseUrl$($t.Tag)/" } else { "https://github.com/$ModelRepo/releases/download/$($t.Tag)/" }
  $lines = @("    BaseUrl := '$url';",
    "    SetArrayLength(PartNames, $n); SetArrayLength(PartSha, $n); SetArrayLength(PartSizes, $n);")
  $i = 0
  foreach ($f in $t.Files) {
    $lines += "    PartNames[$i] := '$($f.Name)'; PartSha[$i] := '$($f.Sha)'; PartSizes[$i] := $($f.Size);"
    $i++
  }
  $lines
}
@("procedure InitModelParts(Large: Boolean);", "begin", "  if Large then", "  begin") + (Pascal-Branch $large) +
  @("  end", "  else", "  begin") + (Pascal-Branch $standard) + @("  end;", "end;") |
  Set-Content "$stage\model_parts_code.iss" -Encoding ascii

# 4. Sign what Windows checks (the app and the runtime), then pack.
if ($sign) {
  Get-ChildItem "$stage\Ustad.exe", "$stage\llama\*.exe", "$stage\llama\*.dll" | ForEach-Object { Sign-File $_.FullName }
}
New-Item -ItemType Directory -Force $out | Out-Null
Get-ChildItem $out -Filter "Ustad-Setup-$Version*" | Remove-Item -Force
$num = (($Version -split "[^0-9.]")[0].Split(".") + @("0", "0", "0", "0"))[0..3] -join "."
$iscc = @("/DStage=$stage", "/DOutDir=$out", "/DAppVersion=$Version", "/DNumVersion=$num")
if ($sign) { $iscc += @("/DSign=1", "/Sustadsign=$sign") }
& "D:\dev\innosetup\ISCC.exe" @iscc (Join-Path $root "installer\ustad.iss")
if ($LASTEXITCODE -ne 0) { throw "Inno Setup failed" }

# 5. Fingerprints for the website.
$setup = Get-Item "$out\Ustad-Setup-$Version.exe"
$sums = @("{0}  {1}" -f (Get-FileHash $setup.FullName -Algorithm SHA256).Hash.ToLower(), $setup.Name)
$sums | Set-Content "$out\SHA256SUMS-windows-$Version.txt" -Encoding ascii
$sums
foreach ($t in $large, $standard) {
  Write-Host ("{0}: {1} files, {2} MB in {3} -> upload to release '{0}' of {4}" -f $t.Tag, $t.Files.Count, [int]($t.Total / 1MB), $t.Dir, $ModelRepo)
}
Write-Host "Setup: $([int]($setup.Length / 1MB)) MB"
