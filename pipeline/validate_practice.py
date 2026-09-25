"""Validate practice sets (content/<book_id>/practice/chapter-N.json, schema practice-set/1).

Usage: python pipeline/validate_practice.py content/<book_id>
Each set: {schema, book_id, chapter, title{en,fa}, questions[]}; each question: {pdf_page, q{en,fa},
options[4]{en,fa}, answer (0-based index), why{en,fa}, idea{en,fa}}.
Exits non-zero on problems.
"""
import json, pathlib, re, sys

ARABIC_YEH_KAF = re.compile("[يك]")


def bilingual(x):
    return isinstance(x, dict) and all(isinstance(x.get(k), str) and x[k].strip() for k in ("en", "fa"))


def main():
    book_dir = pathlib.Path(sys.argv[1])
    book = json.loads((book_dir / "book.json").read_text(encoding="utf-8"))
    chapters = {c["number"]: c for c in book.get("chapters", [])}
    bad = 0
    sets = sorted((book_dir / "practice").glob("chapter-*.json"))
    for path in sets:
        errs = []
        try:
            s = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            print(f"{path.name}: INVALID JSON {e}"); bad += 1; continue
        need = lambda c, m: None if c else errs.append(m)
        need(s.get("schema") == "practice-set/1", "schema must be practice-set/1")
        need(s.get("book_id") == book["book_id"], "book_id mismatch")
        need(s.get("chapter") in chapters, "chapter not in book.json")
        need(path.name == f"chapter-{s.get('chapter')}.json", "file name must be chapter-<chapter>.json")
        need(bilingual(s.get("title")), "title needs en and fa")
        qs = s.get("questions")
        need(isinstance(qs, list) and len(qs) >= 3, "needs at least 3 questions")
        for i, q in enumerate(qs or [], 1):
            need(isinstance(q.get("pdf_page"), int) and 1 <= q["pdf_page"] <= book["page_count"], f"q{i} pdf_page out of range")
            need((book_dir / "packages" / f"{q.get('pdf_page', 0):04d}.json").exists(), f"q{i} pdf_page has no notes")
            for k in ("q", "why", "idea"):
                need(bilingual(q.get(k)), f"q{i} {k} needs en and fa")
            opts = q.get("options")
            need(isinstance(opts, list) and len(opts) == 4 and all(bilingual(o) for o in opts), f"q{i} needs 4 bilingual options")
            need(isinstance(q.get("answer"), int) and 0 <= q["answer"] < 4, f"q{i} answer must be 0-3")
            if isinstance(opts, list):
                en = [o.get("en", "").strip() for o in opts if isinstance(o, dict)]
                need(len(set(en)) == len(en), f"q{i} has duplicate options")
        need(not ARABIC_YEH_KAF.search(json.dumps(s, ensure_ascii=False)), "uses Arabic ي/ك")
        if errs:
            bad += 1; print(f"{path.name}: " + "; ".join(errs))
    missing = [n for n in chapters if not (book_dir / "practice" / f"chapter-{n}.json").exists()]
    if missing:
        bad += 1; print(f"missing sets for chapters {missing}")
    print(f"checked {len(sets)} sets, {bad} with problems")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
