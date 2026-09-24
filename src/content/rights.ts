import type { Multi } from "../lib/i18n";

/* Rights, freedom and a voice. Lives behind the second door only. */

export type RightsUnit = { n: number; title: Multi; about: Multi; done: number; total: number; bg: string };

export const RIGHTS_UNITS: RightsUnit[] = [
  { n: 1, title: { en: "My rights", fa: "حقوق من" }, about: { en: "Dignity, liberty, movement, expression, work, education", fa: "کرامت، آزادی، رفت‌وآمد، بیان، کار، تعلیم" }, done: 5, total: 7, bg: "#7443F0" },
  { n: 2, title: { en: "Afghan women were always strong", fa: "زنان افغان همیشه قوی بوده‌اند" }, about: { en: "Rabia Balkhi, Malalai, Queen Soraya, 1964", fa: "رابعه بلخی، ملالی، ملکه ثریا، ۱۳۴۳" }, done: 3, total: 5, bg: "#D81E57" },
  { n: 3, title: { en: "Faith and knowledge", fa: "ایمان و دانش" }, about: { en: "Khadija, Aisha, Fatima al-Fihri", fa: "خدیجه، عایشه، فاطمه فهری" }, done: 1, total: 4, bg: "#00827E" },
  { n: 4, title: { en: "My voice", fa: "صدای من" }, about: { en: "Write, speak, how change happens", fa: "نوشتن، گفتن، تغییر چگونه می‌آید" }, done: 0, total: 5, bg: "#FFB31A" },
  { n: 5, title: { en: "Staying safe", fa: "در امان ماندن" }, about: { en: "", fa: "" }, done: 0, total: 3, bg: "#1C1433" },
  { n: 6, title: { en: "Today: Courage", fa: "امروز: شجاعت" }, about: { en: "", fa: "" }, done: 0, total: 1, bg: "#7BC043" },
];

export const ARTICLE_26 = {
  id: "rights-a26",
  unit: 1, lesson: 7, minutes: 6,
  title: { en: "Everyone has the right to education", fa: "هر انسان حق دارد تعلیم ببیند" } as Multi,
  steps: [
    { en: "In 1948, countries around the world, including Afghanistan, agreed on a list of rights that belong to every human being. Article 26 says: everyone has the right to education.", fa: "در سال ۱۹۴۸، کشورهای جهان، از جمله افغانستان، روی فهرستی از حقوق که به هر انسان تعلق دارد توافق کردند. ماده ۲۶ می‌گوید: هر کس حق تعلیم دارد." },
    { en: "This right does not say \"every boy.\" It says everyone. It belongs to you, today, even if someone has taken it away.", fa: "این حق نمی‌گوید «هر پسر». می‌گوید هر کس. این حق امروز از آن توست، حتی اگر کسی آن را گرفته باشد." },
    { en: "A woman named Fatima al-Fihri founded one of the world's oldest universities in the year 859. Learning has always belonged to women too.", fa: "زنی به نام فاطمه فهری در سال ۸۵۹ یکی از قدیمی‌ترین دانشگاه‌های جهان را بنیاد گذاشت. آموختن همیشه از آنِ زنان هم بوده است." },
  ] as Multi[],
  reflect: { en: "What would you study if every school were open to you?", fa: "اگر همه مکتب‌ها به رویت باز بودند، چه می‌خواندی؟" } as Multi,
};

export const LETTER_PROMPT: Multi = { en: "What do you want to become? What would you tell the people who make laws?", fa: "می‌خواهی چه کاره شوی؟ به کسانی که قانون می‌سازند چه می‌گویی؟" };

export const LETTER_THEMES: Multi[] = [
  { en: "Education", fa: "تعلیم" }, { en: "Work", fa: "کار" }, { en: "Movement", fa: "رفت‌وآمد" },
  { en: "Health", fa: "صحت" }, { en: "Dreams", fa: "آرزوها" }, { en: "Daily life", fa: "زندگی روزمره" },
];

/** Invented demo letter from the Build Guide (sample 1). Never a real girl's words. */
export const SAMPLE_LETTER = "I am Mariam, from Herat. Before, I studied at Malalai High School. I want to become a doctor. When my school closed, I cried for a week. Now I study at night when the house is quiet. I learned fractions this month. Please don't forget us. We are still learning.";

/** Numbers shown on the "on their way" screen come with the last pack, not from a network. */
export const WALL_SNAPSHOT = { letters: 1285, bill: "H.R. 7669", asOf: "2026-09-01" };
