import type { Multi } from "../lib/i18n";
import type { SubjectKey } from "./subjects";
import type { TextBook } from "../tutor/book";
import type { GlossaryTerm } from "../tutor/teacherPrompt";

/** The shelf, built at start from the books on this device (see library.ts). A book is the real
 *  textbook: page images plus the notes the teacher reads for each page. Chapters are units;
 *  the book's sections are lessons, each a run of pages. */

export type Lesson = {
  id: string;                 // `${bookId}-${unit}.${n}`
  bookId: string;
  grade: number;
  subject: SubjectKey;
  lang: "fa";
  unit: { n: number; title: Multi };
  lesson: { n: number; title: Multi; minutes: number };
  /** Printed page numbers (what the student sees in the footer) and PDF pages of the run. */
  source: { book: string; pages: number[] };
  pdf: { start: number; end: number };
  /** Notes are made from the textbook by AI; no teacher has reviewed them yet. */
  reviewed: boolean;
};

export type Unit = { n: number; title: Multi; pdfPage: number; lessons: Lesson[] };

export type Book = {
  id: string;
  grade: number;
  subject: SubjectKey;
  sizeMB: number;
  installed: boolean;
  version: string;
  units: Unit[];
  title?: Multi;
  pageCount?: number;
  /** The textbook itself, for installed books. */
  text?: TextBook;
  /** The book's own terms (glossary.json), for the teacher. */
  glossary?: GlossaryTerm[];
};

export type Practice = {
  q: Multi;
  options: Multi[];
  answer: number;
  why: Multi;                // one line after "Afarin!"
  idea: Multi;               // one idea to think with after "Almost."
  pdfPage: number;
};

export const isFull = (l: Lesson | undefined): l is Lesson => !!l;
