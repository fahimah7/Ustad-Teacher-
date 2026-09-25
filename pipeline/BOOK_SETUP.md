# Book setup (step 1 of making a book teachable)

The task that sent you here names the book (book_id, subject, subject key, subject in Dari, grade, PDF page count).

You are preparing one Afghan Ministry of Education textbook for an offline AI tutor app ("Ustad") that teaches Afghan girls who are banned from school. The app shows the real book page by page; later, other agents will write Dari study notes for every page. Your job is the book's table of contents, its page numbering, and its own terminology.

Project root: C:\Users\shaye\Desktop\AI Hack for Freedom III

BOOK: <book_id> — <subject>, Grade <grade> (<page_count> PDF pages)
Page images: content\<book_id>\pages\NNNN.jpg (NNNN = 1-based PDF page, zero-padded). Look at them with the Read tool.
Reference book already done: content\g12-math\book.json (see its top-level fields and "chapters") and content\g12-math\titles_en.json.

Steps:
1. Find the table of contents (فهرست / Contents; usually within the first ~15 PDF pages; it may span several pages) and read it completely. Also look at the cover and at several content pages spread through the book, to learn how the printed page numbers in the footers relate to PDF page numbers.
2. Find each chapter/unit's title page in the images to confirm where it starts. Chapter numbers are 1, 2, 3… in book order (for the English book, units are the chapters).
3. Edit content\<book_id>\book.json: load it with Python, ADD these fields, keep every existing field (especially "pages") unchanged, and write it back as UTF-8 with ensure_ascii=False, indent=2:
   - "title_fa": the book title in Dari as the app should show it, e.g. the subject and grade, e.g. "فزیک صنف دهم"
   - "subject": <subject key given in your task: math, phys, chem, bio or eng>
   - "subject_fa": <subject in Dari given in your task>
   - "grade": <grade>
   - "language": "fa-AF"
   - "publisher_fa": "وزارت معارف"
   - "printed_offset": integer k such that, for ordinary numbered pages, pdf_page = printed_page + k (check it at the start, middle and end of the book; if it changes, use the value that holds for most pages and describe the exceptions in your report)
   - "chapters": [{"number": 1, "title_fa": "...", "printed_start": <printed page where the chapter starts>, "printed_end": <printed page where it ends>}, ...] covering the whole teaching content in order. Titles in Dari exactly as the book names them (for the English book, keep the unit title as printed, in English). Use Persian ی and ک, never Arabic ي / ك.
4. Write content\<book_id>\titles_en.json: {"chapters": {"1": "<English chapter title>", ...}, "sections": {}} (sections will be filled in later by someone else; leave it an empty object).
5. Write content\<book_id>\glossary.json — the book's own terminology, so the note writers and the teacher model use the words THIS book uses rather than Iranian Persian ones:
   {"book_id": "<book_id>", "terms": [{"book": "<term as this book writes it>", "avoid": ["<Iranian/other form a Persian model might use instead>", ...], "en": "<English>"}, ...], "style_notes_fa": "<one or two sentences in Dari on this book's conventions, e.g. how it names activities, exercises, units>"}
   Include 20–40 important subject terms you actually saw in the book. Put a term in "avoid" only if you are confident it is the Iranian (or non-Afghan) form, e.g. کیمیا vs شیمی, مالیکول vs مولکول, کتله vs جرم, قوه vs نیرو. An empty "avoid" list is fine for terms that are the same in Iran and Afghanistan but still central to the subject.
6. Verify: run python -c that loads the three JSON files and prints the chapter list and printed_offset (use PYTHONIOENCODING=utf-8).

Only write those three files. Do not modify anything else.

Final report (under 120 words): chapter count, printed_offset (and any exceptions), the PDF page range of the table of contents, and anything unusual (missing pages, duplicated pages, pages in another language, poor scans).
