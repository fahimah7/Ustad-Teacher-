import type { TextBook } from "./book";
import { TEACHING_KINDS } from "./outline";

export type SearchHit = { pdfPage: number; score: number };

/** Offline keyword search (BM25) over the page packages, so the teacher (and the search screen)
 *  can find the right pages anywhere in the book. No model, no network.
 *  Port of app/lib/tutor/book_search.dart. */
export class BookSearch {
  private docs = new Map<number, Map<string, number>>(); // pdf page -> term frequencies
  private topics = new Map<number, Set<string>>(); // pdf page -> words of its section, terms, chapter
  private lengths = new Map<number, number>();
  private docFreq = new Map<string, number>();
  private avgLength = 1;

  constructor(readonly book: TextBook) {
    for (let page = 1; page <= book.pageCount; page++) {
      const pkg = book.pkg(page);
      if (!pkg || !TEACHING_KINDS.has(pkg.pageKind)) continue;
      const tf = new Map<string, number>();
      const add = (text: unknown, weight = 1) => {
        if (typeof text !== "string") return;
        for (const t of tokenize(text)) tf.set(t, (tf.get(t) ?? 0) + weight);
      };
      const chapterTitle = book.chapter(pkg.chapter)?.titleFa;
      add(pkg.sectionFa, 3);
      add(chapterTitle);
      for (const term of pkg.terms) {
        add(term.fa, 2);
        add(term.en, 2);
      }
      pkg.keyPoints.forEach((k) => add(k));
      add(pkg.summaryFa);
      for (const f of pkg.formulas) add(f.meaning_fa);
      for (const f of pkg.figures) add(f.description_fa);
      for (const e of [...pkg.workedExamples, ...pkg.exercises]) add(e.problem_fa);
      if (!tf.size) continue;
      this.docs.set(page, tf);
      this.topics.set(page, new Set([
        ...tokenize(pkg.sectionFa ?? ""),
        ...tokenize(chapterTitle ?? ""),
        ...pkg.terms.flatMap((t) => [...tokenize(t.fa ?? ""), ...tokenize(t.en ?? "")]),
      ]));
      let len = 0;
      tf.forEach((v) => (len += v));
      this.lengths.set(page, len);
      for (const t of tf.keys()) this.docFreq.set(t, (this.docFreq.get(t) ?? 0) + 1);
    }
    if (this.lengths.size) {
      let sum = 0;
      this.lengths.forEach((v) => (sum += v));
      this.avgLength = sum / this.lengths.size;
    }
  }

  /** The search terms that occur on a page (empty for pages that aren't indexed). */
  termsOf(pdfPage: number): Set<string> {
    return new Set(this.docs.get(pdfPage)?.keys() ?? []);
  }

  /** Words naming what a page is about: its section title, its terms and its chapter title. */
  topicTermsOf(pdfPage: number): Set<string> {
    return this.topics.get(pdfPage) ?? new Set();
  }

  /** Whether a term occurs anywhere in the book. */
  knows(term: string): boolean {
    return this.docFreq.has(term);
  }

  /** Every page sharing a term with the query, best first. */
  search(query: string): SearchHit[] {
    const terms = new Set(tokenize(query));
    const n = this.docs.size;
    const k1 = 1.2, b = 0.75;
    const scores = new Map<number, number>();
    for (const t of terms) {
      const df = this.docFreq.get(t);
      if (df === undefined) continue;
      const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
      this.docs.forEach((tf, page) => {
        const f = tf.get(t);
        if (f === undefined) return;
        const norm = (f * (k1 + 1)) / (f + k1 * (1 - b + (b * this.lengths.get(page)!) / this.avgLength));
        scores.set(page, (scores.get(page) ?? 0) + idf * norm);
      });
    }
    return [...scores.entries()].map(([pdfPage, score]) => ({ pdfPage, score })).sort((a, b) => b.score - a.score);
  }
}

const LATEX_COMMAND = /\\[a-zA-Z]+/g;
const SEPARATOR = /[^a-z0-9ؠ-يٮ-ۓ]+/;

/** Folds Arabic/Persian letter variants, digits and diacritics so the same word always looks the
 *  same; ZWNJ becomes a space so plural/verb affixes split off (انتیگرال‌ها → انتیگرال ها). */
export function normalizeForSearch(s: string): string {
  let out = "";
  for (const ch of s.toLowerCase().replace(LATEX_COMMAND, " ")) {
    const r = ch.codePointAt(0)!;
    if (r === 0x064a || r === 0x0649) out += "ی"; // ي ى → ی
    else if (r === 0x0643) out += "ک"; // ك → ک
    else if (r === 0x0629 || r === 0x06c0) out += "ه"; // ة ۀ → ه
    else if (r === 0x0623 || r === 0x0625 || r === 0x0671) out += "ا"; // أ إ ٱ → ا
    else if ((r >= 0x064b && r <= 0x065f) || r === 0x0670 || r === 0x0640) continue; // diacritics, tatweel
    else if (r >= 0x06f0 && r <= 0x06f9) out += String.fromCharCode(0x30 + r - 0x06f0);
    else if (r >= 0x0660 && r <= 0x0669) out += String.fromCharCode(0x30 + r - 0x0660);
    else if (r === 0x200c) out += " ";
    else out += ch;
  }
  return out;
}

/** Search tokens: normalized words minus stopwords and bare numbers, plural suffixes stripped. */
export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  for (const raw of normalizeForSearch(text).split(SEPARATOR)) {
    if (raw.length < 2 || STOPWORDS.has(raw) || /^[0-9]+$/.test(raw)) continue;
    const t = stem(raw);
    if (!STOPWORDS.has(t)) tokens.push(t);
  }
  return tokens;
}

function stem(t: string): string {
  for (const suffix of ["های", "ها", "ات"]) {
    if (t.length > suffix.length + 2 && t.endsWith(suffix)) return t.slice(0, t.length - suffix.length);
  }
  return t;
}

// Function words, question words and words that appear on nearly every page (in normalized form).
const STOPWORDS = new Set([
  "و", "در", "به", "از", "که", "این", "ان", "آن", "را", "با", "است", "اند", "هست", "هستند", "بود", "برای",
  "یک", "یا", "تا", "بر", "هم", "نیز", "می", "شود", "شده", "شد", "کنید", "کند", "کنیم", "کنم", "کرد",
  "کردن", "کنند", "باید", "اگر", "هر", "چه", "چی", "چطور", "چگونه", "چرا", "کجا", "کدام", "آیا", "ایا",
  "لطفا", "بدهید", "بگویید", "بده", "بگو", "توضیح", "دهید", "دهم", "ساده", "صفحه", "صفحات", "کتاب",
  "درس", "مورد", "باره", "درباره", "ما", "شما", "من", "او", "ها", "های", "ای", "یعنی", "چیست",
  "چیه", "چند", "دارد", "دارند", "داریم", "دیگر", "همین", "اینجا", "آنجا", "میشود", "بفهمم", "نمیفهمم",
  "فهمیدم", "حل", "سوال", "سوالی", "مثال", "تمرین", "فصل", "اول", "دوم", "سوم", "چهارم", "پنجم", "ششم",
  "هفتم", "هشتم", "بپرسید", "بیشتر", "خوب", "بخش", "قسمت", "مطلب", "چیزی", "وقتی", "چون", "پس", "اما",
  "ولی", "نه", "بلی", "باشد", "میتوانم", "میتوان", "توانم", "نشان", "میدهد", "دهد", "داده", "خوانم",
  "بخوانم", "میگوید", "گوید", "چیزهایی", "موضوع", "the", "of", "and", "is", "to", "in", "what",
  // Common phrasing in questions ("به زبان ساده", "به دست آمد", "شکل پایین صفحه", "قدم به قدم").
  "زبان", "دست", "آمد", "آمده", "آید", "آورد", "آورده", "آوردن", "کار", "برد", "بردن", "برده", "گرفت",
  "گرفته", "گیرد", "شوند", "بشود", "حساب", "شکل", "پایین", "بالا", "نوشته", "فهم", "کمک", "راه", "روش",
  "مرحله", "قدم", "بعدی", "قبلی", "همه", "کل",
]);
