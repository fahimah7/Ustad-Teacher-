import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Full, Tabbed } from "../components/Shell";
import { Art } from "../components/Art";
import { Icon } from "../components/Icon";
import { Caret, ScanBar, Typing } from "../components/fx";
import { Btn, IconBtn, Press } from "../components/ui";
import { DoorSheet } from "../components/SecondDoor";
import { useApp, useReading, uid } from "../state/app";
import { useLang, type Multi } from "../lib/i18n";
import { RIGHTS, nextRightsLesson, rightsLesson, unitColor, type RightsCheck } from "../content/rights";
import { SCENARIOS, feedbackPrompt, rolePrompt, scenarioById } from "../content/roleplay";
import { chat } from "../native/bridge";
import { useTutorStatus } from "../lib/tutor";
import type { ChatMessage } from "../tutor/promptBuilder";

/* 07 My rights, my voice: lessons on her rights and history, standing up for herself and learning
   together safely, and practice conversations with Ustad. Shown openly; her letters stay locked. */

const fontOf = (lang: string, w = 600, size = 15, lh = lang === "en" ? 1.5 : 1.8) => `${w} ${size}px/${lh} ${lang === "en" ? "var(--font-latin)" : "var(--font-rtl)"}`;

/** One tap (or Escape) from anything here back to her schoolbook, leaving nothing on screen. */
function useQuickExit() {
  const go = useNavigate();
  const reading = useReading();
  const exit = useCallback(() => {
    window.speechSynthesis?.cancel();
    go(reading ? `/lesson/${reading.lesson.id}?page=${reading.page}` : "/library", { replace: true });
  }, [go, reading]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => { if (e.key === "Escape" && !document.querySelector(".sheet")) exit(); };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [exit]);
  return exit;
}

function ExitButton({ onExit, dark }: { onExit: () => void; dark?: boolean }) {
  const { m } = useLang();
  return (
    <Press flat onClick={onExit} aria-label={m({ en: "Quick exit to my book", fa: "خروج سریع به کتاب" })}
      style={{ height: 40, padding: "0 12px", borderRadius: 12, background: dark ? "rgba(255,255,255,.16)" : "#F3ECE2", display: "flex", alignItems: "center", gap: 6, font: "800 13px/1 var(--font-latin)", color: dark ? "#FFFFFF" : "#1C1433" }}>
      <Icon n="book" s={18} c={dark ? "#FFFFFF" : "#1C1433"} w={2.4} />{m({ en: "Exit", fa: "خروج" })}
    </Press>
  );
}

/** The rights home: units and their lessons, practice conversations, and her (locked) letters. */
export function Rights() {
  const { m, num, lang } = useLang();
  const go = useNavigate();
  const { school, voiceOpen } = useApp();
  const exit = useQuickExit();
  const [door, setDoor] = useState(false);
  const all = RIGHTS.flatMap((u) => u.lessons);
  const done = all.filter((l) => school.rightsDone.includes(l.id)).length;
  const next = all.find((l) => !school.rightsDone.includes(l.id));

  return (
    <Tabbed tab="rights" panel={false}>
      <div style={{ background: "#7443F0", position: "relative", overflow: "hidden", paddingTop: "max(var(--safe-top), 12px)", paddingBottom: 22 }}>
        <div style={{ position: "absolute", insetInline: 0, bottom: 0, height: 120, opacity: 0.28 }}><Art seed="band-rights" w={390} h={130} cols={6} bg="#7443F0" anim /></div>
        <div className="desk-pad" style={{ position: "relative", display: "flex", justifyContent: "flex-end", padding: "0 16px" }}><ExitButton onExit={exit} dark /></div>
        <div className="u-enter desk-pad" style={{ position: "relative", padding: "0 20px" }}>
          <h1 style={{ margin: 0, font: lang === "en" ? "900 34px/1.05 var(--font-latin)" : "900 32px/1.4 var(--font-rtl)", color: "#FFFFFF" }}>{m({ en: "My rights, my voice", fa: "حقوق من، صدای من" })}</h1>
          <div style={{ font: fontOf(lang, 700, 15), color: "#E4DBFF", marginTop: 6, maxWidth: 560 }}>
            {m({ en: "Short lessons on your rights and your history, how to stand up for yourself, and how to learn together safely.", fa: "درس‌های کوتاه در بارهٔ حقوق و تاریخ شما، این‌که چطور از خود دفاع کنید، و این‌که چطور با هم و به شکل امن بیاموزید." })}
          </div>
          {all.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <div style={{ height: 30, padding: "0 12px", borderRadius: 999, background: "#FFB31A", display: "flex", alignItems: "center", font: "800 12px/1 var(--font-latin)", color: "#1C1433" }}>{num(done)} / {num(all.length)} {m({ en: "lessons done", fa: "درس تمام شد" })}</div>
            </div>
          )}
        </div>
      </div>

      <div className="desk-pad" style={{ display: "flex", flexDirection: "column", gap: 14, padding: "16px 16px 110px", maxWidth: 900 }}>
        {next && (
          <Press ledge={4} onClick={() => go(`/rights/l/${next.id}`)} className="u-enter" style={{ display: "flex", alignItems: "center", gap: 12, background: "#1C1433", borderRadius: 20, padding: "14px 16px", boxShadow: "0 5px 0 #0A0714", textAlign: "start" }}>
            <Icon n="play" s={24} c="#FFB31A" f="#FFB31A" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: "800 12px/1 var(--font-latin)", color: "#BDB6D9" }}>{done ? m({ en: "Continue", fa: "ادامه" }) : m({ en: "Start here", fa: "از این‌جا شروع کنید" })}</div>
              <div style={{ font: fontOf(lang, 800, 16, 1.4), color: "#FFFFFF", marginTop: 4 }}>{m(next.title)}</div>
            </div>
          </Press>
        )}

        {all.length === 0 && (
          <div style={{ background: "#FFFFFF", borderRadius: 20, padding: 16, font: fontOf(lang), color: "#4E4868" }}>{m({ en: "The lessons are being prepared.", fa: "درس‌ها آماده می‌شوند." })}</div>
        )}

        {RIGHTS.map((u, ui) => (
          <section key={u.unit} className="u-enter" style={{ ["--i" as string]: ui + 1, background: "#FFFFFF", borderRadius: 22, padding: 12, boxShadow: "0 4px 0 #EFE6DA" } as React.CSSProperties}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "2px 4px 8px" }}>
              <div style={{ width: 44, height: 52, borderRadius: "22px 22px 9px 9px", overflow: "hidden", flex: "none" }}><Art seed={`unit-${u.unit}`} w={60} h={72} cols={2} bg={unitColor(u.unit)} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ margin: 0, font: fontOf(lang, 900, 17, 1.35), color: "#1C1433" }}>{num(u.unit)}. {m(u.title)}</h2>
                <div style={{ font: fontOf(lang, 600, 13, 1.5), color: "#6F6A88" }}>{m(u.about)}</div>
              </div>
            </div>
            {u.lessons.map((l) => {
              const ok = school.rightsDone.includes(l.id);
              return (
                <button key={l.id} className="press flat" onClick={() => go(`/rights/l/${l.id}`)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 46, padding: "6px 8px", borderRadius: 12, textAlign: "start" }}>
                  <span style={{ width: 26, height: 26, borderRadius: 13, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: ok ? "#1F8F3F" : "#F3ECE2" }}>{ok && <Icon n="check" s={15} c="#FFFFFF" w={3} />}</span>
                  <span style={{ flex: 1, font: fontOf(lang, 700, 15, 1.45), color: "#1C1433" }}>{m(l.title)}</span>
                  <span style={{ font: "700 12px/1 var(--font-latin)", color: "#6F6A88", flex: "none" }}>{num(l.minutes)} {m({ en: "min", fa: "دقیقه" })}</span>
                </button>
              );
            })}
          </section>
        ))}

        <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 style={{ margin: "6px 4px 0", font: fontOf(lang, 900, 18, 1.35), color: "#1C1433" }}>{m({ en: "Practise with Ustad", fa: "با استاد تمرین کنید" })}</h2>
          <div style={{ font: fontOf(lang, 600, 13), color: "#6F6A88", margin: "0 4px" }}>{m({ en: "Ustad plays the other person, so you can practise what to say. Nothing is saved.", fa: "استاد نقش آن شخص را بازی می‌کند تا شما تمرین کنید چه بگویید. هیچ چیز ذخیره نمی‌شود." })}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
            {SCENARIOS.map((s) => (
              <Press key={s.id} ledge={4} onClick={() => go(`/rights/practice/${s.id}`)} style={{ background: "#FFFFFF", borderRadius: 18, padding: "12px 14px", boxShadow: "0 4px 0 #EFE6DA", display: "flex", alignItems: "center", gap: 10, textAlign: "start" }}>
                <Icon n="wave" s={22} c="#D81E57" w={2.4} />
                <span style={{ flex: 1, font: fontOf(lang, 800, 15, 1.4), color: "#1C1433" }}>{m(s.title)}</span>
              </Press>
            ))}
          </div>
        </section>

        <Press ledge={4} onClick={() => (voiceOpen ? go("/letters") : setDoor(true))} style={{ display: "flex", gap: 12, alignItems: "center", background: "#FFFFFF", borderRadius: 20, padding: "14px 16px", boxShadow: "0 4px 0 #EFE6DA", textAlign: "start" }}>
          <Icon n="letter" s={26} c="#7443F0" w={2.4} />
          <div style={{ flex: 1 }}>
            <div style={{ font: fontOf(lang, 800, 16, 1.4), color: "#1C1433" }}>{m({ en: "My letters", fa: "نامه‌های من" })}</div>
            <div style={{ font: fontOf(lang, 600, 13), color: "#6F6A88" }}>{m({ en: "Private, locked with your code. Write a letter to the world if you want to; your name never leaves.", fa: "خصوصی و با رمز شما قفل است. اگر خواستید برای جهان نامه بنویسید؛ نام شما هرگز بیرون نمی‌رود." })}</div>
          </div>
          <Icon n={voiceOpen ? "next" : "keep"} s={20} c="#6F6A88" w={2.4} />
        </Press>
      </div>
      {door && <DoorSheet onClose={() => setDoor(false)} to="/letters" />}
    </Tabbed>
  );
}

/** One lesson: short steps, a question to think about, a quick check, and (sometimes) practice. */
export function RightsLessonScreen() {
  const { id = "" } = useParams();
  const found = rightsLesson(id);
  const go = useNavigate();
  const { m, num, lang } = useLang();
  const { school, update, voiceOpen, updateVoice } = useApp();
  const exit = useQuickExit();
  const [thought, setThought] = useState("");
  if (!found) return <Full><div style={{ padding: 24 }}><Btn tone="saf" onClick={() => go("/rights")}>{m({ en: "Back", fa: "برگشت" })}</Btn></div></Full>;
  const { unit, lesson } = found;
  const color = unitColor(unit.unit);
  const next = nextRightsLesson(lesson.id);
  const finish = () => {
    update((s) => (s.rightsDone.includes(lesson.id) ? s : { ...s, rightsDone: [...s.rightsDone, lesson.id] }));
    go(next ? `/rights/l/${next.id}` : "/rights", { replace: true });
  };
  const keepAsLetter = () => {
    const letter = uid();
    updateVoice((v) => ({ ...v, letters: [...v.letters, { id: letter, createdAt: Date.now(), lang: lang === "en" ? "en" : "fa", draft: thought, status: "draft" }] }));
    go(`/letter/${letter}`);
  };
  const done = school.rightsDone.includes(lesson.id);

  return (
    <Full>
      <div className="col" style={{ maxWidth: 760, minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
        <div style={{ background: color, paddingTop: "max(var(--safe-top), 10px)", paddingBottom: 18, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, opacity: 0.25 }}><Art seed={lesson.id} w={390} h={170} cols={5} bg={color} anim /></div>
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px" }}>
            <IconBtn n="back" bg="rgba(255,255,255,.9)" s={22} w={2.6} label={m({ en: "Back", fa: "برگشت" })} onClick={() => go("/rights")} />
            <ExitButton onExit={exit} dark />
          </div>
          <div style={{ position: "relative", padding: "12px 20px 0" }}>
            <div style={{ font: "800 12px/1.4 var(--font-latin)", color: "rgba(255,255,255,.85)" }}>{m({ en: `Unit ${unit.unit} · ${lesson.minutes} min`, fa: `فصل ${num(unit.unit)} · ${num(lesson.minutes)} دقیقه` })}</div>
            <h1 style={{ margin: "6px 0 0", font: fontOf(lang, 900, 26, lang === "en" ? 1.15 : 1.5), color: "#FFFFFF" }}>{m(lesson.title)}</h1>
          </div>
        </div>

        <div style={{ flex: 1, padding: "18px 18px 0", display: "flex", flexDirection: "column", gap: 14 }}>
          {lesson.steps.map((s, i) => (
            <div key={i} className="u-enter" style={{ ["--i" as string]: i + 1, display: "flex", gap: 12 } as React.CSSProperties}>
              <div style={{ width: 28, height: 28, borderRadius: 14, background: "#EEE7FF", color: "#4F24B8", display: "flex", alignItems: "center", justifyContent: "center", font: "900 13px/1 var(--font-latin)", flex: "none", marginTop: 2 }}>{num(i + 1)}</div>
              <div style={{ font: fontOf(lang, 500, 16.5, lang === "en" ? 1.6 : 1.9), color: "#1C1433" }}>{m(s)}</div>
            </div>
          ))}

          <div style={{ background: "#7443F0", borderRadius: 22, padding: "14px 16px", boxShadow: "0 5px 0 #4F24B8", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ font: "800 12px/1 var(--font-latin)", letterSpacing: ".08em", color: "#E4DBFF" }}>{m({ en: "THINK ABOUT IT", fa: "فکر کنید" })}</div>
            <div style={{ font: fontOf(lang, 800, 18, 1.5), color: "#FFFFFF" }}>{m(lesson.reflect)}</div>
            <textarea className="plain-input" dir="auto" value={thought} onChange={(e) => setThought(e.target.value)} rows={3}
              placeholder={m({ en: "Write your answer for yourself… (it is not saved)", fa: "جوابتان را برای خودتان بنویسید… (ذخیره نمی‌شود)" })}
              style={{ background: "rgba(255,255,255,.14)", borderRadius: 14, padding: 12, font: fontOf(lang, 600, 15), color: "#FFFFFF", resize: "vertical" }} />
            {voiceOpen && thought.trim() && (
              <Press flat onClick={keepAsLetter} style={{ alignSelf: "flex-start", height: 38, padding: "0 12px", borderRadius: 12, background: "#FFB31A", display: "flex", alignItems: "center", gap: 6, font: "800 13px/1 var(--font-latin)", color: "#1C1433" }}><Icon n="letter" s={16} c="#1C1433" w={2.4} />{m({ en: "Keep it in my letters", fa: "در نامه‌هایم نگه دار" })}</Press>
            )}
          </div>

          {lesson.check.map((c, i) => <Check key={`${lesson.id}-${i}`} check={c} />)}

          {lesson.practice && scenarioById(lesson.practice) && (
            <Press ledge={4} onClick={() => go(`/rights/practice/${lesson.practice}`)} style={{ display: "flex", alignItems: "center", gap: 12, background: "#FFE3EA", borderRadius: 18, padding: "12px 14px", boxShadow: "0 4px 0 #F5C2CF", textAlign: "start" }}>
              <Icon n="wave" s={24} c="#9A1240" w={2.4} />
              <div style={{ flex: 1 }}>
                <div style={{ font: fontOf(lang, 800, 15, 1.4), color: "#9A1240" }}>{m({ en: "Practise it with Ustad", fa: "با استاد تمرین کنید" })}</div>
                <div style={{ font: fontOf(lang, 600, 13, 1.5), color: "#6F2640" }}>{m(scenarioById(lesson.practice)!.title)}</div>
              </div>
            </Press>
          )}
        </div>

        <div style={{ padding: "18px 16px calc(22px + var(--safe-bottom))" }}>
          <Btn tone="saf" icon={next ? "arrow" : "check"} fs={17} onClick={finish}>
            {done ? (next ? m({ en: "Next lesson", fa: "درس بعدی" }) : m({ en: "Back to all lessons", fa: "برگشت به همهٔ درس‌ها" })) : m({ en: "I finished this lesson", fa: "این درس را تمام کردم" })}
          </Btn>
        </div>
      </div>
    </Full>
  );
}

/** A quick check: pick an answer, see why. Never a red screen. */
function Check({ check }: { check: RightsCheck }) {
  const { m, lang } = useLang();
  const [picked, setPicked] = useState<number | null>(null);
  const right = picked === check.answer;
  return (
    <div style={{ background: "#FFFFFF", borderRadius: 20, padding: 14, boxShadow: "0 4px 0 #EFE6DA", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ font: "800 12px/1 var(--font-latin)", color: "#00827E" }}>{m({ en: "QUICK CHECK", fa: "یک سوال کوچک" })}</div>
      <div style={{ font: fontOf(lang, 800, 16, 1.5), color: "#1C1433" }}>{m(check.q)}</div>
      {check.options.map((o, i) => {
        const chosen = picked === i;
        const good = picked !== null && i === check.answer;
        return (
          <button key={i} className="press flat" disabled={picked !== null && right} onClick={() => setPicked(i)}
            style={{ textAlign: "start", minHeight: 44, padding: "8px 12px", borderRadius: 12, border: `2px solid ${good ? "#1F8F3F" : chosen ? "#FFB31A" : "#EFE6DA"}`, background: good ? "#E0F2DF" : chosen ? "#FFF1CC" : "#FFFFFF", font: fontOf(lang, 700, 15, 1.5), color: "#1C1433" }}>
            {m(o)}
          </button>
        );
      })}
      {picked !== null && (
        <div className="u-fade" style={{ font: fontOf(lang, 600, 14, 1.6), color: right ? "#146B2D" : "#7A4E00" }}>
          {right ? m({ en: "Yes! ", fa: "آفرین! " }) : m({ en: "Not quite. ", fa: "نه کاملاً. " })}{right ? m(check.why) : m({ en: "Try another answer.", fa: "جواب دیگری را امتحان کنید." })}
        </div>
      )}
    </div>
  );
}

type Line = { from: "her" | "them" | "ustad"; text: string };

/** Practice a conversation: Ustad plays the other person, then steps out and gives feedback. */
export function RolePlay() {
  const { id = "" } = useParams();
  const scenario = scenarioById(id);
  const go = useNavigate();
  const { m, lang } = useLang();
  const exit = useQuickExit();
  const status = useTutorStatus();
  const tl: "fa" | "en" = lang === "en" ? "en" : "fa";
  const [lines, setLines] = useState<Line[]>(() => (scenario ? [{ from: "them", text: m(scenario.opener) }] : []));
  const [draft, setDraft] = useState("");
  const [live, setLive] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" }); }, [lines.length, live]);
  if (!scenario) return <Full><div style={{ padding: 24 }}><Btn tone="saf" onClick={() => go("/rights")}>{m({ en: "Back", fa: "برگشت" })}</Btn></div></Full>;

  const ready = status.state === "ready";
  const busy = live !== null;
  // The conversation as the model sees it: its own lines are the character's, hers are the user's.
  const asMessages = (ls: Line[]): ChatMessage[] => {
    const out: ChatMessage[] = [{ role: "system", content: rolePrompt(scenario, tl) }, { role: "user", content: tl === "en" ? "(The practice starts. Say your first line.)" : "(تمرین شروع می‌شود. جملهٔ اول خود را بگویید.)" }];
    for (const l of ls) if (l.from !== "ustad") out.push({ role: l.from === "them" ? "assistant" : "user", content: l.text });
    return out;
  };
  const run = async (messages: ChatMessage[], from: Line["from"], base: Line[]) => {
    const ctrl = new AbortController();
    abort.current = ctrl;
    setLive("");
    let text = "";
    try {
      await chat(messages, (piece) => { text += piece; setLive(text); }, ctrl.signal);
    } catch { /* shown below as a gentle line */ }
    abort.current = null;
    setLive(null);
    const said = text.trim() || m({ en: "(Ustad could not answer just now. Try again.)", fa: "(استاد همین حالا نتوانست جواب بدهد. دوباره کوشش کنید.)" });
    setLines([...base, { from, text: said }]);
  };
  const send = () => {
    const t = draft.trim();
    if (!t || busy || !ready) return;
    setDraft("");
    const next: Line[] = [...lines, { from: "her", text: t }];
    setLines(next);
    run(asMessages(next), "them", next);
  };
  const feedback = () => {
    if (busy || !ready || !lines.some((l) => l.from === "her")) return;
    run([...asMessages(lines), { role: "user", content: feedbackPrompt(tl) }], "ustad", lines);
  };
  const restart = () => { abort.current?.abort(); setLines([{ from: "them", text: m(scenario.opener) }]); };

  const bubble = (l: Line, i: number) => {
    const her = l.from === "her";
    const coach = l.from === "ustad";
    return (
      <div key={i} className="u-enter" dir="auto" style={{ alignSelf: her ? "flex-end" : "flex-start", maxWidth: "85%", background: her ? "#00827E" : coach ? "#1C1433" : "#FFFFFF", color: her || coach ? "#FFFFFF" : "#1C1433", border: her || coach ? "none" : "2px solid #EFE6DA", borderRadius: 18, padding: "10px 14px", font: fontOf(lang, 600, 15.5, lang === "en" ? 1.5 : 1.8), whiteSpace: "pre-wrap" }}>
        {coach && <div style={{ font: "800 11px/1 var(--font-latin)", color: "#FFB31A", marginBottom: 6 }}>{m({ en: "USTAD'S FEEDBACK", fa: "نظر استاد" })}</div>}
        {l.text}
      </div>
    );
  };

  return (
    <Full>
      <div className="col" style={{ maxWidth: 760, height: "100dvh", display: "flex", flexDirection: "column" }}>
        <div style={{ background: "#FFFFFF", borderBottom: "2px solid #F3ECE2", paddingTop: "max(var(--safe-top), 8px)", flex: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 12px 10px" }}>
            <IconBtn n="back" label={m({ en: "Back", fa: "برگشت" })} onClick={() => go(-1)} />
            <div style={{ flex: 1, minWidth: 0, font: fontOf(lang, 900, 17, 1.35), color: "#1C1433" }}>{m(scenario.title)}</div>
            <ExitButton onExit={exit} />
          </div>
        </div>
        <div ref={list} className="vscroll" style={{ flex: 1, minHeight: 0, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ background: "#EEE7FF", borderRadius: 16, padding: "10px 14px", font: fontOf(lang, 600, 14, 1.6), color: "#4F24B8" }}>{m(scenario.setup)}</div>
          {lines.map(bubble)}
          {busy && (live ? bubble({ from: "them", text: live }, -1) : <Typing className="u-enter" />)}
          {!ready && <div style={{ font: fontOf(lang, 600, 13), color: "#9A5B00" }}>{m({ en: "Ustad is getting ready…", fa: "استاد آماده می‌شود…" })}</div>}
        </div>
        <div style={{ flex: "none", padding: "10px 12px calc(12px + var(--safe-bottom))", background: "#FFFFFF", borderTop: "2px solid #F3ECE2", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <Press flat disabled={busy || !ready || !lines.some((l) => l.from === "her")} onClick={feedback} style={{ height: 38, padding: "0 12px", borderRadius: 12, background: "#FFF1CC", display: "flex", alignItems: "center", gap: 6, font: fontOf(lang, 800, 13, 1), color: "#7A4E00" }}><Icon n="star" s={16} c="#7A4E00" w={2.4} />{m({ en: "How did I do?", fa: "چطور بود؟" })}</Press>
            <Press flat onClick={restart} style={{ height: 38, padding: "0 12px", borderRadius: 12, background: "#F3ECE2", display: "flex", alignItems: "center", gap: 6, font: fontOf(lang, 800, 13, 1), color: "#1C1433" }}><Icon n="replay" s={16} c="#1C1433" w={2.4} />{m({ en: "Start again", fa: "از نو" })}</Press>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(); }} style={{ display: "flex", gap: 8 }}>
            <input className="plain-input" dir="auto" value={draft} onChange={(e) => setDraft(e.target.value)} disabled={!ready}
              placeholder={m({ en: "What would you say?", fa: "شما چه می‌گویید؟" })}
              style={{ flex: 1, height: 48, borderRadius: 14, background: "#F7F1E8", padding: "0 14px", font: fontOf(lang, 600, 16, 1) }} />
            <Press type="submit" ledge={4} disabled={busy || !ready || !draft.trim()} aria-label={m({ en: "Send", fa: "بفرست" })} style={{ width: 52, height: 48, borderRadius: 14, background: "#00827E", boxShadow: "0 4px 0 #005F5B", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon n="send" s={22} c="#FFFFFF" w={2.4} />
            </Press>
          </form>
        </div>
      </div>
    </Full>
  );
}

/** Her letters (behind the code): write, keep private, or seal one to hand on. */
export function Letters() {
  const { m, num, lang } = useLang();
  const go = useNavigate();
  const { voice, closeVoice } = useApp();
  const kept = voice.letters.filter((l) => l.status === "kept").length;
  const waiting = voice.letters.filter((l) => l.status === "queued").length;
  const leave = () => { closeVoice(); go("/rights", { replace: true }); };
  return (
    <Full>
      <div className="col" style={{ maxWidth: 720, display: "flex", flexDirection: "column", minHeight: "100dvh", padding: "max(var(--safe-top), 12px) 16px 24px", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <IconBtn n="close" label={m({ en: "Lock and close", fa: "قفل و بستن" })} onClick={leave} />
          <h1 style={{ flex: 1, margin: 0, font: fontOf(lang, 900, 24, 1.3), color: "#1C1433" }}>{m({ en: "My letters", fa: "نامه‌های من" })}</h1>
        </div>
        <div style={{ font: fontOf(lang, 600, 13), color: "#6F6A88" }}>{num(kept)} {m({ en: "kept private", fa: "خصوصی" })} · {num(waiting)} {m({ en: "ready to hand on", fa: "آمادهٔ سپردن" })}</div>
        <Btn tone="saf" icon="pen" fs={17} onClick={() => go("/letter/new")}>{m({ en: "Write a letter", fa: "نامه بنویسید" })}</Btn>
        {voice.letters.slice().reverse().map((l) => (
          <Press key={l.id} flat onClick={() => go(l.status === "draft" ? `/letter/${l.id}` : l.status === "reviewed" ? `/letter/${l.id}/share` : `/letter/${l.id}/check`)} style={{ background: "#FFFFFF", borderRadius: 16, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, textAlign: "start" }}>
            <Icon n={l.status === "queued" ? "send" : l.status === "kept" ? "keep" : "pen"} s={18} c="#4F24B8" w={2.4} />
            <div dir="auto" style={{ flex: 1, minWidth: 0, font: fontOf(lang, 600, 14, 1.4), color: "#1C1433", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.scrubbed?.cleaned || l.draft || "…"}</div>
            <div style={{ font: "800 11px/1 var(--font-latin)", color: "#6F6A88" }}>{l.status === "queued" ? m({ en: "ready", fa: "آماده" }) : l.status === "kept" ? m({ en: "private", fa: "خصوصی" }) : m({ en: "draft", fa: "پیش‌نویس" })}</div>
          </Press>
        ))}
      </div>
    </Full>
  );
}

/** The two choices are the same size, style and colour; neither is preselected. */
export function EqualChoice({ onKeep, onShare, disabled, h = 64 }: { onKeep: () => void; onShare: () => void; disabled?: boolean; h?: number }) {
  const { t } = useLang();
  const st: React.CSSProperties = { flex: 1, height: h, borderRadius: 18, background: "#FFFFFF", border: "3px solid #1C1433", boxShadow: "0 5px 0 #1C1433", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, font: "800 16px/1 var(--font-latin)", color: "#1C1433" };
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <Press style={st} onClick={onKeep} disabled={disabled}><Icon n="keep" s={20} c="#1C1433" w={2.4} />{t("keepPrivate")}</Press>
      <Press style={st} onClick={onShare} disabled={disabled}><Icon n="send" s={20} c="#1C1433" w={2.4} />{t("shareIt")}</Press>
    </div>
  );
}

/** The writing surface: 3 px turquoise focus border and a blinking caret. */
export function LetterArea({ text, setText, scan, bg = "#FFFFFF", placeholder }: { text: string; setText: (s: string) => void; scan?: boolean; bg?: string; placeholder?: string }) {
  const [focus, setFocus] = useState(false);
  const { m } = useLang();
  return (
    <label style={{ flex: 1, minHeight: 180, position: "relative", background: bg, border: `3px solid ${focus ? "#00827E" : "#EFE6DA"}`, borderRadius: 22, boxShadow: focus ? "0 0 0 5px #DDF6F3" : undefined, overflow: "hidden", display: "flex", transition: "border-color 160ms, box-shadow 160ms" }}>
      <span className="sr">{m({ en: "Your letter", fa: "نامهٔ شما" })}</span>
      <textarea className="plain-input" value={text} onChange={(e) => setText(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} placeholder={placeholder ?? m({ en: "Start with what you hope for…", fa: "با آرزوی خود شروع کنید…" })} style={{ flex: 1, padding: 16, font: "500 17px/1.6 var(--font-latin)", color: "#1C1433", caretColor: "#00827E" }} />
      {!focus && !text && <span style={{ position: "absolute", insetInlineStart: 16, top: 18 }}><Caret /></span>}
      {scan && text.length > 20 && <ScanBar travel={170} />}
    </label>
  );
}

export type { Multi };
