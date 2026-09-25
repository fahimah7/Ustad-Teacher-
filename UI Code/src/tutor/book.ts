/** A textbook as the pipeline lays it out (content/<book_id>/): book.json, one page image and
 *  one page package per PDF page (format: pipeline/PAGE_PACKAGE.md). Port of app/lib/content/book.dart. */

export type ChapterJson = { number: number; title_fa: string; printed_start: number; printed_end: number };

export type BookJson = {
  book_id: string;
  title_fa?: string;
  subject?: string;
  subject_fa?: string;
  grade?: number;
  page_count: number;
  pages: { pdf_page: number; image: string; width?: number; height?: number }[];
  chapters?: ChapterJson[];
  /** pdf_page = printed_page + printed_offset on ordinary numbered pages; used for pages whose
   *  notes are not written yet. */
  printed_offset?: number;
};

type Json = Record<string, unknown>;

export type Formula = { latex: string; meaning_fa?: string };
export type Term = { fa?: string; en?: string };
export type FigureJson = { id?: string; bbox?: number[]; kind?: string; description_fa?: string };
export type WorkedExample = { label_fa?: string; problem_fa?: string; steps_fa?: string[]; answer?: string | null; solution_source?: string };
export type Exercise = { label_fa?: string; kind?: string; problem_fa?: string; solution_steps_fa?: string[]; answer?: string | null; solution_source?: string };

export class PagePackage {
  constructor(readonly json: Json) {}
  get pdfPage(): number { return this.json.pdf_page as number; }
  get printedPage(): number | null { return (this.json.printed_page as number | null | undefined) ?? null; }
  get chapter(): number | null { return (this.json.chapter as number | null | undefined) ?? null; }
  get sectionFa(): string | null { return (this.json.section_fa as string | null | undefined) ?? null; }
  get pageKind(): string { return (this.json.page_kind as string | undefined) ?? ""; }
  get summaryFa(): string { return (this.json.summary_fa as string | undefined) ?? ""; }
  get keyPoints(): string[] { return this.list<string>("key_points_fa"); }
  get formulas(): Formula[] { return this.list<Formula>("formulas"); }
  get terms(): Term[] { return this.list<Term>("terms"); }
  get figures(): FigureJson[] { return this.list<FigureJson>("figures"); }
  get workedExamples(): WorkedExample[] { return this.list<WorkedExample>("worked_examples"); }
  get exercises(): Exercise[] { return this.list<Exercise>("exercises"); }
  get continuesFromPrevious(): boolean { return this.json.continues_from_previous === true; }
  get continuesOnNext(): boolean { return this.json.continues_on_next === true; }
  private list<T>(key: string): T[] { return Array.isArray(this.json[key]) ? (this.json[key] as T[]) : []; }
}

export class Chapter {
  constructor(readonly number: number, readonly titleFa: string, readonly printedStart: number, readonly printedEnd: number) {}
}

export class TextBook {
  readonly id: string;
  readonly titleFa: string;
  readonly pageCount: number;
  readonly chapters: Chapter[];
  /** Height / width of each page image, in page order (A4 portrait if unknown). */
  readonly pageAspects: number[];
  readonly images: string[];
  private readonly packages = new Map<number, PagePackage>();

  constructor(readonly json: BookJson, packages: (Json | null)[]) {
    this.id = json.book_id;
    this.titleFa = json.title_fa ?? json.book_id;
    this.pageCount = json.page_count;
    this.chapters = (json.chapters ?? []).map((c) => new Chapter(c.number, c.title_fa, c.printed_start, c.printed_end));
    this.pageAspects = json.pages.map((p) => (p.height ?? 1414) / (p.width ?? 1000));
    this.images = json.pages.map((p) => p.image);
    packages.forEach((p) => {
      if (p && typeof p.pdf_page === "number") this.packages.set(p.pdf_page, new PagePackage(p));
    });
  }

  chapter(number: number | null | undefined): Chapter | null {
    return this.chapters.find((c) => c.number === number) ?? null;
  }

  pkg(pdfPage: number): PagePackage | null {
    return this.packages.get(pdfPage) ?? null;
  }

  printedPageOf(pdfPage: number): number | null {
    const pkg = this.packages.get(pdfPage);
    if (pkg) return pkg.printedPage;
    const offset = this.json.printed_offset;
    return typeof offset === "number" && pdfPage - offset >= 1 ? pdfPage - offset : null;
  }

  /** The chapter a page belongs to: from its notes, or (while they are not written yet) from
   *  where its printed number falls in the table of contents. */
  chapterOfPage(pdfPage: number): Chapter | null {
    const pkg = this.packages.get(pdfPage);
    if (pkg) return this.chapter(pkg.chapter);
    const printed = this.printedPageOf(pdfPage);
    return printed === null ? null : this.chapters.find((c) => printed >= c.printedStart && printed <= c.printedEnd) ?? null;
  }

  /** True when every page has its notes. */
  get complete(): boolean {
    return this.packages.size >= this.pageCount;
  }

  /** The highest page number printed in the book. */
  get lastPrintedPage(): number | null {
    let last: number | null = null;
    for (const p of this.packages.values()) {
      const pp = p.printedPage;
      if (pp !== null && (last === null || pp > last)) last = pp;
    }
    return last;
  }

  /** PDF page for a printed page number. Where a page has no printed number, falls back to the
   *  offset of the nearest page that has one. */
  pdfPageForPrinted(printed: number): number {
    let bestPdf: number | null = null;
    let bestDistance = Infinity;
    for (const p of this.packages.values()) {
      const pp = p.printedPage;
      if (pp === null) continue;
      if (pp === printed) return p.pdfPage;
      const d = Math.abs(pp - printed);
      if (d < bestDistance) {
        bestDistance = d;
        bestPdf = p.pdfPage + (printed - pp);
      }
    }
    const offset = this.json.printed_offset;
    const estimate = bestPdf ?? (typeof offset === "number" ? printed + offset : printed);
    return Math.min(this.pageCount, Math.max(1, estimate));
  }
}
