import { faNum } from "./fa";
import type { Formula, PagePackage, TextBook } from "./book";

/** Builds the "[معلومات صفحه]" block the teacher sees for a page. Deterministic per page, so
 *  llama.cpp can reuse its prompt cache. Port of app/lib/tutor/page_context.dart. */
export function buildPageContext(book: TextBook, pkg: PagePackage, around: { prev?: PagePackage | null; next?: PagePackage | null } = {}): string {
  const lines: string[] = ["[معلومات صفحه]", `کتاب: ${book.titleFa}`, ...heading(book, pkg)];
  lines.push(`خلاصه: ${pkg.summaryFa}`);

  if (pkg.keyPoints.length) {
    lines.push("نکات مهم:");
    lines.push(...pkg.keyPoints.map((k) => `- ${k}`));
  }
  if (pkg.formulas.length) {
    lines.push("فورمول‌ها:");
    lines.push(...pkg.formulas.map(formula));
  }
  if (pkg.figures.length) {
    lines.push("شکل‌ها:");
    pkg.figures.forEach((f, i) => lines.push(`- شکل ${faNum(i + 1)}: ${f.description_fa ?? ""}`));
  }
  if (pkg.workedExamples.length) {
    lines.push("مثال‌های این صفحه (با حل):");
    pkg.workedExamples.forEach((e, i) => {
      lines.push(`مثال ${faNum(i + 1)} — ${e.label_fa ?? ""}: ${e.problem_fa ?? ""}`);
      lines.push(...numbered(e.steps_fa ?? []));
      if (e.answer != null) lines.push(`  جواب: ${e.answer}`);
    });
  }
  if (pkg.exercises.length) {
    lines.push("تمرین‌های این صفحه (با حل):");
    pkg.exercises.forEach((e, i) => {
      const label = `${e.label_fa ?? ""}`;
      // Number exercises the way students refer to them: «تمرین ۲ (سوال دوم)».
      const name = /^[0-9۰-۹]/.test(label) ? `تمرین ${label}` : label;
      lines.push(`${name} (سوال ${ordinal(i + 1)}): ${e.problem_fa ?? ""}`);
      lines.push(...numbered(e.solution_steps_fa ?? []));
      if (e.answer != null) lines.push(`  جواب: ${e.answer}`);
    });
  }
  if (around.prev && pkg.continuesFromPrevious) lines.push(`صفحهٔ قبل (خلاصه): ${around.prev.summaryFa}`);
  if (around.next && pkg.continuesOnNext) lines.push(`صفحهٔ بعد (خلاصه): ${around.next.summaryFa}`);
  return lines.join("\n");
}

/** A short "[صفحهٔ دیگری از کتاب]" block (where a page is, what it teaches, its main formulas)
 *  for pages other than the one the student is reading. */
export function pageDigest(book: TextBook, pkg: PagePackage): string {
  const lines = ["[صفحهٔ دیگری از کتاب]", ...heading(book, pkg), `خلاصه: ${pkg.summaryFa}`];
  lines.push(...pkg.keyPoints.slice(0, 4).map((k) => `- ${k}`));
  lines.push(...pkg.formulas.slice(0, 3).map(formula));
  return lines.join("\n");
}

function heading(book: TextBook, pkg: PagePackage): string[] {
  const ch = book.chapter(pkg.chapter);
  const out: string[] = [];
  if (ch) out.push(`فصل ${faNum(ch.number)}: ${ch.titleFa}`);
  if (pkg.sectionFa !== null) out.push(`بخش: ${pkg.sectionFa}`);
  if (pkg.printedPage !== null) out.push(`صفحهٔ ${faNum(pkg.printedPage)} کتاب`);
  return out;
}

const formula = (f: Formula) => `- $${f.latex}$ — ${f.meaning_fa ?? ""}`;

const ORDINALS = ["اول", "دوم", "سوم", "چهارم", "پنجم", "ششم", "هفتم", "هشتم", "نهم", "دهم"];
export const ordinal = (n: number) => (n <= ORDINALS.length ? ORDINALS[n - 1] : faNum(n));

const numbered = (steps: string[]) => steps.map((s, i) => `  ${faNum(i + 1)}) ${s}`);
