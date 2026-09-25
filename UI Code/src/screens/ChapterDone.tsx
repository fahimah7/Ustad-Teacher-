import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Full } from "../components/Shell";
import { Art } from "../components/Art";
import { BigStar, StarBurst } from "../components/fx";
import { Btn } from "../components/ui";
import { uid, useApp, type School } from "../state/app";
import { useLang, SEP } from "../lib/i18n";
import { chaptersIn, setById, setsOf } from "../content/library";
import { SUBJECTS } from "../content/subjects";
import { sha256Hex } from "../lib/crypto";

/** When every chapter of a book has been practised, a certificate record is made on the device:
 *  grade, subject, average score and date, with no name. Its SHA-256 fingerprint is what can be
 *  timestamped later, once a copy reaches a connected computer. */
async function certify(bookId: string, s: School): Promise<School["certificates"][number] | null> {
  const sets = setsOf(bookId);
  if (!sets.length || sets.some((x) => s.practiceBest[x.id] === undefined)) return null;
  const set = sets[0];
  const score = Math.round((sets.reduce((a, x) => a + (s.practiceBest[x.id] ?? 0), 0) / sets.length) * 100);
  const date = new Date().toISOString().slice(0, 10);
  const sha256 = await sha256Hex(JSON.stringify({ v: 1, book: bookId, grade: set.grade, subject: set.subject, score, date, nonce: uid() }));
  return { id: `c-${bookId}-${date}`, grade: set.grade, subject: set.subject, score, date, recordId: sha256.slice(0, 12).toUpperCase(), sha256, status: "saved" };
}

/** 19 Chapter complete: each chapter lights one window of the subject. */
export function ChapterDone() {
  const { id = "" } = useParams();
  const [p] = useSearchParams();
  const set = setById(id);
  const go = useNavigate();
  const { m, t, num } = useLang();
  const { school, update } = useApp();
  const r = +(p.get("r") ?? 0), n = +(p.get("n") ?? 5), s = +(p.get("s") ?? 0);
  const key = set ? set.bookId : "";
  const unitKey = set ? `unit:${set.id}` : "";
  const counted = useRef(false);

  useEffect(() => {
    if (!set || counted.current) return;
    counted.current = true;
    update((st) => st.lessonsDone.includes(unitKey) ? st : {
      ...st,
      lessonsDone: [...st.lessonsDone, unitKey],
      chapterLights: { ...st.chapterLights, [key]: Math.min(chaptersIn(key) || 8, (st.chapterLights[key] ?? 0) + 1) },
    });
  }, [set, key, unitKey, update]);

  // All chapters practised: make (or refresh) the certificate record for this book.
  const [cert, setCert] = useState(false);
  useEffect(() => {
    if (!set) return;
    const done = setsOf(key).every((x) => school.practiceBest[x.id] !== undefined);
    if (!done || school.certificates.some((c) => c.id.startsWith(`c-${key}-`))) return;
    certify(key, school).then((c) => {
      if (!c) return;
      update((st) => (st.certificates.some((x) => x.id === c.id) ? st : { ...st, certificates: [c, ...st.certificates] }));
      setCert(true);
    });
  }, [set, key, school, update]);

  if (!set) return null;
  const total = chaptersIn(key) || 8;
  const lit = school.chapterLights[key] ?? 0;
  const sj = SUBJECTS[set.subject];

  return (
    <Full bg="#1C1433">
      <div className="safe-top" style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", maxWidth: 520, margin: "0 auto", width: "100%" }}>
        <div className="u-pop" style={{ marginTop: 40, width: 250, height: 300, borderRadius: "125px 125px 30px 30px", overflow: "hidden", border: "8px solid #FFFFFF", position: "relative", boxShadow: "0 10px 0 #0A0714", flex: "none" }}>
          <div style={{ position: "absolute", inset: 0 }}><Art seed={`chapter-${set.unit}-done`} w={300} h={300} cols={3} bg="#00827E" anim kinds={["star", "window", "circle", "arch", "half", "dots"]} /></div>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><BigStar s={96} /></div>
          <div style={{ position: "absolute", inset: 0 }}><StarBurst /></div>
        </div>
        <h1 className="u-enter" style={{ ["--i" as string]: 2, margin: "30px 0 0", font: "900 34px/1.08 var(--font-latin)", letterSpacing: "-.02em", color: "#FFFFFF", textAlign: "center" } as React.CSSProperties}>
          {m({ en: "Chapter complete.", fa: "فصل تمام شد." })}<br />{t("afarin")}
        </h1>
        <div className="u-enter" style={{ ["--i" as string]: 3, font: "700 15px/1.4 var(--font-latin)", color: "#BDB6D9", marginTop: 10 } as React.CSSProperties}>{m(set.chapter)}{SEP}{m({ en: `Grade ${set.grade} ${sj.name.en}`, fa: `${sj.name.fa} صنف ${num(set.grade)}` })}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          {[
            [`${num(r)}/${num(n)}`, m({ en: "right", fa: "درست" }), "#FFFFFF"],
            [`+${num(s)} ★`, m({ en: "stars", fa: "ستاره" }), "#FFB31A"],
            [`${num(lit)} ${m({ en: "of", fa: "از" })} ${num(total)}`, m({ en: "chapters", fa: "فصل" }), "#FFFFFF"],
          ].map(([v, l, c], i) => (
            <div key={i} className="u-tile" style={{ ["--i" as string]: 4 + i, width: 100, height: 64, borderRadius: 18, background: "rgba(255,255,255,.08)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 } as React.CSSProperties}>
              <div style={{ font: "900 20px/1 var(--font-latin)", color: c }}>{v}</div>
              <div style={{ font: "700 11px/1 var(--font-latin)", color: "#BDB6D9" }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 18 }} aria-label={`${lit} of ${total} chapters`}>
          {Array.from({ length: total }, (_, i) => (
            <div key={i} style={{ width: 22, height: 28, borderRadius: "11px 11px 5px 5px", background: i < lit ? "#FFB31A" : "transparent", border: i < lit ? "0" : "3px solid rgba(255,255,255,.3)", boxShadow: i === lit - 1 ? "0 0 0 4px rgba(255,179,26,.3)" : undefined, animation: i === lit - 1 ? "uPop 420ms var(--ease-pop) 900ms both" : `uFade 240ms ease ${600 + i * 60}ms both` }} />
          ))}
        </div>
        <div style={{ flex: 1, minHeight: 24 }} />
        <div style={{ alignSelf: "stretch", padding: "0 16px calc(22px + var(--safe-bottom))", display: "flex", flexDirection: "column", gap: 10 }}>
          {cert && <Btn tone="leaf" icon="cert" onClick={() => go("/certificates", { replace: true })}>{m({ en: "Every chapter practised: see your certificate", fa: "همهٔ فصل‌ها تمرین شد: تصدیق‌نامهٔ خود را ببینید" })}</Btn>}
          <Btn tone="saf" iconEnd="arrow" onClick={() => { const next = setsOf(key).find((x) => x.unit === set.unit + 1); go(next ? `/lesson/${next.lessonId}` : "/library", { replace: true }); }}>{m({ en: "Next chapter", fa: "فصل بعدی" })}</Btn>
          <button className="press flat" onClick={() => go(`/quiz/${set.id}`, { replace: true })} style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "center", font: "800 16px/1 var(--font-latin)", color: "#FFFFFF" }}>{m({ en: "Practise this chapter again", fa: "این فصل را دوباره تمرین کن" })}</button>
        </div>
      </div>
    </Full>
  );
}
