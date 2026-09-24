import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Full } from "../components/Shell";
import { Art } from "../components/Art";
import { Icon } from "../components/Icon";
import { Caret, ScanBar } from "../components/fx";
import { Btn, Dari, IconBtn, Press } from "../components/ui";
import { useApp, uid } from "../state/app";
import { useLang, SEP } from "../lib/i18n";
import { useDesktop } from "../lib/useMedia";
import { ARTICLE_26, LETTER_PROMPT, RIGHTS_UNITS } from "../content/rights";
import { scrub } from "../lib/scrub";

/** 07 My rights, my voice. A separate room with the same school look. */
export function Rights() {
  const { m, t, num } = useLang();
  const go = useNavigate();
  const { voice, closeVoice } = useApp();
  const kept = voice.letters.filter((l) => l.status === "kept").length;
  const waiting = voice.letters.filter((l) => l.status === "queued").length;
  const done = Object.values(voice.rightsDone).reduce((a, b) => a + b, 0);
  const leave = () => { closeVoice(); go("/", { replace: true }); };

  return (
    <Full>
      <div className="col" style={{ maxWidth: 720, display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
        <div style={{ background: "#7443F0", paddingBottom: 24, position: "relative", overflow: "hidden", paddingTop: "max(var(--safe-top), 12px)" }}>
          <div style={{ position: "absolute", insetInline: 0, bottom: 0, height: 130, opacity: 0.3 }}><Art seed="band-rights" w={390} h={130} cols={6} bg="#7443F0" anim /></div>
          <div style={{ position: "relative", display: "flex", padding: "0 12px" }}>
            <IconBtn n="close" bg="rgba(255,255,255,.16)" c="#FFFFFF" s={22} w={2.6} label={m({ en: "Close", fa: "بستن" })} onClick={leave} />
          </div>
          <div className="u-enter" style={{ padding: "4px 20px 0", position: "relative" }}>
            <h1 style={{ margin: 0, font: "900 34px/1.02 var(--font-latin)", letterSpacing: "-.02em", color: "#FFFFFF" }}>My rights,<br />my voice</h1>
            <Dari style={{ font: "800 20px/1.6 var(--font-rtl)", color: "#E4DBFF", marginTop: 6 }}>حقوق من، صدای من</Dari>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <div style={{ height: 30, padding: "0 12px", borderRadius: 999, background: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", font: "800 12px/1 var(--font-latin)", color: "#FFFFFF" }}>{m({ en: "6 units · 5–10 min each", fa: "۶ فصل · هر کدام ۵ تا ۱۰ دقیقه" })}</div>
              <div style={{ height: 30, padding: "0 12px", borderRadius: 999, background: "#FFB31A", display: "flex", alignItems: "center", font: "800 12px/1 var(--font-latin)", color: "#1C1433" }}>{num(done)} {m({ en: "lessons done", fa: "درس تمام شد" })}</div>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, padding: 16 }}>
          {RIGHTS_UNITS.slice(0, 4).map((u, i) => (
            <Press key={u.n} ledge={4} className="u-enter" onClick={() => go("/rights/a26")} style={{ ["--i" as string]: i + 1, display: "flex", gap: 12, alignItems: "center", background: "#FFFFFF", borderRadius: 20, padding: 10, boxShadow: "0 4px 0 #EFE6DA", textAlign: "start" } as React.CSSProperties}>
              <div style={{ width: 52, height: 62, borderRadius: "26px 26px 10px 10px", overflow: "hidden", flex: "none" }}><Art seed={`unit-${u.n}`} w={60} h={72} cols={2} bg={u.bg} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: "800 16px/1.2 var(--font-latin)", color: "#1C1433" }}>{num(u.n)}{SEP}{m(u.title)}</div>
                <div style={{ font: "600 13px/1.4 var(--font-latin)", color: "#6F6A88" }}>{m(u.about)}</div>
              </div>
              <div style={{ font: "900 14px/1 var(--font-latin)", color: "#4F24B8" }}>{num(voice.rightsDone[String(u.n)] ?? u.done)}/{num(u.total)}</div>
            </Press>
          ))}
          <div style={{ display: "flex", gap: 10 }}>
            {RIGHTS_UNITS.slice(4).map((u, i) => (
              <Press key={u.n} ledge={4} className="u-enter" onClick={() => go("/rights/a26")} style={{ ["--i" as string]: 5 + i, flex: 1, display: "flex", gap: 10, alignItems: "center", background: "#FFFFFF", borderRadius: 20, padding: 10, boxShadow: "0 4px 0 #EFE6DA", textAlign: "start" } as React.CSSProperties}>
                <div style={{ width: 40, height: 48, borderRadius: "20px 20px 8px 8px", overflow: "hidden", flex: "none" }}><Art seed={`unit-${u.n}`} w={60} h={72} cols={2} bg={u.bg} /></div>
                <div style={{ font: "800 14px/1.2 var(--font-latin)", color: "#1C1433" }}>{num(u.n)}{SEP}{m(u.title)}</div>
              </Press>
            ))}
          </div>
          <div className="u-enter" style={{ ["--i" as string]: 7, display: "flex", gap: 12, alignItems: "center", background: "#1C1433", borderRadius: 20, padding: "14px 14px 14px 16px", boxShadow: "0 5px 0 #0A0714", marginTop: 2 } as React.CSSProperties}>
            <Icon n="letter" s={28} c="#FFB31A" w={2.4} />
            <div style={{ flex: 1 }}>
              <div style={{ font: "800 16px/1.2 var(--font-latin)", color: "#FFFFFF" }}>{m({ en: "My letters", fa: "نامه‌های من" })}</div>
              <div style={{ font: "600 12px/1.4 var(--font-latin)", color: "#BDB6D9" }}>{num(kept)} {m({ en: "kept private", fa: "خصوصی" })}{SEP}{num(waiting)} {m({ en: "waiting to send", fa: "در انتظار فرستادن" })}</div>
            </div>
            <Press ledge={4} onClick={() => go("/letter/new")} style={{ height: 40, padding: "0 14px", borderRadius: 12, background: "#FFB31A", boxShadow: "0 4px 0 #C98300", display: "flex", alignItems: "center", font: "800 14px/1 var(--font-latin)", color: "#1C1433" }}>{m({ en: "Write", fa: "بنویس" })}</Press>
          </div>
          {voice.letters.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              {voice.letters.slice().reverse().map((l, i) => (
                <Press key={l.id} flat className="u-fade" onClick={() => go(l.status === "draft" ? `/letter/${l.id}` : l.status === "reviewed" ? `/letter/${l.id}/share` : `/letter/${l.id}/check`)} style={{ ["--i" as string]: i, background: "#FFFFFF", borderRadius: 16, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, textAlign: "start" } as React.CSSProperties}>
                  <Icon n={l.status === "queued" ? "send" : l.status === "kept" ? "keep" : "pen"} s={18} c="#4F24B8" w={2.4} />
                  <div style={{ flex: 1, minWidth: 0, font: "600 14px/1.3 var(--font-latin)", color: "#1C1433", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.scrubbed?.cleaned || l.draft || "…"}</div>
                  <div style={{ font: "800 11px/1 var(--font-latin)", color: "#6F6A88" }}>{l.status === "queued" ? m({ en: "waiting", fa: "در انتظار" }) : l.status === "kept" ? m({ en: "private", fa: "خصوصی" }) : m({ en: "draft", fa: "پیش‌نویس" })}</div>
                </Press>
              ))}
            </div>
          )}
        </div>
      </div>
    </Full>
  );
}

/** 08 Rights lesson · Article 26, and W4 (lesson + letter side by side). */
export function RightsLesson() {
  const desk = useDesktop();
  const { m, t, num } = useLang();
  const go = useNavigate();
  const { updateVoice } = useApp();
  const [reflection, setReflection] = useState("");
  const [kept, setKept] = useState(false);
  const L = ARTICLE_26;

  const toLetter = () => {
    const id = uid();
    updateVoice((v) => ({ ...v, letters: [...v.letters, { id, createdAt: Date.now(), lang: "en", draft: reflection, status: "draft" }] }));
    go(`/letter/${id}`);
  };
  const keepForMe = () => {
    if (reflection.trim()) updateVoice((v) => ({ ...v, letters: [...v.letters, { id: uid(), createdAt: Date.now(), lang: "en", draft: reflection, status: "kept" }] }));
    setKept(true);
    updateVoice((v) => ({ ...v, rightsDone: { ...v.rightsDone, "1": Math.max(v.rightsDone["1"] ?? 0, 6) } }));
    setTimeout(() => go("/rights", { replace: true }), 900);
  };

  const steps = L.steps.map((s, i) => (
    <div key={i} className="u-enter" style={{ ["--i" as string]: i + 2, display: "flex", gap: desk ? 14 : 10 } as React.CSSProperties}>
      <div style={{ width: desk ? 34 : 28, height: desk ? 34 : 28, borderRadius: 17, background: "#EEE7FF", color: "#4F24B8", display: "flex", alignItems: "center", justifyContent: "center", font: `900 ${desk ? 15 : 13}px/1 var(--font-latin)`, flex: "none" }}>{num(i + 1)}</div>
      <div style={{ font: `500 ${desk ? 18 : 15}px/${desk ? 1.55 : 1.5} var(--font-latin)`, color: "#1C1433", maxWidth: 720 }}>{m(s)}</div>
    </div>
  ));

  const reflect = (
    <div className="u-enter" style={{ ["--i" as string]: 5, animation: desk ? undefined : "uRise 240ms var(--ease-settle) 700ms both, qBob 4s ease-in-out 1s infinite" } as React.CSSProperties}>
      <div style={{ background: "#7443F0", borderRadius: desk ? 26 : 22, padding: desk ? "20px 24px" : "14px 16px", boxShadow: "0 5px 0 #4F24B8", display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="eyebrow" style={{ color: "#E4DBFF" }}>{m({ en: "Reflect", fa: "فکر کن" })}</div>
        <div style={{ font: `800 ${desk ? 22 : 18}px/1.3 var(--font-latin)`, color: "#FFFFFF" }}>{m(L.reflect)}</div>
        {!desk && (
          <label style={{ minHeight: 44, borderRadius: 14, background: "rgba(255,255,255,.16)", display: "flex", alignItems: "center", gap: 8, padding: "0 12px" }}>
            <Icon n="pen" s={18} c="#E4DBFF" w={2.4} />
            <span className="sr">{m({ en: "Write or say your answer", fa: "جوابت را بنویس یا بگو" })}</span>
            <input className="plain-input" value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder={m({ en: "Write or say your answer…", fa: "جوابت را بنویس یا بگو…" })} style={{ font: "600 14px/1 var(--font-latin)", color: "#FFFFFF", height: 44 }} />
          </label>
        )}
      </div>
    </div>
  );

  if (desk) return <RightsDesk steps={steps} reflect={reflect} />;

  return (
    <Full>
      <div className="col" style={{ maxWidth: 720, display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
        <div style={{ height: "calc(190px + var(--safe-top))", position: "relative", flex: "none", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0 }}><Art seed="rights-a26" w={390} h={170} cols={5} bg="#7443F0" anim /></div>
          <div style={{ position: "absolute", insetInlineStart: 12, top: "calc(var(--safe-top) + 36px)" }}><IconBtn n="back" bg="rgba(255,255,255,.9)" s={22} w={2.6} label={t("back")} onClick={() => go(-1)} /></div>
          <div style={{ position: "absolute", insetInlineStart: 16, bottom: 14, height: 30, padding: "0 12px", borderRadius: 999, background: "#FFFFFF", display: "flex", alignItems: "center", font: "800 12px/1 var(--font-latin)", color: "#4F24B8" }}>{m({ en: `Unit ${L.unit} · Lesson ${L.lesson} · ${L.minutes} min`, fa: `فصل ${num(L.unit)} · درس ${num(L.lesson)} · ${num(L.minutes)} دقیقه` })}</div>
        </div>
        <div style={{ flex: 1, padding: "18px 20px 0", display: "flex", flexDirection: "column", gap: 12 }}>
          <h1 className="u-enter" style={{ margin: 0, font: "900 26px/1.12 var(--font-latin)", letterSpacing: "-.01em", color: "#1C1433" }}>{L.title.en}</h1>
          <Dari style={{ font: "800 18px/1.6 var(--font-rtl)", color: "#4F24B8" }}>{L.title.fa}</Dari>
          {steps}
          {reflect}
        </div>
        <div style={{ flex: "none", padding: "12px 16px calc(22px + var(--safe-bottom))", display: "flex", flexDirection: "column", gap: 8 }}>
          <Btn tone="saf" icon="letter" fs={17} onClick={toLetter}>{m({ en: "Turn it into a Letter to the World?", fa: "آن را به نامه‌ای به جهان تبدیل کنی؟" })}</Btn>
          <button className="press flat" onClick={keepForMe} style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, font: "800 15px/1 var(--font-latin)", color: kept ? "#146B2D" : "#4F24B8" }}>
            {kept && <Icon n="check" s={18} c="#146B2D" w={3} />}{kept ? m({ en: "Kept, just for you", fa: "فقط برای تو نگه داشته شد" }) : m({ en: "Keep it just for me", fa: "فقط برای خودم بماند" })}
          </button>
        </div>
      </div>
    </Full>
  );
}

/** W4: the lesson steps in on the left, the letter writes on the right while the
 *  protection scan marks what will be removed. Keep and Share stay equal. */
function RightsDesk({ steps, reflect }: { steps: React.ReactNode; reflect: React.ReactNode }) {
  const { m, t, num, dir } = useLang();
  const go = useNavigate();
  const { updateVoice } = useApp();
  const L = ARTICLE_26;
  const [text, setText] = useState("");
  const s = scrub(text);
  const flagged = s.changes.filter((c) => c.kind === "name" || c.kind === "city").length > 0;

  const finish = (share: boolean) => {
    const id = uid();
    updateVoice((v) => ({ ...v, letters: [...v.letters, { id, createdAt: Date.now(), lang: "en", draft: text, status: share ? "draft" : "kept", scrubbed: share ? scrub(text) : undefined }] }));
    go(share ? `/letter/${id}/check` : "/rights");
  };

  return (
    <div dir={dir} className="screen" style={{ height: "100dvh", display: "flex", flexDirection: "row", background: "#FFF8EF" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ height: 250, position: "relative", overflow: "hidden", flex: "none" }}>
          <div style={{ position: "absolute", inset: 0 }}><Art seed="band-rights" w={390} h={130} cols={6} bg="#7443F0" anim /></div>
          <div style={{ position: "absolute", insetInlineStart: 32, top: 28 }}><IconBtn n="back" bg="rgba(255,255,255,.92)" s={24} w={2.6} size={48} label={t("back")} onClick={() => go(-1)} /></div>
          <div style={{ position: "absolute", insetInlineStart: 32, bottom: 26, display: "flex", gap: 10 }}>
            <div style={{ height: 34, padding: "0 14px", borderRadius: 999, background: "#FFFFFF", display: "flex", alignItems: "center", font: "800 13px/1 var(--font-latin)", color: "#4F24B8" }}>My rights, my voice · Unit {L.unit} · Lesson {L.lesson}</div>
            <div style={{ height: 34, padding: "0 14px", borderRadius: 999, background: "#FFB31A", display: "flex", alignItems: "center", font: "800 13px/1 var(--font-latin)", color: "#1C1433" }}>{num(L.minutes)} min</div>
          </div>
        </div>
        <div className="vscroll" style={{ flex: 1, padding: "30px 48px 30px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="u-enter" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, font: "900 40px/1.1 var(--font-latin)", letterSpacing: "-.02em", color: "#1C1433" }}>{L.title.en}</h1>
            <div dir="rtl" className="fa" style={{ font: "800 24px/1.6 var(--font-rtl)", color: "#4F24B8", flex: "none" }}>{L.title.fa}</div>
          </div>
          {steps}
          {reflect}
        </div>
      </div>
      <div style={{ width: 500, flex: "none", background: "#FFFFFF", borderInlineStart: "2px solid #F3ECE2", display: "flex", flexDirection: "column", padding: "28px 28px 26px", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icon n="letter" s={26} c="#D81E57" w={2.4} />
          <div style={{ flex: 1, font: "900 22px/1 var(--font-latin)", color: "#1C1433" }}>{m({ en: "Letter to the World", fa: "نامه به جهان" })}</div>
          <div style={{ height: 30, padding: "0 10px", borderRadius: 999, background: "#E0F2DF", display: "flex", alignItems: "center", gap: 5, font: "800 12px/1 var(--font-latin)", color: "#146B2D" }}><Icon n="ondevice" s={15} c="#146B2D" w={2.4} />{t("savedHere")}</div>
        </div>
        <div style={{ background: "#EEE7FF", borderRadius: 18, padding: "14px 16px", font: "800 16px/1.35 var(--font-latin)", color: "#4F24B8" }}>{m(LETTER_PROMPT)}</div>
        <LetterArea text={text} setText={setText} scan bg="#FFF8EF" />
        <div style={{ display: "flex", gap: 10, alignItems: "center", background: flagged ? "#E0F2DF" : "#F3ECE2", borderRadius: 16, padding: "12px 14px", transition: "background-color 240ms" }}>
          <div style={{ width: 30, height: 30, borderRadius: 15, background: flagged ? "#1F8F3F" : "#D9CDBB", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon n="check" s={18} c="#FFFFFF" w={3} /></div>
          <div style={{ font: "800 14px/1.35 var(--font-latin)", color: flagged ? "#146B2D" : "#4E4868" }}>{flagged ? m({ en: "Name and city will be removed before anyone sees it.", fa: "نام و شهر پیش از آن‌که کسی ببیند حذف می‌شود." }) : m({ en: "Anything that could identify you is taken out before anyone sees it.", fa: "هر چه تو را بشناساند، پیش از دیدن کسی حذف می‌شود." })}</div>
        </div>
        <EqualChoice onKeep={() => finish(false)} onShare={() => finish(true)} disabled={!text.trim()} h={60} />
      </div>
    </div>
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
      <span className="sr">{m({ en: "Your letter", fa: "نامه تو" })}</span>
      <textarea className="plain-input" value={text} onChange={(e) => setText(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} placeholder={placeholder ?? m({ en: "Start with what you hope for…", fa: "با آرزویت شروع کن…" })} style={{ flex: 1, padding: 16, font: "500 17px/1.6 var(--font-latin)", color: "#1C1433", caretColor: "#00827E" }} />
      {!focus && !text && <span style={{ position: "absolute", insetInlineStart: 16, top: 18 }}><Caret /></span>}
      {scan && text.length > 20 && <ScanBar travel={170} />}
    </label>
  );
}
