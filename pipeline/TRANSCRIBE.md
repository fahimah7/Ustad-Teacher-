# Writing page packages (step 2 of making a book teachable)

The task that sent you here names the book (book_id, subject) and your PDF page range.

You are building "page packages" (structured Dari study notes) for an offline AI tutor app ("Ustad")
that teaches Afghan girls who are banned from school, using the textbooks of the Afghan Ministry of
Education. The student sees the original page image; the on-device teacher (a small LLM) reads your
package for the page she is on, and only that. Your notes must be accurate, in Dari, compact, and in
your own words.

Project root: C:\Users\shaye\Desktop\AI Hack for Freedom III

## Before starting, read

1. `pipeline\PAGE_PACKAGE.md`: the format and the writing rules. Follow it exactly. It was written for
   the math book; where this file says something different for your subject, this file wins.
2. `content\<book_id>\book.json`: "chapters" maps printed page ranges to chapter numbers; "printed_offset"
   tells you roughly how PDF pages relate to printed page numbers (pdf = printed + offset).
3. `content\<book_id>\glossary.json`: this book's own terms. Always use the "book" form, never an
   "avoid" form.
4. Two reviewed math packages, for the level of detail and style: `content\g12-math\packages\0010.json`
   (concept + activities) and `content\g12-math\packages\0025.json` (exercise page).

## For each PDF page p in your range

- If `content\<book_id>\packages\{p:04d}.json` already exists, skip it.
- Look at the page image `content\<book_id>\pages\{p:04d}.jpg` with the Read tool. If a problem or an
  explanation clearly continues across pages, you may also look at the neighbouring page for context.
- Write `content\<book_id>\packages\{p:04d}.json` (UTF-8) with the Write tool.

## Rules (all subjects)

- Study notes in your OWN WORDS. Do not copy or closely paraphrase the book's sentences or passages.
  Headings, term names, formulas and short exercise items may be written exactly as printed; restate
  problems concisely.
- Dari (Afghan) with this book's terminology: see glossary.json. Persian ی and ک only (never Arabic
  ي / ك). Never use Iranian-only words such as شیمی (Afghan books say کیمیا) or دانش‌آموز (say شاگرد).
- `section_fa`: the heading of the section the page belongs to, written exactly as the book prints it
  (look at the table of contents if unsure). Use the same string on every page of that section, even
  across pages done by other people, so the app can group pages into lessons.
- `chapter`: from book.json's printed ranges (or the page's own chapter heading).
- `printed_page`: the number printed on the page (convert Dari digits, ۱۳۷ → 137); null if none.
- Every exercise, activity and question gets a correct worked solution (`solution_source` "generated"
  unless the book solves it). Check numbers carefully; you may use Python via Bash (python is on PATH)
  to verify calculations. If unsure, lower `confidence` and explain in `notes`.
- Figures: approximate bbox as fractions [x0, y0, x1, y1] of the image, plus a Dari description of what
  the figure shows and why it matters for the lesson. Diagrams, tables and labelled drawings matter a
  lot in science books: the teacher cannot see the image, only your description.
- Non-teaching pages (cover, front matter, chapter title pages, full-page photos) still get a short
  package with the right `page_kind` and a brief summary; leave the lists empty where nothing applies.
- Only write files for pages in your range. Do not modify any other files.

## Subject notes

- **Math**: as in PAGE_PACKAGE.md.
- **Physics**: formulas in LaTeX with units written with `\mathrm`, e.g. `$F = m\,a$`,
  `$v = 20\,\mathrm{m/s}$`. Solve numeric problems fully, with units, and check them in Python.
- **Chemistry**: chemical formulas and equations in LaTeX with `\mathrm` (KaTeX has no `\ce`):
  `$\mathrm{H_2SO_4}$`, `$\mathrm{2H_2 + O_2 \rightarrow 2H_2O}$`, charges as `$\mathrm{SO_4^{2-}}$`.
  Balance every equation you write and check it atom by atom. Put important equations in `formulas`
  with `meaning_fa`.
- **Biology**: few formulas; describe figures (cells, organs, cycles, tables) carefully, with the
  labels they show. Put the scientific/English name in `terms[].en`.
- **English** (the book teaches English to Dari speakers): the page itself is in English. Write
  `summary_fa` and `key_points_fa` in Dari, explaining what the lesson teaches (grammar point,
  vocabulary, reading, dialogue), quoting short English words and example sentences where needed.
  `terms`: the new vocabulary, `{"fa": "<Dari meaning>", "en": "<English word or phrase>"}`.
  `formulas`: leave empty; put grammar patterns in `key_points_fa` (e.g. «ساختار: subject + have/has +
  past participle»). Summarise reading passages and dialogues in Dari in your own words (who, what,
  main points); do not copy them. Exercises: give the task briefly (short English items may be quoted
  so the answer makes sense), and the correct answers in English with a short Dari explanation.

## When done

Run, from the project root, with `PYTHONIOENCODING=utf-8`:

    python pipeline/validate_packages.py content/<book_id> <first> <last>

and fix every reported problem until it reports 0 problems.

Final report (under 120 words): pages written, pages skipped, and any pages with confidence
"medium"/"low" and why. Do not paste package contents into the report.
