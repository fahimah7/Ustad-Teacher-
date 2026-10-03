/* Download links, in one place. Fill these in when the builds are published;
   a card with an empty link stays on the download section. */
const RELEASE = "https://github.com/47-P/ustadschool-website/releases/download/v1.1.0/";
const DOWNLOADS = {
  android: "", // Google Play listing (the APK link can sit on the same page)
  ios: "",     // App Store listing
  mac: "",     // .dmg (Apple silicon + Intel)
  windows: RELEASE + "Ustad-Setup-1.1.0.exe",
  checksums: RELEASE + "SHA256SUMS-windows-1.1.0.txt",
};

document.querySelectorAll("[data-dl]").forEach((a) => {
  const url = DOWNLOADS[a.dataset.dl];
  if (url) a.href = url;
});

/* Windows is one file: the setup downloads the teacher itself, so the Windows buttons are plain
   links to it. */
document.querySelectorAll("[data-win]").forEach((a) => {
  a.href = DOWNLOADS.windows;
});
