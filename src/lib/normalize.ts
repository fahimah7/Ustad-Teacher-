/** Text normalisation shared by search and Ustad, so "کیمیا صنف ۱۲ صفحه ۱۳",
 *  "Grade 12 chemistry p.13" and Arabic-keyboard spellings all meet. */

const DIGITS: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[۰-۹٠-٩]/g, (d) => DIGITS[d] ?? d)
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/[ً-ٰٟ]/g, "") // harakat
    .replace(/‌/g, "")                // ZWNJ
    .replace(/ـ/g, "")                      // tatweel
    .replace(/[⅓]/g, " 1/3 ").replace(/[¼]/g, " 1/4 ").replace(/[½]/g, " 1/2 ").replace(/[¾]/g, " 3/4 ")
    .replace(/[?!.,;:«»"“”'’()،؟]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP = new Set([
  "a", "an", "the", "is", "are", "was", "of", "to", "in", "on", "and", "or", "what", "why", "how", "do", "does", "i", "we", "you", "it", "this", "that", "me", "my", "can", "for", "with", "be", "about",
  "چه", "چرا", "چگونه", "است", "را", "در", "و", "به", "از", "که", "این", "آن", "یک", "من", "تو",
]);

export function tokens(input: string): string[] {
  return normalize(input).split(" ").filter((t) => t && !STOP.has(t));
}

/** Words that name a subject, in both scripts. */
export const SUBJECT_WORDS: Record<string, string> = {
  math: "math", maths: "math", mathematics: "math", "ریاضی": "math",
  biology: "bio", bio: "bio", "بیولوژی": "bio",
  chemistry: "chem", chem: "chem", "کیمیا": "chem",
  physics: "phys", "فزیک": "phys",
  geography: "geo", "جغرافیه": "geo",
  history: "hist", "تاریخ": "hist",
  english: "eng", "انگلیسی": "eng",
  dari: "dari", "دری": "dari",
  pashto: "pashto", "پښتو": "pashto",
};
