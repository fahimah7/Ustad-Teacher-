; Ustad for Windows: one setup file to download.
; It installs the app, the books and the teacher's runtime, and fetches the teacher model (~4 GB,
; in parts) during installation. On a computer without internet, put the model parts in the same
; folder as the setup (for example on a USB stick): setup then copies them instead of downloading.
; Built by scripts\build_windows.ps1, which stages the files in {#Stage} and writes
; {#Stage}\model_defines.iss and model_parts_code.iss (the model parts' names, sizes, SHA-256 and
; download address).

#ifndef Stage
  #define Stage "D:\ustad-release\stage"
#endif
#ifndef OutDir
  #define OutDir "D:\ustad-release\out"
#endif
#ifndef AppVersion
  #define AppVersion "1.1.0"
#endif
#ifndef NumVersion
  #define NumVersion "1.1.0.0"
#endif
#include AddBackslash(Stage) + "model_defines.iss"

[Setup]
AppId={{8E3B6C52-6F0A-4C7E-9B7B-2D5A1C3E9F41}
AppName=Ustad
AppVersion={#AppVersion}
AppPublisher=Ustad School
AppPublisherURL=https://ustadschool.com
VersionInfoVersion={#NumVersion}
DefaultDirName={localappdata}\Programs\Ustad
DisableProgramGroupPage=yes
DisableDirPage=auto
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
OutputDir={#OutDir}
OutputBaseFilename=Ustad-Setup-{#AppVersion}
SetupIconFile={#Stage}\ustad.ico
UninstallDisplayIcon={app}\Ustad.exe
UninstallDisplayName=Ustad
WizardStyle=modern
; Page pictures don't compress further; the app and runtime do.
Compression=lzma2/fast
SolidCompression=no
ShowLanguageDialog=yes
LanguageDetectionMethod=uilanguage
; The teacher model is downloaded during setup, so its size is added here.
ExtraDiskSpaceRequired={#ModelTotalBytes}
#ifdef Sign
; scripts\build_windows.ps1 passes the signing command when a code-signing certificate is set up.
SignTool=ustadsign
SignedUninstaller=yes
#endif

[Languages]
Name: "fa"; MessagesFile: "compiler:Default.isl"
Name: "en"; MessagesFile: "compiler:Default.isl"

[LangOptions]
fa.LanguageName=دری
fa.LanguageID=$048C
fa.RightToLeft=yes

[Messages]
; Dari wording for the main screens (Inno Setup has no Dari translation of its own).
fa.SetupAppTitle=نصب استاد
fa.SetupWindowTitle=نصب استاد
fa.WelcomeLabel1=به نصب «استاد» خوش آمدید
fa.WelcomeLabel2=«استاد» مکتب شما روی همین کمپیوتر است: کتاب‌های درسی صنف ۱۰ تا ۱۲ و یک معلم که بدون انترنت کار می‌کند.%n%nدر وقت نصب، معلم (۳ تا ۴٫۵ گیگابایت) از انترنت گرفته می‌شود. بعد از نصب، «استاد» بدون انترنت کار می‌کند. برای نصب حدود ۵ گیگابایت جای خالی لازم است.
fa.ButtonNext=&بعدی >
fa.ButtonBack=< &قبلی
fa.ButtonInstall=&نصب
fa.ButtonCancel=لغو
fa.ButtonFinish=&تمام
fa.ButtonBrowse=&انتخاب...
fa.SelectDirLabel3=«استاد» در این پوشه نصب می‌شود.
fa.SelectDirBrowseLabel=برای ادامه «بعدی» را بزنید.
fa.ReadyLabel1=همه چیز برای نصب آماده است.
fa.ReadyLabel2a=برای شروع نصب «نصب» را بزنید.
fa.InstallingLabel=لطفاً صبر کنید؛ «استاد» نصب می‌شود. این کار چند دقیقه طول می‌کشد.
fa.FinishedHeadingLabel=نصب «استاد» تمام شد
fa.FinishedLabel=«استاد» نصب شد. می‌توانید آن را از منوی شروع یا صفحهٔ دسکتاپ باز کنید.
fa.ClickFinish=برای بستن «تمام» را بزنید.
fa.ExitSetupTitle=خروج از نصب
fa.ExitSetupMessage=نصب تمام نشده است. اگر حالا خارج شوید، «استاد» نصب نمی‌شود.%n%nمی‌خواهید خارج شوید؟
fa.SelectTasksLabel2=چه چیزهای دیگری انجام شود؟
fa.WizardSelectTasks=کارهای بیشتر
fa.WizardReady=آمادهٔ نصب
fa.WizardInstalling=در حال نصب
fa.WizardSelectDir=جای نصب
fa.DiskSpaceMBLabel=حداقل [mb] مگابایت جای خالی لازم است.

[CustomMessages]
fa.DesktopIcon=یک نشانه روی صفحهٔ دسکتاپ بساز
en.DesktopIcon=Create a desktop shortcut
fa.WebView2=نصب اجزای نمایش ویندوز (WebView2)…
en.WebView2=Installing the Windows display component (WebView2)…
fa.OpenUstad=باز کردن «استاد»
en.OpenUstad=Open Ustad
fa.DownloadTitle=گرفتن معلم «استاد»
en.DownloadTitle=Getting Ustad's teacher
fa.DownloadDesc=معلم (حدود %1 مگابایت) از انترنت گرفته می‌شود. این کار نظر به سرعت انترنت شما ممکن است مدتی طول بکشد.
en.DownloadDesc=The teacher (about %1 MB) is being downloaded. Depending on your internet speed this can take a while.
fa.DownloadFailed=گرفتن معلم کامل نشد:%n%1%n%n«Retry» دوباره کوشش می‌کند. «Ignore» «استاد» را بدون معلم نصب می‌کند (کتاب‌ها کار می‌کنند؛ بعداً همین نصب را دوباره اجرا کنید تا معلم گرفته شود). «Abort» نصب را لغو می‌کند.
en.DownloadFailed=The teacher could not be downloaded:%n%1%n%nRetry tries again. Ignore installs Ustad without the teacher (the books work; run this setup again later to get the teacher). Abort cancels the installation.
fa.NoSpace=برای گرفتن معلم در درایف %1 حدود %2 مگابایت جای خالی لازم است. لطفاً کمی جای خالی بسازید و دوباره کوشش کنید.
en.NoSpace=About %2 MB of free space is needed on drive %1 to download the teacher. Please free some space and try again.
fa.CopyingModel=معلم از پوشهٔ نصب کاپی می‌شود…
en.CopyingModel=Copying the teacher from the setup folder…
fa.TeacherTitle=معلم «استاد»
en.TeacherTitle=Ustad's teacher
fa.TeacherDesc=کدام معلم روی این کمپیوتر نصب شود؟
en.TeacherDesc=Which teacher should be installed on this computer?
fa.TeacherNote=هر دو معلم بدون انترنت کار می‌کنند. حافظهٔ این کمپیوتر: %1 گیگابایت. انتخاب پیشنهادی از قبل نشانی شده است.
en.TeacherNote=Both teachers work without internet. This computer has %1 GB of memory; the recommended choice is already selected.
fa.TeacherLarge=معلم بزرگ: هوشیارتر و بهتر در دری و ریاضی (برای کمپیوترهای با ۱۲ گیگابایت حافظه یا بیشتر؛ حدود %1 مگابایت)
en.TeacherLarge=Large teacher: smarter, better at Dari and math (for computers with 12 GB of memory or more; about %1 MB)
fa.TeacherStandard=معلم معیاری: سریع‌تر و سبک‌تر (برای کمپیوترهای با ۸ گیگابایت حافظه؛ حدود %1 مگابایت)
en.TeacherStandard=Standard teacher: faster and lighter (for computers with 8 GB of memory; about %1 MB)

[Tasks]
Name: "desktopicon"; Description: "{cm:DesktopIcon}"

[Files]
Source: "{#Stage}\Ustad.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#Stage}\THIRD_PARTY_NOTICES.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#Stage}\llama\*"; DestDir: "{app}\llama"; Flags: ignoreversion recursesubdirs
Source: "{#Stage}\content\*"; DestDir: "{app}\content"; Flags: ignoreversion recursesubdirs nocompression
Source: "{#Stage}\webview2\MicrosoftEdgeWebview2Setup.exe"; DestDir: "{tmp}"; Flags: deleteafterinstall; Check: NeedsWebView2

[InstallDelete]
; Version 1.0 put CUDA libraries next to llama-server; the runtime now uses Vulkan or the CPU.
Type: files; Name: "{app}\llama\ggml-cuda.dll"
Type: files; Name: "{app}\llama\cudart64_12.dll"
Type: files; Name: "{app}\llama\cublas64_12.dll"
Type: files; Name: "{app}\llama\cublasLt64_12.dll"

[Icons]
Name: "{autoprograms}\Ustad"; Filename: "{app}\Ustad.exe"
Name: "{autodesktop}\Ustad"; Filename: "{app}\Ustad.exe"; Tasks: desktopicon

[Run]
Filename: "{tmp}\MicrosoftEdgeWebview2Setup.exe"; Parameters: "/silent /install"; StatusMsg: "{cm:WebView2}"; Check: NeedsWebView2; Flags: waituntilterminated
Filename: "{app}\Ustad.exe"; Description: "{cm:OpenUstad}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}\models"

[Code]
{ WebView2 (the part of Windows that draws the app) ships with Windows 11 and recent Windows 10.
  The small bootstrapper installs it only where it is missing. }
function HasWebView2(Root: Integer; Key: String): Boolean;
var
  Version: String;
begin
  Result := RegQueryStringValue(Root, Key, 'pv', Version) and (Version <> '') and (Version <> '0.0.0.0');
end;

function NeedsWebView2: Boolean;
begin
  Result := not (
    HasWebView2(HKLM, 'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}') or
    HasWebView2(HKLM, 'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}') or
    HasWebView2(HKCU, 'Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'));
end;

(* ── the teacher model ─────────────────────────────────────────────────────────
  Each part is, in order of preference: already installed (an update with the same model), next
  to the setup file (offline copy), or downloaded into the temporary folder. After the files are
  installed, the parts are moved into the app's models folder and any other model files there (an
  older teacher) removed. *)
var
  PartNames, PartSha: array of String;
  PartSizes: array of Int64;
  PartSource: array of Integer; { 0 installed, 1 next to setup, 2 downloaded, 3 skipped }
  BaseUrl: String;
  DownloadPage: TDownloadWizardPage;
  TeacherPage: TInputOptionWizardPage;
  SkipTeacher, TeacherChecked: Boolean;

{ InitModelParts(Large) fills PartNames, PartSha, PartSizes and BaseUrl for one teacher. }
#include AddBackslash(Stage) + "model_parts_code.iss"

{ The computer's memory in GB, from Windows. }
type
  TMemoryStatusEx = record
    dwLength, dwMemoryLoad: DWORD;
    ullTotalPhys, ullAvailPhys, ullTotalPageFile, ullAvailPageFile, ullTotalVirtual, ullAvailVirtual, ullAvailExtendedVirtual: Int64;
  end;

function GlobalMemoryStatusEx(var Status: TMemoryStatusEx): BOOL;
  external 'GlobalMemoryStatusEx@kernel32.dll stdcall';

function MemoryGB: Integer;
var
  Status: TMemoryStatusEx;
begin
  Status.dwLength := 64;
  if GlobalMemoryStatusEx(Status) then
    Result := Integer((Status.ullTotalPhys + 512 * 1024 * 1024) div (1024 * 1024 * 1024))
  else
    Result := 0;
end;

{ The large teacher by default on computers with about 12 GB of memory or more (Windows reports
  a little less than the installed amount, e.g. 15.8 for 16 GB). }
function LargeTeacher: Boolean;
begin
  Result := TeacherPage.Values[0];
end;

function FileSizeOf(Path: String): Int64;
begin
  if not FileSize64(Path, Result) then Result := -1;
end;

function PartInstalled(I: Integer): Boolean;
var
  Path: String;
begin
  Result := False;
  Path := ExpandConstant('{app}\models\') + PartNames[I];
  if FileSizeOf(Path) = PartSizes[I] then
    Result := GetSHA256OfFile(Path) = PartSha[I];
end;

function PartNextToSetup(I: Integer): Boolean;
begin
  Result := FileSizeOf(ExpandConstant('{src}\') + PartNames[I]) = PartSizes[I];
end;

function OnDownloadProgress(const Url, FileName: String; const Progress, ProgressMax: Int64): Boolean;
begin
  Result := True;
end;

procedure InitializeWizard;
var
  GB: Integer;
begin
  GB := MemoryGB;
  TeacherPage := CreateInputOptionPage(wpSelectDir, CustomMessage('TeacherTitle'), CustomMessage('TeacherDesc'),
    FmtMessage(CustomMessage('TeacherNote'), [IntToStr(GB)]), True, False);
  TeacherPage.Add(FmtMessage(CustomMessage('TeacherLarge'), [IntToStr({#LargeTotalMB})]));
  TeacherPage.Add(FmtMessage(CustomMessage('TeacherStandard'), [IntToStr({#StandardTotalMB})]));
  { /TEACHER=large or /TEACHER=standard on the command line (e.g. for a silent install) decides;
    otherwise the computer's memory does. }
  if CompareText(ExpandConstant('{param:TEACHER|}'), 'standard') = 0 then TeacherPage.Values[1] := True
  else if CompareText(ExpandConstant('{param:TEACHER|}'), 'large') = 0 then TeacherPage.Values[0] := True
  else if (GB >= 11) or (GB = 0) then TeacherPage.Values[0] := True
  else TeacherPage.Values[1] := True;
  DownloadPage := CreateDownloadPage(CustomMessage('DownloadTitle'), '', @OnDownloadProgress);
end;

{ Free space (in MB) on the drive of Path. }
function FreeMB(Path: String): Int64;
var
  Free, Total: Int64;
begin
  if GetSpaceOnDisk64(ExtractFileDrive(Path), Free, Total) then Result := Free div (1024 * 1024)
  else Result := -1;
end;

function DownloadTeacher: Boolean;
var
  I, Answer: Integer;
  NeedMB: Int64;
begin
  Result := True;
  TeacherChecked := True;
  SkipTeacher := False;
  NeedMB := 0;
  InitModelParts(LargeTeacher);
  SetArrayLength(PartSource, GetArrayLength(PartNames));
  DownloadPage.Clear;
  for I := 0 to GetArrayLength(PartNames) - 1 do
  begin
    if PartInstalled(I) then PartSource[I] := 0
    else if PartNextToSetup(I) then PartSource[I] := 1
    else
    begin
      PartSource[I] := 2;
      DownloadPage.Add(BaseUrl + PartNames[I], PartNames[I], PartSha[I]);
      NeedMB := NeedMB + PartSizes[I] div (1024 * 1024) + 1;
    end;
  end;
  if NeedMB = 0 then Exit;
  DownloadPage.Description := FmtMessage(CustomMessage('DownloadDesc'), [IntToStr(NeedMB)]);
  if (FreeMB(ExpandConstant('{tmp}')) >= 0) and (FreeMB(ExpandConstant('{tmp}')) < NeedMB + 200) then
  begin
    MsgBox(FmtMessage(CustomMessage('NoSpace'), [ExtractFileDrive(ExpandConstant('{tmp}')), IntToStr(NeedMB + 200)]), mbError, MB_OK);
    Result := False;
    Exit;
  end;
  DownloadPage.Show;
  try
    repeat
      try
        DownloadPage.Download; { checks each part's SHA-256 }
        Answer := IDOK;
      except
        if DownloadPage.AbortedByUser then
          Answer := IDABORT
        else
          Answer := SuppressibleMsgBox(FmtMessage(CustomMessage('DownloadFailed'), [GetExceptionMessage]),
            mbError, MB_ABORTRETRYIGNORE, IDIGNORE);
      end;
    until Answer <> IDRETRY;
    if Answer = IDABORT then Result := False;
    if Answer = IDIGNORE then SkipTeacher := True;
  finally
    DownloadPage.Hide;
  end;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if CurPageID = wpReady then Result := DownloadTeacher;
end;

{ A silent install (/SILENT, /VERYSILENT) skips the wizard pages, so it fetches the teacher here. }
function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  Result := '';
  if not TeacherChecked then
    if not DownloadTeacher then Result := CustomMessage('DownloadTitle');
end;

procedure PlaceTeacher;
var
  I: Integer;
  Dir, Src, Dest: String;
  FindRec: TFindRec;
  Keep: Boolean;
begin
  Dir := ExpandConstant('{app}\models\');
  ForceDirectories(Dir);
  for I := 0 to GetArrayLength(PartNames) - 1 do
  begin
    Dest := Dir + PartNames[I];
    if PartSource[I] = 1 then
    begin
      WizardForm.StatusLabel.Caption := CustomMessage('CopyingModel');
      Src := ExpandConstant('{src}\') + PartNames[I];
      if not (CopyFile(Src, Dest, False) and (GetSHA256OfFile(Dest) = PartSha[I])) then
        DeleteFile(Dest);
    end
    else if (PartSource[I] = 2) and not SkipTeacher then
    begin
      Src := ExpandConstant('{tmp}\') + PartNames[I];
      DeleteFile(Dest);
      { Same drive: an instant move. Otherwise copy, then free the temporary copy. }
      if not RenameFile(Src, Dest) then
        if CopyFile(Src, Dest, False) then DeleteFile(Src);
    end;
  end;
  { Remove model files that don't belong to this teacher (version 1.0's tutor.gguf, or the other
    teacher size). }
  if not SkipTeacher and (GetArrayLength(PartNames) > 0) and FindFirst(Dir + '*.gguf', FindRec) then
  begin
    try
      repeat
        Keep := False;
        for I := 0 to GetArrayLength(PartNames) - 1 do
          if CompareText(FindRec.Name, PartNames[I]) = 0 then Keep := True;
        if not Keep then DeleteFile(Dir + FindRec.Name);
      until not FindNext(FindRec);
    finally
      FindClose(FindRec);
    end;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then PlaceTeacher;
end;
