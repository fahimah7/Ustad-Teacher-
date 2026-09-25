"""Validate page packages against page-package/1 (see PAGE_PACKAGE.md).

Usage: python pipeline/validate_packages.py content/<book_id> [first_pdf_page] [last_pdf_page]
Exits non-zero if any package in the range is missing or invalid.
"""
import json, pathlib, re, sys

KINDS = {"cover", "front_matter", "toc", "chapter_title", "photo", "content", "exercises", "review", "blank"}
FIG_KINDS = {"graph", "diagram", "table", "photo", "illustration"}
EX_KINDS = {"exercise", "activity", "question"}
SOURCES = {"book", "generated", "mixed"}
ARABIC_YEH_KAF = re.compile("[يك]")  # ي ك — the book's Dari must use ی ک
# Whole-word match so e.g. واحد doesn't trip the حد check.
def whole_word(t):
    return re.compile(r"(?<![؀-ۿ‌])" + re.escape(t) + r"(?![؀-ۿ‌])")

IRANIAN_ALWAYS = ("دانش‌آموز", "شیمی")
# «حد» is Iranian for "limit" (Afghan: لیمت), but the G10/G11 books use it for a term («n حد اول»),
# so a book only gets that check through its glossary.
IRANIAN_MATH = ("انتگرال",)
# Everyday Dari words a glossary may list as "avoid" (مقدار "amount", برد "took", فرد "person"):
# not flagged on their own. Keep in sync with AMBIGUOUS in UI Code/src/tutor/dariTerms.ts.
AMBIGUOUS = {"مقدار", "برد", "دامنه", "مجموعه", "عامل", "صحیح", "تند", "فرد", "زوج", "کار", "توان",
             "صفحه", "گروه", "ترکیب", "کاهش", "باز", "پیوند", "ماشین", "نما", "جهش", "دفع", "تلاقی", "کلیه", "حلال", "ظرفیت", "شکست", "تکانه", "دفتر", "مدار", "کانون"}


def iranian_terms(book, book_dir):
    """Iranian forms this book must not use: the common ones, the math ones for math books, and the
    "avoid" forms of the book's glossary.json."""
    terms = set(IRANIAN_ALWAYS)
    glossary = book_dir / "glossary.json"
    entries = json.loads(glossary.read_text(encoding="utf-8")).get("terms", []) if glossary.exists() else []
    own = " ".join(t.get("book", "") for t in entries)
    if book.get("subject", "math") == "math":
        # A math word is only Iranian if this book doesn't use it itself (G10 says «حد» for a term).
        terms.update(t for t in IRANIAN_MATH if t not in own)
    if entries:
        for t in entries:
            terms.update(a.strip() for a in t.get("avoid", []) if a and a.strip() and a.strip() != t.get("book", "").strip() and a.strip() not in AMBIGUOUS)
    return [whole_word(t) for t in sorted(terms)]


def check(pkg, pdf_page, book_id, iranian=()):
    errs = []
    def need(cond, msg):
        if not cond: errs.append(msg)
    need(pkg.get("schema") == "page-package/1", "schema must be page-package/1")
    need(pkg.get("book_id") == book_id, f"book_id must be {book_id}")
    need(pkg.get("pdf_page") == pdf_page, f"pdf_page must be {pdf_page}")
    pp = pkg.get("printed_page")
    need(pp is None or isinstance(pp, int), "printed_page must be int or null")
    need(pkg.get("page_kind") in KINDS, f"page_kind must be one of {sorted(KINDS)}")
    ch = pkg.get("chapter")
    need(ch is None or (isinstance(ch, int) and 1 <= ch <= 20), "chapter must be int or null")
    need(isinstance(pkg.get("summary_fa"), str) and pkg["summary_fa"].strip(), "summary_fa required")
    for key in ("key_points_fa", "formulas", "terms", "figures", "worked_examples", "exercises"):
        need(isinstance(pkg.get(key), list), f"{key} must be a list")
    for f in pkg.get("formulas", []):
        need(isinstance(f, dict) and f.get("latex"), "formula needs latex")
    for f in pkg.get("figures", []):
        b = f.get("bbox")
        need(isinstance(b, list) and len(b) == 4 and all(isinstance(v, (int, float)) and 0 <= v <= 1 for v in b)
             and b[0] < b[2] and b[1] < b[3], f"figure {f.get('id')} bbox must be [x0,y0,x1,y1] fractions")
        need(f.get("kind") in FIG_KINDS, f"figure {f.get('id')} kind invalid")
        need(f.get("description_fa"), f"figure {f.get('id')} needs description_fa")
    for e in pkg.get("worked_examples", []):
        need(e.get("problem_fa") and isinstance(e.get("steps_fa"), list), "worked example needs problem_fa + steps_fa")
        need(e.get("solution_source") in SOURCES, "worked example solution_source invalid")
    for e in pkg.get("exercises", []):
        need(e.get("kind") in EX_KINDS, "exercise kind invalid")
        need(e.get("problem_fa") and isinstance(e.get("solution_steps_fa"), list) and e["solution_steps_fa"],
             f"exercise {e.get('label_fa')} needs problem_fa + solution_steps_fa")
        need(e.get("solution_source") in SOURCES, "exercise solution_source invalid")
    for key in ("continues_from_previous", "continues_on_next"):
        need(isinstance(pkg.get(key), bool), f"{key} must be bool")
    need(pkg.get("confidence") in {"high", "medium", "low"}, "confidence must be high/medium/low")
    text = json.dumps(pkg, ensure_ascii=False)
    need(not ARABIC_YEH_KAF.search(text), "uses Arabic ي/ك — use Persian ی/ک")
    for term in iranian:
        m = term.search(text)
        need(not m, f"uses Iranian term '{m.group(0) if m else ''}' — use the book's Dari term")
    return errs


def main():
    book_dir = pathlib.Path(sys.argv[1])
    book = json.loads((book_dir / "book.json").read_text(encoding="utf-8"))
    first = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    last = int(sys.argv[3]) if len(sys.argv) > 3 else book["page_count"]
    iranian = iranian_terms(book, book_dir)
    bad = 0
    for p in range(first, last + 1):
        path = book_dir / "packages" / f"{p:04d}.json"
        if not path.exists():
            print(f"{p:04d}: MISSING"); bad += 1; continue
        try:
            pkg = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            print(f"{p:04d}: INVALID JSON {e}"); bad += 1; continue
        errs = check(pkg, p, book["book_id"], iranian)
        if errs:
            bad += 1; print(f"{p:04d}: " + "; ".join(errs))
    print(f"checked {last - first + 1} pages, {bad} with problems")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
