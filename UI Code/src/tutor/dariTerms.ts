/** Rewrites Iranian-Persian terms that the small model slips into, using the Dari terms of the
 *  Afghan textbooks. Only unambiguous words and phrases are listed; a bare «حد» is left alone
 *  because «تا حدی» is ordinary Dari (the prompt handles those cases). */
const GENERAL: Record<string, string> = {
  "فرمول": "فورمول",
  "اطلاعات": "معلومات",
  "دانش‌آموز": "شاگرد",
  "دانش‌آموزان": "شاگردان",
};

/** Math words: only for math books (in biology «دنباله» is a tail, not a sequence). */
const MATH_WORDS: Record<string, string> = {
  "انتگرال": "انتیگرال",
  "دنباله": "ترادف",
  "بازه": "انتروال",
  "ریاضیات": "ریاضی",
  "لگاریتم": "لوگاریتم",
  "لگاریتمی": "لوگاریتمی",
  "پیوستگی": "متمادیت",
  "لیمیت": "لیمت",
};

const MATH_PHRASES: Record<string, string> = {
  "تابع گویا": "تابع نسبتی",
  "توابع گویا": "توابع نسبتی",
  "تابع نمایی": "تابع اکسپوننشیل",
  "توابع نمایی": "توابع اکسپوننشیل",
  "تابع پیوسته": "تابع متمادی",
  "توابع پیوسته": "توابع متمادی",
  "مقدار تابع": "قیمت تابع",
  "حد تابع": "لیمت تابع",
  "حد ترادف": "لیمت ترادف",
  "حد چپ": "لیمت طرف چپ",
  "حد راست": "لیمت طرف راست",
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const key = (match: string) => match.replace(/\s+/g, " ");

export type DariFixer = { fix: (text: string) => string; found: (text: string) => Set<string> };

/** A fixer for one book: the general words, the math words for math books, and the book's own
 *  glossary ("avoid" → "book"). */
export function dariFixer(o: { math?: boolean; extra?: Record<string, string> } = {}): DariFixer {
  const map: Record<string, string> = { ...GENERAL, ...(o.math ? { ...MATH_WORDS, ...MATH_PHRASES } : {}), ...(o.extra ?? {}) };
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  // Whole words only: no Arabic-script letter (or ZWNJ) before, no letter after.
  // A ZWNJ after is allowed so suffixes survive: فرمول‌ها → فورمول‌ها.
  const pattern = new RegExp(
    `(?<![\\u0600-\\u06FF\\u200C])(${keys.map((k) => escape(k).replace(/ /g, "\\s+")).join("|")})(?![\\u0600-\\u06FF])`,
    "g",
  );
  return {
    fix: (text) => text.replace(pattern, (_, m: string) => map[key(m)] ?? m),
    found: (text) => new Set([...text.matchAll(pattern)].map((m) => key(m[1]))),
  };
}

/** Ordinary Dari words that a glossary may list as the Iranian form of a term, but that also have
 *  everyday meanings (مقدار "amount", برد "took", صفحه "page", حلال "halal", باز "open"): never
 *  rewritten on their own. */
export const AMBIGUOUS = new Set(["مقدار", "برد", "دامنه", "مجموعه", "عامل", "صحیح", "تند", "فرد", "زوج", "حد", "کار", "توان",
  "صفحه", "گروه", "ترکیب", "کاهش", "باز", "پیوند", "ماشین", "نما", "جهش", "دفع", "تلاقی", "کلیه", "حلال", "ظرفیت", "شکست", "تکانه", "دفتر", "مدار", "کانون",
]);

/** Glossary pairs ("avoid" → "book") that are safe to rewrite automatically: Dari words or phrases
 *  of at least three letters that differ from the book's form and are not everyday words. */
export function glossaryReplacements(terms: { book: string; avoid?: string[] }[] | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of terms ?? []) {
    const book = t.book?.trim();
    if (!book) continue;
    for (const a of t.avoid ?? []) {
      const w = a.trim();
      // A book form that is a list («مشبوع / غیر مشبوع», «اشعهٔ الفا، بیتا و گاما») can't replace one word.
      if (w.length >= 3 && w !== book && !AMBIGUOUS.has(w) && /^[؀-ۿ‌ ]+$/.test(w) && !/[/،,]/.test(book)) out[w] = book;
    }
  }
  return out;
}

const MATH = dariFixer({ math: true });

/** Replaces Iranian terms with the textbook's Dari terms (math book). */
export const toBookDari = (text: string): string => MATH.fix(text);

/** The Iranian terms found in text (for evaluation). */
export function iranianTermsIn(text: string): Set<string> {
  return MATH.found(text);
}
