; Ustad for Windows: one installer with everything the app needs, nothing to download.
; Built by scripts\build_windows.ps1, which stages the files in {#Stage} first.
; The teacher model and the books make the setup ~5 GB, so it is split into parts of under 2 GB
; (Ustad-Setup-<ver>.exe + Ustad-Setup-<ver>-1.bin, -2.bin …). Keep them in one folder and run the .exe.

#ifndef Stage
  #define Stage "D:\ustad-release\stage"
#endif
#ifndef OutDir
  #define OutDir "D:\ustad-release\out"
#endif
#ifndef AppVersion
  #define AppVersion "1.0.0"
#endif
#ifndef NumVersion
  #define NumVersion "1.0.0.0"
#endif

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
; Pictures and the model don't compress; storing them keeps the build fast and the parts small.
Compression=lzma2/fast
SolidCompression=no
DiskSpanning=yes
DiskSliceSize=1990000000
ShowLanguageDialog=yes
LanguageDetectionMethod=uilanguage
; About 6 GB are needed while installing.
ExtraDiskSpaceRequired=500000000

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
fa.WelcomeLabel2=«استاد» مکتب شما روی همین کمپیوتر است: کتاب‌های درسی صنف ۱۰ تا ۱۲ و یک معلم که بدون انترنت کار می‌کند.%n%nبرای نصب حدود ۶ گیگابایت جای خالی لازم است. هیچ چیز دیگری لازم نیست.
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

[Tasks]
Name: "desktopicon"; Description: "{cm:DesktopIcon}"

[Files]
Source: "{#Stage}\Ustad.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#Stage}\THIRD_PARTY_NOTICES.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#Stage}\llama\*"; DestDir: "{app}\llama"; Flags: ignoreversion recursesubdirs
Source: "{#Stage}\content\*"; DestDir: "{app}\content"; Flags: ignoreversion recursesubdirs nocompression
Source: "{#Stage}\models\tutor.gguf"; DestDir: "{app}\models"; Flags: ignoreversion nocompression
Source: "{#Stage}\webview2\MicrosoftEdgeWebView2RuntimeInstallerX64.exe"; DestDir: "{tmp}"; Flags: deleteafterinstall nocompression; Check: NeedsWebView2

[Icons]
Name: "{autoprograms}\Ustad"; Filename: "{app}\Ustad.exe"
Name: "{autodesktop}\Ustad"; Filename: "{app}\Ustad.exe"; Tasks: desktopicon

[Run]
Filename: "{tmp}\MicrosoftEdgeWebView2RuntimeInstallerX64.exe"; Parameters: "/silent /install"; StatusMsg: "{cm:WebView2}"; Check: NeedsWebView2; Flags: waituntilterminated
Filename: "{app}\Ustad.exe"; Description: "{cm:OpenUstad}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}\models"

[Code]
{ WebView2 (the part of Windows that draws the app) ships with Windows 11 and recent Windows 10.
  Install the bundled offline copy only when it is missing. }
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
