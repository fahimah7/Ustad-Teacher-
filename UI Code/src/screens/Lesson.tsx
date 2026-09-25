import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Full } from "../components/Shell";
import { Art } from "../components/Art";
import { Icon } from "../components/Icon";
import { askPanel, Chat } from "../components/Chat";
import { BookReader, type ReaderHandle } from "../components/BookReader";
import { PageNotes } from "../components/PageNotes";
import { IconBtn, Press, Thumb } from "../components/ui";
import { Line } from "../components/MathText";
import { useApp } from "../state/app";
import { useLang, SEP } from "../lib/i18n";
import { useDesktop } from "../lib/useMedia";
import { bookById, lessonById, lessonForPage, setForPage } from "../content/library";
import type { Book, Lesson } from "../content/schema";
import { SUBJECTS } from "../content/subjects";
import { pageLabel, type Intent } from "../lib/tutor";

type Mode = "book" | "notes";
const ZOOMS = [1, 1.25, 1.5, 2];

/** 15 Lesson (phones) and W2 Lesson + Ustad side by side (laptops): the real textbook, page by
 *  page, with the study notes one tap away. Ustad always knows the page in view. */
export function LessonScreen() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const lesson = lessonById(id);
  const book = lesson ? bookById(lesson.bookId) : undefined;
  if (!lesson || !book?.text) return <Missing />;
  const asked = Number(params.get("page"));
  const start = asked >= 1 && asked <= book.text.pageCount ? asked : lesson.pdf.start;
  return <Reader key={book.id} book={book} startLesson={lesson} startPage={start} jumpTo={asked >= 1 ? asked : undefined} />;
}

function Reader({ book, startLesson, startPage, jumpTo }: { book: Book; startLesson: Lesson; startPage: number; jumpTo?: number }) {
  const desk = useDesktop();
  const go = useNavigate();
  const { school, update } = useApp();
  const { m, lang } = useLang();
  const text = book.text!;
  const reader = useRef<ReaderHandle>(null);
  const [page, setPage] = useState(startPage);
  const [mode, setMode] = useState<Mode>("book");
  const [zoom, setZoom] = useState(1);
  const [contents, setContents] = useState(false);
  const saved = useRef(school.pages[book.id]);
  const [resume, setResume] = useState(() => (saved.current && Math.abs(saved.current - startPage) > 1 ? saved.current : null));
  const lesson = lessonForPage(book, page) ?? startLesson;
  const saveTimer = useRef<number | undefined>(undefined);

  // The page in view is what Ustad reads with her; kept for "continue" too.
  useEffect(() => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      update((s) => (s.pages[book.id] === page && s.reading === lesson.id ? s : { ...s, reading: lesson.id, pages: { ...s.pages, [book.id]: page } }));
    }, 120);
    return () => window.clearTimeout(saveTimer.current);
  }, [page, lesson.id, book.id, update]);

  // A link to a page (from an answer, search, or "continue") while the book is open.
  useEffect(() => {
    if (jumpTo && jumpTo !== page) { reader.current?.goTo(jumpTo); setPage(jumpTo); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTo]);

  const goTo = useCallback((p: number) => {
    const target = Math.min(Math.max(1, p), text.pageCount);
    setPage(target);
    reader.current?.goTo(target);
  }, [text.pageCount]);

  // Keyboard: arrows and Page Up/Down turn pages; Home/End go to the ends.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el?.closest("input, textarea, [contenteditable]")) return;
      // Dari books read right to left: ← is the next page, → the previous one. The English book
      // reads left to right, so there → is next.
      const k = e.key;
      const forward = book.subject === "eng" ? "ArrowRight" : "ArrowLeft";
      const back = book.subject === "eng" ? "ArrowLeft" : "ArrowRight";
      if (k === "PageDown" || k === forward || (k === "ArrowDown" && zoom === 1)) { e.preventDefault(); goTo(page + 1); }
      else if (k === "PageUp" || k === back || (k === "ArrowUp" && zoom === 1)) { e.preventDefault(); goTo(page - 1); }
      else if (k === "Home") { e.preventDefault(); goTo(1); }
      else if (k === "End") { e.preventDefault(); goTo(text.pageCount); }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [page, goTo, zoom, text.pageCount, book.subject]);

  const ask = (question: string, intent?: Intent) => {
    if (desk) askPanel(book.id, question, intent);
    else go(`/chat/${lesson.id}?q=${encodeURIComponent(question)}${intent ? `&intent=${intent}` : ""}`);
  };
  const practice = () => { const set = setForPage(book.id, page); if (set) go(`/quiz/${set.id}`); };
  const marks = school.bookmarks[book.id] ?? [];
  const marked = marks.includes(page);
  const toggleMark = () => update((s) => {
    const list = s.bookmarks[book.id] ?? [];
    return { ...s, bookmarks: { ...s.bookmarks, [book.id]: list.includes(page) ? list.filter((x) => x !== page) : [...list, page].sort((a, b) => a - b) } };
  });

  const view = mode === "book" ? (
    <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex" }}>
      <BookReader ref={reader} bookId={book.id} text={text} initialPage={page} zoom={zoom} onPage={(p) => { setPage(p); if (resume && Math.abs(p - startPage) > 2) setResume(null); }} label={(p) => pageLabel(book.id, p, lang)} />
      {resume && (
        <div style={{ position: "absolute", top: 14, insetInline: 0, display: "flex", justifyContent: "center", pointerEvents: "none", zIndex: 2 }}>
        <Press ledge={4} className="u-pop" onClick={() => { goTo(resume); setResume(null); }} style={{ pointerEvents: "auto", height: 42, padding: "0 16px", borderRadius: 999, background: "#FFB31A", boxShadow: "0 4px 0 #C98300", display: "flex", alignItems: "center", gap: 8, font: lang === "en" ? "800 14px/1 var(--font-latin)" : "800 15px/1 var(--font-rtl)", color: "#1C1433" }}>
          <Icon n="arrow" s={18} c="#1C1433" w={2.6} />{m({ en: `Continue from ${pageLabel(book.id, resume, "en", true)}`, fa: `ادامه از ${pageLabel(book.id, resume, "fa")}` })}
        </Press>
        </div>
      )}
    </div>
  ) : (
    <div className="vscroll" style={{ flex: 1, minHeight: 0, background: "#FFF8EF", padding: desk ? "24px 32px" : "16px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <PageNotes book={book} pdfPage={page} onAsk={(q) => ask(q)} big={desk} />
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 16 }}>
          <NavBtn dir="prev" disabled={page <= 1} onClick={() => goTo(page - 1)} />
          <NavBtn dir="next" disabled={page >= text.pageCount} onClick={() => goTo(page + 1)} />
        </div>
      </div>
    </div>
  );

  const bar = (
    <TopBar book={book} lesson={lesson} page={page} mode={mode} setMode={setMode} zoom={zoom} setZoom={setZoom}
      marked={marked} onMark={toggleMark} onContents={() => setContents(true)} onPage={goTo} desk={desk} />
  );

  return (
    <>
      {desk ? (
        <div className="screen" style={{ height: "100dvh", display: "flex", flexDirection: "row", background: "#3A3350" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            {bar}
            {view}
            <Tray onAsk={ask} onPractice={practice} big />
          </div>
          <div style={{ width: "clamp(400px, 34vw, 520px)", flex: "none", background: "#FFF8EF", display: "flex", flexDirection: "column" }}>
            <Chat lessonId={lesson.id} variant="panel" />
          </div>
        </div>
      ) : (
        <Full>
          <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
            {bar}
            {view}
            <Tray onAsk={ask} onPractice={practice} />
          </div>
        </Full>
      )}
      {contents && <Contents book={book} page={page} marks={marks} onClose={() => setContents(false)} onGo={(p) => { setContents(false); goTo(p); }} />}
    </>
  );
}

function NavBtn({ dir, disabled, onClick }: { dir: "prev" | "next"; disabled?: boolean; onClick: () => void }) {
  const { m } = useLang();
  return (
    <Press ledge={4} disabled={disabled} onClick={onClick} style={{ height: 46, padding: "0 16px", borderRadius: 14, background: "#FFFFFF", boxShadow: "0 4px 0 #EFE6DA", display: "flex", alignItems: "center", gap: 8, font: "800 14px/1 var(--font-latin)", color: "#1C1433" }}>
      {dir === "prev" && <Icon n="back" s={18} c="#1C1433" w={2.6} />}
      {dir === "prev" ? m({ en: "Previous page", fa: "صفحهٔ قبل" }) : m({ en: "Next page", fa: "صفحهٔ بعد" })}
      {dir === "next" && <Icon n="next" s={18} c="#1C1433" w={2.6} />}
    </Press>
  );
}

function ModeToggle({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  const { m } = useLang();
  return (
    <div role="tablist" style={{ height: 36, padding: 4, borderRadius: 12, background: "rgba(255,255,255,.92)", display: "flex", gap: 2, flex: "none" }}>
      {(["book", "notes"] as Mode[]).map((s) => (
        <button key={s} role="tab" aria-selected={mode === s} onClick={() => setMode(s)} className="press flat" style={{ padding: "0 10px", borderRadius: 9, background: mode === s ? "#1C1433" : "transparent", color: mode === s ? "#FFFFFF" : "#1C1433", font: "800 13px/28px var(--font-rtl)", transition: "background-color 160ms" }}>
          {s === "book" ? m({ en: "Book", fa: "کتاب" }) : m({ en: "Notes", fa: "یادداشت" })}
        </button>
      ))}
    </div>
  );
}

function TopBar({ book, lesson, page, mode, setMode, zoom, setZoom, marked, onMark, onContents, onPage, desk }: {
  book: Book; lesson: Lesson; page: number; mode: Mode; setMode: (m: Mode) => void; zoom: number; setZoom: (z: number) => void;
  marked: boolean; onMark: () => void; onContents: () => void; onPage: (p: number) => void; desk: boolean;
}) {
  const go = useNavigate();
  const { m, t, num, lang } = useLang();
  const s = SUBJECTS[book.subject];
  const total = book.text!.pageCount;
  const nextZoom = ZOOMS[(ZOOMS.indexOf(zoom) + 1) % ZOOMS.length];
  const back = () => (window.history.length > 1 ? go(-1) : go("/"));
  const titleFont = lang === "en" ? "800 17px/1.2 var(--font-latin)" : "800 17px/1.5 var(--font-rtl)";
  const pager = (
    <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,.1)", borderRadius: 14, padding: 4, flex: "none" }}>
      <IconBtn n="back" c="#FFFFFF" s={20} size={desk ? 40 : 36} label={m({ en: "Previous page", fa: "صفحهٔ قبل" })} disabled={page <= 1} onClick={() => onPage(page - 1)} />
      <div title={m({ en: `Page ${page} of ${total} in the file`, fa: `صفحهٔ ${num(page)} از ${num(total)}` })} style={{ font: "800 14px/1 var(--font-latin)", color: "#FFFFFF", padding: "0 4px", minWidth: desk ? 96 : 60, textAlign: "center", whiteSpace: "nowrap" }}>
        {pageLabel(book.id, page, lang)}
      </div>
      <IconBtn n="next" c="#FFFFFF" s={20} size={desk ? 40 : 36} label={m({ en: "Next page", fa: "صفحهٔ بعد" })} disabled={page >= total} onClick={() => onPage(page + 1)} />
    </div>
  );
  if (!desk) {
    return (
      <div style={{ position: "relative", overflow: "hidden", flex: "none", paddingTop: "var(--safe-top)", background: s.bg }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.35 }}><Art seed={`lesson-${book.id}`} w={390} h={150} cols={6} bg={s.bg} /></div>
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, padding: "10px 10px 6px" }}>
          <IconBtn n="back" bg="rgba(255,255,255,.92)" c="#1C1433" s={22} w={2.6} label={t("back")} onClick={back} />
          <div style={{ flex: 1, minWidth: 0, font: titleFont, color: s.fg, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}><Line text={m(lesson.lesson.title)} /></div>
          <ModeToggle mode={mode} setMode={setMode} />
        </div>
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, padding: "0 10px 10px" }}>
          {pager}
          <div style={{ flex: 1 }} />
          <IconBtn n="list" bg="rgba(255,255,255,.18)" c={s.fg} s={20} size={40} label={m({ en: "Contents", fa: "فهرست" })} onClick={onContents} />
          <IconBtn n="bookmark" bg="rgba(255,255,255,.18)" c="#FFB31A" f={marked ? "#FFB31A" : "none"} s={20} size={40} label={m({ en: "Bookmark", fa: "نشانه" })} onClick={onMark} />
        </div>
      </div>
    );
  }
  return (
    <div style={{ height: 72, background: "#1C1433", display: "flex", alignItems: "center", gap: 12, padding: "0 16px", flex: "none" }}>
      <IconBtn n="back" bg="rgba(255,255,255,.1)" c="#FFFFFF" s={22} label={t("back")} onClick={back} />
      <Thumb subject={book.subject} grade={book.grade} w={34} h={42} r="12px 12px 5px 5px" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: titleFont, color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}><Line text={m(lesson.lesson.title)} /></div>
        <div style={{ font: lang === "en" ? "600 13px/1.4 var(--font-latin)" : "600 13px/1.5 var(--font-rtl)", color: "#BDB6D9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {m({ en: `Grade ${book.grade} ${s.name.en}`, fa: `${s.name.fa} صنف ${num(book.grade)}` })}{SEP}{m({ en: "Chapter", fa: "فصل" })} {num(lesson.unit.n)}{SEP}{m(lesson.unit.title)}
        </div>
      </div>
      {pager}
      <ModeToggle mode={mode} setMode={setMode} />
      <IconBtn n="list" c="#FFFFFF" s={22} label={m({ en: "Contents", fa: "فهرست" })} onClick={onContents} />
      <button className="press flat" disabled={mode !== "book"} onClick={() => setZoom(nextZoom)} title={m({ en: "Zoom", fa: "بزرگ‌نمایی" })} aria-label={m({ en: "Zoom", fa: "بزرگ‌نمایی" })} style={{ height: 40, minWidth: 44, padding: "0 8px", borderRadius: 12, display: "flex", alignItems: "center", gap: 4, color: "#FFFFFF", font: "800 13px/1 var(--font-latin)", opacity: mode === "book" ? 1 : 0.4 }}>
        <Icon n="zoom" s={22} c="#FFFFFF" w={2.4} />{zoom === 1 ? "" : `${Math.round(zoom * 100)}%`}
      </button>
      <IconBtn n="bookmark" c="#FFB31A" s={22} f={marked ? "#FFB31A" : "none"} label={m({ en: "Bookmark this page", fa: "نشانه‌گذاری این صفحه" })} onClick={onMark} />
    </div>
  );
}

function Tray({ onAsk, onPractice, big }: { onAsk: (text: string, intent?: Intent) => void; onPractice: () => void; big?: boolean }) {
  const { m, lang } = useLang();
  const label = (en: string, fa: string) => m({ en, fa });
  const items: [string, "lines" | "shapes" | "cards" | "practice", string, () => void][] = [
    [label("Explain this page", "توضیح این صفحه"), "lines", "#19B8B0", () => onAsk(label("Explain this page", "این صفحه را توضیح بده"), "explain")],
    [label("Show me", "نشانم بده"), "shapes", "#B9A2FF", () => onAsk(label("Show me", "نشانم بده"), "showMe")],
    [label("Flashcards", "کارت‌ها"), "cards", "#FFB31A", () => onAsk(label("Make flashcards", "کارت بساز"), "flashcards")],
    [big ? label("Practice this chapter", "تمرین این فصل") : label("Practice", "تمرین"), "practice", "#7BC043", onPractice],
  ];
  const font = lang === "en" ? "var(--font-latin)" : "var(--font-rtl)";
  if (big) {
    return (
      <div style={{ height: 76, background: "#1C1433", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flex: "none", padding: "0 12px" }}>
        {items.map(([text, icon, c, fn]) => (
          <Press key={icon} flat onClick={fn} style={{ height: 50, padding: "0 16px", borderRadius: 14, background: "rgba(255,255,255,.1)", display: "flex", alignItems: "center", gap: 8, font: `800 15px/1 ${font}`, color: "#FFFFFF", whiteSpace: "nowrap" }}><Icon n={icon} s={20} c={c} w={2.4} />{text}</Press>
        ))}
      </div>
    );
  }
  return (
    <div style={{ flex: "none", background: "#1C1433", padding: "10px 12px calc(14px + var(--safe-bottom))", display: "flex", flexDirection: "column", gap: 8, borderRadius: "22px 22px 0 0" }}>
      <Press onClick={() => onAsk(label("Explain this page", "این صفحه را توضیح بده"), "explain")} style={{ height: 52, borderRadius: 16, background: "#D81E57", boxShadow: "0 5px 0 #9A1240", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, font: `800 16px/1 ${font}`, color: "#FFFFFF" }}>
        <Icon n="ask" s={22} c="#FFFFFF" w={2.4} />{label("Ask Ustad about this page", "دربارهٔ این صفحه از استاد بپرسید")}
      </Press>
      <div style={{ display: "flex", gap: 8 }}>
        {items.map(([text, icon, c, fn]) => (
          <Press key={icon} flat onClick={fn} style={{ flex: 1, height: 48, borderRadius: 14, background: "rgba(255,255,255,.1)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, font: `700 11px/1.2 ${font}`, color: "#FFFFFF" }}><Icon n={icon} s={18} c={c} w={2.4} />{text}</Press>
        ))}
      </div>
    </div>
  );
}

function Contents({ book, page, marks, onClose, onGo }: { book: Book; page: number; marks: number[]; onClose: () => void; onGo: (p: number) => void }) {
  const { m, num, lang } = useLang();
  const current = lessonForPage(book, page);
  const [jump, setJump] = useState("");
  const text = book.text!;
  const jumpTo = () => {
    const n = Number(jump.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))));
    if (n >= 1) onGo(text.pdfPageForPrinted(n));
  };
  const font = lang === "en" ? "var(--font-latin)" : "var(--font-rtl)";
  const here = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    here.current?.scrollIntoView({ block: "center" });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" style={{ padding: "14px 18px 22px", display: "flex", flexDirection: "column", gap: 12, width: "min(560px, 100%)" }}>
        <div style={{ width: 44, height: 5, borderRadius: 3, background: "#E6DCCD", alignSelf: "center" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, font: `900 20px/1.4 ${font}`, color: "#1C1433" }}>{m({ en: "Contents", fa: "فهرست کتاب" })}</div>
          <IconBtn n="close" label={m({ en: "Close", fa: "بستن" })} onClick={onClose} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); jumpTo(); }} style={{ display: "flex", gap: 8 }}>
          <label style={{ flex: 1, height: 46, borderRadius: 14, background: "#F7F1E8", border: "2px solid #EFE6DA", display: "flex", alignItems: "center", padding: "0 12px" }}>
            <input className="plain-input" inputMode="numeric" value={jump} onChange={(e) => setJump(e.target.value)} placeholder={m({ en: `Go to page (1–${text.lastPrintedPage ?? text.pageCount})`, fa: `رفتن به صفحهٔ (۱ تا ${num(text.lastPrintedPage ?? text.pageCount)})` })} style={{ font: `700 15px/1 ${font}` }} />
          </label>
          <Press type="submit" ledge={4} style={{ height: 46, padding: "0 16px", borderRadius: 14, background: "#00827E", boxShadow: "0 4px 0 #005F5B", font: `800 14px/1 ${font}`, color: "#FFFFFF" }}>{m({ en: "Go", fa: "برو" })}</Press>
        </form>
        {marks.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <Icon n="bookmark" s={16} c="#C98300" f="#FFB31A" />
            {marks.map((p) => <button key={p} className="press flat" onClick={() => onGo(p)} style={{ height: 32, padding: "0 10px", borderRadius: 10, background: "#FFF1CC", font: `800 13px/1 ${font}`, color: "#7A4E00" }}>{pageLabel(book.id, p, lang)}</button>)}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {book.units.map((u) => (
            <div key={u.n} style={{ background: "#FFF8EF", borderRadius: 18, padding: 10 }}>
              <button className="press flat" onClick={() => onGo(u.pdfPage)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "start", padding: "4px 2px" }}>
                <div style={{ width: 30, height: 34, borderRadius: "15px 15px 7px 7px", background: "#DDF6F3", display: "flex", alignItems: "center", justifyContent: "center", font: "900 15px/1 var(--font-latin)", color: "#005F5B", flex: "none" }}>{num(u.n)}</div>
                <div style={{ flex: 1, font: `800 16px/1.5 ${font}`, color: "#1C1433" }}>{m(u.title)}</div>
              </button>
              {u.lessons.map((l) => {
                const on = current?.id === l.id;
                return (
                  <button key={l.id} ref={on ? here : undefined} className="press flat" onClick={() => onGo(l.pdf.start)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 38, padding: "4px 8px", borderRadius: 10, background: on ? "#FFF1CC" : "transparent", textAlign: "start" }}>
                    <div style={{ flex: 1, font: `${on ? 800 : 600} 14px/1.5 ${font}`, color: "#1C1433" }}><Line text={m(l.lesson.title)} /></div>
                    <div style={{ font: "700 12px/1 var(--font-latin)", color: "#6F6A88", flex: "none" }}>{num(l.source.pages[0])}</div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Missing() {
  const go = useNavigate();
  const { m } = useLang();
  return (
    <Full>
      <div className="col u-enter" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14, maxWidth: 560 }}>
        <div style={{ background: "#FFFFFF", border: "2px dashed #D9CDBB", borderRadius: 22, padding: 18, display: "flex", gap: 12 }}>
          <Icon n="box" s={26} c="#7A4E00" w={2.4} />
          <div style={{ font: "600 15px/1.5 var(--font-latin)", color: "#4E4868" }}>{m({ en: "This book isn't on this device yet. Get it from a nearby phone or a memory card.", fa: "این کتاب هنوز در این دستگاه نیست. آن را از گوشی نزدیک یا کارت حافظه بگیرید." })}</div>
        </div>
        <Press onClick={() => go("/packs")} style={{ height: 56, borderRadius: 16, background: "#FFB31A", boxShadow: "0 5px 0 #C98300", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, font: "800 17px/1 var(--font-latin)", color: "#1C1433" }}><Icon n="download" s={22} c="#1C1433" w={2.4} />{m({ en: "Get books", fa: "گرفتن کتاب" })}</Press>
        <button className="press flat" onClick={() => go("/")} style={{ height: 44, font: "800 15px/1 var(--font-latin)", color: "#00827E" }}>{m({ en: "Home", fa: "خانه" })}</button>
      </div>
    </Full>
  );
}
