import type { Multi } from "../lib/i18n";
import type { Book, Lesson, LessonStub } from "./schema";
import type { SubjectKey } from "./subjects";
import { CHEM12_2_3, ELSEWHERE, FULL_LESSONS } from "./lessons";

/* The shelf on this phone. Grades 1–8 are installed, 9–11 are not,
   grade 12 has Chemistry only (as on screen 13). */

const GRADE_SUBJECTS: SubjectKey[] = ["math", "bio", "chem", "phys", "geo", "hist", "eng", "dari", "pashto"];

const UNIT_TITLES: Partial<Record<SubjectKey, Multi[]>> = {
  math: [
    { en: "Whole numbers", fa: "اعداد طبیعی" }, { en: "Integers", fa: "اعداد صحیح" }, { en: "Fractions and ratios", fa: "کسرها و نسبت‌ها" },
    { en: "Decimals and percent", fa: "اعشار و فیصدی" }, { en: "Equations", fa: "معادلات" }, { en: "Geometry", fa: "هندسه" },
    { en: "Area and volume", fa: "مساحت و حجم" }, { en: "Data", fa: "معلومات و ارقام" }, { en: "Probability", fa: "احتمالات" },
  ],
  bio: [
    { en: "Cells", fa: "حجره‌ها" }, { en: "How plants live", fa: "زندگی گیاهان" }, { en: "Food and health", fa: "غذا و صحت" },
    { en: "The human body", fa: "بدن انسان" }, { en: "Breathing", fa: "تنفس" }, { en: "Blood", fa: "خون" }, { en: "Ecosystems", fa: "سیستم‌های زیستی" }, { en: "Heredity", fa: "وراثت" },
  ],
  chem: [
    { en: "Matter", fa: "ماده" }, { en: "Atomic structure", fa: "ساختمان اتم" }, { en: "The periodic table", fa: "جدول تناوبی" },
    { en: "Bonds", fa: "پیوندها" }, { en: "Reactions", fa: "تعاملات" }, { en: "Acids and bases", fa: "تیزاب‌ها و القلی‌ها" }, { en: "Carbon", fa: "کاربن" },
  ],
  phys: [
    { en: "Measurement", fa: "اندازه‌گیری" }, { en: "Motion", fa: "حرکت" }, { en: "Forces", fa: "قوه‌ها" }, { en: "Energy", fa: "انرژی" },
    { en: "Heat", fa: "حرارت" }, { en: "Sound", fa: "صوت" }, { en: "Light", fa: "نور" }, { en: "Electricity", fa: "برق" },
  ],
};

const SIZE: Record<number, number> = { 1: 180, 2: 210, 3: 240, 4: 270, 5: 300, 6: 330, 7: 410, 8: 420, 9: 430, 10: 440, 11: 450, 12: 460 };

function stubLesson(grade: number, subject: SubjectKey, unit: number, n: number, unitTitle: Multi): LessonStub {
  const page = 6 + unit * 12 + n * 3;
  return {
    id: `${subject}${grade}-${unit}.${n}`, grade, subject, stub: true,
    unit: { n: unit, title: unitTitle },
    lesson: { n, title: { en: `Lesson ${unit}.${n}`, fa: `درس ${unit}.${n}` }, minutes: 8 },
    source: { book: `g${grade}_${subject}_fa`, pages: [page, page + 1] },
  };
}

function buildBook(grade: number, subject: SubjectKey, installed: boolean, sizeMB: number): Book {
  const titles = UNIT_TITLES[subject] ?? Array.from({ length: 7 }, (_, i) => ({ en: `Unit ${i + 1}`, fa: `فصل ${i + 1}` }));
  const units = titles.map((title, i) => {
    const n = i + 1;
    const count = subject === "chem" && grade === 12 && n === 2 ? 8 : 4;
    const lessons: (Lesson | LessonStub)[] = Array.from({ length: count }, (_, j) => {
      const full = FULL_LESSONS.find((l) => l.grade === grade && l.subject === subject && l.unit.n === n && l.lesson.n === j + 1);
      return full ?? stubLesson(grade, subject, n, j + 1, title);
    });
    return { n, title, lessons };
  });
  return { id: `g${grade}-${subject}`, grade, subject, sizeMB, installed, version: "2026.2", units };
}

export const BOOKS: Book[] = [];
for (let g = 1; g <= 12; g++) {
  if (g <= 8) {
    const per = Math.floor(SIZE[g] / GRADE_SUBJECTS.length);
    const extra = SIZE[g] - per * GRADE_SUBJECTS.length;
    GRADE_SUBJECTS.forEach((s, i) => BOOKS.push(buildBook(g, s, true, per + (i < extra ? 1 : 0))));
  } else if (g === 12) {
    BOOKS.push(buildBook(12, "chem", true, 46));
    for (const s of GRADE_SUBJECTS.filter((x) => x !== "chem")) BOOKS.push(buildBook(12, s, false, 46));
  } else {
    for (const s of GRADE_SUBJECTS) BOOKS.push(buildBook(g, s, false, Math.round(SIZE[g] / GRADE_SUBJECTS.length)));
  }
}

export type GradeState = "installed" | "partial" | "missing";
export function gradeState(g: number): GradeState {
  const books = BOOKS.filter((b) => b.grade === g);
  const n = books.filter((b) => b.installed).length;
  return n === 0 ? "missing" : n === books.length ? "installed" : "partial";
}
export const booksOf = (g: number) => BOOKS.filter((b) => b.grade === g);
export const bookById = (id: string) => BOOKS.find((b) => b.id === id);

export function allLessons(): (Lesson | LessonStub)[] {
  return BOOKS.flatMap((b) => b.units.flatMap((u) => u.lessons));
}
export function lessonById(id: string): Lesson | LessonStub | undefined {
  return allLessons().find((l) => l.id === id);
}
export function bookOfLesson(l: Pick<Lesson, "grade" | "subject">): Book | undefined {
  return BOOKS.find((b) => b.grade === l.grade && b.subject === l.subject);
}
export function lessonNeighbours(id: string) {
  const l = lessonById(id);
  if (!l) return { index: 0, total: 0 };
  const book = bookOfLesson(l);
  const unit = book?.units.find((u) => u.n === l.unit.n);
  const list = unit?.lessons ?? [];
  const index = list.findIndex((x) => x.id === id);
  return { index, total: list.length, prev: list[index - 1], next: list[index + 1] };
}

export { CHEM12_2_3, ELSEWHERE };

/** The grade she is placed in. Onboarding (not designed yet) will set this. */
export const PLACED_GRADE = 8;

/* ── packs: moved phone to phone or by memory card ─────────────── */

export type PackFile = { kind: "ustad-pack"; version: string; grade: number; lang: string; books: { subject: SubjectKey; sizeMB: number; lessons: Lesson[] }[] };

export function packFor(grade: number): PackFile {
  return {
    kind: "ustad-pack", version: "2026.2", grade, lang: "fa",
    books: booksOf(grade).filter((b) => b.installed).map((b) => ({
      subject: b.subject, sizeMB: b.sizeMB,
      lessons: b.units.flatMap((u) => u.lessons).filter((l): l is Lesson => !("stub" in l)),
    })),
  };
}

/** Installs a received pack into the shelf. Returns the number of books added. */
export function installPack(p: unknown): number {
  const pack = p as PackFile;
  if (!pack || pack.kind !== "ustad-pack" || typeof pack.grade !== "number" || !Array.isArray(pack.books)) throw new Error("not a pack");
  let n = 0;
  for (const pb of pack.books) {
    const book = BOOKS.find((b) => b.grade === pack.grade && b.subject === pb.subject);
    if (!book) continue;
    if (!book.installed) n++;
    book.installed = true;
    book.version = pack.version;
    for (const l of pb.lessons ?? []) {
      if (!l || typeof l.id !== "string" || !Array.isArray(l.blocks)) continue;
      const unit = book.units.find((u) => u.n === l.unit?.n);
      if (!unit) continue;
      const i = unit.lessons.findIndex((x) => x.lesson.n === l.lesson?.n);
      if (i >= 0) unit.lessons[i] = l; else unit.lessons.push(l);
    }
  }
  return n;
}
