import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Full } from "../components/Shell";
import { Art } from "../components/Art";
import { Icon } from "../components/Icon";
import { Btn, Cover, IconBtn, Press, Segmented, UstadAvatar } from "../components/ui";
import { useApp } from "../state/app";
import { useLang, type Lang, langOptions } from "../lib/i18n";
import { booksOf, gradeState, installedGrades } from "../content/library";
import { SUBJECTS } from "../content/subjects";

/** First screens at every start: her name (kept in memory only), a greeting and her grade,
 *  then the book. */

function Stage({ children, back }: { children: React.ReactNode; back?: () => void }) {
  const { t } = useLang();
  return (
    <div style={{ background: "#00827E", position: "relative", overflow: "hidden", padding: "max(var(--safe-top), 28px) 0 76px" }}>
      <div style={{ position: "absolute", insetInline: 0, bottom: 0, height: 150, opacity: 0.28 }}><Art seed="band-home" w={390} h={130} cols={6} bg="#00827E" anim /></div>
      <div className="col" style={{ maxWidth: 720, position: "relative", padding: "8px 20px 0" }}>
        {back && <IconBtn n="back" bg="rgba(255,255,255,.9)" c="#1C1433" s={22} w={2.6} label={t("back")} onClick={back} />}
        {children}
      </div>
    </div>
  );
}

export function WelcomeName() {
  const { m, lang, setLang } = useLang();
  const { name, setName } = useApp();
  const [draft, setDraft] = useState(name);
  const go = useNavigate();
  const submit = () => {
    const n = draft.replace(/\s+/g, " ").trim().slice(0, 30);
    if (!n) return;
    setName(n);
    go("/welcome/grade");
  };
  return (
    <Full>
      <Stage>
        <div className="u-enter" style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18 }}>
          <UstadAvatar w={64} h={70} />
          <div style={{ font: "800 17px/1.4 var(--font-latin)", color: "#DDF6F3" }}>{m({ en: "Salaam! I'm Ustad, your teacher.", fa: "سلام! من استاد هستم، معلم شما." })}</div>
        </div>
        <h1 className="u-enter" style={{ ["--i" as string]: 1, margin: "18px 0 0", font: "900 40px/1.1 var(--font-latin)", letterSpacing: "-.02em", color: "#FFFFFF" } as React.CSSProperties}>
          {m({ en: "What is your name?", fa: "نام شما چیست؟" })}
        </h1>
      </Stage>
      <div className="col u-enter-far" style={{ ["--i" as string]: 2, maxWidth: 680, margin: "-50px auto 0", padding: "0 16px 32px", position: "relative", display: "flex", flexDirection: "column", gap: 14 } as React.CSSProperties}>
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} style={{ background: "#FFFFFF", borderRadius: 28, boxShadow: "0 6px 0 #E6DCCD", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={{ height: 60, borderRadius: 18, background: "#F7F1E8", border: "2px solid #EFE6DA", display: "flex", alignItems: "center", padding: "0 18px" }}>
            <span className="sr">{m({ en: "Your name", fa: "نام شما" })}</span>
            <input autoFocus className="plain-input" value={draft} maxLength={30} onChange={(e) => setDraft(e.target.value)} placeholder={m({ en: "Your name", fa: "نام شما" })} style={{ font: "700 20px/1 var(--font-latin)", width: "100%" }} enterKeyHint="go" />
          </label>
          <Btn tone="saf" iconEnd="arrow" type="submit" disabled={!draft.trim()}>{m({ en: "Continue", fa: "ادامه" })}</Btn>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", font: "600 13px/1.5 var(--font-latin)", color: "#6F6A88" }}>
            <Icon n="ondevice" s={18} c="#00827E" w={2.4} />
            {m({ en: "Your name stays only while the app is open. It is never saved or sent anywhere.", fa: "نام شما فقط تا وقتی برنامه باز است می‌ماند. هرگز ذخیره یا به جایی فرستاده نمی‌شود." })}
          </div>
        </form>
        <div style={{ background: "#FFFFFF", borderRadius: 22, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ font: "800 15px/1 var(--font-latin)", color: "#1C1433" }}>{m({ en: "Language", fa: "زبان" })}</div>
          <Segmented<Lang> value={lang} onChange={setLang} options={langOptions(lang)} />
        </div>
      </div>
    </Full>
  );
}

export function WelcomeGrade() {
  const { m, num } = useLang();
  const { name, school, update } = useApp();
  const go = useNavigate();
  const have = installedGrades();
  if (!name) return <RedirectHome />;
  const pick = (g: number) => {
    update((s) => ({ ...s, grade: g }));
    go("/welcome/book");
  };
  return (
    <Full>
      <Stage back={() => go("/welcome")}>
        <h1 className="u-enter" style={{ margin: "16px 0 0", font: "900 40px/1.1 var(--font-latin)", letterSpacing: "-.02em", color: "#FFFFFF" }}>
          {m({ en: `Salaam, ${name}!`, fa: `سلام ${name} جان، خوش آمدید!` })}
        </h1>
        <div className="u-enter" style={{ ["--i" as string]: 1, font: "700 18px/1.4 var(--font-latin)", color: "#DDF6F3", marginTop: 10 } as React.CSSProperties}>{m({ en: "Which grade are you in?", fa: "در کدام صنف هستید؟" })}</div>
      </Stage>
      <div className="col u-enter-far" style={{ maxWidth: 720, margin: "-50px auto 0", padding: "0 16px 32px", position: "relative" }}>
        <div style={{ background: "#FFFFFF", borderRadius: 28, boxShadow: "0 6px 0 #E6DCCD", padding: 16, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => {
            const here = gradeState(g) !== "missing";
            const on = school.grade === g;
            return here ? (
              <Press key={g} ledge={4} className="u-pop" aria-pressed={on} onClick={() => pick(g)} style={{ ["--i" as string]: g, height: 76, borderRadius: "22px 22px 10px 10px", background: on ? "#FFB31A" : "#FFF1CC", boxShadow: on ? "0 4px 0 #C98300" : "0 4px 0 #E6D2A3", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, font: "900 26px/1 var(--font-latin)", color: "#1C1433" } as React.CSSProperties}>
                {num(g)}
                <span style={{ font: "800 11px/1 var(--font-latin)", color: "#7A4E00" }}>{num(booksOf(g).filter((b) => b.installed).length)} {m({ en: booksOf(g).filter((b) => b.installed).length === 1 ? "book" : "books", fa: "کتاب" })}</span>
              </Press>
            ) : (
              <div key={g} aria-label={m({ en: `Grade ${g}: not on this device yet`, fa: `صنف ${g}: هنوز در این دستگاه نیست` })} style={{ height: 76, borderRadius: "22px 22px 10px 10px", border: "3px dashed #D9CDBB", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, font: "900 22px/1 var(--font-latin)", color: "#A8A1B8" }}>
                {num(g)}
                <Icon n="download" s={13} c="#A8A1B8" w={3} />
              </div>
            );
          })}
        </div>
        {!have.length && (
          <div style={{ marginTop: 14, background: "#FFFFFF", borderRadius: 22, padding: 16, border: "2px dashed #D9CDBB", font: "600 15px/1.5 var(--font-latin)", color: "#4E4868" }}>
            {m({ en: "No books are on this device yet. Get a learning pack from a friend's phone or a memory card.", fa: "هنوز کتابی در این دستگاه نیست. یک بستهٔ آموزشی را از گوشی یک دوست یا کارت حافظه بگیرید." })}
          </div>
        )}
        <div style={{ marginTop: 12, font: "600 13px/1.5 var(--font-latin)", color: "#6F6A88", textAlign: "center" }}>{m({ en: "Grades with a dashed border aren't on this device yet: they come as learning packs.", fa: "صنف‌هایی که حاشیهٔ نقطه‌چین دارند هنوز در این دستگاه نیستند و با بستهٔ آموزشی می‌آیند." })}</div>
      </div>
    </Full>
  );
}

export function WelcomeBook() {
  const { m, num } = useLang();
  const { name, school, update } = useApp();
  const go = useNavigate();
  if (!name) return <RedirectHome />;
  const grade = school.grade ?? installedGrades()[0] ?? 12;
  const books = booksOf(grade);
  const open = (bookId: string) => {
    const b = books.find((x) => x.id === bookId)!;
    const first = b.units[0]?.lessons[0];
    if (!first) return;
    update((s) => ({ ...s, reading: first.id }));
    // A book opens at its first page; "continue" brings her back to where she stopped.
    go(`/lesson/${first.id}?page=1`, { replace: true });
  };
  return (
    <Full>
      <Stage back={() => go("/welcome/grade")}>
        <h1 className="u-enter" style={{ margin: "16px 0 0", font: "900 40px/1.1 var(--font-latin)", letterSpacing: "-.02em", color: "#FFFFFF" }}>{m({ en: "Which book?", fa: "کدام کتاب؟" })}</h1>
        <div className="u-enter" style={{ ["--i" as string]: 1, font: "700 18px/1.4 var(--font-latin)", color: "#DDF6F3", marginTop: 10 } as React.CSSProperties}>{m({ en: `Grade ${grade} books`, fa: `کتاب‌های صنف ${num(grade)}` })}</div>
      </Stage>
      <div className="col u-enter-far" style={{ maxWidth: 720, margin: "-50px auto 0", padding: "0 16px 32px", position: "relative" }}>
        <div className="tab-cols-3" style={{ background: "#FFFFFF", borderRadius: 28, boxShadow: "0 6px 0 #E6DCCD", padding: 16, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {books.map((b, i) => (
            b.installed ? (
              <Press key={b.id} ledge={0} flat className="u-tile" onClick={() => open(b.id)} aria-label={m(SUBJECTS[b.subject].name)} style={{ ["--i" as string]: i, display: "block" } as React.CSSProperties}>
                <Cover subject={b.subject} grade={b.grade} />
              </Press>
            ) : (
              <div key={b.id} style={{ opacity: 0.35, filter: "grayscale(.6)" }} aria-label={m({ en: `${SUBJECTS[b.subject].name.en}: not on this device yet`, fa: `${SUBJECTS[b.subject].name.fa}: هنوز در این دستگاه نیست` })}>
                <Cover subject={b.subject} grade={b.grade} ledge={false} />
              </div>
            )
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
          <button className="press flat" onClick={() => go("/", { replace: true })} style={{ height: 44, padding: "0 16px", font: "800 15px/1 var(--font-latin)", color: "#00827E" }}>{m({ en: "Go to home", fa: "رفتن به خانه" })}</button>
        </div>
      </div>
    </Full>
  );
}

function RedirectHome() {
  return <Navigate to="/welcome" replace />;
}
