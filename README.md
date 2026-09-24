# Ustad · app

Offline school on the phone and the laptop. One React codebase, shipped as native
apps for **iOS, Android, macOS, Windows and Linux** through Tauri 2.

**The app never connects to the internet.** Not for fonts, not for updates, not for
the AI teacher. This is enforced three ways:

1. **CSP** in every build: `connect-src 'none'` (see `vite.config.ts`).
2. **Network guard** (`src/lib/net-guard.ts`): `fetch`, `XMLHttpRequest`, `WebSocket`,
   `EventSource`, `sendBeacon` and `RTCPeerConnection` are disabled at startup.
3. **Native shell** (`src-tauri/`): no plugins, no commands, no permissions.

Fonts (Rubik, Vazirmatn) are bundled in `public/fonts/`.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173 (no CSP in dev so hot reload can connect)
npm run build      # dist/ with the offline CSP
npm run typecheck
```

## Native builds (Tauri 2)

Needs Rust (`rustup`), plus Xcode for iOS/macOS and Android Studio for Android.

```bash
npx tauri icon src-tauri/icons/app-icon.svg   # once: generates all icon sizes
npx tauri dev                                  # desktop window
npx tauri build                                # .dmg / .msi / .AppImage / .deb for this OS
npx tauri android init && npx tauri android build
npx tauri ios init && npx tauri ios build
```

After `tauri android init`, remove `<uses-permission android:name="android.permission.INTERNET"/>`
from `src-tauri/gen/android/app/src/main/AndroidManifest.xml` for release builds (Tauri only
needs it for the dev server).

## What is where

| Path | What |
|---|---|
| `src/screens/` | All 21 mobile screens and the 4 desktop layouts (W1 to W4) |
| `src/components/fx.tsx` | Motion from the design: mark, waveforms, speaking glow, star burst, journey, transfer |
| `src/components/Art.tsx` | Seeded generative art (covers, headers, seals) |
| `src/lib/tutor.ts` | Ustad on the device: answers from lesson blocks and teacher-reviewed explanations, cites the page, says honestly when the lesson doesn't cover it. `TutorModel` is the plug-in point for a local model later |
| `src/lib/search.ts` | Offline search: "grade 12 chemistry page 13" and question search, Persian normalisation |
| `src/lib/scrub.ts` | Letter protection on the device: names, cities, schools, phones, emails, dates |
| `src/lib/outbox.ts` | Shared letters are signed with a one-time key and wait in the outbox; they leave only as a file she hands on |
| `src/lib/store.ts` | Encrypted IndexedDB. School data: device key (no login). Rights and letters: key from the second-door code, memory only |
| `src/lib/speech.ts` | Read-aloud with installed voices only; speech-to-text only where it runs on the device |
| `src/content/` | Demo curriculum (sample lesson text) and rights content. All Dari is a draft for native review |

## Honest limits (by design, because nothing goes online)

- **Certificates**: the fingerprint is made on the device; the Bitcoin timestamp happens when a
  copy of the file reaches a connected computer. New records stay "Proof saved" until then.
- **Letters**: "Share it" seals the letter; posting to the Wall of Voices is done by whoever
  carries the file to a connection.
- **Voice**: if the device has no local voice or no on-device recogniser for a language, Ustad shows
  captions and she types; nothing falls back to a cloud service.
- **Nearby transfer**: packs go out through the phone's share sheet (Quick Share / Bluetooth) or as a
  file for a memory card.
