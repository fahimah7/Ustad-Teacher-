import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Full, Tabbed } from "../components/Shell";
import { Art } from "../components/Art";
import { Icon } from "../components/Icon";
import { Floaters, StarBurst } from "../components/fx";
import { IconBtn, LetterBadge, LETTERS_EN, LETTERS_FA, Press, SourceChip, Thumb } from "../components/ui";
import { MathText } from "../components/MathText";
import { speakable } from "../tutor/mathText";
import { useApp } from "../state/app";
import { useLang, SEP } from "../lib/i18n";
import { useDesktop } from "../lib/useMedia";
import { PRACTICE_SETS, setById } from "../content/library";
import { SUBJECTS } from "../content/subjects";

const TILE = [
  { bg: "#D81E57", ledge: "#9A1240", fg: "#FFFFFF" },
  { bg: "#1C1433", ledge: "#0A0714", fg: "#FFFFFF" },
  { bg: "#FFB31A", ledge: "#C98300", fg: "#1C1433" },
  { bg: "#7443F0", ledge: "#4F24B8", fg: "#FFFFFF" },
];

type State = "idle" | "correct" | "almost";

/** Practice tab: pick a set. (Hub not in the artboards; built in the same system.) */
export function PracticeHub() {
  const { m, num } = useLang();
  const { school } = useApp();
  const go = useNavigate();
  return (
    <Tabbed tab="practice">
      <div className="screen">
        <div className="col" style={{ background: "#00827E", padding: "max(var(--safe-top), 28px) 0 64px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", insetInline: 0, bottom: 0, height: 130, opacity: 0.25 }}><Art seed="band-quiz" w={390} h={130} cols={6} bg="#00827E" anim /></div>
          <div className="desk-pad u-enter" style={{ padding: "22px 20px 0", position: "relative" }}>
            <h1 style={{ margin: 0, font: "900 36px/1 var(--font-latin)", letterSpacing: "-.02em", color: "#FFFFFF" }}>{m({ en: "Practice", fa: "تمرین" })}</h1>
            <div style={{ font: "600 15px/1.45 var(--font-latin)", color: "#DDF6F3", marginTop: 8 }}>{m({ en: "Five questions a chapter. No clock, no rush.", fa: "هر فصل پنج سوال. بدون ساعت، بدون عجله." })}</div>
          </div>
        </div>
        <div className="col desk-pad grid-2" style={{ margin: "-40px 0 0", padding: "0 16px 24px", position: "relative", gap: 12 }}>
          {PRACTICE_SETS.length === 0 && (
            <div style={{ background: "#FFFFFF", borderRadius: 26, padding: 18, border: "2px dashed #D9CDBB", font: "600 15px/1.5 var(--font-latin)", color: "#4E4868" }}>{m({ en: "No practice sets on this device yet. They come with the books.", fa: "هنوز سوال تمرینی در این دستگاه نیست. با کتاب‌ها می‌آید." })}</div>
          )}
          {PRACTICE_SETS.map((s, i) => {
            const sj = SUBJECTS[s.subject];
            const best = school.practiceBest[s.id];
            return (
              <Press key={s.id} ledge={6} className="u-tile" onClick={() => go(`/quiz/${s.id}`)} style={{ ["--i" as string]: i, background: "#FFFFFF", borderRadius: 26, boxShadow: "0 6px 0 #E6DCCD", padding: 14, display: "flex", gap: 14, alignItems: "center", textAlign: "start" } as React.CSSProperties}>
                <Thumb subject={s.subject} grade={s.grade} w={60} h={74} r="30px 30px 10px 10px" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: "800 12px/1.3 var(--font-latin)", color: sj.ink }}>{m(sj.short)} {num(s.grade)}{SEP}{m({ en: "Chapter", fa: "فصل" })} {num(s.unit)}</div>
                  <div style={{ font: "900 20px/1.35 var(--font-latin)", color: "#1C1433", marginTop: 6 }}>{m(s.title)}</div>
                  <div style={{ font: "600 13px/1.4 var(--font-latin)", color: "#6F6A88", marginTop: 2 }}>{num(s.questions.length)} {m({ en: "questions · about 3 minutes", fa: "سوال · حدود ۳ دقیقه" })}{best !== undefined ? <>{SEP}<span style={{ color: "#146B2D", fontWeight: 800 }}>{m({ en: "best", fa: "بهترین" })} {num(Math.round(best * s.questions.length))}/{num(s.questions.length)}</span></> : null}</div>
                </div>
                <div style={{ height: 44, padding: "0 16px", borderRadius: 14, background: "#FFB31A", boxShadow: "0 4px 0 #C98300", font: "800 16px/44px var(--font-latin)", color: "#1C1433" }}>{m({ en: "Play", fa: "بازی" })}</div>
              </Press>
            );
          })}
        </div>
      </div>
    </Tabbed>
  );
}

/** 16 question · 17 Afarin! · 18 Almost · W3 full screen. No countdown, never red. */
export function Quiz() {
  const { id = "" } = useParams();
  const set = setById(id);
  const go = useNavigate();
  const desk = useDesktop();
  const { m, t, num, rtl } = useLang();
  const { school, update } = useApp();
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [tried, setTried] = useState<number[]>([]);
  const [state, setState] = useState<State>("idle");
  const [right, setRight] = useState(0);
  const [earned, setEarned] = useState(0);
  const [hint, setHint] = useState(false);

  const q = set?.questions[index];

  const pick = useCallback((i: number) => {
    if (!q || state === "correct" || tried.includes(i)) return;
    setPicked(i);
    setHint(false);
    if (i === q.answer) {
      setState("correct");
      if (tried.length === 0) { setRight((r) => r + 1); setEarned((e) => e + 1); update((s) => ({ ...s, stars: s.stars + 1 })); }
      navigator.vibrate?.(20);
    } else {
      setState("almost");
      setTried((x) => [...x, i]);
    }
  }, [q, state, tried, update]);

  const next = useCallback(() => {
    if (!set) return;
    if (index + 1 >= set.questions.length) {
      const bonus = right === set.questions.length ? 1 : 0;
      const share = right / set.questions.length;
      update((s) => ({ ...s, stars: s.stars + bonus, practiceBest: { ...s.practiceBest, [set.id]: Math.max(share, s.practiceBest[set.id] ?? 0) } }));
      go(`/done/${set.id}?r=${right}&n=${set.questions.length}&s=${earned + bonus}`, { replace: true });
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
    setTried([]);
    setState("idle");
  }, [set, index, right, earned, go, update]);

  const retry = () => { setPicked(null); setState("idle"); };

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const map: Record<string, number> = { "1": 0, "2": 1, "3": 2, "4": 3, a: 0, b: 1, c: 2, d: 3 };
      if (k in map) pick(map[k]);
      else if (k === "enter") { if (state === "correct") next(); else if (state === "almost") retry(); }
      else if (k === "escape") go(-1);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [pick, next, state, go]);

  if (!set || !q) return null;
  const total = set.questions.length;
  const big = desk;

  const header = (
    <div style={{ height: big ? 88 : 60, display: "flex", alignItems: "center", gap: big ? 20 : 10, padding: big ? "0 40px" : "0 14px 0 8px", position: "relative", flex: "none" }}>
      <IconBtn n="close" bg="rgba(255,255,255,.16)" c="#FFFFFF" s={big ? 24 : 22} w={2.6} size={big ? 48 : 44} label={m({ en: "Close", fa: "بستن" })} onClick={() => go(-1)} />
      {big && <div style={{ font: "800 17px/1 var(--font-latin)", color: "#FFFFFF" }}>{m({ en: `Grade ${set.grade} ${SUBJECTS[set.subject].name.en} · Chapter ${set.unit}`, fa: `${SUBJECTS[set.subject].name.fa} صنف ${num(set.grade)}، فصل ${num(set.unit)}` })}</div>}
      <div style={{ flex: 1, maxWidth: big ? 520 : undefined, margin: big ? "0 auto" : undefined, display: "flex", gap: big ? 8 : 5 }} role="progressbar" aria-valuenow={index + 1} aria-valuemax={total}>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} style={{ flex: 1, height: big ? 12 : 10, borderRadius: 6, background: i < index || (i === index && state === "correct") ? "#FFB31A" : i === index ? "#FFFFFF" : "rgba(255,255,255,.3)", transition: "background-color 280ms var(--ease-settle)" }} />
        ))}
      </div>
      <div style={{ height: big ? 40 : 34, padding: big ? "0 14px" : "0 10px", borderRadius: 999, background: "#1C1433", display: "flex", alignItems: "center", gap: 5, font: `900 ${big ? 16 : 14}px/1 var(--font-latin)`, color: "#FFB31A" }}>
        <Icon n="star" s={big ? 18 : 16} c="#FFB31A" f="#FFB31A" /><span key={school.stars} style={{ display: "inline-block", animation: "uPop 360ms var(--ease-pop)" }}>{num(school.stars)}</span>
      </div>
    </div>
  );

  const correct = state === "correct";
  const almost = state === "almost";

  return (
    <Full bg="#00827E">
      <div className="safe-top" style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", insetInline: 0, top: 0, height: big ? "100%" : 260, opacity: big ? 0.18 : 0.25, pointerEvents: "none" }}><Art seed="band-quiz" w={390} h={130} cols={6} bg="#00827E" anim /></div>
        {big && <Floaters />}
        {header}

        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: big ? "center" : undefined, padding: big ? "12px 120px 0" : 0, position: "relative", maxWidth: big ? 1440 : 560, width: "100%", margin: "0 auto" }}>
          {/* question card */}
          <div key={`q${index}`} className="u-enter" style={{ alignSelf: "stretch", margin: big ? 0 : "10px 16px 0", background: "#FFFFFF", borderRadius: big ? 36 : 28, padding: big ? "34px 40px" : "20px 18px", boxShadow: big ? "0 8px 0 #005F5B" : "0 6px 0 #005F5B", textAlign: big ? "center" : "start", display: "flex", flexDirection: "column", alignItems: big ? "center" : "stretch", gap: big ? 16 : 0, opacity: correct ? 0.55 : 1, transition: "opacity 280ms" }}>
            <div className="eyebrow" style={{ fontSize: big ? 13 : 12, letterSpacing: ".12em", color: "#00827E" }}>{m({ en: `Question ${index + 1} of ${total}`, fa: `سوال ${num(index + 1)} از ${num(total)}` })}</div>
            <MathText text={m(q.q)} style={{ font: big ? `900 ${rtl ? 32 : 34}px/1.6 ${rtl ? "var(--font-rtl)" : "var(--font-latin)"}` : `900 ${rtl ? 21 : 22}px/1.6 ${rtl ? "var(--font-rtl)" : "var(--font-latin)"}`, color: "#1C1433", marginTop: big ? 0 : 10, maxWidth: big ? 900 : undefined, textAlign: big ? "center" : "start" }} />
            {!correct && <div style={{ marginTop: big ? 0 : 14, alignSelf: big ? "center" : "flex-start" }}><SourceChip h={big ? 30 : 28} fs={big ? 13 : 12} onClick={() => go(`/lesson/${set.lessonId}?page=${q.pdfPage}`)}>{m(set.lessonLabel)}</SourceChip></div>}
            {hint && !almost && <div className="u-fade" style={{ marginTop: 12, background: "#FFF1CC", borderRadius: 16, padding: "10px 12px", font: "600 15px/1.5 var(--font-latin)", color: "#4E3500" }}><MathText text={m(q.idea)} /></div>}
          </div>

          {/* answer tiles */}
          <div key={`t${index}`} style={{ alignSelf: "stretch", display: "grid", gridTemplateColumns: "1fr 1fr", gridAutoRows: big ? 150 : correct || almost ? 120 : 132, gap: big ? 20 : 12, padding: big ? 0 : "18px 16px 0", marginTop: big ? 30 : 0, transition: "grid-auto-rows 280ms" }}>
            {q.options.map((o, i) => {
              const c = TILE[i];
              const isPick = picked === i;
              const wasTried = tried.includes(i);
              const dim = correct && !isPick;
              const green = correct && isPick;
              const quiet = wasTried && !green;
              return (
                <button key={i} onClick={() => pick(i)} disabled={correct || wasTried} aria-label={`${(rtl ? LETTERS_FA : LETTERS_EN)[i]}: ${speakable(m(o))}`}
                  className="press u-tile locked"
                  style={{
                    ["--i" as string]: i, ["--lh" as string]: big ? "8px" : "6px",
                    position: "relative", height: "100%", borderRadius: big ? 30 : 24,
                    background: green ? "#1F8F3F" : quiet ? "#F3ECE2" : c.bg,
                    boxShadow: green ? `0 6px 0 #146B2D,0 0 0 4px #FFFFFF` : quiet ? "0 6px 0 #D9CDBB" : `0 ${big ? 8 : 6}px 0 ${c.ledge}`,
                    padding: big ? "22px 26px" : 14, display: "flex", flexDirection: big ? "row" : "column", alignItems: big ? "center" : "stretch", justifyContent: big ? "flex-start" : "space-between", gap: big ? 22 : 0,
                    textAlign: "start", opacity: dim ? 0.3 : 1, transition: "opacity 280ms var(--ease-settle), background-color 200ms",
                    animation: green ? "uCorrect 420ms var(--ease-pop) both" : undefined,
                  } as React.CSSProperties}>
                  {green ? (
                    <span style={{ width: big ? 62 : 36, height: big ? 62 : 36, borderRadius: "50%", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", animation: "uCheck 420ms var(--ease-pop) 80ms both" }}><Icon n="check" s={big ? 36 : 22} c="#1F8F3F" w={3.2} /></span>
                  ) : quiet ? (
                    <span style={{ height: 28, alignSelf: "flex-start", padding: "0 10px", borderRadius: 999, background: "#FFFFFF", display: "flex", alignItems: "center", font: "800 12px/1 var(--font-latin)", color: "#6F6A88", animation: "uPop 280ms var(--ease-pop)" }}>{t("notThisOne")}</span>
                  ) : (
                    <LetterBadge i={i} w={big ? 62 : 36} h={big ? 70 : 40} fs={big ? 28 : 18} />
                  )}
                  {!dim && <span style={{ font: `800 ${big ? 28 : correct || almost ? 17 : 18}px/1.3 var(--font-latin)`, color: quiet ? "#4E4868" : green ? "#FFFFFF" : c.fg, minWidth: 0 }}><MathText text={m(o)} /></span>}
                  {green && <StarBurst />}
                </button>
              );
            })}
          </div>

          {state === "idle" && (
            <div style={{ padding: big ? 0 : "18px 16px 22px", marginTop: big ? 30 : "auto", position: big ? "absolute" : "relative", insetInlineStart: big ? 48 : undefined, bottom: big ? 36 : undefined, alignSelf: big ? undefined : "stretch" }}>
              <Press flat onClick={() => setHint(true)} style={{ height: big ? 56 : 52, padding: big ? "0 20px" : undefined, width: big ? undefined : "100%", borderRadius: 16, background: "rgba(255,255,255,.16)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, font: `800 ${big ? 16 : 15}px/1 var(--font-latin)`, color: "#FFFFFF" }}>
                <Icon n="ask" s={big ? 22 : 20} c="#FFFFFF" w={2.4} />{m({ en: "Ask Ustad for a hint", fa: "از استاد راهنمایی بخواه" })}
              </Press>
            </div>
          )}
          {big && correct && (
            <div className="u-pop" style={{ position: "absolute", insetInlineEnd: 48, bottom: 36, height: 64, padding: "0 24px", borderRadius: 999, background: "#FFB31A", boxShadow: "0 6px 0 #C98300", display: "flex", alignItems: "center", gap: 10, font: "900 26px/1 var(--font-latin)", color: "#1C1433" }}>
              <Icon n="star" s={28} c="#1C1433" f="#1C1433" />{t("afarin")} +1
            </div>
          )}
        </div>

        {/* 17 · Afarin! sheet (centred with a margin: the slide-up animation owns `transform`) */}
        {correct && (
          <div className="sheet-in" style={{ position: big ? "fixed" : "relative", insetInline: big ? "auto" : 0, left: big ? "50%" : undefined, marginLeft: big ? -280 : undefined, width: big ? 560 : undefined, bottom: big ? 130 : undefined, zIndex: 5, marginTop: "auto", background: "#1F8F3F", borderRadius: big ? 32 : "32px 32px 0 0", padding: "24px 20px calc(24px + var(--safe-bottom))", display: "flex", flexDirection: "column", gap: 12, boxShadow: big ? "0 8px 0 #146B2D" : "0 -6px 0 #146B2D", animation: "uSheetUp 360ms var(--ease-settle) both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ font: "900 40px/1 var(--font-latin)", letterSpacing: "-.02em", color: "#FFFFFF" }}>Afarin!</div>
              <div dir="rtl" className="fa" style={{ font: "900 30px/1.2 var(--font-rtl)", color: "#E0F2DF" }}>آفرین!</div>
              {tried.length === 0 && (
                <div className="u-pop" style={{ ["--i" as string]: 3, marginInlineStart: "auto", height: 40, padding: "0 12px", borderRadius: 999, background: "#FFB31A", display: "flex", alignItems: "center", gap: 5, font: "900 17px/1 var(--font-latin)", color: "#1C1433" } as React.CSSProperties}><Icon n="star" s={18} c="#1C1433" f="#1C1433" />+1</div>
              )}
            </div>
            <MathText text={m(q.why)} style={{ font: "600 16px/1.7 var(--font-rtl)", color: "#E0F2DF" }} />
            <Press autoFocus onClick={next} style={{ height: 56, borderRadius: 16, background: "#FFFFFF", boxShadow: "0 5px 0 #146B2D", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, font: "800 18px/1 var(--font-latin)", color: "#146B2D" }}>
              {index + 1 >= total ? m({ en: "See how you did", fa: "نتیجه را ببین" }) : t("nextQuestion")}<Icon n="arrow" s={22} c="#146B2D" w={2.6} />
            </Press>
          </div>
        )}

        {/* 18 · Almost sheet */}
        {almost && (
          <div style={{ position: big ? "fixed" : "relative", left: big ? "50%" : undefined, marginLeft: big ? -280 : undefined, width: big ? 560 : undefined, bottom: big ? 130 : undefined, zIndex: 5, marginTop: "auto", background: "#FFF1CC", borderRadius: big ? 32 : "32px 32px 0 0", padding: "22px 20px calc(24px + var(--safe-bottom))", display: "flex", flexDirection: "column", gap: 12, animation: "uSheetUp 360ms var(--ease-settle) both" }}>
            <div style={{ font: "900 30px/1 var(--font-latin)", letterSpacing: "-.02em", color: "#1C1433" }}>{t("almost")}</div>
            <MathText text={m(q.idea)} style={{ font: "600 16px/1.7 var(--font-rtl)", color: "#4E3500" }} />
            <SourceChip h={28} onClick={() => go(`/lesson/${set.lessonId}?page=${q.pdfPage}`)}>{m({ en: "See the page in the book", fa: "صفحهٔ کتاب را ببینید" })}</SourceChip>
            <div style={{ display: "flex", gap: 10 }}>
              <Press onClick={() => go(`/lesson/${set.lessonId}?page=${q.pdfPage}`)} style={{ flex: 1, height: 56, borderRadius: 16, background: "#FFFFFF", border: "3px solid #E6D2A3", boxShadow: "0 5px 0 #E6D2A3", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, font: "800 16px/1 var(--font-latin)", color: "#4F24B8" }}><Icon n="shapes" s={20} c="#4F24B8" w={2.4} />{m({ en: "Show me", fa: "نشانم بده" })}</Press>
              <Press autoFocus onClick={retry} style={{ flex: 1.3, height: 56, borderRadius: 16, background: "#00827E", boxShadow: "0 5px 0 #005F5B", display: "flex", alignItems: "center", justifyContent: "center", font: "800 17px/1 var(--font-latin)", color: "#FFFFFF" }}>{t("tryAgain")}</Press>
            </div>
          </div>
        )}
      </div>
    </Full>
  );
}
