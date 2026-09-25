# Page package format (`page-package/1`)

One JSON file per PDF page: `content/<book_id>/packages/NNNN.json` (NNNN = 1-based PDF page, zero-padded).
The reader app shows the original page image; the package is what the on-device teacher reads when the
student is on that page. Keep it compact (aim for 300–900 words total) so it fits a small model's prompt.

## Writing rules

- **Study notes, not a copy.** Write summaries, key points and figure descriptions as your own explanation
  of what the page teaches. Do not copy or closely paraphrase the book's sentences. Short headings, term names,
  and mathematical expressions may be written exactly as printed.
- **Dari, with the book's terminology.** Use the words the book uses: لیمت (not حد), انتیگرال (not انتگرال),
  مشتق، تابع، ترادف، انتروال، قیمت، احصائیه، احتمالات، متمادی، مثال، حل، تمرین، فعالیت. Use Persian ی and ک
  (never Arabic ي / ك). Never switch to Iranian-only terms (e.g., حد، شیمی، دانش‌آموز).
- **Math in LaTeX**, inline as `$...$`. Inside JSON escape backslashes (`"$\\frac{1}{2}$"`).
- **Solutions must be correct.** Every exercise gets a worked solution. Mark `solution_source`:
  `"book"` if the page itself solves it, `"generated"` if you solved it, `"mixed"` if you completed a partial one.
  Double-check arithmetic; if unsure, say so in `notes` and set `confidence` to `"medium"` or `"low"`.
- **Figures:** `bbox` is `[x0, y0, x1, y1]` as fractions of the page image width/height (origin top-left),
  approximate is fine. Describe what the figure shows and why it matters for the lesson.
- If a problem or explanation continues from the previous page or onto the next page, set the
  `continues_*` flags and describe only what is on this page (you may finish a solution, marked `"mixed"`).

## Fields

| Field | Type | Notes |
|---|---|---|
| `schema` | `"page-package/1"` | |
| `book_id` | string | e.g. `"g12-math"` |
| `pdf_page` | int | 1-based |
| `printed_page` | int or null | Number printed in the page footer (convert Dari digits: ۱۳۷ → 137); null if none printed |
| `page_kind` | enum | `cover`, `front_matter`, `toc`, `chapter_title`, `photo`, `content`, `exercises`, `review`, `blank` |
| `chapter` | int or null | Chapter number 1–8 (see `book.json`) |
| `section_fa` | string or null | Heading of the section this page belongs to |
| `summary_fa` | string | 40–180 words, own words: what the page teaches and how |
| `key_points_fa` | string[] | 0–6 short bullets |
| `formulas` | `{latex, meaning_fa}`[] | Definitions/rules/results introduced or used on the page |
| `terms` | `{fa, en}`[] | Technical terms introduced on the page (English equivalent if known) |
| `figures` | `{id, bbox, kind, description_fa}`[] | `kind`: `graph`, `diagram`, `table`, `photo`, `illustration` |
| `worked_examples` | `{label_fa, problem_fa, steps_fa[], answer, solution_source}`[] | Examples the page works through (مثال) |
| `exercises` | `{label_fa, kind, problem_fa, solution_steps_fa[], answer, solution_source}`[] | `kind`: `exercise`, `activity`, `question` |
| `continues_from_previous` | bool | |
| `continues_on_next` | bool | |
| `confidence` | `high` / `medium` / `low` | Your confidence in the package's accuracy |
| `notes` | string | Anything uncertain or unreadable |

Validate with: `python pipeline/validate_packages.py content/g12-math [first] [last]`
