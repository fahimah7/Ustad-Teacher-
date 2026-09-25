# Ustad · app

Offline school on the laptop (and, next, the phone). One React codebase in a Tauri 2 shell.
The student reads the real textbook page by page; Ustad, a local AI teacher, reads the same page
with her.

**The app never connects to the internet.** Not for fonts, not for updates, not for the teacher:

1. **CSP** in every build (`vite.config.ts`, `src-tauri/tauri.conf.json`): the page may only reach
   the app's own native side (Tauri IPC) and page images (`book:` scheme).
2. **Network guard** (`src/lib/net-guard.ts`): `fetch`, `XMLHttpRequest`, `WebSocket`,
   `EventSource`, `sendBeacon` and `RTCPeerConnection` are disabled at startup, except the IPC door.
3. **Native shell** (`src-tauri/`): no plugins. Its only HTTP client talks to the teacher model on
   `127.0.0.1` and is built without TLS, so it cannot reach an https server at all.

## Run it

```bash
powershell -ExecutionPolicy Bypass -File ..\scripts\run_ustad.ps1   # the app, with the teacher
npm run dev        # the same UI in a browser at http://localhost:5173 (vite.backend.ts stands in
                   # for the native side; start the model with ..\scripts\start_llama_server.ps1)
npm test           # tutor logic, and parity with the evaluated Dart prompts
npm run typecheck
```

## What is where

| Path | What |
|---|---|
| `src-tauri/src/content.rs` | Books on the device (bundled, dev `content/`, received packs), `load_book`, the `book:` scheme for page images |
| `src-tauri/src/tutor.rs` | Keeps `llama-server` running on 127.0.0.1 and streams answers to the page over a Tauri channel |
| `src-tauri/src/packs.rs` | Learning packs: every book of a grade in one file, checked entry by entry on import |
| `src/native/bridge.ts` | The one door to the native side (or to `vite.backend.ts` in dev) |
| `src/tutor/` | The teacher's brain, ported from the Flutter app: page notes, outline, BM25 search, prompt builder, Dari terms, math splitting. Prompts are character-identical to the evaluated Dart ones |
| `src/lib/tutor.ts` | Asking Ustad (streamed), plus flashcards, "show me" figures and quick checks made straight from the page notes |
| `src/content/library.ts` | The shelf, built from the books on disk: chapters are units, sections are lessons |
| `src/screens/Lesson.tsx` | The reader: the real pages, fitted to the window, with the notes one tap away and Ustad beside them |
| `src/screens/Welcome.tsx` | Every start: her name (memory only), a greeting, her grade, her book |
| `src/components/MathText.tsx` | Dari + KaTeX (bundled) for answers and notes |

## Honest limits

- **Notes and practice** are made from the textbook by AI and checked by script, not yet by a teacher;
  the book page is always one tap away.
- **Voice**: read-aloud uses voices installed on the device (Windows has English; Dari needs a
  voice to be installed). Speech-to-text only runs where it works on the device; otherwise she types.
- **Certificates**: the fingerprint is made on the device; timestamping happens when a copy of the
  file reaches a connected computer. New records stay "Proof saved" until then.
- **Packs** travel as a file (memory card, Bluetooth, a phone's share sheet).
- **Phones**: the UI is responsive, but on Android the model will need llama.cpp in-process instead
  of the `llama-server` sidecar.
