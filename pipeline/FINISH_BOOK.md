# Finishing a book (step 3 of making a book teachable)

The task that sent you here names the book (book_id, subject). Every page of it already has a page
package (`content\<book_id>\packages\NNNN.json`, written by several people 20 pages at a time), and
`book.json` has its chapters. You make the book consistent and give it practice questions.

Project root: C:\Users\shaye\Desktop\AI Hack for Freedom III. Run Python from the project root with
`PYTHONIOENCODING=utf-8`. Read `pipeline\PAGE_PACKAGE.md` and `content\<book_id>\glossary.json` first.

## 1. Lessons: consistent section names

The app turns each run of pages with the same `chapter` and `section_fa` into one lesson, and lists
the lessons in the book's contents and in the teacher's outline. Run:

    python pipeline/sections.py content/<book_id>

and compare the runs with the book's table of contents (the "toc" pages; look at their images).
Fix, by editing only the `section_fa` (and if clearly wrong, `chapter`) fields of the packages:
- the same heading spelled differently on different pages (one string per section, as the book prints it);
- a section split into several runs by a page with a different or empty `section_fa`
  (exercise and review pages belong to the section they review, or to the chapter's review section);
- teaching pages with an empty `section_fa`.
Leave cover, front matter, toc and chapter title pages as they are. Aim for lessons of roughly 2–12
pages that match the book's own sections. Re-run sections.py until it looks right.

Edit packages with Python (load, change the field, write back with ensure_ascii=False, indent=2),
never by hand-rewriting a whole file.

## 2. English titles

Update `content\<book_id>\titles_en.json`: keep "chapters" (fix any that are wrong) and fill
"sections" with {"<section_fa exactly as used in the packages>": "<short English title>"} for every
section that sections.py lists as a lesson. For the English book the titles may already be English;
map them to themselves (or to a cleaner English form).

## 3. Practice: five questions per chapter

For every chapter in book.json write `content\<book_id>\practice\chapter-<n>.json`:

    {"schema": "practice-set/1", "book_id": "<book_id>", "chapter": <n>,
     "title": {"en": "<chapter title in English>", "fa": "<chapter title_fa>"},
     "questions": [ five of:
       {"pdf_page": <PDF page where this is taught>,
        "q": {"en": "...", "fa": "..."},
        "options": [{"en": "...", "fa": "..."} x4],
        "answer": <0-based index of the correct option>,
        "why": {"en": "...", "fa": "..."},        (one or two sentences: why that option is right)
        "idea": {"en": "...", "fa": "..."}}       (a hint for a student who picked wrong)
     ]}

- Look at `content\g12-math\practice\chapter-2.json` for the format and tone.
- Base every question on what the chapter's pages teach (read their packages; look at page images
  when needed). Cover different sections of the chapter; mix understanding and (where the subject
  has them) calculation questions. Exactly one option is correct; wrong options are plausible
  mistakes. Vary the position of the correct answer.
- Check every answer. Verify calculations, units and balanced equations with Python.
- Dari with the book's terms (glossary.json), Persian ی/ک, math and formulas in LaTeX `$...$`
  (chemistry with `\mathrm{...}`), exactly as in the page packages. English book: `q.fa` gives the
  instruction in Dari with the English item quoted; options are English in both en and fa.

Then run:

    python pipeline/validate_practice.py content/<book_id>
    python pipeline/validate_packages.py content/<book_id>

and fix every problem until both report 0.

Final report (under 120 words): how many section names you changed, the number of lessons per
chapter, practice sets written, and anything a human should check.
