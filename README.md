# Ustad: offline school

An offline school for Afghan girls: the real Ministry of Education textbooks, page by page, with a
local AI teacher ("Ustad") that knows which page the student is reading. Nothing goes online.
Today: **Grades 10–12 Mathematics, Physics and Biology** (9 books, every page with study notes
and checked practice questions) on Windows, plus a "My rights, my voice" section. More books are being
prepared in `content-pending/`; Android is next.

## Layout

| Path | What |
|---|---|
| `UI Code/` | **The app**: React UI in a Tauri 2 shell. `src/` is the UI and the tutor logic, `src-tauri/` the native side (books from disk, the teacher model, learning packs). See `UI Code/README.md` |
| `content/<book>/` | The books in the app (g10-, g11-, g12-math, -phys and -bio): `book.json` (chapters, pages), `packages/NNNN.json` (study notes per page), `practice/chapter-N.json` (5 checked questions per chapter), `titles_en.json`, `glossary.json` (the book's Dari terms), `pages/` (rendered images, not in git, regenerated) |
| `content-pending/` | Books still being prepared (chemistry, English); see its README |
| `UI Code/src/content/rights/` | The rights lessons (6 units, Dari and English) |
| `pipeline/` | Adding a book: `BOOK_SETUP.md` → `TRANSCRIBE.md` → `FINISH_BOOK.md`; `render_pages.py` (PDF → page images), `PAGE_PACKAGE.md` (page-package format), `validate_packages.py`, `validate_practice.py` |
| `app/` | The earlier Flutter app. Its tutor code (Dart) is the evaluated reference; `app/tool/dump_prompts.dart` checks the web port against it |
| `scripts/run_ustad.ps1` | Runs the app |
| `scripts/build_windows.ps1`, `installer/` | The Windows installer (Inno Setup): one setup file with the app, books and runtime. During installation it downloads the teacher (large or standard, chosen by the computer's memory) in parts from GitHub Releases, or copies the parts from its own folder for computers without internet. Signs everything when `USTAD_SIGN_CMD` is set (see the script). Installers are not in git |
| `Website/` | ustadschool.com (published from its own repository) |
| `eval/` | Teacher evaluations and replayed conversations |
| `scripts/start_llama_server.ps1` | Runs llama.cpp by hand for testing |
| `maktab93-textbooks/` | Source PDFs (junction to D:, not in git; re-download from `manifest.csv`) |

## Run on Windows

Needs: Node 22 (`D:\dev\node22`), Rust, the llama.cpp Vulkan build (`D:\dev\llama-vulkan`), and the
teachers in `D:\ai-models\gemma-4\`: `gemma-4-E4B-it-qat-UD-Q4_K_XL.gguf` (large) and
`gemma-4-E2B-it-qat-UD-Q4_K_XL.gguf` (standard), from Unsloth's Gemma 4 QAT GGUF repositories.

```bash
powershell -ExecutionPolicy Bypass -File scripts/run_ustad.ps1
```

The app starts `llama-server` itself on `127.0.0.1:8080` (loopback only), reuses one that is
already running, and stops the one it started when the window closes. It puts the model on a
graphics card if the computer has one (Vulkan: NVIDIA, AMD or Intel Arc), and otherwise runs it on
the CPU alone, with a 32K context. Override paths with
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
powershell -File scripts/start_llama_server.ps1 -Model e4b      # or -Model e2b, add -Cpu for no graphics card
cd "UI Code" && USTAD_EVAL=1 USTAD_EVAL_TAG=e4b npx vitest run src/tutor/conversation.eval.test.ts   # → eval/conversations_app_e4b.md
cd "UI Code" && npm test                                         # tutor logic + parity with the Dart prompts
```

Measured on a laptop with an i5-11300H, Intel Iris Xe and an RTX 3050 (4 GB), writing / reading speed:

| Teacher | RTX 3050 (Vulkan) | CPU only |
|---|---|---|
| Large: Gemma 4 E4B QAT (4.2 GB) | ~16 / ~440 tok/s | ~8 / ~38 tok/s |
| Standard: Gemma 4 E2B QAT (2.6 GB) | ~69 tok/s | ~17 / ~85 tok/s |

The built-in Iris Xe graphics wrote two to three times slower than the CPU, so without a graphics
card the app uses the CPU alone. When a book opens, the app sends the rules and the book's outline
ahead of time (`warmTeacher`), so the first question doesn't wait for them. Qwen3.5-4B was also tried
(`eval/conversations_app_qwen3.5-4b.md`): correct maths, but informal Dari («تو») and slow on Vulkan.
Requests must send `chat_template_kwargs: {"enable_thinking": false}` or Gemma 4 spends its tokens on hidden reasoning.

## License

Ustad is open source. The app's code is under the [MIT License](LICENSE). The learning content
written for it (page notes, practice questions, titles, glossaries and the "My rights" lessons) is
under [CC BY 4.0](LICENSE-CONTENT.md). The textbooks themselves belong to the Ministry of Education
of Afghanistan, and the software and model shipped in the installer keep their own licenses
([`installer/THIRD_PARTY_NOTICES.txt`](installer/THIRD_PARTY_NOTICES.txt)).
