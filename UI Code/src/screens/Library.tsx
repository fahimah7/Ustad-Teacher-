import { useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { Tabbed } from "../components/Shell";
import { Icon } from "../components/Icon";
import { Cover, IconBtn, Press } from "../components/ui";
import { MathText } from "../components/MathText";
import { useLang, SEP } from "../lib/i18n";
import { bookById, booksOf, gradeState, installedGrades } from "../content/library";
import { SUBJECTS } from "../content/subjects";
import { useApp, usePlacedGrade } from "../state/app";

/** 13 Library: grade → subject → book → chapter → lesson. */
export function Library() {
  const [params, setParams] = useSearchParams();
  const bookId = params.get("book");
  return (
    <Tabbed tab="library">
      <div className="screen">
        {bookId ? <BookView id={bookId} onBack={() => setParams({})} /> : <Shelf />}
      </div>
    </Tabbed>
  );
}

function SearchField({ onOpen }: { onOpen: () => void }) {
  const { m } = useLang();
  return (
    <Press ledge={0} flat onClick={onOpen} style={{ height: 52, borderRadius: 18, background: "#FFFFFF", border: "3px solid #EFE6DA", display: "flex", alignItems: "center", gap: 10, padding: "0 14px", width: "100%", textAlign: "start" }}>
      <Icon n="search" s={22} c="#00827E" w={2.6} />
      <div style={{ flex: 1, font: "600 15px/1 var(--font-latin)", color: "#6F6A88" }}>{m({ en: 'Search books, or "grade 12 page 13"', fa: "جستجوی کتاب، یا «صنف ۱۲ صفحه ۱۳»" })}</div>
      <Icon n="mic" s={22} c="#D81E57" w={2.4} />
    </Press>
  );
}

function Shelf() {
  const { m, num } = useLang();
  const go = useNavigate();
  const placed = usePlacedGrade();
  const [grade, setGrade] = useState(placed);
  const books = booksOf(grade).filter((b) => b.installed);
  const gradesHere = installedGrades().length;
  const size = books.reduce((a, b) => a + b.sizeMB, 0);

  return (
    <div className="col desk-pad" style={{ paddingTop: "max(var(--safe-top), 28px)" }}>
      <div style={{ padding: "12px 16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <h1 className="u-enter" style={{ margin: 0, font: "900 30px/1 var(--font-latin)", letterSpacing: "-.02em", color: "#1C1433" }}>{m({ en: "Library", fa: "کتابخانه" })}</h1>
          <div style={{ marginInlineStart: "auto", height: 30, padding: "0 10px", borderRadius: 999, background: "#DDF6F3", display: "flex", alignItems: "center", gap: 5, font: "800 12px/1 var(--font-latin)", color: "#005F5B" }}>
            <Icon n="ondevice" s={15} c="#005F5B" w={2.4} />{num(gradesHere)} {m({ en: gradesHere === 1 ? "grade on this device" : "grades on this device", fa: "صنف در این دستگاه" })}
          </div>
        </div>
        <SearchField onOpen={() => go("/search")} />
      </div>
      <h2 style={{ margin: 0, padding: "16px 16px 8px", font: "800 17px/1 var(--font-latin)", color: "#1C1433" }}>{m({ en: "Grades", fa: "صنف‌ها" })}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8, padding: "0 16px" }}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => {
          const st = gradeState(g);
          const on = g === grade;
          const base: React.CSSProperties = { height: 52, borderRadius: "18px 18px 8px 8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", ["--i" as string]: g, animationDelay: `${g * 30}ms` };
          if (st === "missing") {
            return (
              <Press key={g} ledge={0} flat className="u-pop" onClick={() => go("/packs")} aria-label={`${m({ en: "Grade", fa: "صنف" })} ${g}: ${m({ en: "not on this phone", fa: "در این گوشی نیست" })}`} style={{ ...base, border: "3px dashed #D9CDBB", gap: 2, font: "900 17px/1 var(--font-latin)", color: "#6F6A88" }}>
                {num(g)}<Icon n="download" s={12} c="#6F6A88" w={3} />
              </Press>
            );
          }
          if (st === "partial" && !on) {
            return (
              <Press key={g} ledge={4} className="u-pop" onClick={() => setGrade(g)} style={{ ...base, background: "linear-gradient(0deg,#FFFFFF 50%,#FFF8EF 50%)", border: "3px solid #FFFFFF", boxShadow: "0 4px 0 #E6DCCD", gap: 1, font: "900 17px/1 var(--font-latin)", color: "#1C1433" }}>
                {num(g)}<span style={{ font: "800 9px/1 var(--font-latin)", color: "#9A5B00" }}>{num(booksOf(g).filter((b) => b.installed).length)} {m({ en: booksOf(g).filter((b) => b.installed).length === 1 ? "book" : "books", fa: "کتاب" })}</span>
              </Press>
            );
          }
          return (
            <Press key={g} ledge={4} className="u-pop" aria-pressed={on} onClick={() => setGrade(g)} style={{ ...base, background: on ? "#FFB31A" : "#FFFFFF", boxShadow: on ? "0 4px 0 #C98300,0 0 0 3px #FFF8EF,0 0 0 6px #1C1433" : "0 4px 0 #E6DCCD", font: `900 ${on ? 22 : 20}px/1 var(--font-latin)`, color: "#1C1433", transition: "background-color 160ms" }}>
              {num(g)}
            </Press>
          );
        })}
      </div>
      <div style={{ padding: "20px 16px 10px", display: "flex", alignItems: "baseline" }}>
        <h2 style={{ margin: 0, font: "800 17px/1 var(--font-latin)", color: "#1C1433" }}>{m({ en: `Grade ${grade} books`, fa: `کتاب‌های صنف ${num(grade)}` })}</h2>
        <div style={{ marginInlineStart: "auto", font: "700 13px/1 var(--font-latin)", color: "#00827E" }}>{num(books.length)} {m({ en: "books", fa: "کتاب" })}{SEP}{num(size)} MB</div>
      </div>
      <div key={grade} className="tab-cols-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, padding: "0 16px 24px" }}>
        {books.map((b, i) => (
          <Press key={b.id} ledge={0} flat className="u-tile" onClick={() => go(`/library?book=${b.id}`)} style={{ ["--i" as string]: i, display: "block" } as React.CSSProperties} aria-label={`${SUBJECTS[b.subject].name.en} ${b.grade}`}>
            <Cover subject={b.subject} grade={b.grade} />
          </Press>
        ))}
      </div>
    </div>
  );
}

/** Book: units and lessons. Not in the artboards; built in the same system. */
function BookView({ id, onBack }: { id: string; onBack: () => void }) {
  const { m, num, t } = useLang();
  const go = useNavigate();
  const { school } = useApp();
  const b = bookById(id);
  if (!b) return null;
  const s = SUBJECTS[b.subject];
  return (
    <div className="col">
      <div style={{ background: s.bg, padding: "max(var(--safe-top), 12px) 0 28px", position: "relative", overflow: "hidden" }}>
        <div className="desk-pad" style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px" }}>
          <IconBtn n="back" bg="rgba(255,255,255,.9)" c="#1C1433" s={22} w={2.6} label={t("back")} onClick={onBack} />
        </div>
        <div className="desk-pad" style={{ display: "flex", gap: 16, alignItems: "flex-end", padding: "14px 20px 0" }}>
          <div className="u-pop" style={{ width: 96, flex: "none" }}><Cover subject={b.subject} grade={b.grade} label={false} /></div>
          <div className="u-enter" style={{ minWidth: 0 }}>
            <div style={{ font: "700 14px/1 var(--font-latin)", color: s.sub }}>{m({ en: "Grade", fa: "صنف" })} {num(b.grade)}</div>
            <h1 style={{ margin: "8px 0 0", font: "900 30px/1.05 var(--font-latin)", color: s.fg }}>{b.title ? m(b.title) : s.name.en}</h1>
            <div dir="rtl" className="fa" style={{ font: "800 18px/1.6 var(--font-rtl)", color: s.fg, textAlign: "start" }}>{s.name.fa} صنف {new Intl.NumberFormat("fa-AF").format(b.grade)}</div>
          </div>
        </div>
      </div>
      <div className="desk-pad" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {!b.installed && (
          <div style={{ background: "#FFFFFF", border: "2px dashed #D9CDBB", borderRadius: 22, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <Icon n="box" s={26} c="#7A4E00" w={2.4} />
              <div style={{ font: "600 15px/1.5 var(--font-latin)", color: "#4E4868" }}>{m({ en: "This book isn't on this device yet. Get it from a nearby phone or a memory card.", fa: "این کتاب هنوز در این دستگاه نیست. آن را از گوشی نزدیک یا کارت حافظه بگیرید." })}</div>
            </div>
            <Press onClick={() => go("/packs")} style={{ height: 52, borderRadius: 16, background: "#FFB31A", boxShadow: "0 5px 0 #C98300", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, font: "800 16px/1 var(--font-latin)", color: "#1C1433" }}><Icon n="download" s={22} c="#1C1433" w={2.4} />{m({ en: "Get this book", fa: "این کتاب را بگیرید" })}</Press>
          </div>
        )}
        {b.installed && (
          <Press ledge={5} onClick={() => go(`/lesson/${b.units[0].lessons[0].id}?page=1`)} style={{ height: 56, borderRadius: 16, background: s.bg, boxShadow: `0 5px 0 ${s.ledge}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, font: "800 17px/1 var(--font-latin)", color: s.fg }}>
            <Icon n="book" s={22} c={s.fg} w={2.4} />{m({ en: "Read from the first page", fa: "خواندن از صفحهٔ اول" })}
          </Press>
        )}
        {b.units.map((u, ui) => {
          const done = (school.chapterLights[b.id] ?? 0) >= u.n;
          return (
            <div key={u.n} className="u-enter" style={{ ["--i" as string]: ui, background: "#FFFFFF", borderRadius: 22, boxShadow: "0 4px 0 #EFE6DA", padding: 14 } as React.CSSProperties}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 34, height: 38, borderRadius: "17px 17px 8px 8px", background: done ? "#FFB31A" : s.tint, display: "flex", alignItems: "center", justifyContent: "center", font: "900 16px/1 var(--font-latin)", color: done ? "#1C1433" : s.ink }}>{num(u.n)}</div>
                <div style={{ flex: 1, font: "800 17px/1.4 var(--font-latin)", color: "#1C1433" }}>{m(u.title)}</div>
                {done && <Icon n="check" s={20} c="#1F8F3F" w={3} />}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {u.lessons.map((l) => (
                  <Press key={l.id} flat onClick={() => go(`/lesson/${l.id}`)} style={{ minHeight: 48, borderRadius: 14, background: "#FFF8EF", display: "flex", alignItems: "center", gap: 10, padding: "6px 12px", textAlign: "start" }}>
                    <div style={{ font: "800 13px/1 var(--font-latin)", color: "#6F6A88", width: 34, flex: "none" }}>{num(u.n)}.{num(l.lesson.n)}</div>
                    <div style={{ flex: 1, font: "700 15px/1.5 var(--font-latin)", color: "#1C1433" }}><MathText text={m(l.lesson.title)} /></div>
                    <div style={{ font: "700 12px/1 var(--font-latin)", color: "#6F6A88", flex: "none" }}>{m({ en: "p.", fa: "ص" })} {num(l.source.pages[0])}</div>
                    <Icon n="next" s={18} c="#6F6A88" w={2.4} />
                  </Press>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
