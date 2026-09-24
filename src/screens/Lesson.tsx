import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Full } from "../components/Shell";
import { Art } from "../components/Art";
import { Icon } from "../components/Icon";
import { Figure } from "../components/Figure";
import { askPanel, Chat } from "../components/Chat";
import { IconBtn, Press, Rich, Thumb } from "../components/ui";
import { useApp } from "../state/app";
import { useLang, type Multi, SEP } from "../lib/i18n";
import { useDesktop } from "../lib/useMedia";
import { bookOfLesson, lessonById, lessonNeighbours } from "../content/library";
import { isFull, type Block, type Lesson } from "../content/schema";
import { SUBJECTS } from "../content/subjects";
import { setById } from "../content/practice";
import type { Intent } from "../lib/tutor";

type Script = "en" | "fa";

/** 15 Lesson (phones) and W2 Lesson + Ustad side by side (laptops).
 *  Our own lesson, parsed from the textbook: never a PDF. */
export function LessonScreen() {
  const { id = "" } = useParams();
  const { update } = useApp();
  const desk = useDesktop();
  const { lang } = useLang();
  const [script, setScript] = useState<Script>(lang === "en" ? "en" : "fa");
  const l = lessonById(id);

  useEffect(() => {
    if (l && isFull(l)) update((s) => (s.reading === id ? s : { ...s, reading: id }));
  }, [id, l, update]);

  if (!l) return null;
  if (!isFull(l)) return <StubLesson id={id} />;
  return desk ? <LessonDesk l={l} script={script} setScript={setScript} /> : <LessonPhone l={l} script={script} setScript={setScript} />;
}

function useAsk(l: Lesson, desk: boolean) {
  const go = useNavigate();
  return (text: string, intent?: Intent) => {
    if (desk) askPanel(l.id, text, intent);
    else go(`/chat/${l.id}?q=${encodeURIComponent(text)}`);
  };
}

function questionFor(l: Lesson, b: Block): string {
  const page = "source" in b ? b.source?.page : undefined;
  const e = l.explain?.find((x) => x.page === page) ?? l.explain?.[0];
  if (e) return e.q[0].charAt(0).toUpperCase() + e.q[0].slice(1) + "?";
  return "Explain this lesson";
}

function ScriptToggle({ script, setScript }: { script: Script; setScript: (s: Script) => void }) {
  return (
    <div role="tablist" style={{ height: 36, padding: 4, borderRadius: 12, background: "rgba(255,255,255,.92)", display: "flex", gap: 2 }}>
      {(["en", "fa"] as Script[]).map((s) => (
        <button key={s} role="tab" aria-selected={script === s} onClick={() => setScript(s)} className="press flat" style={{ padding: "0 10px", borderRadius: 9, background: script === s ? "#1C1433" : "transparent", color: script === s ? "#FFFFFF" : "#1C1433", font: s === "en" ? "800 12px/28px var(--font-latin)" : "800 13px/28px var(--font-rtl)", transition: "background-color 160ms" }}>{s === "en" ? "EN" : "دری"}</button>
      ))}
    </div>
  );
}

/* ── blocks ────────────────────────────────────────────────────── */

function Blocks({ l, script, big, onAsk, only }: { l: Lesson; script: Script; big?: boolean; onAsk: (b: Block) => void; only?: Block["type"][] }) {
  const s = SUBJECTS[l.subject];
  const T = (v: Multi) => (script === "en" ? v.en : v.fa);
  const dir = script === "fa" ? "rtl" : "ltr";
  const fa = script === "fa";
  const bodyFont = (w: number, px: number, lh: number) => fa ? `${w} ${Math.round(px * 1.08)}px/${Math.max(lh, 1.7)} var(--font-rtl)` : `${w} ${px}px/${lh} var(--font-latin)`;
  const blocks = l.blocks.filter((b) => (only ? only.includes(b.type) : true));
  let i = 0;
  return (
    <>
      {blocks.map((b, k) => {
        const idx = i++;
        const enter = { className: "u-enter", style: { ["--i" as string]: idx + 1 } as React.CSSProperties };
        const tap = (child: React.ReactNode, style: React.CSSProperties = {}) => (
          <button key={k} {...enter} onClick={() => onAsk(b)} dir={dir} className="u-enter press flat" title="Ask Ustad about this" style={{ ...enter.style, textAlign: "start", display: "block", width: "100%", ...style }}>{child}</button>
        );
        switch (b.type) {
          case "keyIdea":
            return tap(
              <div style={{ background: "#FFF1CC", borderRadius: big ? 22 : 20, padding: big ? "16px 18px" : "12px 14px", display: "flex", gap: big ? 12 : 10, boxShadow: big ? "0 0 0 3px #FFB31A" : undefined }}>
                <div style={{ width: big ? 36 : 30, height: big ? 40 : 34, borderRadius: big ? "18px 18px 8px 8px" : "15px 15px 7px 7px", background: "#FFB31A", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon n="star" s={big ? 18 : 16} c="#1C1433" f="#1C1433" /></div>
                <div>
                  <div className="eyebrow" style={{ fontSize: big ? 12 : 11, color: "#7A4E00" }}>{fa ? "نکته اصلی" : "Key idea"}</div>
                  <div className={fa ? "fa" : undefined} style={{ font: bodyFont(700, big ? 18 : 15, 1.45), color: "#1C1433", marginTop: big ? 6 : 5 }}><Rich text={T(b.text)} /></div>
                </div>
              </div>,
            );
          case "explanation":
            return tap(<div className={fa ? "fa" : undefined} style={{ font: bodyFont(500, big ? 17 : 16, 1.65), color: "#1C1433" }}><Rich text={T(b.text)} /></div>);
          case "figure":
            return (
              <div key={k} {...enter} style={{ ...enter.style, animation: big ? "qBob 4s ease-in-out infinite" : undefined }}>
                <div className={big ? undefined : "u-enter"} style={{ background: "#FFFFFF", borderRadius: big ? 26 : 20, padding: big ? 22 : "12px 14px", boxShadow: big ? "0 5px 0 #EFE6DA" : "0 4px 0 #EFE6DA" }}>
                  <Figure spec={b.spec} big={big} color={s.key === "chem" ? "#F46A24" : s.bg} />
                  {b.caption && <div dir={dir} className={fa ? "fa" : undefined} style={{ font: fa ? `600 ${big ? 15 : 13}px/1.6 var(--font-rtl)` : `600 ${big ? 14 : 12}px/1.4 var(--font-latin)`, color: "#6F6A88", textAlign: "center", marginTop: big ? 14 : 8 }}>{T(b.caption)}</div>}
                </div>
              </div>
            );
          case "keyTerms":
            return (
              <div key={k} {...enter} dir={dir} style={{ ...enter.style, display: "flex", gap: big ? 8 : 6, flexWrap: "wrap" }}>
                {b.terms.map((t, j) => (
                  <span key={j} className={fa ? "fa" : undefined} style={{ height: big ? 36 : 32, padding: big ? "0 14px" : "0 11px", borderRadius: 999, background: s.tint, display: "inline-flex", alignItems: "center", font: fa ? `800 ${big ? 15 : 13}px/1 var(--font-rtl)` : `800 ${big ? 14 : 12}px/1 var(--font-latin)`, color: s.ink, animation: `uPop 320ms var(--ease-pop) ${(idx + 1) * 140 + j * 60}ms both` }}>{T(t)}</span>
                ))}
              </div>
            );
          case "workedExample":
            return tap(
              <div style={{ background: "#FFFFFF", borderRadius: big ? 22 : 20, padding: big ? "16px 18px" : "12px 14px", boxShadow: "0 4px 0 #EFE6DA" }}>
                <div className="eyebrow" style={{ fontSize: big ? 12 : 11, color: "#00827E" }}>{fa ? "مثال حل‌شده" : "Worked example"}</div>
                <div className={fa ? "fa" : undefined} style={{ font: bodyFont(600, big ? 16 : 14, 1.5), color: "#1C1433", marginTop: big ? 8 : 6 }}><Rich text={T(b.text).replace(/= (\d+)\.$/, "= **$1**.")} /></div>
              </div>,
            );
          case "check":
            return <Check key={k} b={b} script={script} big={big} i={idx + 1} />;
        }
      })}
    </>
  );
}

function Check({ b, script, big, i }: { b: Extract<Block, { type: "check" }>; script: Script; big?: boolean; i: number }) {
  const [picked, setPicked] = useState<number | null>(null);
  const fa = script === "fa";
  const right = picked === b.answer;
  return (
    <div className="u-enter" dir={fa ? "rtl" : "ltr"} style={{ ["--i" as string]: i, background: "#7443F0", borderRadius: 24, padding: big ? "18px 20px" : "14px 16px", boxShadow: "0 6px 0 #4F24B8", display: "flex", flexDirection: "column", gap: 12 } as React.CSSProperties}>
      <div className="eyebrow" style={{ color: "#E4DBFF" }}>{fa ? "خودت را امتحان کن" : "Check yourself"}</div>
      <div className={fa ? "fa" : undefined} style={{ font: fa ? "800 20px/1.6 var(--font-rtl)" : "800 19px/1.35 var(--font-latin)", color: "#FFFFFF" }}>{fa ? b.question.fa : b.question.en}</div>
      <div style={{ display: "flex", gap: 10 }}>
        {b.options.map((o, j) => {
          const isRight = right && j === b.answer;
          const quiet = picked === j && !right;
          return (
            <button key={j} disabled={right} onClick={() => setPicked(j)} className="press flat locked" style={{ flex: 1, height: 50, borderRadius: 14, background: isRight ? "#1F8F3F" : quiet ? "#F3ECE2" : "rgba(255,255,255,.16)", boxShadow: isRight ? "0 4px 0 #146B2D" : undefined, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, font: "900 20px/1 var(--font-latin)", color: quiet ? "#6F6A88" : "#FFFFFF", transition: "background-color 200ms", animation: isRight ? "uCorrect 360ms var(--ease-pop)" : undefined }}>
              {isRight && <Icon n="check" s={20} c="#FFFFFF" w={3} style={{ animation: "uCheck 360ms var(--ease-pop)" }} />}{fa ? o.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]) : o}
            </button>
          );
        })}
      </div>
      {right && <div className="u-pop" style={{ alignSelf: "flex-start", height: 32, padding: "0 12px", borderRadius: 999, background: "#FFB31A", boxShadow: "0 3px 0 #C98300", display: "flex", alignItems: "center", gap: 6, font: "900 14px/1 var(--font-latin)", color: "#1C1433" }}><Icon n="star" s={16} c="#1C1433" f="#1C1433" />Afarin!</div>}
      {picked !== null && !right && <div className="u-fade" style={{ font: "700 13px/1.4 var(--font-latin)", color: "#E4DBFF" }}>{fa ? "این نه · دوباره فکر کن" : "Not this one · think again"}</div>}
    </div>
  );
}

function SourceLine({ l, script, full }: { l: Lesson; script: Script; full?: boolean }) {
  const { t } = useLang();
  const s = SUBJECTS[l.subject];
  const p = l.source.pages.join("–");
  const text = script === "fa"
    ? `ساخته‌شده از کتاب درسی ص ${l.source.pages.map((n) => new Intl.NumberFormat("fa-AF").format(n)).join("–")} · بازبینی‌شده توسط معلم`
    : full ? `Built from Grade ${l.grade} ${s.name.en} textbook p. ${p} · teacher-reviewed` : `Built from textbook p. ${p} · ${l.reviewed ? "teacher-reviewed" : t("teacherReviewed")}`;
  return (
    <div className="u-fade" style={{ ["--i" as string]: 8, display: "inline-flex", alignSelf: "flex-start", alignItems: "center", gap: 6, minHeight: 28, padding: "4px 10px", borderRadius: 999, border: "2px solid #EFE6DA", font: `700 ${full ? 12 : 11}px/1.3 ${script === "fa" ? "var(--font-rtl)" : "var(--font-latin)"}`, color: "#6F6A88" } as React.CSSProperties}>
      <Icon n="book" s={full ? 15 : 14} c="#6F6A88" w={2.4} />{text}
    </div>
  );
}

function Tray({ l, onAsk, big }: { l: Lesson; onAsk: (text: string, intent?: Intent) => void; big?: boolean }) {
  const { m } = useLang();
  const go = useNavigate();
  const practice = () => go(`/quiz/${setById(l.id) ? l.id : l.subject === "math" ? "math8-u3" : "chem12-2.3"}`);
  const items: [string, "lines" | "shapes" | "cards" | "practice", string, () => void][] = [
    [m({ en: "Simpler", fa: "ساده‌تر" }), "lines", "#19B8B0", () => onAsk(m({ en: "Simpler, please", fa: "ساده‌تر لطفا" }), "simpler")],
    [m({ en: "Show me", fa: "نشانم بده" }), "shapes", "#B9A2FF", () => onAsk(m({ en: "Show me", fa: "نشانم بده" }), "showMe")],
    [m({ en: "Flashcards", fa: "کارت‌ها" }), "cards", "#FFB31A", () => onAsk(m({ en: "Make flashcards", fa: "کارت بساز" }), "flashcards")],
    [big ? m({ en: "Practice this lesson", fa: "تمرین این درس" }) : m({ en: "Practice", fa: "تمرین" }), "practice", "#7BC043", practice],
  ];
  if (big) {
    return (
      <div style={{ height: 84, background: "#1C1433", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flex: "none" }}>
        {items.map(([label, icon, c, fn]) => (
          <Press key={icon} flat onClick={fn} style={{ height: 52, padding: "0 18px", borderRadius: 14, background: "rgba(255,255,255,.1)", display: "flex", alignItems: "center", gap: 8, font: "800 15px/1 var(--font-latin)", color: "#FFFFFF" }}><Icon n={icon} s={20} c={c} w={2.4} />{label}</Press>
        ))}
      </div>
    );
  }
  return (
    <div style={{ flex: "none", background: "#1C1433", padding: "12px 12px calc(20px + var(--safe-bottom))", display: "flex", flexDirection: "column", gap: 10, borderRadius: "26px 26px 0 0", marginTop: 10, position: "sticky", bottom: 0 }}>
      <Press onClick={() => onAsk(m({ en: "Explain this lesson", fa: "این درس را توضیح بده" }), "explain")} style={{ height: 56, borderRadius: 16, background: "#D81E57", boxShadow: "0 5px 0 #9A1240", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, font: "800 17px/1 var(--font-latin)", color: "#FFFFFF" }}>
        <Icon n="ask" s={22} c="#FFFFFF" w={2.4} />{m({ en: "Ask Ustad about this lesson", fa: "درباره این درس از استاد بپرس" })}
      </Press>
      <div style={{ display: "flex", gap: 8 }}>
        {items.map(([label, icon, c, fn]) => (
          <Press key={icon} flat onClick={fn} style={{ flex: 1, height: 48, borderRadius: 14, background: "rgba(255,255,255,.1)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, font: "700 11px/1 var(--font-latin)", color: "#FFFFFF" }}><Icon n={icon} s={18} c={c} w={2.4} />{label}</Press>
        ))}
      </div>
    </div>
  );
}

/* ── 15 · phone ────────────────────────────────────────────────── */

function LessonPhone({ l, script, setScript }: { l: Lesson; script: Script; setScript: (s: Script) => void }) {
  const go = useNavigate();
  const { m, t } = useLang();
  const s = SUBJECTS[l.subject];
  const ask = useAsk(l, false);
  return (
    <Full>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
        <div style={{ height: "calc(150px + var(--safe-top))", position: "relative", overflow: "hidden", flex: "none" }}>
          <div style={{ position: "absolute", inset: 0 }}><Art seed={`lesson-${l.id}`} w={390} h={150} cols={6} bg={s.bg} anim /></div>
          <div style={{ position: "absolute", insetInlineStart: 10, top: "calc(var(--safe-top) + 34px)" }}><IconBtn n="back" bg="rgba(255,255,255,.92)" c="#1C1433" s={22} w={2.6} label={t("back")} onClick={() => go(-1)} /></div>
          <div style={{ position: "absolute", insetInlineEnd: 12, top: "calc(var(--safe-top) + 38px)" }}><ScriptToggle script={script} setScript={setScript} /></div>
          <div style={{ position: "absolute", insetInline: 16, bottom: 14, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div style={{ height: 30, padding: "0 12px", borderRadius: 999, background: "#FFFFFF", display: "flex", alignItems: "center", font: "800 12px/1 var(--font-latin)", color: s.ink }}>{m(s.short)} {l.grade}{SEP}{m({ en: "Unit", fa: "فصل" })} {l.unit.n}{SEP}{m({ en: "Lesson", fa: "درس" })} {l.lesson.n}</div>
            <div style={{ height: 30, padding: "0 12px", borderRadius: 999, background: "#1C1433", display: "flex", alignItems: "center", font: "800 12px/1 var(--font-latin)", color: "#FFB31A" }}>{l.lesson.minutes} min</div>
          </div>
        </div>
        <div style={{ flex: 1, padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="u-enter" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <h1 style={{ margin: 0, font: "900 30px/1 var(--font-latin)", letterSpacing: "-.02em", color: "#1C1433" }}>{l.lesson.title.en}</h1>
            <div dir="rtl" className="fa" style={{ font: "800 20px/1.4 var(--font-rtl)", color: s.ink }}>{l.lesson.title.fa}</div>
          </div>
          <Blocks l={l} script={script} onAsk={(b) => ask(questionFor(l, b))} only={["keyIdea", "figure", "keyTerms", "workedExample", "explanation", "check"]} />
          <SourceLine l={l} script={script} />
        </div>
        <Tray l={l} onAsk={ask} />
      </div>
    </Full>
  );
}

/* ── W2 · laptop ───────────────────────────────────────────────── */

function LessonDesk({ l, script, setScript }: { l: Lesson; script: Script; setScript: (s: Script) => void }) {
  const go = useNavigate();
  const { m, t, dir } = useLang();
  const s = SUBJECTS[l.subject];
  const nb = lessonNeighbours(l.id);
  const ask = useAsk(l, true);
  const [marked, setMarked] = useState(false);
  const [zoom, setZoom] = useState(1);
  return (
    <div dir={dir} className="screen" style={{ height: "100dvh", display: "flex", flexDirection: "row", background: "#3A3350" }}>
      <div style={{ flex: 1.15, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ height: 72, background: "#1C1433", display: "flex", alignItems: "center", gap: 14, padding: "0 20px", flex: "none" }}>
          <IconBtn n="back" bg="rgba(255,255,255,.1)" c="#FFFFFF" s={22} label={t("back")} onClick={() => go(-1)} />
          <Thumb subject={l.subject} grade={l.grade} w={34} h={42} r="12px 12px 5px 5px" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: "800 17px/1.1 var(--font-latin)", color: "#FFFFFF" }}>{m({ en: `Grade ${l.grade} ${s.name.en}`, fa: `${s.name.fa} صنف ${l.grade}` })}</div>
            <div style={{ font: "600 13px/1.4 var(--font-latin)", color: "#BDB6D9" }}>{m({ en: "Unit", fa: "فصل" })} {l.unit.n}{SEP}{m(l.unit.title)}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.1)", borderRadius: 14, padding: 4 }}>
            <IconBtn n="back" c="#FFFFFF" s={20} size={40} label={m({ en: "Previous lesson", fa: "درس قبلی" })} disabled={!nb.prev} onClick={() => nb.prev && go(`/lesson/${nb.prev.id}`, { replace: true })} />
            <div style={{ font: "800 15px/1 var(--font-latin)", color: "#FFFFFF", padding: "0 6px" }}>{m({ en: `Lesson ${nb.index + 1} of ${nb.total}`, fa: `درس ${nb.index + 1} از ${nb.total}` })}</div>
            <IconBtn n="next" c="#FFFFFF" s={20} size={40} label={m({ en: "Next lesson", fa: "درس بعدی" })} disabled={!nb.next} onClick={() => nb.next && go(`/lesson/${nb.next.id}`, { replace: true })} />
          </div>
          <ScriptToggle script={script} setScript={setScript} />
          <IconBtn n="zoom" c="#FFFFFF" s={22} label={m({ en: "Bigger text", fa: "متن بزرگ‌تر" })} onClick={() => setZoom((z) => (z >= 1.2 ? 1 : z + 0.1))} />
          <IconBtn n="bookmark" c="#FFB31A" s={22} f={marked ? "#FFB31A" : "none"} label={m({ en: "Bookmark", fa: "نشانه" })} onClick={() => setMarked((x) => !x)} />
        </div>
        <div key={l.id} className="vscroll" style={{ flex: 1, display: "flex", gap: 24, padding: "28px 32px", minHeight: 0, background: "#FFF8EF", zoom } as React.CSSProperties}>
          <div style={{ flex: 1.2, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            <div className="u-enter" style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
              <h1 style={{ margin: 0, font: "900 44px/1 var(--font-latin)", letterSpacing: "-.02em", color: "#1C1433" }}>{l.lesson.title.en}</h1>
              <div dir="rtl" className="fa" style={{ font: "800 26px/1.4 var(--font-rtl)", color: s.ink }}>{l.lesson.title.fa}</div>
            </div>
            <Blocks l={l} script={script} big onAsk={(b) => ask(questionFor(l, b))} only={["keyIdea", "explanation", "workedExample"]} />
            <SourceLine l={l} script={script} full />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            <Blocks l={l} script={script} big onAsk={(b) => ask(questionFor(l, b))} only={["figure", "keyTerms", "check"]} />
          </div>
        </div>
        <Tray l={l} onAsk={ask} big />
      </div>
      <div style={{ width: 520, flex: "none", background: "#FFF8EF", display: "flex", flexDirection: "column" }}>
        <Chat lessonId={l.id} variant="panel" />
      </div>
    </div>
  );
}

function StubLesson({ id }: { id: string }) {
  const go = useNavigate();
  const { m, t } = useLang();
  const l = lessonById(id)!;
  const s = SUBJECTS[l.subject];
  const book = bookOfLesson(l);
  return (
    <Full>
      <div style={{ height: "calc(150px + var(--safe-top))", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0 }}><Art seed={`lesson-${l.id}`} w={390} h={150} cols={6} bg={s.bg} anim /></div>
        <div style={{ position: "absolute", insetInlineStart: 10, top: "calc(var(--safe-top) + 34px)" }}><IconBtn n="back" bg="rgba(255,255,255,.92)" s={22} w={2.6} label={t("back")} onClick={() => go(-1)} /></div>
      </div>
      <div className="col u-enter" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, maxWidth: 560 }}>
        <div style={{ font: "800 13px/1 var(--font-latin)", color: s.ink }}>{m(s.short)} {l.grade}{SEP}{m({ en: "Unit", fa: "فصل" })} {l.unit.n}{SEP}{m({ en: "Lesson", fa: "درس" })} {l.lesson.n}</div>
        <h1 style={{ margin: 0, font: "900 28px/1.1 var(--font-latin)", color: "#1C1433" }}>{m(l.unit.title)}</h1>
        <div style={{ background: "#FFFFFF", border: "2px dashed #D9CDBB", borderRadius: 22, padding: 18, display: "flex", gap: 12 }}>
          <Icon n="box" s={26} c="#7A4E00" w={2.4} />
          <div style={{ font: "600 15px/1.5 var(--font-latin)", color: "#4E4868" }}>
            {book?.installed
              ? m({ en: `This lesson (textbook p. ${l.source.pages.join("–")}) comes in the next pack update. The teachers are still checking it.`, fa: "این درس با به‌روزرسانی بعدی می‌آید. معلم‌ها هنوز آن را بررسی می‌کنند." })
              : m({ en: "This book isn't on your phone yet. Get it from a nearby phone or a memory card.", fa: "این کتاب هنوز در گوشی تو نیست. آن را از گوشی نزدیک یا کارت حافظه بگیر." })}
          </div>
        </div>
        {!book?.installed && <Press onClick={() => go("/packs")} style={{ height: 56, borderRadius: 16, background: "#FFB31A", boxShadow: "0 5px 0 #C98300", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, font: "800 17px/1 var(--font-latin)", color: "#1C1433" }}><Icon n="download" s={22} c="#1C1433" w={2.4} />{m({ en: "Get this book", fa: "این کتاب را بگیر" })}</Press>}
      </div>
    </Full>
  );
}
