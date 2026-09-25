"""List a book's lessons as the app will build them: runs of pages per chapter and section_fa.

Usage: python pipeline/sections.py content/<book_id>
Prints one line per run: chapter, first-last PDF page, printed pages, page kinds, section_fa.
Two runs with nearly the same title, or one section split by another, usually mean the notes
used different spellings for the same heading.
"""
import json, pathlib, sys

TEACHING = {"content", "exercises", "review"}


def main():
    book_dir = pathlib.Path(sys.argv[1])
    book = json.loads((book_dir / "book.json").read_text(encoding="utf-8"))
    runs = []
    for p in range(1, book["page_count"] + 1):
        path = book_dir / "packages" / f"{p:04d}.json"
        if not path.exists():
            runs.append([None, p, p, None, None, {"missing"}, "(no notes)"])
            continue
        pkg = json.loads(path.read_text(encoding="utf-8"))
        key = (pkg.get("chapter"), (pkg.get("section_fa") or "").strip())
        kind = pkg.get("page_kind")
        pp = pkg.get("printed_page")
        if runs and (runs[-1][0], runs[-1][6]) == key:
            runs[-1][2] = p; runs[-1][4] = pp if pp is not None else runs[-1][4]; runs[-1][5].add(kind)
        else:
            runs.append([key[0], p, p, pp, pp, {kind}, key[1]])
    seen = {}
    for ch, a, b, pa, pb, kinds, title in runs:
        again = " <-- repeated" if title and (ch, title) in seen and seen[(ch, title)] != a else ""
        seen.setdefault((ch, title), a)
        teach = "" if kinds & TEACHING else " (not a lesson)"
        print(f"ch {ch}\tpdf {a}-{b}\tprinted {pa}-{pb}\t{','.join(sorted(k or '?' for k in kinds))}{teach}\t{title}{again}")


if __name__ == "__main__":
    main()
