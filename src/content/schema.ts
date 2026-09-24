import type { Multi } from "../lib/i18n";
import type { SubjectKey } from "./subjects";

/** Curriculum schema from the handoff README. Textbooks are parsed once,
 *  offline, into this shape; the learner never sees a PDF. */

export type Source = { page: number };

export type Block =
  | { type: "keyIdea"; text: Multi; source?: Source }
  | { type: "explanation"; text: Multi; source?: Source }
  | { type: "figure"; spec: FigureSpec; caption?: Multi; source?: Source }
  | { type: "keyTerms"; terms: Multi[] }
  | { type: "workedExample"; text: Multi; source?: Source }
  | { type: "check"; question: Multi; options: string[]; answer: number };

export type FigureSpec =
  | { kind: "atoms"; items: { label: string; nucleus: number }[] }
  | { kind: "fractionBars"; parts: { n: number; d: number }[] }
  | { kind: "halfLife"; steps: number };

/** Teacher-reviewed explanations shipped with the pack. Ustad answers from
 *  these and from the blocks; it never invents a source. */
export type Explain = {
  q: string[];               // ways a learner might ask (any language)
  answer: Multi;             // two sentences, the explanation
  example?: Multi;           // one daily-life example
  simpler?: Multi;           // a simpler retelling
  check?: { question: Multi; options: Multi[]; answer: number };
  page: number;
};

export type Practice = {
  q: Multi;
  options: Multi[];
  answer: number;
  why: Multi;                // one line after "Afarin!"
  idea: Multi;               // one idea to think with after "Almost."
};

export type Lesson = {
  id: string;
  grade: number;
  subject: SubjectKey;
  lang: "fa" | "ps" | "en";
  unit: { n: number; title: Multi };
  lesson: { n: number; title: Multi; minutes: number };
  source: { book: string; pages: number[] };
  reviewed: boolean;
  blocks: Block[];
  explain?: Explain[];
  practice?: Practice[];
};

export type LessonStub = Pick<Lesson, "id" | "grade" | "subject" | "unit" | "lesson" | "source"> & { stub: true };

export type Book = {
  id: string;
  grade: number;
  subject: SubjectKey;
  sizeMB: number;
  installed: boolean;
  version: string;
  units: { n: number; title: Multi; lessons: (Lesson | LessonStub)[] }[];
};

export const isFull = (l: Lesson | LessonStub): l is Lesson => !("stub" in l);
