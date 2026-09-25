import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabbed } from "../components/Shell";
import { Icon } from "../components/Icon";
import { Caret } from "../components/fx";
import { Cover, IconBtn, Press } from "../components/ui";
import { useApp, usePlacedGrade, useReading } from "../state/app";
import { useLang, SEP } from "../lib/i18n";
import { search } from "../lib/search";
import { Line } from "../components/MathText";
import { SUBJECTS } from "../content/subjects";

/** 14 Search: one box does both jobs, all on the phone. */
export function Search() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [focused, setFocused] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const go = useNavigate();
  const { m, num, t } = useLang();
  const { school, update } = useApp();
  const grade = usePlacedGrade();
  const reading = useReading();
  const res = useMemo(() => (q.trim().length > 1 ? search(q, grade) : null), [q, grade]);

  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => {
    const id = window.setTimeout(() => setParams(q ? { q } : {}, { replace: true }), 250);
    return () => window.clearTimeout(id);
  }, [q, setParams]);

  const remember = () => { if (q.trim()) update((s) => ({ ...s, recent: [q.trim(), ...s.recent.filter((r) => r !== q.trim())].slice(0, 6) })); };
  const open = (id: string, pdfPage?: number) => { remember(); go(`/lesson/${id}${pdfPage ? `?page=${pdfPage}` : ""}`); };

  const hl = (text: string, term: string) => {
    if (!term) return text;
    const i = text.toLowerCase().indexOf(term.toLowerCase());
    if (i < 0) return text;
    return <>{text.slice(0, i)}<span style={{ background: "#FFF1CC", borderRadius: 4, padding: "0 3px", fontWeight: 700, color: "#1C1433" }}>{text.slice(i, i + term.length)}</span>{text.slice(i + term.length)}</>;
  };

  return (
    <Tabbed tab="library">
      <div className="screen">
        <div className="col desk-pad" style={{ display: "flex", flexDirection: "column", minHeight: "calc(100dvh - var(--nav-h))", paddingTop: "max(var(--safe-top), 28px)" }}>
          <div style={{ padding: "10px 16px 0", display: "flex", gap: 8, alignItems: "center" }}>
            <IconBtn n="back" label={t("back")} onClick={() => go(-1)} />
            <form onSubmit={(e) => { e.preventDefault(); remember(); if (res?.page) open(res.page.lesson.id, res.page.pdfPage); else if (res?.lessons[0]) open(res.lessons[0].lesson.id, res.lessons[0].pdfPage); }} style={{ flex: 1, height: 52, borderRadius: 18, background: "#FFFFFF", border: `3px solid ${focused ? "#00827E" : "#EFE6DA"}`, boxShadow: focused ? "0 0 0 5px #DDF6F3" : undefined, display: "flex", alignItems: "center", gap: 8, padding: "0 12px", transition: "border-color 160ms, box-shadow 160ms" }}>
              <label className="sr" htmlFor="q">{m({ en: "Search books", fa: "جستجوی کتاب" })}</label>
              <input id="q" ref={input} className="plain-input" value={q} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onChange={(e) => setQ(e.target.value)} placeholder={m({ en: 'Search, or "grade 12 math page 13"', fa: "جستجو، یا «ریاضی صنف ۱۲ صفحه ۱۳»" })} style={{ flex: 1, font: "700 16px/1 var(--font-latin)", color: "#1C1433" }} enterKeyHint="search" />
              {q && <IconBtn n="close" s={18} w={2.6} c="#6F6A88" size={36} label={m({ en: "Clear", fa: "پاک کن" })} onClick={() => { setQ(""); input.current?.focus(); }} />}
            </form>
          </div>

          {res?.page && (() => {
            const l = res.page.lesson;
            return (
              <>
                <div className="eyebrow u-fade" style={{ padding: "18px 16px 8px", color: "#6F6A88" }}>{m({ en: "Go straight to", fa: "مستقیم برو به" })}</div>
                <div key={l.id} className="u-enter" style={{ margin: "0 16px", background: "#00827E", borderRadius: 24, padding: 14, boxShadow: "0 6px 0 #005F5B", display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{ width: 78, flex: "none", boxShadow: "0 4px 0 rgba(0,0,0,.25)", borderRadius: "14px 14px 6px 6px" }}><Cover subject={l.subject} grade={l.grade} badge={24} radius="14px 14px 6px 6px" ledge={false} label={false} /></div>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ font: "700 13px/1 var(--font-latin)", color: "#DDF6F3" }}>{m({ en: "Grade", fa: "صنف" })} {num(l.grade)} {m(SUBJECTS[l.subject].name)}</div>
                    <div style={{ font: "900 26px/1.3 var(--font-latin)", color: "#FFFFFF" }}>{m({ en: "Page", fa: "صفحهٔ" })} {num(res.page.printed)}{SEP}<Line text={m(l.lesson.title)} /></div>
                    <div style={{ font: "600 13px/1.4 var(--font-latin)", color: "#DDF6F3" }}>{m({ en: "Chapter", fa: "فصل" })} {num(l.unit.n)}{SEP}{m(l.unit.title)}</div>
                    <Press ledge={4} onClick={() => open(l.id, res.page!.pdfPage)} style={{ height: 40, borderRadius: 12, background: "#FFB31A", boxShadow: "0 4px 0 #C98300", display: "flex", alignItems: "center", justifyContent: "center", font: "800 15px/1 var(--font-latin)", color: "#1C1433", marginTop: 4 }}>{m({ en: "Open the page", fa: "باز کردن صفحه" })}</Press>
                  </div>
                </div>
              </>
            );
          })()}

          {res && res.lessons.length > 0 && (
            <>
              <div className="eyebrow" style={{ padding: "22px 16px 8px", color: "#6F6A88" }}>{m({ en: "Pages that teach it", fa: "صفحه‌هایی که آن را درس می‌دهند" })}</div>
              <div className="grid-2" style={{ gap: 8, padding: "0 16px" }}>
                {res.lessons.map((h, i) => {
                  const l = h.lesson, sj = SUBJECTS[l.subject];
                  return (
                    <Press key={l.id + h.pdfPage} ledge={4} className="u-enter" onClick={() => open(l.id, h.pdfPage)} style={{ ["--i" as string]: i + 1, background: "#FFFFFF", borderRadius: 18, padding: "12px 14px", boxShadow: "0 4px 0 #EFE6DA", textAlign: "start", display: "block" } as React.CSSProperties}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 5, background: sj.bg, flex: "none" }} />
                        <div style={{ flex: 1, font: "800 15px/1.4 var(--font-latin)", color: "#1C1433" }}>{m(sj.short)} {num(l.grade)}{SEP}<Line text={m(l.lesson.title)} /></div>
                        <div style={{ font: "800 12px/1 var(--font-latin)", color: "#7A4E00", background: "#FFF1CC", borderRadius: 999, padding: "6px 10px", flex: "none" }}>{h.printed != null ? `${m({ en: "p.", fa: "ص" })} ${num(h.printed)}` : m({ en: "page", fa: "صفحه" })}</div>
                      </div>
                      <div dir="rtl" style={{ font: "500 14px/1.8 var(--font-rtl)", color: "#4E4868", marginTop: 6, textAlign: "start" }}>«{h.snippet.includes("$") ? <Line text={h.snippet} /> : hl(h.snippet, h.term)}»</div>
                    </Press>
                  );
                })}
              </div>
            </>
          )}

          {res && !res.page && res.lessons.length === 0 && (
            <div className="u-enter" style={{ margin: "24px 16px", background: "#FFFFFF", borderRadius: 22, padding: 18, border: "2px dashed #D9CDBB", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ font: "800 17px/1.3 var(--font-latin)", color: "#1C1433" }}>{m({ en: "Nothing on this phone matches yet.", fa: "هنوز چیزی در این گوشی پیدا نشد." })}</div>
              <div style={{ font: "500 15px/1.5 var(--font-latin)", color: "#4E4868" }}>{m({ en: "Try a page, like \"grade 12 math page 41\", or ask Ustad in your own words.", fa: "یک صفحه را امتحان کنید، مثل «ریاضی صنف ۱۲ صفحه ۴۱»، یا با کلمات خود از استاد بپرسید." })}</div>
              <Press ledge={5} disabled={!reading} onClick={() => reading && go(`/chat/${reading.lesson.id}?q=${encodeURIComponent(q)}`)} style={{ alignSelf: "flex-start", height: 48, padding: "0 16px", borderRadius: 14, background: "#D81E57", boxShadow: "0 5px 0 #9A1240", display: "flex", alignItems: "center", gap: 8, font: "800 15px/1 var(--font-latin)", color: "#FFFFFF" }}><Icon n="ask" s={20} c="#FFFFFF" w={2.4} />{m({ en: "Ask Ustad", fa: "از استاد بپرس" })}</Press>
            </div>
          )}

          {!res && (
            <div className="u-fade" style={{ padding: "22px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ font: "500 15px/1.5 var(--font-latin)", color: "#4E4868" }}>
                {m({ en: 'Type a page, like "grade 12 math page 13", or a topic, like "derivative" or "مشتق".', fa: "یک صفحه بنویسید، مثل «ریاضی صنف ۱۲ صفحه ۱۳»، یا یک موضوع، مثل «مشتق»." })}<Caret />
              </div>
            </div>
          )}

          <div style={{ flex: 1 }} />
          <div style={{ padding: "16px 16px 22px", display: "flex", flexWrap: "wrap", gap: 8 }}>
            {school.recent.map((r) => (
              <Press key={r} flat onClick={() => setQ(r)} style={{ height: 36, padding: "0 12px", borderRadius: 12, background: "#F3ECE2", display: "flex", alignItems: "center", gap: 6, font: "700 13px/1 var(--font-latin)", color: "#4E4868" }}>
                <Icon n="refresh" s={14} c="#4E4868" w={2.4} />{r}
              </Press>
            ))}
          </div>
        </div>
      </div>
    </Tabbed>
  );
}
