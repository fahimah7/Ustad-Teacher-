import MiniSearch from "minisearch";
import { normalize, SUBJECT_WORDS, tokens } from "./normalize";
import { allLessons, bookOfLesson, ELSEWHERE } from "../content/library";
import { isFull, type Lesson } from "../content/schema";
import type { SubjectKey } from "../content/subjects";
import type { Multi } from "./i18n";

/** One box does both jobs: "grade 12 chemistry page 13" jumps straight to the
 *  lesson that covers that page; a question returns the best lessons, with a
 *  highlighted snippet. Entirely on the phone. */

export type PageHit = { kind: "page"; lesson: Lesson; page: number };
export type LessonHit = { kind: "lesson"; lesson: Lesson; snippet: Multi; term: string; onPhone: true };
export type RemoteHit = { kind: "remote"; id: string; grade: number; subject: SubjectKey; title: Multi; n: number; snippet: Multi; sizeMB: number; term: string; onPhone: false };
export type SearchResult = { page?: PageHit; lessons: (LessonHit | RemoteHit)[]; term: string };

type Doc = { id: string; lessonId: string; text: string };

let index: MiniSearch<Doc> | null = null;
function getIndex() {
  if (index) return index;
  index = new MiniSearch<Doc>({
    fields: ["text"],
    storeFields: ["lessonId", "text"],
    processTerm: (t) => normalize(t) || null,
    searchOptions: { prefix: true, fuzzy: 0.15, boost: { text: 1 } },
  });
  const docs: Doc[] = [];
  for (const l of allLessons()) {
    if (!isFull(l)) continue;
    const pieces: string[] = [l.lesson.title.en, l.lesson.title.fa, l.unit.title.en];
    for (const b of l.blocks) {
      if ("text" in b) pieces.push(b.text.en, b.text.fa);
      if (b.type === "keyTerms") b.terms.forEach((t) => pieces.push(t.en, t.fa));
      if (b.type === "check") pieces.push(b.question.en);
    }
    for (const e of l.explain ?? []) pieces.push(...e.q, e.answer.en);
    docs.push({ id: l.id, lessonId: l.id, text: pieces.join(" \n ") });
  }
  index.addAll(docs);
  return index;
}

/** Parse "grade 12 chemistry page 13" / "کیمیا صنف ۱۲ صفحه ۱۳" / "g12 chem p13". */
export function parsePageQuery(q: string): { grade?: number; subject?: SubjectKey; page?: number } {
  const s = normalize(q);
  const grade = s.match(/(?:grade|class|g|صنف|درجه)\s*(\d{1,2})/)?.[1];
  const page = s.match(/(?:page|pg|p|صفحه|ص)\s*(\d{1,3})/)?.[1];
  let subject: SubjectKey | undefined;
  for (const w of s.split(" ")) if (SUBJECT_WORDS[w]) subject = SUBJECT_WORDS[w] as SubjectKey;
  return { grade: grade ? +grade : undefined, subject, page: page ? +page : undefined };
}

function snippetFor(l: Lesson, term: string): Multi {
  const t = normalize(term);
  for (const b of l.blocks) {
    if (!("text" in b)) continue;
    const en = b.text.en;
    const i = normalize(en).indexOf(t);
    if (i >= 0 || t === "") return { en: trimAround(en, term), fa: b.text.fa };
  }
  const first = l.blocks.find((b) => "text" in b) as { text: Multi } | undefined;
  return first ? { en: trimAround(first.text.en, term), fa: first.text.fa } : { en: "", fa: "" };
}

function trimAround(text: string, term: string): string {
  const i = text.toLowerCase().indexOf(term.toLowerCase());
  if (i < 0) return "…" + text.slice(0, 80) + "…";
  const start = Math.max(0, text.lastIndexOf(" ", Math.max(0, i - 40)));
  const end = Math.min(text.length, text.indexOf(" ", i + term.length + 36) === -1 ? text.length : text.indexOf(" ", i + term.length + 36));
  return "…" + text.slice(start, end).trim() + "…";
}

export function search(q: string): SearchResult {
  const lessons: (LessonHit | RemoteHit)[] = [];
  const parsed = parsePageQuery(q);
  let page: PageHit | undefined;

  if (parsed.page) {
    const candidates = allLessons().filter(isFull).filter((l) =>
      (!parsed.grade || l.grade === parsed.grade) && (!parsed.subject || l.subject === parsed.subject),
    );
    const exact = candidates.find((l) => l.source.pages.includes(parsed.page!));
    const near = exact ?? candidates
      .map((l) => ({ l, d: Math.min(...l.source.pages.map((p) => Math.abs(p - parsed.page!))) }))
      .sort((a, b) => a.d - b.d)[0]?.l;
    if (near && bookOfLesson(near)?.installed) page = { kind: "page", lesson: near, page: parsed.page };
  }

  const words = tokens(q).filter((w) => !/^\d+$/.test(w) && !SUBJECT_WORDS[w] && !/^(grade|page|صنف|صفحه|class)$/.test(w));
  const term = pickTerm(words);
  if (words.length) {
    const hits = getIndex().search(words.join(" "), { combineWith: "OR" });
    for (const h of hits.slice(0, 4)) {
      const l = allLessons().find((x) => x.id === h.lessonId);
      if (l && isFull(l) && l.id !== page?.lesson.id) lessons.push({ kind: "lesson", lesson: l, snippet: snippetFor(l, term), term, onPhone: true });
    }
    for (const r of ELSEWHERE) {
      if (words.some((w) => r.terms.some((t) => normalize(t).startsWith(w) || w.startsWith(normalize(t))))) {
        lessons.push({ kind: "remote", id: r.id, grade: r.grade, subject: r.subject, title: r.title, n: r.n, snippet: r.snippet, sizeMB: r.sizeMB, term, onPhone: false });
      }
    }
  }
  return { page, lessons, term };
}

function pickTerm(words: string[]): string {
  // Longest content word reads best as the highlighted term.
  return words.slice().sort((a, b) => b.length - a.length)[0] ?? "";
}
