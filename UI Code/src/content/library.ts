import type { Multi } from "../lib/i18n";
import type { Book, Lesson, Practice, Unit } from "./schema";
import { SUBJECTS, type SubjectKey } from "./subjects";
import { listBooks, loadBook, type BookData, type BookSummary } from "../native/bridge";
import { TextBook } from "../tutor/book";
import { buildOutline, stripLatin } from "../tutor/outline";
import { faNum } from "../tutor/fa";

/* The shelf on this device, read from disk at start (native side: src-tauri/src/content.rs).
   Every grade × subject slot exists; the ones without a book are "not on this device yet"
   and can arrive as a learning pack. */

export const GRADE_SUBJECTS: SubjectKey[] = ["math", "bio", "chem", "phys", "geo", "hist", "eng", "dari", "pashto"];

const SUBJECT_ALIASES: Record<string, SubjectKey> = {
  math: "math", mathematics: "math", bio: "bio", biology: "bio", chem: "chem", chemistry: "chem",
  phys: "phys", physics: "phys", geo: "geo", geography: "geo", hist: "hist", history: "hist",
  eng: "eng", english: "eng", dari: "dari", pashto: "pashto",
};

export const BOOKS: Book[] = [];
export const PRACTICE_SETS: PracticeSet[] = [];
const LESSONS = new Map<string, Lesson>();

export type PracticeSet = {
  id: string; bookId: string; subject: SubjectKey; grade: number; unit: number;
  title: Multi; chapter: Multi; lessonId: string; lessonLabel: Multi; questions: Practice[];
};

/** Reads the books on this device. Called once before the first render (main.tsx). */
export async function initLibrary(): Promise<void> {
  const summaries = await listBooks().catch(() => [] as BookSummary[]);
  const loaded = await Promise.all(
    summaries.map((s) => loadBook(s.id).then((d) => [s, d] as const).catch(() => null)),
  );
  BOOKS.length = 0;
  PRACTICE_SETS.length = 0;
  LESSONS.clear();
  const real = new Map<string, Book>();
  for (const entry of loaded) {
    if (!entry) continue;
    const [summary, data] = entry;
    const subject = SUBJECT_ALIASES[summary.subject.toLowerCase()];
    if (!subject || real.has(`${summary.grade}-${subject}`)) continue;
    real.set(`${summary.grade}-${subject}`, buildBook(summary, subject, data));
  }
  for (let g = 1; g <= 12; g++) {
    for (const s of GRADE_SUBJECTS) {
      BOOKS.push(real.get(`${g}-${s}`) ?? { id: `g${g}-${s}`, grade: g, subject: s, sizeMB: 0, installed: false, version: "", units: [] });
    }
  }
}


function buildBook(summary: BookSummary, subject: SubjectKey, data: BookData): Book {
  const text = new TextBook(data.book, data.packages);
  const titles = data.titlesEn ?? {};
  const outline = buildOutline(text);
  const id = summary.id;
  const units: Unit[] = outline.map((c, ci) => {
    const n = c.chapter.number;
    const unitTitle: Multi = { en: titles.chapters?.[String(n)] ?? c.chapter.titleFa, fa: c.chapter.titleFa };
    const nextChapterStart = outline[ci + 1]?.pdfPage ?? text.pageCount + 1;
    const sections = c.sections.length ? c.sections : [{ title: c.chapter.titleFa, pdfPage: c.pdfPage, printedPage: text.printedPageOf(c.pdfPage) }];
    const lessons: Lesson[] = sections.map((s, si) => {
      const start = si === 0 ? c.pdfPage : s.pdfPage;
      const end = (sections[si + 1]?.pdfPage ?? nextChapterStart) - 1;
      const printedStart = firstPrinted(text, start, end);
      const printedEnd = lastPrinted(text, start, end);
      const lesson: Lesson = {
        id: `${id}-${n}.${si + 1}`, bookId: id, grade: summary.grade, subject, lang: "fa",
        unit: { n, title: unitTitle },
        lesson: { n: si + 1, title: { en: titles.sections?.[s.title] ?? stripLatin(s.title), fa: stripLatin(s.title) }, minutes: Math.max(2, (end - start + 1) * 3) },
        source: { book: id, pages: [printedStart ?? start, printedEnd ?? end] },
        pdf: { start, end: Math.max(start, end) },
        reviewed: false,
      };
      LESSONS.set(lesson.id, lesson);
      return lesson;
    });
    return { n, title: unitTitle, pdfPage: c.pdfPage, lessons };
  });

  const book: Book = {
    id, grade: summary.grade, subject, installed: true, version: "",
    sizeMB: Math.max(1, Math.round(summary.sizeBytes / 1048576)),
    units, pageCount: text.pageCount, text,
    glossary: data.glossary?.terms ?? [],
    title: { en: `Grade ${summary.grade} ${SUBJECTS[subject].name.en}`, fa: summary.titleFa },
  };

  for (const p of data.practice) {
    const unit = units.find((u) => u.n === p.chapter);
    if (!unit || !Array.isArray(p.questions) || !p.questions.length) continue;
    const questions: Practice[] = p.questions.map((q) => ({ q: q.q, options: q.options, answer: q.answer, why: q.why, idea: q.idea, pdfPage: q.pdf_page }));
    const s = SUBJECTS[subject];
    PRACTICE_SETS.push({
      id: `${id}-ch${p.chapter}`, bookId: id, subject, grade: summary.grade, unit: p.chapter,
      title: p.title ?? unit.title, chapter: unit.title,
      lessonId: lessonForPage(book, questions[0].pdfPage)?.id ?? unit.lessons[0].id,
      lessonLabel: { en: `${s.short.en} ${summary.grade} · Chapter ${p.chapter}`, fa: `${s.short.fa} ${faNum(summary.grade)} · فصل ${faNum(p.chapter)}` },
      questions,
    });
  }
  return book;
}

function firstPrinted(t: TextBook, a: number, b: number) {
  for (let p = a; p <= b; p++) { const x = t.printedPageOf(p); if (x !== null) return x; }
  return null;
}
function lastPrinted(t: TextBook, a: number, b: number) {
  for (let p = b; p >= a; p--) { const x = t.printedPageOf(p); if (x !== null) return x; }
  return null;
}

export type GradeState = "installed" | "partial" | "missing";
export function gradeState(g: number): GradeState {
  const books = booksOf(g);
  const n = books.filter((b) => b.installed).length;
  return n === 0 ? "missing" : n === books.length ? "installed" : "partial";
}
export const booksOf = (g: number) => BOOKS.filter((b) => b.grade === g);
export const installedBooks = () => BOOKS.filter((b) => b.installed);
export const bookById = (id: string) => BOOKS.find((b) => b.id === id);
export const installedGrades = () => [...new Set(installedBooks().map((b) => b.grade))].sort((a, b) => a - b);

export function allLessons(): Lesson[] {
  return [...LESSONS.values()];
}
export function lessonById(id: string): Lesson | undefined {
  return LESSONS.get(id);
}
export function bookOfLesson(l: Pick<Lesson, "bookId">): Book | undefined {
  return bookById(l.bookId);
}

/** The lesson (section) a PDF page belongs to. */
export function lessonForPage(book: Book, pdfPage: number): Lesson | undefined {
  const all = book.units.flatMap((u) => u.lessons);
  return all.find((l) => pdfPage >= l.pdf.start && pdfPage <= l.pdf.end) ?? (pdfPage < (all[0]?.pdf.start ?? 0) ? all[0] : all[all.length - 1]);
}

export function lessonNeighbours(id: string) {
  const l = lessonById(id);
  if (!l) return { index: 0, total: 0 };
  const unit = bookOfLesson(l)?.units.find((u) => u.n === l.unit.n);
  const list = unit?.lessons ?? [];
  const index = list.findIndex((x) => x.id === id);
  const all = bookOfLesson(l)?.units.flatMap((u) => u.lessons) ?? [];
  const k = all.findIndex((x) => x.id === id);
  return { index, total: list.length, prev: all[k - 1], next: all[k + 1] };
}

export const setById = (id: string) => PRACTICE_SETS.find((s) => s.id === id);
export const setsOf = (bookId: string) => PRACTICE_SETS.filter((s) => s.bookId === bookId);
/** The practice set for the chapter a page is in. */
export function setForPage(bookId: string, pdfPage: number): PracticeSet | undefined {
  const book = bookById(bookId);
  const chapter = book?.text?.pkg(pdfPage)?.chapter ?? (book ? lessonForPage(book, pdfPage)?.unit.n : undefined);
  return PRACTICE_SETS.find((s) => s.bookId === bookId && s.unit === chapter) ?? setsOf(bookId)[0];
}
export const chaptersIn = (bookId: string) => bookById(bookId)?.units.length ?? 0;
