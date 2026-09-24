import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, set } from "idb-keyval";
import { Tabbed } from "../components/Shell";
import { Icon } from "../components/Icon";
import { Transfer } from "../components/fx";
import { Btn, IconBtn, Press } from "../components/ui";
import { useLang, SEP } from "../lib/i18n";
import { pickFile, saveFile } from "../lib/files";
import { BOOKS, booksOf, gradeState, installPack, packFor } from "../content/library";
import { SUBJECTS } from "../content/subjects";

type Job = { dir: "send" | "receive"; grade: number; total: number; done: number; finished?: boolean; note?: string };

const PACKS_KEY = "u.packs"; // curriculum is public: stored plain, not in a vault

/** Reinstall packs received earlier (called once at start). */
export async function restorePacks() {
  const list = ((await get(PACKS_KEY)) as unknown[] | undefined) ?? [];
  for (const p of list) { try { installPack(p); } catch { /* skip a damaged pack */ } }
}

/** 21 Learning packs: knowledge moving through a community, without internet. */
export function Packs() {
  const { m, t, num } = useLang();
  const go = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [picking, setPicking] = useState(false);
  const [, force] = useState(0);
  const [all, setAll] = useState(false);
  const raf = useRef<number | undefined>(undefined);

  const grades = Array.from({ length: 12 }, (_, i) => i + 1).filter((g) => gradeState(g) !== "missing");
  const usedMB = BOOKS.filter((b) => b.installed).reduce((a, b) => a + b.sizeMB, 0);

  useEffect(() => () => cancelAnimationFrame(raf.current!), []);

  const animate = (j: Job, ms: number, after: () => void) => {
    const start = performance.now();
    setJob(j);
    const tick = () => {
      const p = Math.min(1, (performance.now() - start) / ms);
      setJob((cur) => (cur ? { ...cur, done: Math.round(cur.total * p) } : cur));
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else { after(); setJob((cur) => (cur ? { ...cur, finished: true } : cur)); }
    };
    raf.current = requestAnimationFrame(tick);
  };

  const share = async (grade: number) => {
    setPicking(false);
    const pack = packFor(grade);
    const total = booksOf(grade).filter((b) => b.installed).reduce((a, b) => a + b.sizeMB, 0);
    const name = `grade-${grade}.pack.json`;
    const file = new File([JSON.stringify(pack)], name, { type: "application/json" });
    animate({ dir: "send", grade, total, done: 0 }, 2600, async () => {
      // Android's share sheet reaches nearby phones over Bluetooth/Wi-Fi Direct with no internet.
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        try { await nav.share({ files: [file], title: name }); return; } catch { /* dismissed: fall back to a file */ }
      }
      saveFile(name, file);
    });
  };

  const receive = async () => {
    const f = await pickFile(".json,application/json");
    if (!f) return;
    let pack: unknown;
    try { pack = JSON.parse(await f.text()); } catch { setJob({ dir: "receive", grade: 0, total: 0, done: 0, finished: true, note: m({ en: "That file isn't a learning pack.", fa: "این فایل بسته آموزشی نیست." }) }); return; }
    const grade = (pack as { grade?: number })?.grade ?? 0;
    const total = Math.max(1, Math.round(f.size / 1024 / 1024)) || 1;
    animate({ dir: "receive", grade, total, done: 0 }, 1800, async () => {
      try {
        installPack(pack);
        const list = ((await get(PACKS_KEY)) as unknown[] | undefined) ?? [];
        await set(PACKS_KEY, [...list.filter((p) => (p as { grade?: number }).grade !== grade), pack]);
        force((x) => x + 1);
      } catch {
        setJob((cur) => (cur ? { ...cur, note: m({ en: "That file isn't a learning pack.", fa: "این فایل بسته آموزشی نیست." }) } : cur));
      }
    });
  };

  return (
    <Tabbed tab="me">
      <div className="screen">
        <div className="col" style={{ maxWidth: 640, paddingTop: "var(--safe-top)", display: "flex", flexDirection: "column", minHeight: "calc(100dvh - var(--nav-h))" }}>
          <div style={{ padding: "12px 20px 0", display: "flex", alignItems: "center", gap: 6 }}>
            <IconBtn n="back" label={t("back")} onClick={() => go(-1)} style={{ marginInlineStart: -12 }} />
            <h1 className="u-enter" style={{ margin: 0, font: "900 30px/1 var(--font-latin)", letterSpacing: "-.02em", color: "#1C1433" }}>{m({ en: "On this phone", fa: "در این گوشی" })}</h1>
          </div>
          <div className="u-enter" style={{ ["--i" as string]: 1, margin: "14px 16px 0", background: "#FFFFFF", borderRadius: 20, padding: 14, boxShadow: "0 4px 0 #EFE6DA" } as React.CSSProperties}>
            <div style={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden", background: "#F3ECE2" }}>
              <div style={{ width: "30%", background: "#00827E", transformOrigin: "left", animation: "uBarX 800ms var(--ease-settle) 200ms both" }} />
              <div style={{ width: "34%", background: "#D9CDBB", transformOrigin: "left", animation: "uBarX 800ms var(--ease-settle) 350ms both" }} />
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 10, font: "700 12px/1 var(--font-latin)", color: "#4E4868", flexWrap: "wrap" }}>
              <span style={{ color: "#00827E" }}>■ {m({ en: "Learning", fa: "آموزش" })} {num(usedMB)} MB</span><span>■ {m({ en: "Other apps", fa: "برنامه‌های دیگر" })}</span><span style={{ marginInlineStart: "auto" }}>2.1 GB {m({ en: "free", fa: "خالی" })}</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "14px 16px 0" }}>
            {grades.slice().reverse().filter((g, i) => all || i < 3).map((g, i) => {
              const books = booksOf(g).filter((b) => b.installed);
              const partial = gradeState(g) === "partial";
              const size = books.reduce((a, b) => a + b.sizeMB, 0);
              const update = g === 8;
              return (
                <div key={g} className="u-enter" style={{ ["--i" as string]: 2 + i, display: "flex", alignItems: "center", gap: 12, background: "#FFFFFF", borderRadius: 18, padding: "10px 12px" } as React.CSSProperties}>
                  <div style={{ width: 40, height: 40, borderRadius: "20px 20px 8px 8px", background: "#1C1433", color: "#FFB31A", display: "flex", alignItems: "center", justifyContent: "center", font: `900 ${g > 9 ? 15 : 17}px/1 var(--font-latin)` }}>{num(g)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: "800 15px/1.2 var(--font-latin)", color: "#1C1433" }}>{m({ en: "Grade", fa: "صنف" })} {num(g)}{SEP}{partial ? `${m(SUBJECTS[books[0].subject].name)} ${m({ en: "only", fa: "فقط" })}` : "Dari"}</div>
                    <div style={{ font: "600 12px/1.4 var(--font-latin)", color: "#6F6A88" }}>{num(books.length)} {m({ en: books.length === 1 ? "book" : "books", fa: "کتاب" })}{SEP}{num(size)} MB{!update ? ` · ${m({ en: "version", fa: "نسخه" })} ${books[0].version}` : ""}</div>
                  </div>
                  {update ? (
                    <Press flat onClick={receive} style={{ height: 30, padding: "0 10px", borderRadius: 999, background: "#FFF1CC", display: "flex", alignItems: "center", font: "800 12px/1 var(--font-latin)", color: "#7A4E00" }}>{m({ en: "Update · 12 MB", fa: "به‌روزرسانی · ۱۲ MB" })}</Press>
                  ) : (
                    <Icon n="ondevice" s={22} c="#1F8F3F" w={2.4} />
                  )}
                </div>
              );
            })}
            {grades.length > 3 && (
              <button className="press flat" onClick={() => setAll((a) => !a)} style={{ alignSelf: "flex-start", height: 36, padding: "0 12px", borderRadius: 12, background: "#F3ECE2", font: "700 13px/1 var(--font-latin)", color: "#4E4868", display: "flex", alignItems: "center", gap: 6 }}>
                <Icon n={all ? "back" : "down"} s={14} c="#4E4868" w={2.4} style={{ transform: all ? "rotate(90deg)" : undefined }} />
                {all ? m({ en: "Show fewer", fa: "کمتر" }) : m({ en: `All ${grades.length} grades`, fa: `همه ${num(grades.length)} صنف` })}
              </button>
            )}
          </div>

          {job && (
            <div className="u-enter" style={{ margin: "16px 16px 0", background: "#1C1433", borderRadius: 26, padding: 18, boxShadow: "0 6px 0 #0A0714", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ font: "800 16px/1.2 var(--font-latin)", color: "#FFFFFF", flex: 1 }}>
                  {job.note ? job.note
                    : job.finished ? (job.dir === "send" ? m({ en: `Grade ${job.grade} is ready to hand over`, fa: `صنف ${num(job.grade)} آماده سپردن است` }) : m({ en: `Grade ${job.grade} is on this phone`, fa: `صنف ${num(job.grade)} در این گوشی است` }))
                    : job.dir === "send" ? m({ en: `Sending Grade ${job.grade} to a nearby phone`, fa: `فرستادن صنف ${num(job.grade)} به گوشی نزدیک` }) : m({ en: `Receiving Grade ${job.grade}`, fa: `گرفتن صنف ${num(job.grade)}` })}
                </div>
                <div style={{ height: 26, padding: "0 10px", borderRadius: 999, background: "rgba(255,255,255,.12)", display: "flex", alignItems: "center", font: "800 11px/1 var(--font-latin)", color: "#FFB31A" }}>{m({ en: "no internet", fa: "بدون انترنت" })}</div>
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}><Transfer running={!job.finished} /></div>
              <div style={{ height: 12, borderRadius: 6, background: "rgba(255,255,255,.14)", overflow: "hidden" }}>
                <div style={{ height: 12, borderRadius: 6, background: job.finished && !job.note ? "#1F8F3F" : "#FFB31A", width: `${job.total ? (job.done / job.total) * 100 : 100}%`, transition: "background-color 240ms" }} />
              </div>
              <div style={{ display: "flex", font: "700 13px/1 var(--font-latin)", color: "#BDB6D9" }}>
                <span>{num(job.done)} {m({ en: "of", fa: "از" })} {num(job.total)} MB</span>
                <span style={{ marginInlineStart: "auto" }}>{job.finished ? <button className="press flat" onClick={() => setJob(null)} style={{ color: "#FFB31A", font: "800 13px/1 var(--font-latin)" }}>{m({ en: "Done", fa: "تمام" })}</button> : m({ en: "Keep the phones close", fa: "گوشی‌ها را نزدیک نگه دار" })}</span>
              </div>
            </div>
          )}

          <div style={{ flex: 1, minHeight: 20 }} />
          <div style={{ padding: "0 16px 22px", display: "flex", gap: 10 }}>
            <Btn tone="saf" icon="nearby" fs={15} style={{ flex: 1, gap: 8 }} onClick={() => setPicking(true)} disabled={!!job && !job.finished}>{m({ en: "Share a pack", fa: "بسته بفرست" })}</Btn>
            <Btn tone="outline" icon="download" fs={15} style={{ flex: 1, gap: 8 }} onClick={receive} disabled={!!job && !job.finished}>{m({ en: "Receive", fa: "دریافت" })}</Btn>
          </div>
        </div>
      </div>
      {picking && (
        <>
          <div className="scrim" onClick={() => setPicking(false)} />
          <div className="sheet" role="dialog" aria-modal="true" style={{ padding: "14px 20px 26px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ width: 44, height: 5, borderRadius: 3, background: "#E6DCCD", alignSelf: "center" }} />
            <div style={{ font: "900 20px/1.2 var(--font-latin)", color: "#1C1433", margin: "8px 0 4px" }}>{m({ en: "Which grade?", fa: "کدام صنف؟" })}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
              {grades.map((g, i) => (
                <Press key={g} ledge={4} className="u-pop" onClick={() => share(g)} style={{ ["--i" as string]: i, height: 56, borderRadius: "18px 18px 8px 8px", background: "#FFFFFF", boxShadow: "0 4px 0 #E6DCCD", border: "2px solid #EFE6DA", font: "900 20px/1 var(--font-latin)", color: "#1C1433" } as React.CSSProperties}>{num(g)}</Press>
              ))}
            </div>
            <div style={{ font: "600 13px/1.5 var(--font-latin)", color: "#6F6A88", marginTop: 6 }}>{m({ en: "It goes out through your phone's share sheet (Nearby, Bluetooth) or as a file for a memory card.", fa: "از راه صفحه اشتراک گوشی (نزدیک، بلوتوث) یا به شکل فایل برای کارت حافظه فرستاده می‌شود." })}</div>
          </div>
        </>
      )}
    </Tabbed>
  );
}
