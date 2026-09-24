import type { Practice } from "./schema";
import { CHEM12_2_3 } from "./lessons";
import type { SubjectKey } from "./subjects";
import type { Multi } from "../lib/i18n";

export type PracticeSet = {
  id: string; subject: SubjectKey; grade: number; unit: number;
  title: Multi; chapter: Multi; lessonId: string; lessonLabel: Multi; questions: Practice[];
};

const FRACTIONS: Practice[] = [
  { q: { en: "What is ½ + ¼?", fa: "½ + ¼ چند می‌شود؟" }, options: [{ en: "2⁄6", fa: "۲⁄۶" }, { en: "¾", fa: "¾" }, { en: "2⁄4", fa: "۲⁄۴" }, { en: "1⁄8", fa: "۱⁄۸" }], answer: 1, why: { en: "Halves become quarters: 2⁄4 + 1⁄4 = 3⁄4.", fa: "نصف‌ها چهارم می‌شوند: ۲⁄۴ + ۱⁄۴ = ۳⁄۴." }, idea: { en: "Make the pieces the same size first. How many quarters are in one half?", fa: "اول تکه‌ها را هم‌اندازه کن. در یک نصف چند چهارم است؟" } },
  { q: { en: "Which fraction is the same as 2⁄3?", fa: "کدام کسر با ۲⁄۳ برابر است؟" }, options: [{ en: "3⁄2", fa: "۳⁄۲" }, { en: "4⁄5", fa: "۴⁄۵" }, { en: "4⁄6", fa: "۴⁄۶" }, { en: "2⁄6", fa: "۲⁄۶" }], answer: 2, why: { en: "Double the top and the bottom: 2⁄3 = 4⁄6.", fa: "صورت و مخرج را دو برابر کن: ۲⁄۳ = ۴⁄۶." }, idea: { en: "Multiply the top and the bottom by the same number. What do you get with 2?", fa: "صورت و مخرج را در یک عدد ضرب کن. با ۲ چه می‌شود؟" } },
  { q: { en: "3 ÷ ½ = ?", fa: "۳ ÷ ½ = ؟" }, options: [{ en: "1½", fa: "۱½" }, { en: "3½", fa: "۳½" }, { en: "6", fa: "۶" }, { en: "9", fa: "۹" }], answer: 2, why: { en: "Six halves fit into 3, so 3 ÷ ½ = 6.", fa: "در ۳، شش نصف جا می‌شود، پس ۳ ÷ ½ = ۶." }, idea: { en: "Ask: how many halves fit into 3 wholes?", fa: "بپرس: در ۳ واحد چند نصف جا می‌شود؟" } },
  { q: { en: "Simplify the ratio 6 : 9.", fa: "نسبت ۶ : ۹ را ساده کن." }, options: [{ en: "2 : 3", fa: "۲ : ۳" }, { en: "3 : 2", fa: "۳ : ۲" }, { en: "1 : 3", fa: "۱ : ۳" }, { en: "6 : 3", fa: "۶ : ۳" }], answer: 0, why: { en: "Both divide by 3: 6 : 9 = 2 : 3.", fa: "هر دو بر ۳ تقسیم می‌شوند: ۶ : ۹ = ۲ : ۳." }, idea: { en: "Find a number that divides both 6 and 9.", fa: "عددی پیدا کن که هم ۶ و هم ۹ بر آن تقسیم شوند." } },
  { q: { en: "⅓ + ¼ = ?", fa: "⅓ + ¼ = ؟" }, options: [{ en: "2⁄7", fa: "۲⁄۷" }, { en: "7⁄12", fa: "۷⁄۱۲" }, { en: "1⁄12", fa: "۱⁄۱۲" }, { en: "5⁄12", fa: "۵⁄۱۲" }], answer: 1, why: { en: "4⁄12 + 3⁄12 = 7⁄12.", fa: "۴⁄۱۲ + ۳⁄۱۲ = ۷⁄۱۲." }, idea: { en: "Cut both into twelfths. How many twelfths is one third?", fa: "هر دو را به دوازدهم ببُر. یک‌سوم چند دوازدهم است؟" } },
];

export const PRACTICE_SETS: PracticeSet[] = [
  { id: "chem12-2.3", subject: "chem", grade: 12, unit: 2, title: { en: "Isotopes", fa: "ایزوتوپ‌ها" }, chapter: { en: "Atomic structure", fa: "ساختمان اتم" }, lessonId: "chem12-2.3", lessonLabel: { en: "Chemistry 12 · Lesson 2.3", fa: "کیمیا ۱۲ · درس ۲.۳" }, questions: CHEM12_2_3.practice! },
  { id: "math8-u3", subject: "math", grade: 8, unit: 3, title: { en: "Fractions", fa: "کسرها" }, chapter: { en: "Fractions and ratios", fa: "کسرها و نسبت‌ها" }, lessonId: "math8-3.1", lessonLabel: { en: "Math 8 · Chapter 3", fa: "ریاضی ۸ · فصل ۳" }, questions: FRACTIONS },
];

export const setById = (id: string) => PRACTICE_SETS.find((s) => s.id === id);
/** Chapters per subject book, for the row of windows on "Chapter complete". */
export const CHAPTERS_IN: Record<string, number> = { "chem12": 8, "math8": 9 };
