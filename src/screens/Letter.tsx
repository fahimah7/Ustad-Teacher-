import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Full } from "../components/Shell";
import { Icon } from "../components/Icon";
import { Journey, ScanBar } from "../components/fx";
import { Btn, Dari, IconBtn, Press, Segmented } from "../components/ui";
import { EqualChoice, LetterArea } from "./Rights";
import { useApp, uid, type Letter } from "../state/app";
import { LANG_LABEL, useLang, type Lang } from "../lib/i18n";
import type { IconName } from "../lib/icons";
import { LETTER_PROMPT, LETTER_THEMES, WALL_SNAPSHOT } from "../content/rights";
import { scrub, type Change } from "../lib/scrub";
import { sealLetter } from "../lib/outbox";
import { saveFile } from "../lib/files";
import { canRecognizeLocally, recognizeLocally } from "../lib/speech";

function useLetter(): [Letter | undefined, (fn: (l: Letter) => Letter) => void] {
  const { id } = useParams();
  const { voice, updateVoice } = useApp();
  const l = voice.letters.find((x) => x.id === id);
  const set = (fn: (l: Letter) => Letter) => updateVoice((v) => ({ ...v, letters: v.letters.map((x) => (x.id === id ? fn(x) : x)) }));
  return [l, set];
}

function Top({ title, right, onBack }: { title: string; right?: React.ReactNode; onBack?: () => void }) {
  const go = useNavigate();
  const { t } = useLang();
  return (
    <div className="safe-top" style={{ background: "#FFFFFF", borderBottom: "2px solid #F3ECE2", flex: "none" }}>
      <div style={{ height: 60, display: "flex", alignItems: "center", gap: 8, padding: "0 14px 0 6px", maxWidth: 720, margin: "0 auto" }}>
        <IconBtn n="back" label={t("back")} onClick={onBack ?? (() => go(-1))} />
        <h1 style={{ flex: 1, margin: 0, font: "900 18px/1 var(--font-latin)", color: "#1C1433" }}>{title}</h1>
        {right}
      </div>
    </div>
  );
}

/** 09 Write a letter: autosaved and encrypted on the phone. */
export function LetterWrite() {
  const { id } = useParams();
  const go = useNavigate();
  const { m, t } = useLang();
  const { voice, updateVoice } = useApp();
  const [l, setL] = useLetter();
  const [listening, setListening] = useState(false);
  const [hint, setHint] = useState("");
  const recog = useRef<{ stop(): void } | null>(null);

  // /letter/new makes a draft and moves to its own address.
  useEffect(() => {
    if (!id) {
      const nid = uid();
      updateVoice((v) => ({ ...v, letters: [...v.letters, { id: nid, createdAt: Date.now(), lang: "en", draft: "", status: "draft" }] }));
      go(`/letter/${nid}`, { replace: true });
    }
  }, [id, go, updateVoice]);
  useEffect(() => () => recog.current?.stop(), []);
  if (!l) return <Full><div /></Full>;

  const langs: Lang[] = ["en", "fa", "ps"];
  const rtl = l.lang !== "en";

  const say = async () => {
    if (listening) { recog.current?.stop(); setListening(false); return; }
    if (!(await canRecognizeLocally(l.lang))) {
      setHint(m({ en: "Speaking isn't available offline on this device yet. You can write instead.", fa: "گفتن هنوز روی این دستگاه به‌طور آفلاین در دسترس نیست. می‌توانی بنویسی." }));
      return;
    }
    const base = l.draft ? l.draft.trimEnd() + " " : "";
    recog.current = recognizeLocally(l.lang, (text) => setL((x) => ({ ...x, draft: base + text })));
    setListening(!!recog.current);
  };

  const protect = () => {
    recog.current?.stop();
    setL((x) => ({ ...x, scrubbed: scrub(x.draft) }));
    go(`/letter/${l.id}/check`);
  };

  return (
    <Full>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
        <Top title={m({ en: "Letter to the World", fa: "نامه به جهان" })} onBack={() => go("/rights")} right={
          <div style={{ height: 30, padding: "0 10px", borderRadius: 999, background: "#E0F2DF", display: "flex", alignItems: "center", gap: 5, font: "800 12px/1 var(--font-latin)", color: "#146B2D" }}><Icon n="ondevice" s={15} c="#146B2D" w={2.4} />{t("savedOnThisPhone")}</div>
        } />
        <div className="col" style={{ flex: 1, maxWidth: 720, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="u-enter" style={{ background: "#EEE7FF", borderRadius: 20, padding: "14px 16px", font: "800 17px/1.35 var(--font-latin)", color: "#4F24B8" }}>{m(LETTER_PROMPT)}</div>
          <div className="u-enter" dir={rtl ? "rtl" : "ltr"} style={{ ["--i" as string]: 1, flex: 1, display: "flex", minHeight: 220 } as React.CSSProperties}>
            <LetterArea text={l.draft} setText={(d) => setL((x) => ({ ...x, draft: d, status: "draft" }))} />
          </div>
          <div className="u-enter" style={{ ["--i" as string]: 2, display: "flex", alignItems: "center", gap: 8, minHeight: 40, padding: "6px 12px", borderRadius: 14, border: "2px dashed #FFB31A", flexWrap: "wrap" } as React.CSSProperties}>
            <Icon n="info" s={18} c="#7A4E00" w={2.4} />
            <div style={{ flex: 1, font: "800 13px/1.2 var(--font-latin)", color: "#7A4E00" }}>Don't write names or places</div>
            <div dir="rtl" className="fa" style={{ font: "700 13px/1.4 var(--font-rtl)", color: "#7A4E00" }}>نام اشخاص یا جاها را ننویس</div>
          </div>
          {hint && <div className="u-fade" style={{ font: "700 13px/1.4 var(--font-latin)", color: "#6F6A88" }}>{hint}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <Btn tone="outline" icon="mic" fg="#D81E57" fs={15} h={52} ledge={4} style={{ flex: 1, gap: 8, animation: listening ? "qPulse 1.6s ease-out infinite" : undefined }} onClick={say}>{listening ? m({ en: "Stop", fa: "بس" }) : m({ en: "Say it instead", fa: "به جایش بگو" })}</Btn>
            <Btn tone="outline" fs={15} h={52} ledge={4} style={{ flex: 1 }} onClick={() => setL((x) => ({ ...x, lang: langs[(langs.indexOf(x.lang) + 1) % 3] }))}>
              <span className={rtl ? "fa" : undefined}>{LANG_LABEL[l.lang]}</span> ▾
            </Btn>
          </div>
        </div>
        <div className="col" style={{ flex: "none", maxWidth: 720, padding: "0 16px calc(22px + var(--safe-bottom))" }}>
          <Btn tone="teal" iconEnd="arrow" fs={17} disabled={!l.draft.trim()} onClick={protect} style={{ width: "100%" }}>{m({ en: "Protect my letter", fa: "نامه‌ام را محافظت کن" })}</Btn>
        </div>
      </div>
    </Full>
  );
}

const CHANGE_ICON: Record<Change["kind"], { icon: IconName; bg: string; c: string }> = {
  name: { icon: "me", bg: "#FFE3EA", c: "#9A1240" },
  city: { icon: "map", bg: "#FFE3EA", c: "#9A1240" },
  school: { icon: "library", bg: "#DDF6F3", c: "#005F5B" },
  phone: { icon: "phone", bg: "#FFE3EA", c: "#9A1240" },
  email: { icon: "letter", bg: "#FFE3EA", c: "#9A1240" },
  date: { icon: "timer", bg: "#DDF6F3", c: "#005F5B" },
};

/** 10 Check your letter: rules on the phone took out what could identify her. */
export function LetterCheck() {
  const go = useNavigate();
  const { m, num } = useLang();
  const [l, setL] = useLetter();
  const [view, setView] = useState<"protected" | "original">("protected");
  const s = useMemo(() => l?.scrubbed ?? (l ? scrub(l.draft) : null), [l]);
  if (!l || !s) return <Full><div /></Full>;
  const n = s.changes.length;
  const label = (c: Change) => ({
    name: m({ en: "Name removed", fa: "نام حذف شد" }), city: c.replacement ? m({ en: "City made general", fa: "شهر عمومی شد" }) : m({ en: "City removed", fa: "شهر حذف شد" }),
    school: m({ en: "School name made general", fa: "نام مکتب عمومی شد" }), phone: m({ en: "Phone number removed", fa: "شماره تلفن حذف شد" }),
    email: m({ en: "Email removed", fa: "ایمیل حذف شد" }), date: m({ en: "Exact date made general", fa: "تاریخ دقیق عمومی شد" }),
  }[c.kind]);

  return (
    <Full>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
        <Top title={m({ en: "Check your letter", fa: "نامه‌ات را بررسی کن" })} right={<div style={{ font: "800 13px/1 var(--font-latin)", color: "#6F6A88" }}>{m({ en: "Step 2 of 3", fa: "مرحله ۲ از ۳" })}</div>} />
        <div className="col" style={{ flex: 1, maxWidth: 720, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="u-enter" style={{ display: "flex", gap: 12, alignItems: "center", background: "#E0F2DF", borderRadius: 18, padding: "12px 14px" }}>
            <div className="u-pop" style={{ ["--i" as string]: 2, width: 36, height: 36, borderRadius: 18, background: "#1F8F3F", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" } as React.CSSProperties}><Icon n="check" s={22} c="#FFFFFF" w={3} /></div>
            <div style={{ font: "800 15px/1.35 var(--font-latin)", color: "#146B2D" }}>
              {n ? m({ en: `We took out ${n} ${n === 1 ? "thing" : "things"} that could identify you. Everything else is your words.`, fa: `${num(n)} چیز را که می‌توانست تو را بشناساند برداشتیم. باقی همه حرف‌های خودت است.` })
                : m({ en: "Nothing in your letter could identify you. Every word is yours.", fa: "هیچ چیز در نامه‌ات تو را نمی‌شناساند. همه کلمات از خودت است." })}
            </div>
          </div>
          <Segmented value={view} h={40} onChange={setView} options={[{ v: "protected", label: m({ en: "Protected", fa: "محافظت‌شده" }) }, { v: "original", label: m({ en: "Your original", fa: "نسخه اصلی" }) }]} />
          <div key={view} className="u-fade" dir={l.lang === "en" ? "ltr" : "rtl"} style={{ position: "relative", background: "#FFFFFF", borderRadius: 22, padding: 16, boxShadow: "0 4px 0 #EFE6DA", font: l.lang === "en" ? "500 17px/1.75 var(--font-latin)" : "500 18px/1.8 var(--font-rtl)", color: "#1C1433", overflow: "hidden" }}>
            {view === "original" ? l.draft : s.segments.map((g, i) => {
              if (g.t === "keep") return <span key={i}>{g.text}</span>;
              const strike: React.CSSProperties = { background: "#FFE3EA", color: "#9A1240", textDecoration: "line-through", textDecorationThickness: 2, borderRadius: 6, padding: "1px 4px" };
              if (g.t === "removed") return <span key={i} style={strike}>{g.text}</span>;
              return <span key={i}><span style={strike}>{g.from}</span> <span style={{ background: "#DDF6F3", color: "#005F5B", borderRadius: 6, padding: "1px 4px", fontWeight: 700 }}>{g.to}</span></span>;
            })}
            {view === "protected" && n > 0 && <ScanBar />}
          </div>
          {n > 0 && <div style={{ font: "800 15px/1 var(--font-latin)", color: "#1C1433", marginTop: 4 }}>{m({ en: "What changed", fa: "چه تغییر کرد" })}</div>}
          {s.changes.map((c, i) => {
            const ic = CHANGE_ICON[c.kind];
            return (
              <div key={i} className="u-enter" style={{ ["--i" as string]: 3 + i, minHeight: 52, borderRadius: 16, background: "#FFFFFF", display: "flex", alignItems: "center", gap: 10, padding: "0 12px" } as React.CSSProperties}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: ic.bg, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon n={ic.icon} s={18} c={ic.c} w={2.4} /></div>
                <div style={{ flex: 1, font: "700 14px/1.3 var(--font-latin)", color: "#1C1433" }}>{label(c)}</div>
                <div style={{ font: "700 13px/1 var(--font-latin)", color: ic.c, textDecoration: c.replacement ? undefined : "line-through" }}>{c.replacement ? `→ ${c.replacement}` : c.original}</div>
              </div>
            );
          })}
        </div>
        <div className="col" style={{ flex: "none", maxWidth: 720, padding: "0 16px calc(22px + var(--safe-bottom))", display: "flex", gap: 10 }}>
          <Btn tone="outline" fs={16} style={{ flex: 1 }} onClick={() => go(`/letter/${l.id}`)}>{m({ en: "Edit more", fa: "بیشتر ویرایش کن" })}</Btn>
          <Btn tone="teal" fs={16} style={{ flex: 1.4 }} onClick={() => { setL((x) => ({ ...x, scrubbed: s, status: "reviewed" })); go(`/letter/${l.id}/share`); }}>{m({ en: "Looks right", fa: "درست است" })}</Btn>
        </div>
      </div>
    </Full>
  );
}

/** 11 Keep it, or share it. No dark pattern: both choices are identical. */
export function LetterShare() {
  const go = useNavigate();
  const { m } = useLang();
  const [l, setL] = useLetter();
  const [theme, setTheme] = useState(0);
  if (!l || !l.scrubbed) return <Full><div /></Full>;
  const text = l.scrubbed.cleaned;

  const keep = () => { setL((x) => ({ ...x, status: "kept", theme })); go("/rights", { replace: true }); };
  const share = () => {
    const sealed = sealLetter(text, LETTER_THEMES[theme].en, l.lang);
    setL((x) => ({ ...x, status: "queued", theme, outbox: sealed }));
    go(`/letter/${l.id}/sent`, { replace: true });
  };

  return (
    <Full>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
        <Top title={m({ en: "Your letter is ready", fa: "نامه‌ات آماده است" })} right={<div style={{ font: "800 13px/1 var(--font-latin)", color: "#6F6A88" }}>{m({ en: "Step 3 of 3", fa: "مرحله ۳ از ۳" })}</div>} />
        <div className="col" style={{ flex: 1, maxWidth: 720, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="u-enter" style={{ background: "#FFFFFF", borderRadius: 22, padding: 16, boxShadow: "0 4px 0 #EFE6DA", display: "flex", flexDirection: "column", gap: 10 }}>
            <div dir={l.lang === "en" ? "ltr" : "rtl"} style={{ font: l.lang === "en" ? "500 16px/1.6 var(--font-latin)" : "500 17px/1.8 var(--font-rtl)", color: "#1C1433" }}>"{text}"</div>
            <div style={{ font: "700 12px/1.4 var(--font-latin)", color: "#6F6A88" }}>{m({ en: `Protected · in ${LANG_LABEL[l.lang] === "English" ? "English" : "your language"} · your original stays only on this phone`, fa: "محافظت‌شده · به زبان خودت · نسخه اصلی فقط در همین گوشی می‌ماند" })}</div>
          </div>
          <div style={{ font: "800 15px/1 var(--font-latin)", color: "#1C1433" }}>{m({ en: "What is it about?", fa: "درباره چیست؟" })}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }} role="radiogroup">
            {LETTER_THEMES.map((th, i) => {
              const on = i === theme;
              return (
                <button key={i} role="radio" aria-checked={on} onClick={() => setTheme(i)} className="press flat u-pop" style={{ ["--i" as string]: i, height: 40, padding: "0 14px", borderRadius: 999, background: on ? "#1C1433" : "#FFFFFF", border: on ? "0" : "2px solid #EFE6DA", display: "flex", alignItems: "center", gap: 6, font: `${on ? 800 : 700} 14px/1 var(--font-latin)`, color: on ? "#FFFFFF" : "#1C1433", transition: "background-color 160ms" } as React.CSSProperties}>
                  {on && <Icon n="check" s={16} c="#FFB31A" w={3} />}{m(th)}
                </button>
              );
            })}
          </div>
          <div className="u-enter" style={{ ["--i" as string]: 3, background: "#EEE7FF", borderRadius: 20, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 } as React.CSSProperties}>
            <div style={{ font: "800 14px/1 var(--font-latin)", color: "#4F24B8" }}>{m({ en: "If you share it", fa: "اگر آن را شریک کنی" })}</div>
            {([
              ["ondevice", m({ en: "Your name, place and phone never leave.", fa: "نام، جا و گوشی تو هرگز بیرون نمی‌رود." })],
              ["refresh", m({ en: "A new one-time key; no one can link it to you.", fa: "یک کلید یک‌بارمصرف تازه؛ هیچ‌کس نمی‌تواند آن را به تو وصل کند." })],
              ["letter", m({ en: "People can read it and send it to lawmakers.", fa: "مردم می‌توانند آن را بخوانند و به قانون‌گذاران بفرستند." })],
            ] as [IconName, string][]).map(([ic, tx]) => (
              <div key={ic} style={{ display: "flex", gap: 10, font: "600 14px/1.4 var(--font-latin)", color: "#1C1433" }}><Icon n={ic} s={18} c="#4F24B8" w={2.4} />{tx}</div>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ textAlign: "center", font: "700 14px/1.4 var(--font-latin)", color: "#6F6A88" }}>{m({ en: "You can share later, or never. Both are good choices.", fa: "می‌توانی بعدا شریک کنی، یا هرگز. هر دو انتخاب خوب است." })}</div>
        </div>
        <div className="col" style={{ flex: "none", maxWidth: 720, padding: "0 16px calc(22px + var(--safe-bottom))" }}>
          <EqualChoice onKeep={keep} onShare={share} />
        </div>
      </div>
    </Full>
  );
}

/** 12 Her voice travels: learn → speak → mobilise, made visible. */
export function LetterSent() {
  const go = useNavigate();
  const { m, num } = useLang();
  const { closeVoice } = useApp();
  const [l] = useLetter();
  const [saved, setSaved] = useState(false);
  const nodes: [string, string, string][] = [
    [m({ en: "Your phone", fa: "گوشی تو" }), m({ en: "name, place and device stay here", fa: "نام، جا و دستگاه همین‌جا می‌ماند" }), "#00827E"],
    [m({ en: "One-time key", fa: "کلید یک‌بارمصرف" }), m({ en: "no link to you or your other letters", fa: "هیچ پیوندی با تو یا نامه‌های دیگرت" }), "#7443F0"],
    [m({ en: "Wall of Voices", fa: "دیوار صداها" }), m({ en: "people read it, in English and Dari", fa: "مردم آن را به انگلیسی و دری می‌خوانند" }), "#D81E57"],
    [m({ en: "Lawmakers", fa: "قانون‌گذاران" }), m({ en: "readers send it with one tap", fa: "خوانندگان با یک ضربه آن را می‌فرستند" }), "#FFB31A"],
  ];
  const exportIt = () => {
    if (!l?.outbox) return;
    saveFile(`letter-${(l.outbox.pubkey as string).slice(0, 8)}.json`, JSON.stringify(l.outbox.event, null, 2));
    setSaved(true);
  };
  return (
    <Full bg="#1C1433">
      <div className="safe-top col" style={{ maxWidth: 560, minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
        <div className="u-enter" style={{ padding: "28px 24px 0" }}>
          <div style={{ display: "inline-flex", height: 30, padding: "0 12px", borderRadius: 999, background: "#1F8F3F", alignItems: "center", gap: 6, font: "800 12px/1 var(--font-latin)", color: "#FFFFFF" }}><Icon n="check" s={15} c="#FFFFFF" w={3} />{m({ en: "Sealed without your name", fa: "بدون نام تو مهر شد" })}</div>
          <h1 style={{ margin: "14px 0 0", font: "900 32px/1.08 var(--font-latin)", letterSpacing: "-.02em", color: "#FFFFFF" }}>{m({ en: "Your words are on their way.", fa: "کلمات تو در راه است." })}</h1>
          <div style={{ font: "600 15px/1.5 var(--font-latin)", color: "#BDB6D9", marginTop: 8 }}>{m({ en: "No one can trace this letter to you, your phone, or your other letters.", fa: "هیچ‌کس نمی‌تواند این نامه را به تو، گوشی‌ات یا نامه‌های دیگرت ربط دهد." })}</div>
        </div>
        <div className="u-enter" style={{ ["--i" as string]: 2, padding: "28px 24px 0" } as React.CSSProperties}><Journey nodes={nodes} /></div>
        <div className="u-fade" style={{ ["--i" as string]: 6, margin: "22px 16px 0", display: "flex", alignItems: "center", gap: 10, background: "rgba(255,179,26,.12)", borderRadius: 16, padding: "12px 14px" } as React.CSSProperties}>
          <Icon n="keep" s={20} c="#FFB31A" w={2.4} />
          <div style={{ flex: 1, font: "700 13px/1.4 var(--font-latin)", color: "#FFF1CC" }}>{m({ en: "Waiting for a connection · safe here until then. This phone never goes online: hand it on as a file, and anyone with a connection can post it.", fa: "در انتظار اتصال · تا آن وقت این‌جا امن است. این گوشی آنلاین نمی‌شود: آن را به شکل فایل بسپار تا هر کسی با اتصال بتواند آن را بفرستد." })}</div>
        </div>
        <div style={{ flex: 1, minHeight: 20 }} />
        <div className="u-enter" style={{ ["--i" as string]: 7, margin: "0 16px", background: "rgba(255,255,255,.08)", borderRadius: 22, padding: 16, display: "flex", gap: 16 } as React.CSSProperties}>
          <div style={{ flex: 1 }}><div style={{ font: "900 28px/1 var(--font-latin)", color: "#FFB31A" }}>{num(WALL_SNAPSHOT.letters)}</div><div style={{ font: "700 12px/1.4 var(--font-latin)", color: "#BDB6D9", marginTop: 4 }}>{m({ en: "letters on the Wall of Voices", fa: "نامه روی دیوار صداها" })}</div></div>
          <div style={{ flex: 1 }}><div style={{ font: "900 28px/1 var(--font-latin)", color: "#19B8B0" }}>{WALL_SNAPSHOT.bill}</div><div style={{ font: "700 12px/1.4 var(--font-latin)", color: "#BDB6D9", marginTop: 4 }}>{m({ en: "the bill readers ask Congress to pass", fa: "لایحه‌ای که خوانندگان از کانگرس می‌خواهند تصویب کند" })}</div></div>
        </div>
        <div style={{ padding: "8px 24px 0", font: "600 11px/1.4 var(--font-latin)", color: "#6F6A88" }}>{m({ en: `As of your last pack · ${WALL_SNAPSHOT.asOf}`, fa: `بر اساس آخرین بسته · ${WALL_SNAPSHOT.asOf}` })}</div>
        <div style={{ padding: "16px 16px calc(22px + var(--safe-bottom))", display: "flex", flexDirection: "column", gap: 10 }}>
          <Btn tone="outline" icon={saved ? "check" : "sdcard"} fs={16} style={{ background: "rgba(255,255,255,.08)", border: "3px solid rgba(255,255,255,.18)", boxShadow: "0 5px 0 rgba(0,0,0,.35)", color: "#FFFFFF" }} fg="#FFFFFF" onClick={exportIt}>{saved ? m({ en: "Saved as a file", fa: "به شکل فایل ذخیره شد" }) : m({ en: "Save for a memory card", fa: "ذخیره برای کارت حافظه" })}</Btn>
          <Btn tone="saf" fs={17} onClick={() => { closeVoice(); go("/", { replace: true }); }}>{m({ en: "Back to my lessons", fa: "بازگشت به درس‌هایم" })}</Btn>
        </div>
      </div>
    </Full>
  );
}

export { Dari, Press };
