import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabbed } from "../components/Shell";
import { Icon } from "../components/Icon";
import { Transfer } from "../components/fx";
import { Btn, IconBtn, Press } from "../components/ui";
import { useLang, SEP } from "../lib/i18n";
import { pickFile } from "../lib/files";
import { booksOf, gradeState, initLibrary, installedGrades } from "../content/library";
import { SUBJECTS } from "../content/subjects";
import { canUsePacks, exportPack, importPack, storage, type Storage } from "../native/bridge";
import { forgetBooks } from "../lib/tutor";
import { forgetIndexes } from "../lib/search";

type Job = { dir: "send" | "receive"; grade: number; total: number; done: number; finished?: boolean; note?: string; ok?: boolean };

/** 21 Learning packs: books moving through a community, without internet. A pack is one file
 *  holding every book of a grade (pages, notes, practice); it travels by memory card, Bluetooth
 *  or a phone's share sheet, and is checked file by file before anything is installed. */
export function Packs() {
  const { m, t, num } = useLang();
  const go = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [picking, setPicking] = useState(false);
  const [space, setSpace] = useState<Storage | null>(null);
  const [, force] = useState(0);
  const [all, setAll] = useState(false);
  const raf = useRef<number | undefined>(undefined);

  const grades = installedGrades();
  const refreshSpace = () => storage().then(setSpace).catch(() => {});
  useEffect(() => { refreshSpace(); return () => cancelAnimationFrame(raf.current!); }, []);
  const usedMB = space ? Math.round(space.contentBytes / 1048576) : 0;
  const freeGB = space?.freeBytes != null ? space.freeBytes / 1073741824 : null;
  const usedPct = space?.freeBytes ? Math.max(2, (space.contentBytes / (space.contentBytes + space.freeBytes)) * 100) : 2;

  /** Moves the bar while the native side works; it settles when the work is done. */
  const run = async (j: Job, work: () => Promise<{ note: string; ok: boolean }>) => {
    const start = performance.now();
    setJob(j);
    const tick = () => {
      const p = 1 - Math.exp(-(performance.now() - start) / 2500); // never reaches the end by itself
      setJob((cur) => (cur && !cur.finished ? { ...cur, done: Math.round(cur.total * 0.95 * p) } : cur));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    const res = await work().catch((e: unknown) => ({ note: String(e instanceof Error ? e.message : e), ok: false }));
    cancelAnimationFrame(raf.current!);
    setJob((cur) => (cur ? { ...cur, done: cur.total, finished: true, note: res.note, ok: res.ok } : cur));
  };

  const onlyInApp = () => setJob({ dir: "send", grade: 0, total: 0, done: 0, finished: true, note: m({ en: "Packs work in the Ustad app, not in a browser.", fa: "بسته‌ها در برنامهٔ استاد کار می‌کنند، نه در مرورگر." }) });

  const share = async (grade: number) => {
    setPicking(false);
    if (!canUsePacks()) return onlyInApp();
    const total = booksOf(grade).filter((b) => b.installed).reduce((a, b) => a + b.sizeMB, 0);
    await run({ dir: "send", grade, total, done: 0 }, async () => {
      const r = await exportPack(grade);
      return { ok: true, note: m({ en: `Saved as ${r.path}. Copy it to a memory card or send it by Bluetooth.`, fa: `در ${r.path} ذخیره شد. آن را به کارت حافظه کاپی کنید یا با بلوتوث بفرستید.` }) };
    });
  };

  const receive = async () => {
    if (!canUsePacks()) return onlyInApp();
    const f = await pickFile(".ustadpack,.zip,application/zip");
    if (!f) return;
    const total = Math.max(1, Math.round(f.size / 1048576));
    await run({ dir: "receive", grade: 0, total, done: 0 }, async () => {
      const ids = await importPack(f);
      await initLibrary();
      forgetBooks();
      forgetIndexes();
      refreshSpace();
      force((x) => x + 1);
      return { ok: true, note: m({ en: `Installed: ${ids.join(", ")}`, fa: `نصب شد: ${ids.join("، ")}` }) };
    });
  };

  return (
    <Tabbed tab="me">
      <div className="screen">
        <div className="col" style={{ maxWidth: 640, paddingTop: "var(--safe-top)", display: "flex", flexDirection: "column", minHeight: "calc(100dvh - var(--nav-h))" }}>
          <div style={{ padding: "12px 20px 0", display: "flex", alignItems: "center", gap: 6 }}>
            <IconBtn n="back" label={t("back")} onClick={() => go(-1)} style={{ marginInlineStart: -12 }} />
            <h1 className="u-enter" style={{ margin: 0, font: "900 30px/1.2 var(--font-latin)", letterSpacing: "-.02em", color: "#1C1433" }}>{m({ en: "On this device", fa: "در این دستگاه" })}</h1>
          </div>
          <div className="u-enter" style={{ ["--i" as string]: 1, margin: "14px 16px 0", background: "#FFFFFF", borderRadius: 20, padding: 14, boxShadow: "0 4px 0 #EFE6DA" } as React.CSSProperties}>
            <div style={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden", background: "#F3ECE2" }}>
              <div style={{ width: `${usedPct}%`, background: "#00827E", transformOrigin: "left", animation: "uBarX 800ms var(--ease-settle) 200ms both" }} />
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 10, font: "700 12px/1 var(--font-latin)", color: "#4E4868", flexWrap: "wrap" }}>
              <span style={{ color: "#00827E" }}>■ {m({ en: "Books", fa: "کتاب‌ها" })} {num(usedMB)} MB</span>
              {freeGB !== null && <span style={{ marginInlineStart: "auto" }}>{num(Math.round(freeGB * 10) / 10)} GB {m({ en: "free", fa: "خالی" })}</span>}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "14px 16px 0" }}>
            {grades.length === 0 && (
              <div style={{ background: "#FFFFFF", borderRadius: 18, padding: 14, border: "2px dashed #D9CDBB", font: "600 14px/1.5 var(--font-latin)", color: "#4E4868" }}>{m({ en: "No books yet. Receive a pack to begin.", fa: "هنوز کتابی نیست. برای شروع یک بسته بگیرید." })}</div>
            )}
            {grades.slice().reverse().filter((_, i) => all || i < 3).map((g, i) => {
              const books = booksOf(g).filter((b) => b.installed);
              const partial = gradeState(g) === "partial";
              const size = books.reduce((a, b) => a + b.sizeMB, 0);
              return (
                <div key={g} className="u-enter" style={{ ["--i" as string]: 2 + i, display: "flex", alignItems: "center", gap: 12, background: "#FFFFFF", borderRadius: 18, padding: "10px 12px" } as React.CSSProperties}>
                  <div style={{ width: 40, height: 40, borderRadius: "20px 20px 8px 8px", background: "#1C1433", color: "#FFB31A", display: "flex", alignItems: "center", justifyContent: "center", font: `900 ${g > 9 ? 15 : 17}px/1 var(--font-latin)` }}>{num(g)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: "800 15px/1.3 var(--font-latin)", color: "#1C1433" }}>{m({ en: "Grade", fa: "صنف" })} {num(g)}{SEP}{books.map((b) => m(SUBJECTS[b.subject].name)).join(", ")}{partial ? ` ${m({ en: "only", fa: "فقط" })}` : ""}</div>
                    <div style={{ font: "600 12px/1.4 var(--font-latin)", color: "#6F6A88" }}>{num(books.length)} {m({ en: books.length === 1 ? "book" : "books", fa: "کتاب" })}{SEP}{num(size)} MB</div>
                  </div>
                  <Icon n="ondevice" s={22} c="#1F8F3F" w={2.4} />
                </div>
              );
            })}
            {grades.length > 3 && (
              <button className="press flat" onClick={() => setAll((a) => !a)} style={{ alignSelf: "flex-start", height: 36, padding: "0 12px", borderRadius: 12, background: "#F3ECE2", font: "700 13px/1 var(--font-latin)", color: "#4E4868" }}>
                {all ? m({ en: "Show fewer", fa: "کمتر" }) : m({ en: `All ${grades.length} grades`, fa: `همه ${num(grades.length)} صنف` })}
              </button>
            )}
          </div>

          {job && (
            <div className="u-enter" style={{ margin: "16px 16px 0", background: "#1C1433", borderRadius: 26, padding: 18, boxShadow: "0 6px 0 #0A0714", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ font: "800 16px/1.4 var(--font-latin)", color: "#FFFFFF", flex: 1, overflowWrap: "anywhere" }}>
                  {job.finished ? job.note
                    : job.dir === "send" ? m({ en: `Packing Grade ${job.grade}`, fa: `بسته‌بندی صنف ${num(job.grade)}` }) : m({ en: "Checking and installing the pack", fa: "بررسی و نصب بسته" })}
                </div>
                <div style={{ height: 26, padding: "0 10px", borderRadius: 999, background: "rgba(255,255,255,.12)", display: "flex", alignItems: "center", font: "800 11px/1 var(--font-latin)", color: "#FFB31A", flex: "none" }}>{m({ en: "no internet", fa: "بدون انترنت" })}</div>
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}><Transfer running={!job.finished} /></div>
              <div style={{ height: 12, borderRadius: 6, background: "rgba(255,255,255,.14)", overflow: "hidden" }}>
                <div style={{ height: 12, borderRadius: 6, background: job.finished && job.ok ? "#1F8F3F" : "#FFB31A", width: `${job.total ? (job.done / job.total) * 100 : 100}%`, transition: "background-color 240ms" }} />
              </div>
              <div style={{ display: "flex", font: "700 13px/1 var(--font-latin)", color: "#BDB6D9" }}>
                <span>{num(job.done)} {m({ en: "of", fa: "از" })} {num(job.total)} MB</span>
                <span style={{ marginInlineStart: "auto" }}>{job.finished ? <button className="press flat" onClick={() => setJob(null)} style={{ color: "#FFB31A", font: "800 13px/1 var(--font-latin)" }}>{m({ en: "Done", fa: "تمام" })}</button> : m({ en: "Working…", fa: "در حال کار…" })}</span>
              </div>
            </div>
          )}

          <div style={{ flex: 1, minHeight: 20 }} />
          <div style={{ padding: "0 16px 22px", display: "flex", gap: 10 }}>
            <Btn tone="saf" icon="nearby" fs={15} style={{ flex: 1, gap: 8 }} onClick={() => setPicking(true)} disabled={(!!job && !job.finished) || !grades.length}>{m({ en: "Share a pack", fa: "فرستادن بسته" })}</Btn>
            <Btn tone="outline" icon="download" fs={15} style={{ flex: 1, gap: 8 }} onClick={receive} disabled={!!job && !job.finished}>{m({ en: "Receive", fa: "گرفتن" })}</Btn>
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
            <div style={{ font: "600 13px/1.5 var(--font-latin)", color: "#6F6A88", marginTop: 6 }}>{m({ en: "The pack is saved as one file in your Downloads folder. Copy it to a memory card or send it by Bluetooth.", fa: "بسته به شکل یک فایل در پوشهٔ Downloads ذخیره می‌شود. آن را به کارت حافظه کاپی کنید یا با بلوتوث بفرستید." })}</div>
          </div>
        </>
      )}
    </Tabbed>
  );
}
