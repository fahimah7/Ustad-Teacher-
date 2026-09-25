import { faNum } from "./fa";
import type { Chapter, TextBook } from "./book";

export type OutlineSection = { title: string; pdfPage: number; printedPage: number | null };
export type OutlineChapter = { chapter: Chapter; pdfPage: number; sections: OutlineSection[] };

export const TEACHING_KINDS = new Set(["content", "exercises", "review"]);

/** The book's chapters and sections in reading order, built from the page packages. */
export function buildOutline(book: TextBook): OutlineChapter[] {
  const chapters: OutlineChapter[] = [];
  for (let page = 1; page <= book.pageCount; page++) {
    const pkg = book.pkg(page);
    const chapter = book.chapterOfPage(page);
    if (!chapter) continue;
    if (!chapters.length || chapters[chapters.length - 1].chapter.number !== chapter.number) {
      chapters.push({ chapter, pdfPage: page, sections: [] });
    }
    const title = pkg?.sectionFa?.trim();
    if (!pkg || !title || !TEACHING_KINDS.has(pkg.pageKind)) continue;
    const sections = chapters[chapters.length - 1].sections;
    if (sections.length && sections[sections.length - 1].title === title) continue;
    sections.push({ title, pdfPage: page, printedPage: pkg.printedPage });
  }
  return chapters;
}

/** "[فهرست کتاب]" block for the teacher's prompt. Deterministic, so it stays in the prompt cache. */
export function outlineText(book: TextBook, outline: OutlineChapter[]): string {
  const lines = [`[فهرست کتاب: ${book.titleFa}]`];
  for (const c of outline) {
    const ch = c.chapter;
    lines.push(`فصل ${faNum(ch.number)}: ${ch.titleFa} (صفحات ${faNum(ch.printedStart)} تا ${faNum(ch.printedEnd)})`);
    for (const s of c.sections) {
      lines.push(s.printedPage === null ? `- ${s.title}` : `- ${s.title} (صفحهٔ ${faNum(s.printedPage)})`);
    }
  }
  return lines.join("\n");
}

/** "خواص لیمت (Properties of limit)" → "خواص لیمت"; parentheses holding a formula stay. */
export const stripLatin = (s: string) => s.replace(/\s*\((?=[^)]*[A-Za-z]{2})[^)$\\]*\)/g, "").trim();
