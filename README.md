# Ustad: offline school

An offline school for Afghan girls: the real Ministry of Education textbooks, page by page, with a
local AI teacher ("Ustad") that knows which page the student is reading. Nothing goes online.
Today: **Grades 10–12 Mathematics and Grades 10–11 Physics** (5 books, every page with study notes
and checked practice questions) on Windows, plus a "My rights, my voice" section. More books are being
prepared in `content-pending/`; Android is next.

## Layout

| Path | What |
|---|---|
| `UI Code/` | **The app**: React UI in a Tauri 2 shell. `src/` is the UI and the tutor logic, `src-tauri/` the native side (books from disk, the teacher model, learning packs). See `UI Code/README.md` |
| `content/<book>/` | The books in the app (g10-math, g11-math, g12-math, g10-phys, g11-phys): `book.json` (chapters, pages), `packages/NNNN.json` (study notes per page), `practice/chapter-N.json` (5 checked questions per chapter), `titles_en.json`, `glossary.json` (the book's Dari terms), `pages/` (rendered images, not in git, regenerated) |
| `content-pending/` | Books still being prepared (chemistry, biology, English, grade 12 physics); see its README |
| `UI Code/src/content/rights/` | The rights lessons (6 units, Dari and English) |
| `pipeline/` | Adding a book: `BOOK_SETUP.md` → `TRANSCRIBE.md` → `FINISH_BOOK.md`; `render_pages.py` (PDF → page images), `PAGE_PACKAGE.md` (page-package format), `validate_packages.py`, `validate_practice.py` |
| `app/` | The earlier Flutter app. Its tutor code (Dart) is the evaluated reference; `app/tool/dump_prompts.dart` checks the web port against it |
| `scripts/run_ustad.ps1` | Runs the app |
| `scripts/build_windows.ps1`, `installer/` | The Windows installer (Inno Setup): app, books, teacher model and runtime in one setup, split into parts under 2 GB for GitHub Releases. Installers are not in git |
| `Website/` | ustadschool.com (published from its own repository) |
| `eval/` | Teacher evaluations and replayed conversations |
| `scripts/start_llama_server.ps1` | Runs llama.cpp by hand for testing |
| `maktab93-textbooks/` | Source PDFs (junction to D:, not in git; re-download from `manifest.csv`) |

## Run on Windows

Needs: Node 22 (`D:\dev\node22`), Rust, llama.cpp CUDA build (`D:\dev\llama.cpp`),
`gemma-4-E2B-it-Q4_K_M.gguf` in `C:\ai-models\gemma-4\` (SSD, loads fast) or `D:\ai-models\gemma-4\`,
CUDA 12.x runtime.

```bash
powershell -ExecutionPolicy Bypass -File scripts/run_ustad.ps1
```

The app starts `llama-server` itself on `127.0.0.1:8080` (loopback only), reuses one that is
already running, and stops the one it started when the window closes. Override paths with
`SCHOOL_CONTENT_DIR`, `SCHOOL_LLAMA_SERVER`, `SCHOOL_MODEL`, `SCHOOL_CUDA_BIN`, `SCHOOL_LLAMA_PORT`.

## How the teacher sees the book

Every question is sent with: the teacher's rules (`UI Code/src/tutor/prompts/teacher_fa.txt`, or
`teacher_en.txt` when the app is in English), the book outline (all chapters and sections with
printed pages), and the open page's notes with its examples and exercises. If the question is about
another part of the book, offline keyword search (`UI Code/src/tutor/bookSearch.ts`) adds short
notes from the best-matching pages; a page named by number ("صفحهٔ ۴۰") gets its full notes. Those
pages appear as links under the answer. Iranian terms in answers are rewritten to the book's Dari
terms (`dariTerms.ts`). The TypeScript prompt builder is a port of the Dart one and builds
character-identical prompts (`UI Code/src/tutor/parity.test.ts`).

## Test the teacher without the app

```bash
powershell -File scripts/start_llama_server.ps1 -Model e2b
cd app && dart run tool/eval_teacher.dart e2b         # answers → eval/teacher_e2b.jsonl
cd "UI Code" && npm test                               # tutor logic + parity with the Dart prompts
```

On an RTX 3050 (4 GB): Gemma 4 E2B answers in ~2–5 s at ~65 tok/s; E4B ~14 s at ~14 tok/s.
Requests must send `chat_template_kwargs: {"enable_thinking": false}` or Gemma 4 spends its tokens on hidden reasoning.
