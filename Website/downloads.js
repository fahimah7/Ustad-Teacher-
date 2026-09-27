/* Download links, in one place. Fill these in when the builds are published;
   a card with an empty link stays on the download section. */
const RELEASE = "https://github.com/47-P/ustadschool-website/releases/download/v1.0.0/";
const DOWNLOADS = {
  android: "", // Google Play listing (the APK link can sit on the same page)
  ios: "",     // App Store listing
  mac: "",     // .dmg (Apple silicon + Intel)
  windows: RELEASE + "Ustad-Setup-1.0.0.exe",
  checksums: RELEASE + "SHA256SUMS-windows-1.0.0.txt",
};

document.querySelectorAll("[data-dl]").forEach((a) => {
  const url = DOWNLOADS[a.dataset.dl];
  if (url) a.href = url;
});

/* The Windows installer is split into four files that must sit in one folder,
   so the Windows buttons start all four downloads, one after another. */
const WINDOWS_FILES = [
  "Ustad-Setup-1.0.0.exe",
  "Ustad-Setup-1.0.0-1.bin",
  "Ustad-Setup-1.0.0-2.bin",
  "Ustad-Setup-1.0.0-3.bin",
].map((f) => RELEASE + f);

document.querySelectorAll("[data-win]").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("windows")?.scrollIntoView({ behavior: "smooth", block: "center" });
    WINDOWS_FILES.forEach((url, i) =>
      setTimeout(() => {
        const link = document.createElement("a");
        link.href = url;
        link.rel = "noopener";
        document.body.appendChild(link);
        link.click();
        link.remove();
      }, i * 2500)
    );
  });
});
