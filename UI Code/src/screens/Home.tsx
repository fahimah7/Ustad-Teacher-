import { useNavigate } from "react-router-dom";
import { Tabbed, useDoor } from "../components/Shell";
import { Art } from "../components/Art";
import { Icon } from "../components/Icon";
import { Floaters } from "../components/fx";
import { Chat } from "../components/Chat";
import { Bar, Btn, Cover, Press } from "../components/ui";
import { DoorDot, greeting } from "../components/Nav";
import { useApp, usePlacedGrade, useReading } from "../state/app";
import { useLang, SEP } from "../lib/i18n";
import { booksOf, setForPage } from "../content/library";
import { SUBJECTS, type SubjectKey } from "../content/subjects";
import { pageLabel } from "../lib/tutor";
import { Line } from "../components/MathText";

/** 01 Home (phones) and W1 Home (laptops). */
export function Home() {
  return (
    <Tabbed tab="home" panel={false}>
      <div className="screen">
        <div className="phone-only"><HomePhone /></div>
        <div className="desk-only" style={{ flex: 1, minHeight: 0 }}><HomeDesk /></div>
      </div>
    </Tabbed>
  );
}

/** Where she stopped: the book, section and page last in view. */
function useContinue() {
  const r = useReading();
  const { lang } = useLang();
  if (!r) return null;
  const { book, lesson: l, page } = r;
  const total = book.pageCount ?? 1;
  return {
    l, s: SUBJECTS[l.subject], book,
    c: {
      lessonId: l.id, page, label: pageLabel(book.id, page, lang),
      pct: Math.max(1, Math.round((page / total) * 100)),
      minutesLeft: Math.max(1, (l.pdf.end - page + 1) * 3),
      href: `/lesson/${l.id}?page=${page}`,
    },
  };
}

function NoBook() {
  const { m } = useLang();
  const go = useNavigate();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
      <div style={{ font: "800 19px/1.3 var(--font-latin)", color: "#1C1433" }}>{m({ en: "No book is on this device yet.", fa: "هنوز کتابی در این دستگاه نیست." })}</div>
      <Btn tone="saf" icon="download" onClick={() => go("/packs")}>{m({ en: "Get books", fa: "گرفتن کتاب" })}</Btn>
    </div>
  );
}

function HomePhone() {
  const { t, m, lang, num } = useLang();
  const door = useDoor();
  const go = useNavigate();
  const cont = useContinue();
  const { school, name } = useApp();
  const grade = usePlacedGrade();
  const tiles: SubjectKey[] = ["math", "bio", "chem", "phys"];

  return (
    <div className="col">
      {/* turquoise stage */}
      <div style={{ background: "#00827E", paddingBottom: 60, position: "relative", overflow: "hidden", paddingTop: "max(var(--safe-top), 12px)" }}>
        <div style={{ position: "absolute", insetInline: 0, bottom: 0, height: 130, opacity: 0.28 }}><Art seed="band-home" w={390} h={130} cols={6} bg="#00827E" /></div>
        <div style={{ height: 56, display: "flex", alignItems: "center", padding: "0 12px 0 6px", gap: 4, position: "relative" }}>
          <div style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <DoorDot handlers={door?.handlers} strong={door?.charging} />
          </div>
          <div style={{ font: "700 16px/1.3 var(--font-latin)", color: "#DDF6F3" }} className={lang !== "en" ? "fa" : undefined}>{greeting(lang)}{name ? (lang === "en" ? `, ${name}` : ` ${name} جان`) : ""}</div>
          <div style={{ marginInlineStart: "auto", height: 32, padding: "0 12px", borderRadius: 999, background: "rgba(255,255,255,.16)", display: "flex", alignItems: "center", gap: 6, font: "700 13px/1 var(--font-latin)", color: "#FFFFFF" }}>
            <Icon n="ondevice" s={16} c="#FFFFFF" />{t("offlineAllHere")}
          </div>
        </div>
        <h1 className="u-enter" style={{ margin: 0, padding: "2px 20px 0", position: "relative", font: "900 32px/1.08 var(--font-latin)", letterSpacing: "-.02em", color: "#FFFFFF" }}>
          {m({ en: "Pick up where", fa: "از همان‌جا" })}<br />{m({ en: "you left off.", fa: "که ماندی ادامه بده." })}
        </h1>
      </div>

      {/* continue card, overlapping the stage by −46 px */}
      <div className="u-enter-far" style={{ ["--i" as string]: 1, margin: "-46px 16px 0", background: "#FFFFFF", borderRadius: 28, boxShadow: "0 6px 0 #E6DCCD", padding: 16, position: "relative", display: "flex", flexDirection: "column", gap: 14 } as React.CSSProperties}>
        {cont ? (() => { const { c, l, s: sj } = cont; return (<>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ width: 74, height: 86, borderRadius: "37px 37px 12px 12px", overflow: "hidden", flex: "none" }}><Art seed={`cont-${l.bookId}-ch${l.unit.n}`} w={160} h={160} cols={2} bg="#1C1433" anim /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "inline-flex", height: 24, padding: "0 10px", borderRadius: 999, background: "#DDF6F3", color: "#005F5B", font: "800 12px/24px var(--font-latin)" }}>{m({ en: "Grade", fa: "صنف" })} {num(l.grade)}{SEP}{m(sj.name)}</div>
            <div style={{ font: "800 21px/1.3 var(--font-latin)", color: "#1C1433", marginTop: 6 }}>{m({ en: "Chapter", fa: "فصل" })} {num(l.unit.n)}{SEP}{m(l.unit.title)}</div>
            <div style={{ font: "600 13px/1.4 var(--font-latin)", color: "#6F6A88", marginTop: 2 }}>{c.label}{SEP}{m({ en: `about ${c.minutesLeft} min left in this lesson`, fa: `حدود ${num(c.minutesLeft)} دقیقه تا پایان این درس` })}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Bar pct={c.pct} delay={380} /><div style={{ font: "900 16px/1 var(--font-latin)", color: "#1C1433" }}>{num(c.pct)}%</div></div>
        <Btn tone="saf" iconEnd="arrow" onClick={() => go(c.href)}>{t("continueLabel")}</Btn>
        </>); })() : <NoBook />}
      </div>

      {/* Ask + Search tiles */}
      <div style={{ display: "flex", gap: 12, padding: "20px 16px 0" }}>
        <Press className="u-tile" onClick={() => go("/ask")} style={{ ["--i" as string]: 3, flex: 1.6, height: 90, borderRadius: 24, background: "#D81E57", boxShadow: "0 5px 0 #9A1240", padding: "14px 16px", display: "flex", flexDirection: "column", justifyContent: "space-between", textAlign: "start" } as React.CSSProperties}>
          <Icon n="ask" s={26} c="#FFFFFF" w={2.4} />
          <div><div style={{ font: "800 17px/1.1 var(--font-latin)", color: "#FFFFFF" }}>{t("askUstad")}</div><div style={{ font: "600 12px/1.4 var(--font-latin)", color: "#FFE3EA" }}>{m({ en: "about any page, voice or text", fa: "درباره هر صفحه، با صدا یا متن" })}</div></div>
        </Press>
        <Press className="u-tile" onClick={() => go("/search")} style={{ ["--i" as string]: 4, flex: 1, height: 90, borderRadius: 24, background: "#FFFFFF", border: "3px solid #EFE6DA", boxShadow: "0 5px 0 #EFE6DA", padding: "12px 14px", display: "flex", flexDirection: "column", justifyContent: "space-between", textAlign: "start" } as React.CSSProperties}>
          <Icon n="search" s={26} c="#00827E" w={2.4} />
          <div style={{ font: "800 16px/1.1 var(--font-latin)", color: "#1C1433" }}>{t("searchBooks")}</div>
        </Press>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", padding: "20px 20px 10px" }}>
        <h2 style={{ margin: 0, font: "800 19px/1 var(--font-latin)", color: "#1C1433" }}>{m({ en: "Your subjects", fa: "مضمون‌های تو" })}</h2>
        <button className="press flat" onClick={() => go("/library")} style={{ marginInlineStart: "auto", font: "700 14px/1 var(--font-latin)", color: "#00827E" }}>{m({ en: "Grade", fa: "صنف" })} {num(grade)}{SEP}{m({ en: "All", fa: "همه" })}</button>
      </div>
      <div style={{ display: "flex", gap: 10, padding: "0 16px" }}>
        {tiles.map((k, i) => {
          const sj = SUBJECTS[k];
          const bk = booksOf(grade).find((x) => x.subject === k);
          const here = !!bk?.installed;
          return (
            <Press key={k} className="u-tile" onClick={() => go(here ? `/library?book=${bk!.id}` : "/packs")} style={{ ["--i" as string]: 5 + i, flex: 1, minWidth: 0, height: 96, borderRadius: "20px 20px 10px 10px", background: sj.bg, boxShadow: `0 5px 0 ${sj.ledge}`, padding: 10, display: "flex", flexDirection: "column", justifyContent: "space-between", textAlign: "start", opacity: here ? 1 : 0.45 } as React.CSSProperties}>
              <Icon n={here ? sj.icon : "download"} s={24} c={sj.fg} w={2.4} />
              <div>
                <div style={{ font: "800 13px/1.1 var(--font-latin)", color: sj.fg }}>{m(sj.short)}</div>
                <div style={{ font: "700 11px/1.4 var(--font-latin)", color: sj.sub }}>{here ? `${num(school.chapterLights[bk!.id] ?? 0)} ${m({ en: "of", fa: "از" })} ${num(bk!.units.length)}` : m({ en: "Get it", fa: "بگیرید" })}</div>
              </div>
            </Press>
          );
        })}
      </div>

      <QuickFive i={9} />
      {/* The rights section, reachable from the phone layout (the desk layout has it in the side nav). */}
      <Press ledge={5} className="u-enter" onClick={() => go("/rights")} style={{ ["--i" as string]: 10, margin: "12px 16px 0", width: "calc(100% - 32px)", minHeight: 64, borderRadius: 22, background: "#7443F0", boxShadow: "0 5px 0 #4F24B8", display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", textAlign: "start" } as React.CSSProperties}>
        <Icon n="heart" s={26} c="#FFFFFF" w={2.4} />
        <div style={{ flex: 1 }}>
          <div style={{ font: "800 16px/1.3 var(--font-latin)", color: "#FFFFFF" }}>{m({ en: "My rights, my voice", fa: "حقوق من، صدای من" })}</div>
          <div style={{ font: "600 12px/1.4 var(--font-latin)", color: "#E4DBFF" }}>{m({ en: "Short lessons, and practice with Ustad", fa: "درس‌های کوتاه و تمرین با استاد" })}</div>
        </div>
        <Icon n="next" s={20} c="#FFFFFF" w={2.6} />
      </Press>
      <div style={{ height: 20 }} />
    </div>
  );
}

function QuickFive({ i, big }: { i: number; big?: boolean }) {
  const go = useNavigate();
  const { m, num } = useLang();
  const r = useReading();
  const set = r ? setForPage(r.book.id, r.page) : undefined;
  if (!set) return null;
  return (
    <Press ledge={big ? 6 : 5} className="u-enter" onClick={() => go(`/quiz/${set.id}`)} style={{ ["--i" as string]: i, margin: big ? 0 : "16px 16px 0", width: big ? "100%" : "calc(100% - 32px)", height: big ? 92 : 72, borderRadius: big ? 26 : 22, background: "#1C1433", boxShadow: `0 ${big ? 6 : 5}px 0 #0A0714`, display: "flex", alignItems: "center", gap: big ? 16 : 12, padding: big ? "0 16px 0 20px" : "0 12px 0 16px", textAlign: "start", flex: "none" } as React.CSSProperties}>
      <div style={{ animation: big ? "qBob 3s ease-in-out infinite" : undefined }}><Icon n="star" s={big ? 34 : 28} c="#FFB31A" f="#FFB31A" /></div>
      <div style={{ flex: 1 }}>
        <div style={{ font: `800 ${big ? 18 : 16}px/1.2 var(--font-latin)`, color: "#FFFFFF" }}>{m({ en: "Today's quick 5", fa: "پنج سوال امروز" })}</div>
        <div style={{ font: `600 ${big ? 13 : 12}px/1.4 var(--font-latin)`, color: "#BDB6D9" }}>{m(set.chapter)}{SEP}{m({ en: `${set.questions.length} questions · about 3 minutes`, fa: `${num(set.questions.length)} سوال · حدود ۳ دقیقه` })}</div>
      </div>
      <div style={{ height: big ? 48 : 44, padding: big ? "0 22px" : "0 18px", borderRadius: 14, background: "#FFB31A", boxShadow: "0 4px 0 #C98300", font: `800 ${big ? 17 : 16}px/${big ? 48 : 44}px var(--font-latin)`, color: "#1C1433" }}>{m({ en: "Play", fa: "بازی" })}</div>
    </Press>
  );
}

function HomeDesk() {
  const { t, m, num } = useLang();
  const go = useNavigate();
  const cont = useContinue();
  const reading = useReading();
  const { name } = useApp();
  const grade = usePlacedGrade();
  const shelf: SubjectKey[] = ["math", "bio", "chem", "phys", "geo", "hist"];
  const day = new Date().toLocaleDateString("en", { weekday: "long" });
  const part = new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", minHeight: 720 }}>
      <div style={{ height: 290, background: "#00827E", position: "relative", overflow: "hidden", flex: "none", padding: "44px 44px 0" }}>
        <div style={{ position: "absolute", insetInline: 0, bottom: 0, height: 160, opacity: 0.3 }}><Art seed="band-home" w={390} h={130} cols={6} bg="#00827E" /></div>
        <Floaters />
        <div style={{ position: "relative", display: "flex", alignItems: "flex-start", gap: 32 }}>
          <div style={{ flex: 1 }} className="u-enter">
            <div style={{ font: "700 17px/1 var(--font-latin)", color: "#DDF6F3" }}>{m({ en: `${name ? name + " · " : ""}Grade ${grade} · ${day} ${part}`, fa: `${name ? name + " جان، " : ""}صنف ${num(grade)}` })}</div>
            <h1 style={{ margin: "12px 0 0", font: "900 54px/1.02 var(--font-latin)", letterSpacing: "-.03em", color: "#FFFFFF" }}>{m({ en: "Pick up where", fa: "از همان‌جا" })}<br />{m({ en: "you left off.", fa: "که ماندی ادامه بده." })}</h1>
          </div>
          <Press ledge={5} onClick={() => go("/search")} style={{ width: 440, maxWidth: "40%", height: 58, borderRadius: 18, background: "#FFFFFF", display: "flex", alignItems: "center", gap: 12, padding: "0 18px", boxShadow: "0 5px 0 #005F5B" }}>
            <Icon n="search" s={22} c="#00827E" w={2.6} />
            <div style={{ flex: 1, font: "600 16px/1 var(--font-latin)", color: "#6F6A88", textAlign: "start", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m({ en: 'Search books, or "grade 12 page 13"', fa: "جستجوی کتاب، یا «صنف ۱۲ صفحه ۱۳»" })}</div>
            <Icon n="mic" s={22} c="#D81E57" w={2.4} />
          </Press>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", gap: 24, padding: "0 44px 32px", marginTop: -92, position: "relative", minHeight: 0 }}>
        <div style={{ flex: 1.7, display: "flex", flexDirection: "column", gap: 22, minWidth: 0 }}>
          <div className="u-enter-far" style={{ background: "#FFFFFF", borderRadius: 32, boxShadow: "0 7px 0 #E6DCCD", padding: 24, display: "flex", gap: 26, alignItems: "center" }}>
            {cont ? (() => { const { c, l, s: sj } = cont; return (<>
            <div style={{ width: 150, height: 184, borderRadius: "75px 75px 20px 20px", overflow: "hidden", flex: "none" }}><Art seed={`cont-${l.bookId}-ch${l.unit.n}`} w={160} h={160} cols={2} bg="#1C1433" anim /></div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
              <div style={{ display: "inline-flex", alignSelf: "flex-start", height: 28, padding: "0 12px", borderRadius: 999, background: "#DDF6F3", color: "#005F5B", font: "800 13px/28px var(--font-latin)" }}>{m({ en: "Grade", fa: "صنف" })} {num(l.grade)}{SEP}{m(sj.name)}</div>
              <div style={{ font: "900 32px/1.25 var(--font-latin)", letterSpacing: "-.02em", color: "#1C1433" }}>{m({ en: "Chapter", fa: "فصل" })} {num(l.unit.n)}{SEP}{m(l.unit.title)}</div>
              <div style={{ font: "600 15px/1.5 var(--font-latin)", color: "#6F6A88" }}><Line text={m(l.lesson.title)} />{SEP}{c.label}{SEP}{m({ en: `about ${c.minutesLeft} minutes left in this lesson`, fa: `حدود ${num(c.minutesLeft)} دقیقه تا پایان این درس` })}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Bar pct={c.pct} h={16} delay={300} /><div style={{ font: "900 18px/1 var(--font-latin)", color: "#1C1433" }}>{num(c.pct)}%</div></div>
              <div style={{ display: "flex", gap: 12, marginTop: 2, flexWrap: "wrap" }}>
                <Btn tone="saf" iconEnd="arrow" style={{ padding: "0 32px" }} onClick={() => go(c.href)}>{t("continueLabel")}</Btn>
                <Btn tone="outline" icon="ask" fg="#D81E57" fs={17} style={{ padding: "0 24px" }} onClick={() => go("/ask")}>{m({ en: "Ask about this page", fa: "دربارهٔ این صفحه بپرسید" })}</Btn>
              </div>
            </div>
            </>); })() : <NoBook />}
          </div>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <h2 style={{ margin: 0, font: "800 22px/1 var(--font-latin)", color: "#1C1433" }}>{m({ en: "Your subjects", fa: "مضمون‌های تو" })}</h2>
            <button className="press flat" onClick={() => go("/library")} style={{ marginInlineStart: "auto", font: "700 15px/1 var(--font-latin)", color: "#00827E" }}>{m({ en: "All books", fa: "همهٔ کتاب‌ها" })}</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 14 }}>
            {shelf.map((k, i) => {
              const bk = booksOf(grade).find((x) => x.subject === k);
              const here = !!bk?.installed;
              return (
                <Press key={k} ledge={0} flat className="u-tile" onClick={() => go(here ? `/library?book=${bk!.id}` : "/packs")} style={{ ["--i" as string]: 2 + i, display: "block", opacity: here ? 1 : 0.4 } as React.CSSProperties}>
                  <Cover subject={k} grade={grade} badge={34} radius="18px 18px 8px 8px" fs={13} />
                </Press>
              );
            })}
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, minWidth: 360 }}>
          <div className="u-enter" style={{ ["--i" as string]: 2, flex: 1, minHeight: 0, background: "#FFFFFF", borderRadius: 32, boxShadow: "0 7px 0 #E6DCCD", overflow: "hidden", display: "flex", flexDirection: "column" } as React.CSSProperties}>
            <Chat lessonId={reading?.lesson.id ?? ""} variant="panel" />
          </div>
          <QuickFive i={4} big />
        </div>
      </div>
    </div>
  );
}
