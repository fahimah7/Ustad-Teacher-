import { normalize, tokens } from "./normalize";
import { allLessons, ELSEWHERE, lessonById } from "../content/library";
import { isFull, type Explain, type Lesson } from "../content/schema";
import { SUBJECTS } from "../content/subjects";
import type { Multi } from "./i18n";

/** Ustad, on the phone.
 *
 *  This tutor never calls a server. It answers from what ships in the grade
 *  pack: the lesson blocks and the teacher-reviewed explanations written for
 *  them. That keeps two promises at once: every answer has a real source, and
 *  nothing leaves the device. When the lesson does not cover a question, it
 *  says so and looks through her other books instead of guessing.
 *
 *  A local model can be plugged in later through `TutorModel` (llama.cpp in a
 *  native shell, for example). It would receive the same retrieved blocks and
 *  must keep the same contract: grounded answer + source, or an honest "not
 *  in this lesson". Until then, no model is loaded and nothing is invented. */

export type TutorModel = {
  name: string;
  answer(input: { question: string; lesson: Lesson; context: string[]; lang: "en" | "fa" | "ps" }): Promise<Multi | null>;
};
let model: TutorModel | null = null;
export const setTutorModel = (m: TutorModel | null) => { model = m; };

export type Source = { lessonId: string; label: Multi; page: number };

export type Reply =
  | { kind: "answer"; text: Multi; example?: Multi; source: Source; check?: Explain["check"]; explainIndex?: number }
  | { kind: "notHere"; question: string; elsewhere?: { id: string; label: Multi; snippet: Multi; onPhone: boolean; sizeMB?: number; subject: string; grade: number }; shortAnswer?: Multi }
  | { kind: "cards"; cards: { front: Multi; back: Multi }[]; source: Source }
  | { kind: "text"; text: Multi; source?: Source };

export type Intent = "explain" | "example" | "simpler" | "flashcards" | "quiz" | "showMe" | "ask";

export function sourceOf(l: Lesson, page?: number): Source {
  const s = SUBJECTS[l.subject];
  return {
    lessonId: l.id,
    page: page ?? l.source.pages[0],
    label: { en: `${s.short.en} ${l.grade} · ${l.unit.n}.${l.lesson.n}`, fa: `${s.short.fa} ${l.grade} · ${l.unit.n}.${l.lesson.n}` },
  };
}

function score(q: string[], e: Explain): number {
  const phrase = q.join(" ");
  let best = 0;
  for (const p of e.q) {
    const pt = tokens(p);
    if (!pt.length) continue;
    const overlap = pt.filter((t) => q.some((w) => w === t || (w.length > 3 && (w.startsWith(t) || t.startsWith(w))))).length;
    let s = overlap / pt.length;
    if (normalize(p).includes(phrase) || phrase.includes(tokens(p).join(" "))) s += 0.5;
    best = Math.max(best, s);
  }
  return best;
}

function bestExplain(lesson: Lesson, question: string): { e: Explain; i: number; s: number } | null {
  const q = tokens(question);
  if (!q.length) return null;
  let top: { e: Explain; i: number; s: number } | null = null;
  (lesson.explain ?? []).forEach((e, i) => {
    const s = score(q, e);
    if (!top || s > top.s) top = { e, i, s };
  });
  return top && (top as { s: number }).s >= 0.6 ? top : null;
}

function blockHit(lesson: Lesson, question: string): Multi | null {
  const q = tokens(question).filter((w) => w.length > 2);
  if (!q.length) return null;
  let best: { t: Multi; s: number } | null = null;
  for (const b of lesson.blocks) {
    if (!("text" in b)) continue;
    const words = new Set(tokens(b.text.en + " " + b.text.fa));
    const s = q.filter((w) => words.has(w)).length / q.length;
    if (!best || s > best.s) best = { t: b.text, s };
  }
  return best && best.s >= 0.6 ? best.t : null;
}

export function detectIntent(text: string): Intent {
  const s = normalize(text);
  if (/\b(simpler|simple|easier|ساده)/.test(s)) return "simpler";
  if (/\b(example|مثال)/.test(s)) return "example";
  if (/\b(flashcard|flash card|cards|کارت)/.test(s)) return "flashcards";
  if (/\b(quiz|test me|امتحان)/.test(s)) return "quiz";
  if (/\b(show me|picture|draw|تصویر|نشان)/.test(s)) return "showMe";
  if (/\b(explain this lesson|explain the lesson|summar|این درس)/.test(s)) return "explain";
  return "ask";
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Ask Ustad something about the lesson she is in. */
export async function ask(question: string, lessonId: string, opts: { intent?: Intent; lastExplain?: number; lang?: "en" | "fa" | "ps" } = {}): Promise<Reply> {
  const lesson = lessonById(lessonId);
  // A short pause so the typing dots read as thought, not lag.
  await delay(650 + Math.min(700, question.length * 8));
  if (!lesson || !isFull(lesson)) {
    return { kind: "text", text: { en: "This lesson isn't on your phone yet. It comes with the next pack.", fa: "این درس هنوز در گوشی تو نیست. با بسته بعدی می‌آید." } };
  }
  const intent = opts.intent ?? detectIntent(question);
  const src = sourceOf(lesson);

  if (intent === "explain") {
    const key = lesson.blocks.find((b) => b.type === "keyIdea") as { text: Multi; source?: { page: number } } | undefined;
    const exp = lesson.blocks.find((b) => b.type === "explanation") as { text: Multi; source?: { page: number } } | undefined;
    const ex = lesson.blocks.find((b) => b.type === "workedExample") as { text: Multi } | undefined;
    return {
      kind: "answer",
      text: { en: `${key?.text.en ?? ""} ${firstSentences(exp?.text.en ?? "", 1)}`.trim(), fa: `${key?.text.fa ?? ""} ${firstSentences(exp?.text.fa ?? "", 1)}`.trim() },
      example: ex?.text,
      source: sourceOf(lesson, key?.source?.page),
      check: lesson.explain?.[0]?.check,
    };
  }

  if (intent === "showMe") {
    const fig = lesson.blocks.find((b) => b.type === "figure") as { caption?: Multi; source?: { page: number } } | undefined;
    const key = lesson.blocks.find((b) => b.type === "keyIdea") as { text: Multi } | undefined;
    return { kind: "text", text: fig?.caption ?? key?.text ?? lesson.lesson.title, source: sourceOf(lesson, fig?.source?.page) };
  }

  if (intent === "quiz") {
    const e = lesson.explain?.find((x) => x.check);
    if (e?.check) return { kind: "answer", text: { en: "Here is one to try.", fa: "این یکی را امتحان کن." }, source: sourceOf(lesson, e.page), check: e.check };
  }

  if (intent === "flashcards") {
    const cards = lesson.blocks.flatMap((b) => (b.type === "keyTerms" ? b.terms : [])).map((t) => {
      const def = lesson.blocks.find((b) => "text" in b && normalize(b.text.en).includes(normalize(t.en))) as { text: Multi } | undefined;
      return { front: t, back: def ? { en: firstSentences(def.text.en, 1), fa: firstSentences(def.text.fa, 1) } : t };
    });
    return { kind: "cards", cards, source: src };
  }

  if (intent === "simpler" || intent === "example") {
    const e = lesson.explain?.[opts.lastExplain ?? 0] ?? lesson.explain?.[0];
    if (e) {
      const text = intent === "simpler" ? e.simpler ?? e.answer : e.example ?? e.answer;
      return { kind: "answer", text, source: sourceOf(lesson, e.page), explainIndex: opts.lastExplain ?? 0 };
    }
  }

  const hit = bestExplain(lesson, question);
  if (hit) {
    if (model) {
      const m = await model.answer({ question, lesson, context: [hit.e.answer.en], lang: opts.lang ?? "en" }).catch(() => null);
      if (m) return { kind: "answer", text: m, example: hit.e.example, source: sourceOf(lesson, hit.e.page), check: hit.e.check, explainIndex: hit.i };
    }
    return { kind: "answer", text: hit.e.answer, example: hit.e.example, source: sourceOf(lesson, hit.e.page), check: hit.e.check, explainIndex: hit.i };
  }

  const block = blockHit(lesson, question);
  if (block) return { kind: "answer", text: block, source: src };

  // Honest state: not on this page. Look in her other books, then the index of books she doesn't have.
  const q = tokens(question);
  for (const other of allLessons()) {
    if (!isFull(other) || other.id === lesson.id) continue;
    const h = bestExplain(other, question);
    if (h) {
      return {
        kind: "notHere", question,
        elsewhere: { id: other.id, label: sourceOf(other).label, snippet: { en: `"…${firstSentences(stripMd(h.e.answer.en), 1).slice(0, 60)}…"`, fa: `«…${firstSentences(stripMd(h.e.answer.fa), 1).slice(0, 60)}…»` }, onPhone: true, subject: other.subject, grade: other.grade },
        shortAnswer: h.e.answer,
      };
    }
  }
  const remote = ELSEWHERE.find((r) => q.some((w) => r.terms.some((t) => normalize(t) === w || (w.length > 3 && normalize(t).startsWith(w)))));
  if (remote) {
    const s = SUBJECTS[remote.subject];
    return {
      kind: "notHere", question,
      elsewhere: { id: remote.id, label: { en: `${s.short.en} ${remote.grade} · Lesson ${remote.n}`, fa: `${s.short.fa} ${remote.grade} · درس ${remote.n}` }, snippet: { en: `"${remote.snippet.en}"`, fa: `«${remote.snippet.fa}»` }, onPhone: false, sizeMB: remote.sizeMB, subject: remote.subject, grade: remote.grade },
      shortAnswer: remote.shortAnswer,
    };
  }
  return { kind: "notHere", question };
}

/** Three questions from where she is: her lesson first, then the rest of its unit. */
export function suggestionsFor(lessonId: string): { q: Multi; tint: "saf" | "teal" | "vio"; lessonId: string }[] {
  const l = lessonById(lessonId);
  if (!l || !isFull(l)) return [];
  const tints: ("saf" | "teal" | "vio")[] = ["saf", "teal", "vio"];
  const unit = allLessons().filter((x): x is Lesson => isFull(x) && x.grade === l.grade && x.subject === l.subject && x.unit.n === l.unit.n && x.id !== l.id);
  const pool = [l, ...unit.sort((a, b) => a.lesson.n - b.lesson.n)];
  const out: { q: Multi; tint: "saf" | "teal" | "vio"; lessonId: string }[] = [];
  for (const lesson of pool) for (const e of lesson.explain ?? []) {
    if (out.length >= 2) break;
    out.push({ q: { en: cap(e.q[0]) + "?", fa: (e.q.find((x) => /[\u0600-\u06FF]/.test(x)) ?? e.q[0]) + "؟" }, tint: tints[out.length], lessonId: lesson.id });
  }
  const topic = l.subject === "math" ? { en: "Show me fractions as a picture", fa: "کسرها را با تصویر نشانم بده" } : { en: `Show me ${l.lesson.title.en.toLowerCase()} as a picture`, fa: `${l.lesson.title.fa} را با تصویر نشانم بده` };
  out.push({ q: topic, tint: "vio", lessonId: pool.find((x) => x.blocks.some((b) => b.type === "figure"))?.id ?? l.id });
  return out.slice(0, 3);
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const stripMd = (s: string) => s.replace(/\*\*/g, "");
function firstSentences(s: string, n: number): string {
  const parts = s.match(/[^.!?؟]+[.!?؟]?/g) ?? [s];
  return parts.slice(0, n).join("").trim();
}
