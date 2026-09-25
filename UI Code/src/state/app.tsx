import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { closeVault, isOpen, loadVault, openDeviceVault, openVault, saveVault } from "../lib/store";
import { formatNum, isRtl, LangContext, pickMulti, setSep, STRINGS, type Lang, type LangCtx, type Multi } from "../lib/i18n";
import type { Reply } from "../lib/tutor";
import type { Scrubbed } from "../lib/scrub";
import { bookById, installedBooks, lessonForPage, lessonById } from "../content/library";

/* ── shapes ─────────────────────────────────────────────────────── */

export type ChatMsg =
  | { id: string; from: "me"; text: string; page?: number; voice?: { seconds: number; url?: string } }
  | { id: string; from: "ustad"; reply: Reply; picked?: number; page?: number }
  /** Marks where the student moved to another page: history before it isn't sent to the model. */
  | { id: string; from: "page"; page: number };

export type SavedQuestion = { id: string; q: string; lessonId: string; page?: number; answer?: string };

export type Certificate = {
  id: string; grade: number; subject: string; score: number; date: string;
  recordId: string; sha256: string; status: "saved" | "confirming" | "confirmed";
};

export type School = {
  lang: Lang;
  /** The grade she chose (onboarding). */
  grade: number | null;
  stars: number;
  /** Lesson (section) Ustad is attached to; its book's page in view is `pages[bookId]`. */
  reading: string;
  /** Book id → PDF page last in view. */
  pages: Record<string, number>;
  bookmarks: Record<string, number[]>;
  lessonsDone: string[];
  /** Book id → conversation with Ustad about that book. */
  chats: Record<string, ChatMsg[]>;
  questions: SavedQuestion[];
  certificates: Certificate[];
  chapterLights: Record<string, number>; // book id -> chapters practised
  practiceBest: Record<string, number>; // practice set id -> best share right (0..1)
  recent: string[];
  /** Rights lessons she has finished ("r1-2"…). */
  rightsDone: string[];
};

export type Letter = {
  id: string; createdAt: number; lang: Lang; draft: string;
  status: "draft" | "reviewed" | "kept" | "queued";
  scrubbed?: Scrubbed; theme?: number;
  outbox?: { pubkey: string; event: unknown };
};

export type Voice = { letters: Letter[]; rightsDone: Record<string, number> };

const SCHOOL_DEFAULT: School = {
  lang: "fa",
  grade: null,
  stars: 0,
  reading: "",
  pages: {},
  bookmarks: {},
  lessonsDone: [],
  chats: {},
  questions: [],
  certificates: [],
  chapterLights: {},
  practiceBest: {},
  recent: [],
  rightsDone: [],
};

const VOICE_DEFAULT: Voice = { letters: [], rightsDone: {} };

/* ── context ────────────────────────────────────────────────────── */

type AppCtx = {
  ready: boolean;
  school: School;
  update(fn: (s: School) => School): void;
  /** What Ustad calls her. Asked at every start and kept in memory only, never saved. */
  name: string;
  setName(n: string): void;
  voiceOpen: boolean;
  openVoice(code: string): Promise<boolean>;
  closeVoice(): void;
  voice: Voice;
  updateVoice(fn: (v: Voice) => Voice): void;
  reducedMotion: boolean;
};

const Ctx = createContext<AppCtx | null>(null);
export function useApp(): AppCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp outside provider");
  return c;
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/** Drops saved state that no longer matches the books on this device. */
function repair(s: School): School {
  const reading = lessonById(s.reading) ? s.reading : "";
  return { ...s, reading, lang: s.lang === "ps" ? "fa" : s.lang, chats: typeof s.chats === "object" && s.chats ? s.chats : {}, rightsDone: Array.isArray(s.rightsDone) ? s.rightsDone : [] };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [school, setSchool] = useState<School>(SCHOOL_DEFAULT);
  const [name, setName] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voice, setVoice] = useState<Voice>(VOICE_DEFAULT);
  const [reducedMotion, setReduced] = useState(false);
  const saveTimer = useRef<number | undefined>(undefined);
  const voiceTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    openDeviceVault("school")
      .then(() => loadVault("school", SCHOOL_DEFAULT))
      .then((s) => { setSchool(repair(s)); setReady(true); })
      .catch(() => setReady(true)); // private mode or no IndexedDB: run in memory
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const update = useCallback((fn: (s: School) => School) => {
    setSchool((prev) => {
      const next = fn(prev);
      if (next === prev) return prev;
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => { if (isOpen("school")) saveVault("school", next); }, 300);
      return next;
    });
  }, []);

  const openVoice = useCallback(async (code: string) => {
    const ok = await openVault("voice", code);
    if (!ok) return false;
    setVoice(await loadVault("voice", VOICE_DEFAULT));
    setVoiceOpen(true);
    return true;
  }, []);

  const closeVoice = useCallback(() => {
    closeVault("voice");
    setVoiceOpen(false);
    setVoice(VOICE_DEFAULT);
  }, []);

  const updateVoice = useCallback((fn: (v: Voice) => Voice) => {
    setVoice((prev) => {
      const next = fn(prev);
      window.clearTimeout(voiceTimer.current);
      voiceTimer.current = window.setTimeout(() => { if (isOpen("voice")) saveVault("voice", next); }, 300);
      return next;
    });
  }, []);

  // The second door closes the moment the app leaves the screen.
  useEffect(() => {
    const onVis = () => { if (document.hidden) closeVoice(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [closeVoice]);

  const value = useMemo<AppCtx>(() => ({
    ready, school, update, name, setName,
    voiceOpen, openVoice, closeVoice, voice, updateVoice, reducedMotion,
  }), [ready, school, update, name, voiceOpen, openVoice, closeVoice, voice, updateVoice, reducedMotion]);

  const lang = school.lang;
  setSep(lang);
  const langValue = useMemo<LangCtx>(() => ({
    lang, rtl: isRtl(lang), dir: isRtl(lang) ? "rtl" : "ltr",
    // Pashto is "coming soon": it can't be chosen yet (see langOptions).
    setLang: (l) => update((s) => ({ ...s, lang: l === "ps" ? "fa" : l })),
    t: (id) => (STRINGS[id] ? pickMulti(STRINGS[id], lang) : String(id)),
    m: (v) => pickMulti(v, lang),
    num: (n) => formatNum(n, lang),
  }), [lang, update]);

  useEffect(() => {
    document.documentElement.lang = lang === "fa" ? "fa-AF" : lang === "ps" ? "ps-AF" : "en";
    document.documentElement.dir = isRtl(lang) ? "rtl" : "ltr";
  }, [lang]);

  return (
    <Ctx.Provider value={value}>
      <LangContext.Provider value={langValue}>{children}</LangContext.Provider>
    </Ctx.Provider>
  );
}

/* ── where she is ──────────────────────────────────────────────── */

/** The grade she is placed in: her choice, else the first grade with a book on this device. */
export function usePlacedGrade(): number {
  const { school } = useApp();
  return school.grade ?? installedBooks()[0]?.grade ?? 12;
}

/** The book and page Ustad is looking at with her, or null before she opens a book. */
export function useReading() {
  const { school } = useApp();
  return useMemo(() => {
    const lesson = lessonById(school.reading) ?? firstLesson(school.grade);
    if (!lesson) return null;
    const book = bookById(lesson.bookId)!;
    const page = school.pages[book.id] ?? lesson.pdf.start;
    const here = lessonForPage(book, page) ?? lesson;
    return { book, lesson: here, page, text: book.text! };
  }, [school.reading, school.pages, school.grade]);
}

function firstLesson(grade: number | null) {
  const books = installedBooks();
  const book = books.find((b) => b.grade === grade) ?? books[0];
  return book?.units[0]?.lessons[0];
}

export type { Multi };
