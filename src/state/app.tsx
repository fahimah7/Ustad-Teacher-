import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { closeVault, isOpen, loadVault, openDeviceVault, openVault, saveVault } from "../lib/store";
import { formatNum, isRtl, LangContext, pickMulti, setSep, STRINGS, type Lang, type LangCtx, type Multi } from "../lib/i18n";
import type { Reply } from "../lib/tutor";
import type { Scrubbed } from "../lib/scrub";

/* ── shapes ─────────────────────────────────────────────────────── */

export type ChatMsg =
  | { id: string; from: "me"; text: string; voice?: { seconds: number; url?: string } }
  | { id: string; from: "ustad"; reply: Reply; picked?: number };

export type SavedQuestion = { id: string; q: string; lessonId: string; answer?: Multi };

export type Certificate = {
  id: string; grade: number; subject: string; score: number; date: string;
  recordId: string; sha256: string; status: "saved" | "confirming" | "confirmed";
};

export type School = {
  lang: Lang;
  stars: number;
  continueAt: { lessonId: string; page: number; pct: number; minutesLeft: number };
  reading: string; // lesson Ustad is attached to
  chapters: Record<string, { done: number; total: number }>; // per subject, placed grade
  lessonsDone: string[];
  chats: Record<string, ChatMsg[]>;
  questions: SavedQuestion[];
  certificates: Certificate[];
  chapterLights: Record<string, number>; // `${subject}${grade}` -> chapter windows lit
  recent: string[];
};

export type Letter = {
  id: string; createdAt: number; lang: Lang; draft: string;
  status: "draft" | "reviewed" | "kept" | "queued";
  scrubbed?: Scrubbed; theme?: number;
  outbox?: { pubkey: string; event: unknown };
};

export type Voice = { letters: Letter[]; rightsDone: Record<string, number> };

const SCHOOL_DEFAULT: School = {
  lang: "en",
  stars: 12,
  continueAt: { lessonId: "math8-3.2", page: 41, pct: 72, minutesLeft: 12 },
  reading: "chem12-2.3",
  chapters: { math: { done: 3, total: 9 }, bio: { done: 5, total: 8 }, chem: { done: 1, total: 7 }, phys: { done: 2, total: 8 } },
  lessonsDone: [],
  chats: {},
  questions: [
    { id: "q1", q: "What is an isotope?", lessonId: "chem12-2.3" },
    { id: "q2", q: "Why do we flip the fraction to divide?", lessonId: "math8-3.4" },
  ],
  certificates: [
    // Demo record, invented: arrived with its proof already confirmed.
    { id: "c-g8-math", grade: 8, subject: "math", score: 86, date: "2026-09-12", recordId: "7F3A91C20B6E", sha256: "7f3a91c20b6e4d1a9c55e8f0b2d7a6c3e1f49b8d20a7c6e5f3b1d9a8c7e6f5d4", status: "confirmed" },
    { id: "c-g7-dari", grade: 7, subject: "dari", score: 91, date: "2026-06-30", recordId: "2C8D51E07A94", sha256: "2c8d51e07a94b3f6d2e1c0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9", status: "confirmed" },
  ],
  chapterLights: { chem12: 2, math8: 2 },
  recent: ["What is photosynthesis?", "grade 8 math page 41"],
};

const VOICE_DEFAULT: Voice = { letters: [], rightsDone: { "1": 5, "2": 3, "3": 1, "4": 0 } };

/* ── context ────────────────────────────────────────────────────── */

type AppCtx = {
  ready: boolean;
  school: School;
  update(fn: (s: School) => School): void;
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

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [school, setSchool] = useState<School>(SCHOOL_DEFAULT);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voice, setVoice] = useState<Voice>(VOICE_DEFAULT);
  const [reducedMotion, setReduced] = useState(false);
  const saveTimer = useRef<number | undefined>(undefined);
  const voiceTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    openDeviceVault("school")
      .then(() => loadVault("school", SCHOOL_DEFAULT))
      .then((s) => { setSchool(s); setReady(true); })
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
    ready, school, update,
    voiceOpen, openVoice, closeVoice, voice, updateVoice, reducedMotion,
  }), [ready, school, update, voiceOpen, openVoice, closeVoice, voice, updateVoice, reducedMotion]);

  const lang = school.lang;
  setSep(lang);
  const langValue = useMemo<LangCtx>(() => ({
    lang, rtl: isRtl(lang), dir: isRtl(lang) ? "rtl" : "ltr",
    setLang: (l) => update((s) => ({ ...s, lang: l })),
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
