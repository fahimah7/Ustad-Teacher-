"""Render every page of a textbook PDF to a JPEG for the reader app and for transcription.

Usage: python pipeline/render_pages.py <pdf> <book_id> [--dpi 150]
Writes content/<book_id>/pages/NNNN.jpg (1-based PDF page numbers) and content/<book_id>/book.json.
"""
import argparse, json, pathlib
import fitz  # PyMuPDF

ROOT = pathlib.Path(__file__).resolve().parents[1]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("book_id")
    ap.add_argument("--dpi", type=int, default=150)
    args = ap.parse_args()

    out = ROOT / "content" / args.book_id
    pages_dir = out / "pages"
    pages_dir.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(args.pdf)
    pages = []
    for i, page in enumerate(doc, start=1):
        pix = page.get_pixmap(dpi=args.dpi)
        name = f"{i:04d}.jpg"
        pix.save(pages_dir / name, jpg_quality=85)
        pages.append({"pdf_page": i, "image": f"pages/{name}", "width": pix.width, "height": pix.height})

    book_path = out / "book.json"
    book = json.loads(book_path.read_text(encoding="utf-8")) if book_path.exists() else {}
    book.update({"book_id": args.book_id, "source_pdf": pathlib.Path(args.pdf).name,
                 "page_count": doc.page_count, "pages": pages})
    book_path.write_text(json.dumps(book, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"rendered {doc.page_count} pages to {pages_dir}")

if __name__ == "__main__":
    main()
