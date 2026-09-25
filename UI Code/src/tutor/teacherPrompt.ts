import teacherFaMath from "./prompts/teacher_fa.txt?raw";
import teacherEnMath from "./prompts/teacher_en.txt?raw";
import teacherFaSubject from "./prompts/teacher_fa_subject.txt?raw";
import teacherEnSubject from "./prompts/teacher_en_subject.txt?raw";
import teacherFaEng from "./prompts/teacher_fa_eng.txt?raw";
import teacherEnEng from "./prompts/teacher_en_eng.txt?raw";

/** The teacher's rules for a book, by subject and by the language she reads the app in. Math uses
 *  the evaluated prompts unchanged (parity with the Dart app); the sciences share one template
 *  filled with the book's own terms (glossary.json); English has its own. `{{book_title}}` and
 *  `{{student_name}}` are left for fillTeacherPrompt. */

export type GlossaryTerm = { book: string; avoid?: string[]; en?: string };

type SubjectRules = { fa: string; en: string; formulaFa: string; formulaEn: string; examplesEn: string };

const SCIENCE: Record<string, SubjectRules> = {
  phys: {
    fa: "فزیک", en: "physics",
    formulaFa: "فورمول‌ها و محاسبه‌ها را با LaTeX بین دو علامت $ بنویسید و هر فورمول کامل را در یک جفت $ بگذارید، مثلاً $F = m\\,a$ یا $v = 20\\,\\mathrm{m/s}$. واحد هر کمیت را همیشه بنویسید. کلمات دری را داخل $ ننویسید.",
    formulaEn: "Write formulas and calculations in LaTeX between $ signs, one complete formula per pair of $, e.g. $F = m\\,a$ or $v = 20\\,\\mathrm{m/s}$. Always give units. Never put words inside $...$.",
    examplesEn: "force (قوه), mass (کتله), acceleration (تعجیل)",
  },
  chem: {
    fa: "کیمیا", en: "chemistry",
    formulaFa: "فورمول‌های کیمیاوی و معادله‌ها را با LaTeX بین دو علامت $ بنویسید، مثلاً $\\mathrm{H_2O}$ یا $\\mathrm{2H_2 + O_2 \\rightarrow 2H_2O}$، و معادله‌ها را همیشه متوازن بنویسید. کلمات دری را داخل $ ننویسید.",
    formulaEn: "Write chemical formulas and equations in LaTeX between $ signs, e.g. $\\mathrm{H_2O}$ or $\\mathrm{2H_2 + O_2 \\rightarrow 2H_2O}$, and always balance equations. Never put words inside $...$.",
    examplesEn: "chemistry (کیمیا), molecule (مالیکول), atom (اتوم)",
  },
  bio: {
    fa: "بیولوژی", en: "biology",
    formulaFa: "نام علمی یا انگلیسی را اگر کمک می‌کند در قوس بنویسید. اگر فورمول یا معادله‌ای لازم شد، آن را با LaTeX بین دو علامت $ بنویسید، مثلاً $\\mathrm{CO_2}$. کلمات دری را داخل $ ننویسید.",
    formulaEn: "Give scientific names where they help. If a formula or equation is needed, write it in LaTeX between $ signs, e.g. $\\mathrm{CO_2}$. Never put words inside $...$.",
    examplesEn: "cell (حجره), tissue (نسج), biology (بیولوژی)",
  },
};

/** Words every book uses the Afghan way. */
const ALWAYS_FA = "شاگرد (نه دانش‌آموز)، صنف (نه کلاس)، معلومات (نه اطلاعات)، فورمول (نه فرمول)";

/** «کتله (نه جرم)، قوه (نه نیرو)، …» from the book's glossary. */
export function termsRuleFa(terms: GlossaryTerm[] | undefined, max = 18): string {
  const pairs = (terms ?? [])
    .filter((t) => t.book?.trim() && t.avoid?.some((a) => a.trim() && a.trim() !== t.book.trim()))
    .slice(0, max)
    .map((t) => `${t.book.trim()} (نه ${t.avoid!.map((a) => a.trim()).filter((a) => a && a !== t.book.trim()).join(" یا ")})`);
  return [...pairs, ALWAYS_FA].join("، ") + ".";
}

/** «force (قوه), mass (کتله), …» from the book's glossary, else the subject's defaults. */
export function termExamplesEn(terms: GlossaryTerm[] | undefined, fallback: string): string {
  const withEn = (terms ?? []).filter((t) => t.en?.trim() && t.book?.trim() && /[؀-ۿ]/.test(t.book));
  return withEn.length >= 2 ? withEn.slice(0, 3).map((t) => `${t.en!.trim()} (${t.book.trim()})`).join(", ") : fallback;
}

export function teacherTemplate(subject: string, lang: "fa" | "en", terms?: GlossaryTerm[]): string {
  if (subject === "eng") return lang === "en" ? teacherEnEng : teacherFaEng;
  const s = SCIENCE[subject];
  if (!s) return lang === "en" ? teacherEnMath : teacherFaMath;
  const fill = (t: string, map: Record<string, string>) => Object.entries(map).reduce((acc, [k, v]) => acc.split(`{{${k}}}`).join(v), t);
  return lang === "en"
    ? fill(teacherEnSubject, { subject_en: s.en, terms_examples: termExamplesEn(terms, s.examplesEn), formula_rule: s.formulaEn })
    : fill(teacherFaSubject, { subject_fa: s.fa, terms_rule: termsRuleFa(terms), formula_rule: s.formulaFa });
}
