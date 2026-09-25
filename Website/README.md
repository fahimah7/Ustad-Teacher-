# Ustad · landing

Static download page for Ustad School: Android and Windows (iOS and macOS coming soon).
No build step, no framework, no third-party requests: fonts and images are local.

- `index.html` English, `fa.html` Persian (right to left)
- `downloads.js` the only place to put the store and download links
- `assets/` team photos, partner logos, favicon, share image
- `fonts/` Rubik and Vazirmatn, bundled

Preview locally:

```bash
python3 -m http.server 8080
```

The pages were generated from the design handoff (`Ustad Landing.dc.html`, `Ustad Landing FA.dc.html`),
so layout, copy and motion match it. Deploy the folder as is to any static host.
