import { faNum, parseFaInt } from "./fa";
import type { TextBook } from "./book";
import { BookSearch, tokenize } from "./bookSearch";
import { buildOutline, outlineText, type OutlineChapter } from "./outline";
import { buildPageContext, pageDigest } from "./pageContext";

/** Assembles what the teacher sees for one question. Port of app/lib/tutor/prompt_builder.dart,
 *  which was tuned and evaluated against the real model (tool/eval_*.dart). */

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/** A link under an answer to a page or chapter the answer mentions. */
export type PageLink = { label: string; pdfPage: number };

export type TutorTurn = { messages: ChatMessage[]; sourcePages: number[] };

const NO_PACKAGE =
  "برای این صفحه هنوز معلومات آماده نیست. به شاگرد بگویید به صفحهٔ کتاب نگاه کند و فقط به اندازهٔ دانش عمومی همین کتاب کمک کنید.";

/** Fills {{book_title}} and {{student_name}} in the teacher prompt. The name is user input, so it
 *  is cut to one short line without brackets. */
export function fillTeacherPrompt(template: string, bookTitle: string, studentName: string, fallbackName = "شاگرد"): string {
  let name = studentName.replace(/[\r\n{}[\]«»]/g, " ").replace(/\s+/g, " ").trim();
  if (name.length > 30) name = name.slice(0, 30).trim();
  return template.split("{{book_title}}").join(bookTitle).split("{{student_name}}").join(name || fallbackName);
}

const ORDINALS: Record<string, number> = { "اول": 1, "دوم": 2, "سوم": 3, "چهارم": 4, "پنجم": 5, "ششم": 6, "هفتم": 7, "هشتم": 8, "نهم": 9, "دهم": 10 };
const EN_ORDINALS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8 };

const PAGE_REF = /(?:صفحهٔ|صفحه‌ی|صفحه|ص|\bpage)\s*\.?\s*([0-9۰-۹٠-٩]+)/gi;
const PAGE_MENTION = /(?:صفحه(?:ٔ|‌ی|ی)?|\bpage)\s*([0-9۰-۹]+)/gi;
const CHAPTER_MENTION = new RegExp(`(?:فصل\\s*([0-9۰-۹]+|${Object.keys(ORDINALS).join("|")}))|(?:\\bchapter\\s*([0-9]+|${Object.keys(EN_ORDINALS).join("|")})\\b)`, "gi");
// "این صفحه", "همین مثال", "اینجا"…: the student means what is in front of her.
const ABOUT_THIS_PAGE = /(این|همین)\s*(صفحه|مثال|تمرین|شکل|درس|فورمول|فرمول|گراف|جدول|فعالیت|سوال)|اینجا|\bthis (page|example|exercise|figure|lesson|formula|graph|table|question)\b|\bhere\b/i;

export class PromptBuilder {
  readonly search: BookSearch;
  readonly outline: OutlineChapter[];
  private readonly prefix: string;

  /** systemPrompt: the filled teacher prompt (rules). The book outline is appended once; the
   *  result never changes, so it stays in llama.cpp's prompt cache across pages and turns. */
  constructor(readonly book: TextBook, systemPrompt: string) {
    this.search = new BookSearch(book);
    this.outline = buildOutline(book);
    this.prefix = `${systemPrompt}\n\n${outlineText(book, this.outline)}`;
  }

  /** guide: an optional note to the teacher under the question (conversation.ts), e.g. "she
   *  didn't understand, explain differently". Without one the turn is the evaluated Dart one. */
  build(pdfPage: number, question: string, history: ChatMessage[] = [], guide = ""): TutorTurn {
    const book = this.book;
    const page = book.pkg(pdfPage);
    const pageContext = page ? buildPageContext(book, page, { prev: book.pkg(pdfPage - 1), next: book.pkg(pdfPage + 1) }) : NO_PACKAGE;

    const extra: string[] = [];
    const sources: number[] = [];

    // A page the student names ("صفحهٔ ۴۰") gets its full notes.
    for (const m of question.matchAll(PAGE_REF)) {
      const printed = parseFaInt(m[1]);
      if (printed === null) continue;
      const target = book.pdfPageForPrinted(printed);
      const pkg = book.pkg(target);
      if (!pkg || target === pdfPage || sources.includes(target)) continue;
      extra.push(buildPageContext(book, pkg).replace("[معلومات صفحه]", "[معلومات صفحه‌ای که شاگرد نام برده]"));
      sources.push(target);
      if (sources.length === 2) break;
    }

    // Otherwise, if the question is about another part of the book, add the best-matching pages.
    if (!sources.length) {
      for (const other of this.relatedPages(question, pdfPage)) {
        extra.push(pageDigest(book, book.pkg(other)!));
        sources.push(other);
      }
    }

    // The open page's notes go right before the question: a small model keeps reading what is
    // closest to the question, even deep into a conversation. The page is named with the
    // question, so "this page" can't be mistaken for another one.
    const user = [pageContext, ...extra, `[سوال شاگرد در ${this.pageName(pdfPage)}]\n${question}`, ...(guide ? [guide] : [])].join("\n\n");
    return { messages: [{ role: "system", content: this.prefix }, ...history, { role: "user", content: user }], sourcePages: sources };
  }

  /** Links for the pages and chapters an answer actually mentions. A page only gets a link if the
   *  teacher was given it (another page's notes, or the outline's section and chapter starts), so
   *  a mistaken page number never becomes a link. The page being read gets no link. */
  answerLinks(answer: string, currentPage: number, sourcePages: number[] = [], lang: "fa" | "en" = "fa"): PageLink[] {
    const book = this.book;
    const allowed = new Set<number>([...sourcePages, ...this.outline.flatMap((c) => [c.pdfPage, ...c.sections.map((s) => s.pdfPage)])]);
    const links: PageLink[] = [];
    const add = (label: string, pdfPage: number) => {
      if (pdfPage !== currentPage && !links.some((l) => l.pdfPage === pdfPage)) links.push({ label, pdfPage });
    };
    for (const m of answer.matchAll(PAGE_MENTION)) {
      const printed = parseFaInt(m[1]);
      if (printed === null) continue;
      const pdf = book.pdfPageForPrinted(printed);
      if (book.printedPageOf(pdf) === printed && allowed.has(pdf)) add(lang === "en" ? `Page ${printed}` : `صفحهٔ ${faNum(printed)}`, pdf);
    }
    const currentChapter = book.pkg(currentPage)?.chapter ?? null;
    for (const m of answer.matchAll(CHAPTER_MENTION)) {
      const word = (m[1] ?? m[2] ?? "").toLowerCase();
      const n = ORDINALS[word] ?? EN_ORDINALS[word] ?? parseFaInt(word);
      if (n === null || n === undefined || n === currentChapter) continue;
      for (const c of this.outline) if (c.chapter.number === n) add(lang === "en" ? `Chapter ${n}` : `فصل ${faNum(n)}`, c.pdfPage);
    }
    return links.slice(0, 4);
  }

  /** "صفحهٔ ۲۴۵ کتاب" (or the PDF page number for pages without a printed number). */
  pageName(pdfPage: number): string {
    const printed = this.book.printedPageOf(pdfPage);
    return printed !== null ? `صفحهٔ ${faNum(printed)} کتاب` : `صفحهٔ ${faNum(pdfPage)} (پی‌دی‌اف)`;
  }

  /** Pages elsewhere in the book for a question that names a topic the open page doesn't cover. */
  relatedPages(question: string, pdfPage: number, limit = 2, minScore = 4.0): number[] {
    if (ABOUT_THIS_PAGE.test(question)) return [];
    // If every topic word in the question already occurs on the open page (or its neighbours),
    // the question is about this page and other pages would only distract the small model.
    const local = new Set<string>();
    for (let p = pdfPage - 1; p <= pdfPage + 1; p++) this.search.termsOf(p).forEach((t) => local.add(t));
    const missing = new Set(tokenize(question).filter((t) => this.search.knows(t) && !local.has(t)));
    if (!missing.size) return [];
    // Another page only counts if the question names its topic (section title or terms), not
    // merely a word that happens to appear in its notes (e.g. «جدول»).
    const candidates = this.search.search(question).filter(
      (h) => Math.abs(h.pdfPage - pdfPage) > 1 && [...this.search.topicTermsOf(h.pdfPage)].some((t) => missing.has(t)),
    );
    if (!candidates.length || candidates[0].score < minScore) return [];
    const best = candidates[0].score;
    return candidates.filter((h) => h.score >= best * 0.6).map((h) => h.pdfPage).slice(0, limit);
  }
}
