/* Download links, in one place. Fill these in when the builds are published;
   a card with an empty link stays on the download section. */
const DOWNLOADS = {
  android: "", // Google Play listing (the APK link can sit on the same page)
  ios: "",     // App Store listing
  mac: "",     // .dmg (Apple silicon + Intel)
  windows: "", // .exe / .msi
  linux: "",   // AppImage / .deb
  checksums: "", // page or file with the SHA-256 fingerprints
};

document.querySelectorAll("[data-dl]").forEach((a) => {
  const url = DOWNLOADS[a.dataset.dl];
  if (url) a.href = url;
});
