import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Full } from "../components/Shell";
import { Icon } from "../components/Icon";
import { VoiceGlow } from "../components/fx";
import { IconBtn, Press, SourceChip } from "../components/ui";
import { MicButton } from "../components/Chat";
import { useApp, uid } from "../state/app";
import { useLang, type Lang } from "../lib/i18n";
import { ask, sourceOf, stripMd } from "../lib/tutor";
import { lessonById } from "../content/library";
import { isFull } from "../content/schema";
import { canRecognizeLocally, recognizeLocally, record, speak, voiceFor, type Recording, type SpeakHandle } from "../lib/speech";

type Phase = "speaking" | "paused" | "listening" | "thinking" | "idle";

/** 04 Talk with Ustad: a calm conversation, not a phone call. */
export function Talk() {
  const { id = "" } = useParams();
  const go = useNavigate();
  const { m, lang, setLang } = useLang();
  const { school, update } = useApp();
  const lesson = lessonById(id);
  const full = lesson && isFull(lesson) ? lesson : undefined;

  const [speechLang, setSpeechLang] = useState<Lang>(lang === "en" ? "en" : "fa");
  const opening = useMemo(() => {
    const last = [...(school.chats[id] ?? [])].reverse().find((x) => x.from === "ustad" && x.reply.kind === "answer");
    if (last && last.from === "ustad" && last.reply.kind === "answer") return last.reply.text;
    const key = full?.blocks.find((b) => b.type === "keyIdea");
    return key && "text" in key ? key.text : { en: "Ask me about this lesson.", fa: "درباره این درس از من بپرس." };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  const [text, setText] = useState(opening);
  const words = useMemo(() => tokenizeWords(stripMd(speechLang === "en" ? text.en : text.fa)), [text, speechLang]);
  const [word, setWord] = useState(-1);
  const [phase, setPhase] = useState<Phase>("idle");
  const [rate, setRate] = useState(1);
  const [captions, setCaptions] = useState(true);
  const [noVoice, setNoVoice] = useState(false);
  const [typed, setTyped] = useState<string | null>(null);
  const handle = useRef<SpeakHandle | null>(null);
  const sim = useRef<number | undefined>(undefined);
  const rec = useRef<Recording | null>(null);
  const heard = useRef("");
  const recog = useRef<{ stop(): void } | null>(null);

  const stopAll = () => { handle.current?.stop(); window.clearInterval(sim.current); };

  const say = useCallback((t = text, r = rate) => {
    stopAll();
    const plain = stripMd(speechLang === "en" ? t.en : t.fa);
    const ws = tokenizeWords(plain);
    setPhase("speaking");
    setWord(0);
    const h = speak(plain, {
      lang: speechLang, rate: r,
      onWord: (ci) => setWord(Math.max(0, ws.findIndex((w) => ci >= w.start && ci < w.end + 1))),
      onEnd: () => { setPhase("idle"); setWord(-1); },
    });
    handle.current = h;
    setNoVoice(!voiceFor(speechLang));
    if (!h) {
      // No voice installed for this language: captions still run at speaking pace.
      let i = 0;
      sim.current = window.setInterval(() => {
        i++;
        if (i >= ws.length) { window.clearInterval(sim.current); setPhase("idle"); setWord(-1); return; }
        setWord(i);
      }, 330 / r);
    }
  }, [text, rate, speechLang]);

  useEffect(() => {
    const t = window.setTimeout(() => say(opening), 500);
    return () => { window.clearTimeout(t); stopAll(); rec.current?.cancel(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pause = () => {
    if (phase === "speaking") { handle.current?.pause(); window.clearInterval(sim.current); setPhase("paused"); }
    else if (phase === "paused") { if (handle.current) { handle.current.resume(); setPhase("speaking"); } else say(); }
  };

  const answer = async (q: string) => {
    setPhase("thinking");
    setTyped(null);
    update((s) => ({ ...s, chats: { ...s.chats, [id]: [...(s.chats[id] ?? []), { id: uid(), from: "me", text: q }] } }));
    const r = await ask(q, id, { lang: speechLang });
    update((s) => ({ ...s, chats: { ...s.chats, [id]: [...(s.chats[id] ?? []), { id: uid(), from: "ustad", reply: r }] } }));
    const next = r.kind === "answer" ? r.text : r.kind === "notHere" ? { en: "Your lesson doesn't explain that. I can find it in another book for you in the chat.", fa: "درس تو این را توضیح نمی‌دهد. در چت می‌توانم آن را در کتاب دیگری پیدا کنم." } : r.kind === "text" ? r.text : { en: "I made flashcards for you in the chat.", fa: "برایت در چت کارت ساختم." };
    setText(next);
    say(next);
  };

  const holdStart = async () => {
    stopAll();
    const r = await record();
    if (!r) { setTyped(""); return; }
    rec.current = r;
    heard.current = "";
    setPhase("listening");
    if (await canRecognizeLocally(speechLang)) recog.current = recognizeLocally(speechLang, (t) => { heard.current = t; setText({ en: t, fa: t }); });
  };
  const holdEnd = async () => {
    if (!rec.current) return;
    const r = rec.current;
    rec.current = null;
    recog.current?.stop();
    await r.stop();
    if (heard.current) answer(heard.current);
    else { setPhase("idle"); setTyped(""); }
  };

  const src = full ? sourceOf(full) : null;
  const status = phase === "speaking" ? m({ en: "Ustad is speaking", fa: "استاد صحبت می‌کند" })
    : phase === "listening" ? m({ en: "Listening…", fa: "گوش می‌دهم…" })
    : phase === "thinking" ? m({ en: "Ustad is thinking", fa: "استاد فکر می‌کند" })
    : phase === "paused" ? m({ en: "Paused", fa: "توقف" })
    : m({ en: "Hold the mic to talk", fa: "برای گفتن، میکروفون را نگه دار" });

  const ctl = (label: string, onClick: () => void, child: React.ReactNode, on?: boolean) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <Press flat aria-label={label} aria-pressed={on} onClick={onClick} style={{ width: 52, height: 52, borderRadius: 26, background: on ? "rgba(255,179,26,.28)" : "rgba(255,255,255,.12)", display: "flex", alignItems: "center", justifyContent: "center", font: "900 15px/1 var(--font-latin)", color: "#FFFFFF" }}>{child}</Press>
      <div style={{ font: "700 12px/1 var(--font-latin)", color: "#BDB6D9" }}>{label}</div>
    </div>
  );

  return (
    <Full bg="#1C1433">
      <div className="safe-top" style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", maxWidth: 560, width: "100%", margin: "0 auto" }}>
        <div style={{ alignSelf: "stretch", height: 60, display: "flex", alignItems: "center", padding: "0 12px", gap: 10 }}>
          <IconBtn n="close" bg="rgba(255,255,255,.1)" c="#FFFFFF" s={22} w={2.6} label={m({ en: "Close", fa: "بستن" })} onClick={() => { stopAll(); go(-1); }} />
          <div style={{ flex: 1, font: "800 17px/1 var(--font-latin)", color: "#FFFFFF" }}>{m({ en: "Talk with Ustad", fa: "گفتگو با استاد" })}</div>
          <Press flat onClick={() => { const n: Lang = speechLang === "en" ? "fa" : "en"; setSpeechLang(n); if (lang !== n && lang !== "ps") setLang(n); }} style={{ height: 36, padding: "0 14px", borderRadius: 999, background: "rgba(255,255,255,.12)", display: "flex", alignItems: "center", gap: 6, font: "800 13px/1 var(--font-latin)", color: "#FFFFFF" }}>
            {speechLang === "en" ? "English ⇄ Dari" : "Dari ⇄ English"}
          </Press>
        </div>
        {src && <div style={{ marginTop: 8 }}><SourceChip>{m(src.label)}</SourceChip></div>}
        <div style={{ marginTop: 34 }}><VoiceGlow speaking={phase === "speaking" || phase === "listening"} /></div>
        <div aria-live="polite" style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 8, font: "800 14px/1 var(--font-latin)", color: "#FFB31A" }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: "#FFB31A", animation: phase === "speaking" || phase === "listening" ? "qTwinkle 1.2s ease-in-out infinite" : undefined }} />{status}
        </div>
        {captions && (
          <div dir={speechLang === "en" ? "ltr" : "rtl"} className={speechLang !== "en" ? "fa" : undefined} style={{ margin: "14px 32px 0", font: speechLang === "en" ? "700 22px/1.45 var(--font-latin)" : "700 23px/1.7 var(--font-rtl)", color: "#FFFFFF", textAlign: "center", minHeight: 96 }}>
            {words.map((w, i) => (
              <span key={i}>
                <span style={{ background: i === word ? "#FFB31A" : "transparent", color: i === word ? "#1C1433" : undefined, borderRadius: 6, padding: "0 4px", margin: "0 -4px", transition: "background-color 90ms" }}>{w.text}</span>{" "}
              </span>
            ))}
          </div>
        )}
        {noVoice && phase !== "listening" && (
          <div className="u-fade" style={{ marginTop: 10, font: "600 13px/1.4 var(--font-latin)", color: "#BDB6D9", textAlign: "center", padding: "0 32px" }}>
            {m({ en: "No voice for this language is installed on this device, so Ustad shows the words instead.", fa: "صدای این زبان روی این دستگاه نصب نیست، پس استاد کلمات را نشان می‌دهد." })}
          </div>
        )}
        <div style={{ flex: 1 }} />
        {typed !== null && (
          <form className="u-enter" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) answer(typed.trim()); }} style={{ alignSelf: "stretch", margin: "0 16px 18px", display: "flex", gap: 10 }}>
            <input autoFocus className="plain-input" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={m({ en: "Write what you asked…", fa: "سوالت را بنویس…" })} style={{ flex: 1, height: 52, borderRadius: 18, background: "rgba(255,255,255,.1)", padding: "0 16px", font: "600 16px/1 var(--font-latin)", color: "#FFFFFF" }} />
            <Press type="submit" aria-label={m({ en: "Send", fa: "بفرست" })} style={{ width: 52, height: 52, borderRadius: 26, background: "#FFB31A", boxShadow: "0 5px 0 #C98300", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon n="send" s={24} c="#1C1433" w={2.4} /></Press>
          </form>
        )}
        <div style={{ alignSelf: "stretch", display: "flex", alignItems: "flex-end", justifyContent: "space-around", padding: "0 16px calc(34px + var(--safe-bottom))" }}>
          {ctl(m({ en: "Slower", fa: "آهسته‌تر" }), () => { const r = rate === 1 ? 0.8 : 1; setRate(r); if (phase === "speaking") say(text, r); }, "0.8×", rate !== 1)}
          {ctl(m({ en: "Replay", fa: "دوباره" }), () => say(), <Icon n="replay" s={24} c="#FFFFFF" w={2.4} />)}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <MicButton size={88} label={m({ en: "Hold to talk", fa: "نگه دار و بگو" })} onDown={holdStart} onUp={holdEnd} style={{ transform: phase === "listening" ? "scale(1.06)" : undefined, transition: "transform 160ms var(--ease-pop)" }} />
            <div style={{ font: "800 13px/1 var(--font-latin)", color: "#FFFFFF" }}>{m({ en: "Hold to talk", fa: "نگه دار و بگو" })}</div>
          </div>
          {ctl(phase === "paused" ? m({ en: "Resume", fa: "ادامه" }) : m({ en: "Pause", fa: "توقف" }), pause, <Icon n={phase === "paused" ? "play" : "pause"} s={24} c="#FFFFFF" w={2.6} />)}
          {ctl(m({ en: "Captions", fa: "زیرنویس" }), () => setCaptions((c) => !c), <Icon n="lines" s={24} c="#FFFFFF" w={2.4} />, captions)}
        </div>
      </div>
    </Full>
  );
}

function tokenizeWords(s: string) {
  const out: { text: string; start: number; end: number }[] = [];
  const re = /\S+/g;
  let mm: RegExpExecArray | null;
  while ((mm = re.exec(s))) out.push({ text: mm[0], start: mm.index, end: mm.index + mm[0].length });
  return out;
}
