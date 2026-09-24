import { createContext, useContext } from "react";

export type Lang = "en" | "fa" | "ps";
export const RTL_LANGS: Lang[] = ["fa", "ps"];
export const isRtl = (l: Lang) => RTL_LANGS.includes(l);

/** A string that exists in every script the app speaks. Dari is a draft
 *  throughout and is marked for a native-speaker review before release. */
export type Multi = { en: string; fa: string; ps?: string };

export const LANG_LABEL: Record<Lang, string> = { en: "English", fa: "دری", ps: "پښتو" };

type Dict = Record<string, Multi>;

export const STRINGS: Dict = {
  navHome: { en: "Home", fa: "خانه", ps: "کور" },
  navLibrary: { en: "Library", fa: "کتابخانه", ps: "کتابتون" },
  navAsk: { en: "Ask", fa: "بپرس", ps: "وپوښته" },
  navPractice: { en: "Practice", fa: "تمرین", ps: "تمرین" },
  navMe: { en: "Me", fa: "من", ps: "زه" },
  navMyLearning: { en: "My learning", fa: "آموزش من", ps: "زما زده‌کړه" },

  offlineAllHere: { en: "Offline · all here", fa: "آفلاین · همه اینجاست", ps: "آفلاین · ټول دلته" },
  askUstad: { en: "Ask Ustad", fa: "از استاد بپرس", ps: "له استاد وپوښته" },
  continueLabel: { en: "Continue", fa: "ادامه", ps: "دوام" },
  searchBooks: { en: "Search books", fa: "جستجوی کتاب‌ها", ps: "کتابونه ولټوه" },
  showMe: { en: "Show me", fa: "نشانم بده", ps: "وښیه" },
  simpler: { en: "Simpler", fa: "ساده‌تر", ps: "ساده" },
  listen: { en: "Listen", fa: "بشنو", ps: "واوره" },
  quizMe: { en: "Quiz me", fa: "امتحانم کن", ps: "و مې ازمویه" },
  flashcards: { en: "Flashcards", fa: "کارت‌ها", ps: "کارتونه" },
  next: { en: "Next", fa: "بعدی", ps: "بل" },
  back: { en: "Back", fa: "بازگشت", ps: "شاته" },
  afarin: { en: "Afarin!", fa: "آفرین!", ps: "آفرین!" },
  almost: { en: "Almost.", fa: "نزدیک بود.", ps: "نږدې وو." },
  tryAgain: { en: "Try again", fa: "دوباره امتحان کن", ps: "بیا هڅه وکړه" },
  notThisOne: { en: "Not this one", fa: "این نه", ps: "دا نه" },
  nextQuestion: { en: "Next question", fa: "سوال بعدی", ps: "بله پوښتنه" },
  savedOnThisPhone: { en: "Saved on this phone", fa: "در همین گوشی ذخیره شد", ps: "په همدې ټیلیفون کې خوندي" },
  savedHere: { en: "Saved here", fa: "اینجا ذخیره شد", ps: "دلته خوندي" },
  keepPrivate: { en: "Keep it private", fa: "پیش خودم بماند", ps: "زما سره دې پاتې شي" },
  shareIt: { en: "Share it", fa: "به اشتراک بگذار", ps: "شریکه یې کړه" },
  openPage: { en: "Open page", fa: "باز کردن صفحه", ps: "پاڼه پرانیزه" },
  fromYourLesson: { en: "From your lesson", fa: "از درس تو", ps: "ستا له لوست څخه" },
  teacherReviewed: { en: "teacher-reviewed", fa: "بازبینی‌شده توسط معلم", ps: "د ښوونکي کتل شوی" },
};

export type LangCtx = {
  lang: Lang;
  rtl: boolean;
  dir: "ltr" | "rtl";
  setLang: (l: Lang) => void;
  /** UI chrome string by id. */
  t: (id: keyof typeof STRINGS | string) => string;
  /** A bilingual pair authored with the content. */
  m: (v: Multi) => string;
  /** Digits in the reader's script: Persian digits in Dari and Pashto. */
  num: (n: number) => string;
};

export const LangContext = createContext<LangCtx | null>(null);

export function useLang(): LangCtx {
  const ctx = useContext(LangContext);
  if (ctx) return ctx;
  // Icons and small leaves may render outside the provider in tests.
  return {
    lang: "en", rtl: false, dir: "ltr", setLang: () => {},
    t: (id) => STRINGS[id]?.en ?? String(id),
    m: (v) => v.en,
    num: (n) => String(n),
  };
}

/** Separator between facts ("Page 41 · 12 min"). In Dari and Pashto a middle
 *  dot next to Persian digits reads as a zero (۰), so it becomes a comma. */
export let SEP = " · ";
export function setSep(lang: Lang) { SEP = isRtl(lang) ? "، " : " · "; }

export function pickMulti(v: Multi, lang: Lang): string {
  if (lang === "fa") return v.fa.split(" · ").join("، ");
  if (lang === "ps") return (v.ps ?? v.fa).split(" · ").join("، ");
  return v.en;
}

const FA_DIGITS = new Intl.NumberFormat("fa-AF");
export function formatNum(n: number, lang: Lang): string {
  return isRtl(lang) ? FA_DIGITS.format(n) : new Intl.NumberFormat("en").format(n);
}
