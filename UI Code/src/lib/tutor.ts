import { useEffect, useState } from "react";
import { bookById, setForPage } from "../content/library";
import type { Multi } from "./i18n";
import { chat, tutorStatus, type TutorStatus } from "../native/bridge";
import { dariFixer, glossaryReplacements, type DariFixer } from "../tutor/dariTerms";
import { faNum } from "../tutor/fa";
import { speakable } from "../tutor/mathText";
import { fillTeacherPrompt, PromptBuilder, type ChatMessage, type PageLink } from "../tutor/promptBuilder";
import { prepareTurn, tidyAnswer } from "../tutor/conversation";
import { teacherTemplate } from "../tutor/teacherPrompt";
import type { ChatMsg } from "../state/app";

/** Ustad, on the device.
 *
 *  Questions go to a local model (Gemma, run by llama.cpp on this computer) together with the
 *  notes of the page she is looking at, found by page, not guessed: the teacher always knows
 *  which page is open. Flashcards, "show me" and quick checks come straight from the page notes
 *  and practice sets, with no model at all. Nothing leaves the device. */

export type Intent = "explain" | "example" | "simpler" | "flashcards" | "quiz" | "showMe" | "ask";

export type Reply =
  | { kind: "teacher"; text: string; page: number; links: PageLink[]; lang?: TeacherLang; failed?: boolean; stopped?: boolean }
  | { kind: "cards"; cards: { front: string; back: string }[]; page: number }
  | { kind: "figures"; page: number; figures: { pdfPage: number; bbox: number[]; description: string }[] }
  | { kind: "check"; page: number; check: { question: Multi; options: Multi[]; answer: number; why: Multi } }
  | { kind: "text"; text: Multi; page?: number };

export type TeacherLang = "fa" | "en";
const teacherLang = (lang: string): TeacherLang => (lang === "en" ? "en" : "fa");

const builders = new Map<string, PromptBuilder>();
const fixers = new Map<string, DariFixer>();
/** Drops prompt builders after the books on the device change (a pack was received). */
export const forgetBooks = () => { builders.clear(); fixers.clear(); };

/** Rewrites Iranian words in the teacher's Dari to this book's words. */
function fixerFor(bookId: string): DariFixer {
  let f = fixers.get(bookId);
  if (!f) {
    const book = bookById(bookId);
    f = dariFixer({ math: !book || book.subject === "math", extra: glossaryReplacements(book?.glossary) });
    fixers.set(bookId, f);
  }
  return f;
}
function builderFor(bookId: string, lang: TeacherLang, name: string): PromptBuilder | null {
  const book = bookById(bookId);
  if (!book?.text) return null;
  const key = `${bookId}|${lang}|${name}`;
  let b = builders.get(key);
  if (!b) {
    const template = teacherTemplate(book.subject, lang, book.glossary);
    b = new PromptBuilder(book.text, fillTeacherPrompt(template, book.text.titleFa, name, lang === "en" ? "student" : "شاگرد"));
    builders.set(key, b);
  }
  return b;
}

/** "Page 61" / «صفحهٔ ۶۱». `inline` is for the middle of an English sentence: "page 61", "PDF page 1". */
export function pageLabel(bookId: string, pdfPage: number, lang: string, inline = false): string {
  const printed = bookById(bookId)?.text?.printedPageOf(pdfPage);
  if (lang === "en") return printed != null ? `${inline ? "page" : "Page"} ${printed}` : `PDF page ${pdfPage}`;
  return printed != null ? `صفحهٔ ${faNum(printed)}` : `صفحهٔ ${faNum(pdfPage)} (پی‌دی‌اف)`;
}

/** What the tray and chips ask the model, in the language she reads. */
export function questionFor(intent: Intent, lang: string): string {
  const en = lang === "en";
  switch (intent) {
    case "explain": return en ? "Explain this page simply." : "این صفحه را ساده توضیح بدهید.";
    case "example": return en ? "Solve the first example on this page step by step." : "مثال اول این صفحه را قدم به قدم حل کنید.";
    case "simpler": return en ? "Please explain that more simply." : "لطفاً ساده‌تر توضیح بدهید.";
    default: return "";
  }
}

/** Recent turns since she moved to this page (at most six messages), oldest first and starting
 *  with her own question, as the chat template expects. */
export function historyOnThisPage(msgs: ChatMsg[], max = 6): ChatMessage[] {
  const turns: ChatMessage[] = [];
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    if (m.from === "page") break;
    if (m.from === "me") turns.unshift({ role: "user", content: m.text });
    else if (m.reply.kind === "teacher" && !m.reply.failed && m.reply.text) turns.unshift({ role: "assistant", content: m.reply.text });
    if (turns.length >= max) break;
  }
  while (turns.length && turns[0].role !== "user") turns.shift();
  return turns;
}

/** Asks the teacher about the page in view and streams the answer (with the textbook's Dari terms). */
export async function askTeacher(o: {
  bookId: string; page: number; question: string; history: ChatMessage[]; lang: string; name: string;
  onText?: (text: string) => void; signal?: AbortSignal;
}): Promise<Extract<Reply, { kind: "teacher" }>> {
  const lang = teacherLang(o.lang);
  const builder = builderFor(o.bookId, lang, o.name);
  if (!builder) return { kind: "teacher", text: lang === "en" ? "Open a book first." : "اول یک کتاب را باز کنید.", page: o.page, links: [], lang, failed: true };
  const pages = bookById(o.bookId)?.text;
  if (pages && !pages.pkg(o.page) && !pages.complete) {
    // The book is on the device but this page's notes are still being written: say so rather than guess.
    return {
      kind: "teacher", page: o.page, links: [], lang,
      text: lang === "en"
        ? "I haven't studied this page yet: its notes are still being prepared for this book. You can read the page, and ask me about pages I have studied."
        : "من هنوز این صفحه را مطالعه نکرده‌ام؛ یادداشت‌های این صفحه برای این کتاب هنوز آماده می‌شود. شما می‌توانید صفحه را بخوانید و در بارهٔ صفحه‌هایی که مطالعه کرده‌ام از من بپرسید.",
    };
  }
  // Follow-ups ("simpler", "I didn't understand", "problem 2") get a note to the teacher, and
  // earlier answers are shortened so they aren't copied (tutor/conversation.ts).
  const turn = prepareTurn({ builder, page: o.page, question: o.question, history: o.history, lang, name: o.name });
  if (import.meta.env.DEV) console.debug(`tutor: asked on PDF page ${o.page} (${builder.pageName(o.page)}), other pages [${turn.sourcePages}]`);
  let raw = "";
  const fixer = fixerFor(o.bookId);
  const answered = o.history.some((m) => m.role === "assistant");
  const fix = (t: string) => tidyAnswer(lang === "en" ? t : fixer.fix(t), o.name, answered);
  try {
    await chat(turn.messages, (piece) => { raw += piece; o.onText?.(fix(raw)); }, o.signal);
  } catch (e) {
    const sorry = lang === "en" ? "Sorry, something went wrong. Please try again." : "معذرت می‌خواهم، مشکلی پیش آمد. لطفاً دوباره کوشش کنید.";
    if (import.meta.env.DEV) console.error("tutor error", e);
    return { kind: "teacher", text: raw ? fix(raw) : sorry, page: o.page, links: [], lang, failed: !raw };
  }
  const text = fix(raw).trim();
  if (o.signal?.aborted) return { kind: "teacher", text, page: o.page, links: [], lang, stopped: true };
  return { kind: "teacher", text, page: o.page, links: builder.answerLinks(text, o.page, turn.sourcePages, lang), lang };
}

/** Plain words of an answer for read-aloud and captions. */
export const plainText = (text: string) => speakable(text);

/* ── answers made from the page notes, without the model ─────────── */

export function flashcards(bookId: string, page: number): Reply {
  const text = bookById(bookId)?.text;
  const cards: { front: string; back: string }[] = [];
  const seen = new Set<string>();
  for (const p of [page, page - 1, page + 1, page + 2, page - 2]) {
    const pkg = text?.pkg(p);
    if (!pkg) continue;
    for (const f of pkg.formulas) {
      if (!f.meaning_fa || seen.has(f.meaning_fa)) continue;
      seen.add(f.meaning_fa);
      cards.push({ front: f.meaning_fa, back: `$${f.latex}$` });
    }
    for (const t of pkg.terms) {
      if (!t.fa || seen.has(t.fa)) continue;
      seen.add(t.fa);
      const point = pkg.keyPoints.find((k) => k.includes(t.fa!));
      cards.push({ front: t.fa, back: [t.en, point].filter(Boolean).join(" — ") || t.fa });
    }
    if (cards.length >= 8) break;
  }
  if (!cards.length) return { kind: "text", text: { en: "This page has no terms or formulas to make cards from. Try a lesson page.", fa: "در این صفحه اصطلاح یا فورمولی برای کارت نیست. یک صفحهٔ درس را امتحان کنید." }, page };
  return { kind: "cards", cards: cards.slice(0, 8), page };
}

export function showMe(bookId: string, page: number): Reply {
  const text = bookById(bookId)?.text;
  for (const p of [page, page + 1, page - 1]) {
    const figs = (text?.pkg(p)?.figures ?? []).filter((f) => Array.isArray(f.bbox) && f.bbox.length === 4);
    if (figs.length) return { kind: "figures", page, figures: figs.map((f) => ({ pdfPage: p, bbox: f.bbox!, description: f.description_fa ?? "" })) };
  }
  return { kind: "text", text: { en: "There is no picture on this page. Ask me and I'll explain it in words.", fa: "در این صفحه شکلی نیست. از من بپرسید تا با کلمات توضیح بدهم." }, page };
}

export function quickCheck(bookId: string, page: number, nth = 0): Reply {
  const set = setForPage(bookId, page);
  if (!set) return { kind: "text", text: { en: "There are no practice questions for this book yet.", fa: "برای این کتاب هنوز سوال تمرینی نیست." }, page };
  const byDistance = [...set.questions].sort((a, b) => Math.abs(a.pdfPage - page) - Math.abs(b.pdfPage - page));
  const q = byDistance[nth % byDistance.length];
  return { kind: "check", page, check: { question: q.q, options: q.options, answer: q.answer, why: q.why } };
}

/** Three things to ask about the page she is on. */
export function suggestionsFor(bookId: string, page: number): { q: Multi; tint: "saf" | "teal" | "vio" }[] {
  const pkg = bookById(bookId)?.text?.pkg(page);
  const out: { q: Multi; tint: "saf" | "teal" | "vio" }[] = [{ q: { en: "Explain this page simply", fa: "این صفحه را ساده توضیح بدهید" }, tint: "saf" }];
  if (pkg?.exercises.length) out.push({ q: { en: "Solve exercise 1 step by step", fa: "تمرین ۱ را قدم به قدم حل کنید" }, tint: "teal" });
  else if (pkg?.workedExamples.length) out.push({ q: { en: "Walk me through the example", fa: "مثال این صفحه را قدم به قدم توضیح بدهید" }, tint: "teal" });
  const term = pkg?.terms.find((t) => t.fa);
  if (term?.fa) out.push({ q: { en: `What does “${term.en ?? term.fa}” mean?`, fa: `«${term.fa}» یعنی چه؟` }, tint: "vio" });
  else if (pkg?.formulas[0]?.meaning_fa) out.push({ q: { en: "Where does the main formula come from?", fa: `${pkg.formulas[0].meaning_fa} از کجا می‌آید؟` }, tint: "vio" });
  return out.slice(0, 3);
}

/* ── is the teacher ready? ─────────────────────────────────────── */

let current: TutorStatus = { state: "starting" };
const listeners = new Set<(s: TutorStatus) => void>();
let polling = false;

function poll() {
  if (polling) return;
  polling = true;
  const tick = async () => {
    const s = await tutorStatus().catch(() => ({ state: "error", message: "no answer" }) as TutorStatus);
    if (s.state !== current.state || s.message !== current.message) {
      current = s;
      listeners.forEach((l) => l(s));
    }
    window.setTimeout(tick, s.state === "ready" ? 8000 : 1200);
  };
  tick();
}

export function useTutorStatus(): TutorStatus {
  const [s, setS] = useState(current);
  useEffect(() => {
    listeners.add(setS);
    poll();
    setS(current);
    return () => { listeners.delete(setS); };
  }, []);
  return s;
}
