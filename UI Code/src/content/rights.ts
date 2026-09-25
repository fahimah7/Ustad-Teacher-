import type { Multi } from "../lib/i18n";

/* "My rights, my voice": short lessons on her rights, her history, standing up for herself and
   learning together safely. Shown openly; her letters stay in the locked vault. The lessons live in
   ./rights/unit-<n>.json (format: pipeline/RIGHTS_CONTENT.md). */

export type RightsCheck = { q: Multi; options: Multi[]; answer: number; why: Multi };
export type RightsLesson = {
  id: string; title: Multi; minutes: number; steps: Multi[]; reflect: Multi; check: RightsCheck[];
  practice: string | null; sources?: string[];
};
export type RightsUnit = { unit: number; title: Multi; about: Multi; lessons: RightsLesson[] };

const files = import.meta.glob<RightsUnit>("./rights/unit-*.json", { eager: true, import: "default" });

export const RIGHTS: RightsUnit[] = Object.values(files)
  .filter((u) => u && Array.isArray(u.lessons))
  .sort((a, b) => a.unit - b.unit);

export const UNIT_COLORS = ["#7443F0", "#D81E57", "#00827E", "#C98300", "#2F7CF6", "#1C1433"];
export const unitColor = (n: number) => UNIT_COLORS[(n - 1) % UNIT_COLORS.length];

export function rightsLesson(id: string): { unit: RightsUnit; lesson: RightsLesson; index: number } | null {
  for (const unit of RIGHTS) {
    const index = unit.lessons.findIndex((l) => l.id === id);
    if (index >= 0) return { unit, lesson: unit.lessons[index], index };
  }
  return null;
}

/** The lesson after this one, across units. */
export function nextRightsLesson(id: string): RightsLesson | null {
  const all = RIGHTS.flatMap((u) => u.lessons);
  const i = all.findIndex((l) => l.id === id);
  return i >= 0 ? all[i + 1] ?? null : null;
}

export const LETTER_PROMPT: Multi = { en: "What do you want to become? What would you tell the people who make laws?", fa: "می‌خواهید چه کاره شوید؟ به کسانی که قانون می‌سازند چه می‌گویید؟" };

export const LETTER_THEMES: Multi[] = [
  { en: "Education", fa: "تعلیم" }, { en: "Work", fa: "کار" }, { en: "Movement", fa: "رفت‌وآمد" },
  { en: "Health", fa: "صحت" }, { en: "Dreams", fa: "آرزوها" }, { en: "Daily life", fa: "زندگی روزمره" },
];

/** Invented demo letter from the Build Guide (sample 1). Never a real girl's words. */
export const SAMPLE_LETTER = "I am Mariam, from Herat. Before, I studied at Malalai High School. I want to become a doctor. When my school closed, I cried for a week. Now I study at night when the house is quiet. I learned fractions this month. Please don't forget us. We are still learning.";
