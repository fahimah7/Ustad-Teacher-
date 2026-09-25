import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabbed } from "../components/Shell";
import { Art } from "../components/Art";
import { Icon } from "../components/Icon";
import { MicButton } from "../components/Chat";
import { isRtlText } from "../components/MathText";
import { Press, Segmented, Thumb } from "../components/ui";
import { useApp, useReading } from "../state/app";
import { useLang, type Lang, SEP, langOptions } from "../lib/i18n";
import { speak } from "../lib/speech";
import { pageLabel, plainText, suggestionsFor } from "../lib/tutor";
import { bookById, lessonById } from "../content/library";
import { SUBJECTS } from "../content/subjects";

const TINT = { saf: { bg: "#FFF1CC", c: "#7A4E00" }, teal: { bg: "#DDF6F3", c: "#005F5B" }, vio: { bg: "#EEE7FF", c: "#4F24B8" } };

/** 05 Ask: the question hub (centre tab). */
export function AskHub() {
  const { m, lang, setLang } = useLang();
  const { school, update } = useApp();
  const go = useNavigate();
  const [q, setQ] = useState("");
  const reading = useReading();
  const here = reading?.lesson.id ?? "";
  const sugg = reading ? suggestionsFor(reading.book.id, reading.page) : [];

  const start = (text: string, lessonId = here, page?: number) => {
    const l = lessonById(lessonId);
    if (!text.trim() || !l) return;
    update((s) => ({ ...s, reading: lessonId, pages: page ? { ...s.pages, [l.bookId]: page } : s.pages }));
    go(`/chat/${lessonId}?q=${encodeURIComponent(text.trim())}`);
  };

  return (
    <Tabbed tab="ask">
      <div className="screen">
        <div className="col" style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ background: "#D81E57", paddingBottom: 70, position: "relative", overflow: "hidden", paddingTop: "max(var(--safe-top), 28px)" }}>
            <div style={{ position: "absolute", insetInline: 0, bottom: 0, height: 130, opacity: 0.3 }}><Art seed="band-ask" w={390} h={130} cols={6} bg="#D81E57" anim /></div>
            <div className="desk-pad u-enter" style={{ padding: "22px 20px 0", position: "relative" }}>
              <h1 style={{ margin: 0, font: "900 36px/1 var(--font-latin)", letterSpacing: "-.02em", color: "#FFFFFF" }}>{m({ en: "Ask Ustad", fa: "از استاد بپرس" })}</h1>
              <div style={{ font: "600 15px/1.45 var(--font-latin)", color: "#FFE3EA", marginTop: 8, maxWidth: 300 }}>{reading ? m({ en: `Any question, by voice or text. Ustad answers from ${pageLabel(reading.book.id, reading.page, "en", true)} of your book.`, fa: `هر سوالی، با صدا یا متن. استاد از ${pageLabel(reading.book.id, reading.page, "fa")} کتاب شما جواب می‌دهد.` }) : m({ en: "Open a book first, and Ustad will read it with you.", fa: "اول یک کتاب را باز کنید تا استاد آن را با شما بخواند." })}</div>
            </div>
          </div>
          <div className="u-enter-far" style={{ ["--i" as string]: 1, margin: "-52px 16px 0", background: "#FFFFFF", borderRadius: 26, boxShadow: "0 6px 0 #E6DCCD", padding: 14, position: "relative", display: "flex", flexDirection: "column", gap: 12 } as React.CSSProperties}>
            <form onSubmit={(e) => { e.preventDefault(); start(q); }} style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <label style={{ flex: 1, height: 56, borderRadius: 18, background: "#F7F1E8", border: "2px solid #EFE6DA", display: "flex", alignItems: "center", padding: "0 16px" }}>
                <span className="sr">{m({ en: "Type your question", fa: "سوالت را بنویس" })}</span>
                <input className="plain-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={m({ en: "Type your question…", fa: "سوالت را بنویس…" })} style={{ font: "600 16px/1 var(--font-latin)" }} enterKeyHint="send" />
              </label>
              {q.trim() ? (
                <Press type="submit" aria-label={m({ en: "Ask", fa: "بپرس" })} style={{ width: 52, height: 52, borderRadius: 26, background: "#D81E57", boxShadow: "0 5px 0 #9A1240", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon n="send" s={24} c="#FFFFFF" w={2.4} /></Press>
              ) : (
                <MicButton size={52} label={m({ en: "Talk with Ustad", fa: "گفتگو با استاد" })} onDown={() => here && go(`/talk/${here}`)} />
              )}
            </form>
            <Segmented<Lang> value={lang} onChange={setLang} options={langOptions(lang)} />
          </div>

          <h2 className="desk-pad" style={{ margin: 0, padding: "20px 20px 10px", font: "800 18px/1 var(--font-latin)", color: "#1C1433" }}>{reading ? m({ en: `About ${pageLabel(reading.book.id, reading.page, "en", true)}`, fa: `دربارهٔ ${pageLabel(reading.book.id, reading.page, "fa")}` }) : m({ en: "About the page you're on", fa: "دربارهٔ صفحه‌ای که در آن هستید" })}</h2>
          <div className="desk-pad grid-2" style={{ gap: 8, padding: "0 16px" }}>
            {sugg.map((s, i) => (
              <Press key={i} ledge={4} className="u-enter" onClick={() => start(m(s.q))} style={{ ["--i" as string]: 2 + i, height: 52, borderRadius: 16, background: "#FFFFFF", border: "2px solid #EFE6DA", boxShadow: "0 4px 0 #EFE6DA", display: "flex", alignItems: "center", gap: 10, padding: "0 12px", textAlign: "start" } as React.CSSProperties}>
                <div style={{ width: 30, height: 30, borderRadius: "15px 15px 7px 7px", background: TINT[s.tint].bg, display: "flex", alignItems: "center", justifyContent: "center", font: "900 15px/1 var(--font-latin)", color: TINT[s.tint].c, flex: "none" }}>?</div>
                <div style={{ flex: 1, minWidth: 0, font: "700 15px/1.2 var(--font-latin)", color: "#1C1433", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m(s.q)}</div>
                <Icon n="next" s={20} c="#6F6A88" w={2.4} />
              </Press>
            ))}
          </div>

          <div className="desk-pad" style={{ padding: "20px 20px 10px", display: "flex", alignItems: "baseline" }}>
            <h2 style={{ margin: 0, font: "800 18px/1 var(--font-latin)", color: "#1C1433" }}>{m({ en: "Your questions", fa: "سوال‌های تو" })}</h2>
            <div style={{ marginInlineStart: "auto", font: "700 13px/1 var(--font-latin)", color: "#6F6A88" }}>{m({ en: "saved on this device, locked", fa: "در همین دستگاه، قفل‌شده" })}</div>
          </div>
          <div className="desk-pad grid-2" style={{ gap: 8, padding: "0 16px 24px" }}>
            {school.questions.slice(0, 8).map((sq, i) => {
              const l = lessonById(sq.lessonId);
              if (!l) return null;
              const sj = SUBJECTS[l.subject];
              const book = bookById(l.bookId);
              return (
                <div key={sq.id} className="u-fade" style={{ ["--i" as string]: 5 + i, display: "flex", gap: 12, alignItems: "center", background: "#FFFFFF", borderRadius: 16, padding: "8px 12px 8px 8px" } as React.CSSProperties}>
                  <button className="press flat" onClick={() => start(sq.q, sq.lessonId, sq.page)} style={{ display: "flex", gap: 12, alignItems: "center", flex: 1, minWidth: 0, textAlign: "start" }}>
                    <Thumb subject={l.subject} grade={l.grade} w={36} h={44} r="10px 10px 5px 5px" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div dir="auto" style={{ font: "700 15px/1.5 var(--font-rtl)", color: "#1C1433", textAlign: "start" }}>{sq.q}</div>
                      <div style={{ font: "600 12px/1.5 var(--font-latin)", color: "#6F6A88" }}>{m(sj.short)} {l.grade}{SEP}{book && sq.page ? pageLabel(book.id, sq.page, lang) : m(l.lesson.title)}</div>
                    </div>
                  </button>
                  <Press flat aria-label={m({ en: "Listen", fa: "بشنو" })} onClick={() => speak(plainText(sq.answer ?? sq.q), { lang: isRtlText(sq.answer ?? sq.q) ? "fa" : "en" })} style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 22 }}>
                    <Icon n="speaker" s={22} c="#D81E57" w={2.4} />
                  </Press>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Tabbed>
  );
}
