import { normalize, SUBJECT_WORDS, tokens } from "./normalize";
import { installedBooks, lessonForPage } from "../content/library";
import type { Book, Lesson } from "../content/schema";
import type { SubjectKey } from "../content/subjects";
import { BookSearch } from "../tutor/bookSearch";

/** One box does both jobs: "grade 12 math page 13" jumps straight to that page of the book; a
 *  question returns the best pages across the books on this device (the same offline BM25
 *  index the teacher uses), with a snippet from the page notes. */

export type PageHit = { kind: "page"; lesson: Lesson; book: Book; pdfPage: number; printed: number };
export type LessonHit = { kind: "lesson"; lesson: Lesson; book: Book; pdfPage: number; printed: number | null; snippet: string; term: string };
export type SearchResult = { page?: PageHit; lessons: LessonHit[]; term: string };

const indexes = new Map<string, BookSearch>();
export const forgetIndexes = () => indexes.clear();
function indexOf(book: Book): BookSearch {
  let i = indexes.get(book.id);
  if (!i) { i = new BookSearch(book.text!); indexes.set(book.id, i); }
  return i;
}

/** Parse "grade 12 math page 13" / "ریاضی صنف ۱۲ صفحه ۱۳" / "g12 p13". */
export function parsePageQuery(q: string): { grade?: number; subject?: SubjectKey; page?: number } {
  const s = normalize(q);
  const grade = s.match(/(?:grade|class|g|صنف|درجه)\s*(\d{1,2})/)?.[1];
  const page = s.match(/(?:page|pg|p|صفحه|ص)\s*(\d{1,3})/)?.[1];
  let subject: SubjectKey | undefined;
  for (const w of s.split(" ")) if (SUBJECT_WORDS[w]) subject = SUBJECT_WORDS[w] as SubjectKey;
  return { grade: grade ? +grade : undefined, subject, page: page ? +page : undefined };
}

export function search(q: string, preferGrade?: number): SearchResult {
  const books = installedBooks().filter((b) => b.text);
  const parsed = parsePageQuery(q);
  let page: PageHit | undefined;

  if (parsed.page) {
    const fits = books.filter((b) => (!parsed.grade || b.grade === parsed.grade) && (!parsed.subject || b.subject === parsed.subject));
    const book = fits.find((b) => b.grade === preferGrade) ?? fits[0];
    if (book) {
      const pdf = book.text!.pdfPageForPrinted(parsed.page);
      const lesson = lessonForPage(book, pdf);
      if (lesson) page = { kind: "page", lesson, book, pdfPage: pdf, printed: parsed.page };
    }
  }

  const words = tokens(q).filter((w) => !/^\d+$/.test(w) && !SUBJECT_WORDS[w] && !/^(grade|page|صنف|صفحه|class|p|g)$/.test(w));
  const term = words.slice().sort((a, b) => b.length - a.length)[0] ?? "";
  const lessons: LessonHit[] = [];
  if (words.length) {
    const hits = books.flatMap((book) => indexOf(book).search(q).slice(0, 8).map((h) => ({ book, ...h })));
    hits.sort((a, b) => b.score - a.score);
    const seen = new Set<string>();
    for (const h of hits) {
      const lesson = lessonForPage(h.book, h.pdfPage);
      if (!lesson || seen.has(`${lesson.id}`) || (page && h.pdfPage === page.pdfPage)) continue;
      seen.add(lesson.id);
      const pkg = h.book.text!.pkg(h.pdfPage);
      lessons.push({ kind: "lesson", lesson, book: h.book, pdfPage: h.pdfPage, printed: pkg?.printedPage ?? null, snippet: snippetFor(pkg?.summaryFa ?? "", words), term: pickShown(pkg?.summaryFa ?? "", words) });
      if (lessons.length >= 6) break;
    }
  }
  return { page, lessons, term };
}

/** The sentence of the notes that holds a search word (or the start of the notes). */
function snippetFor(text: string, words: string[]): string {
  const sentences = text.split(/(?<=[.!?؟])\s+/);
  const n = (s: string) => normalize(s);
  // Keep the formulas ($…$) so the snippet can show them drawn, and never cut one in half.
  const hit = sentences.find((s) => words.some((w) => n(s).includes(w))) ?? sentences[0] ?? "";
  if (hit.length <= 180) return hit;
  let cut = hit.slice(0, 177);
  if ((cut.match(/\$/g) ?? []).length % 2) cut = cut.slice(0, cut.lastIndexOf("$"));
  return cut.trimEnd() + "…";
}

/** The word as it is written in the snippet, so it can be highlighted. */
function pickShown(text: string, words: string[]): string {
  for (const w of words.slice().sort((a, b) => b.length - a.length)) {
    const m = text.split(/\s+/).find((t) => normalize(t).includes(w));
    if (m) return m.replace(/[.,،؛:«»()؟!]/g, "");
  }
  return "";
}
