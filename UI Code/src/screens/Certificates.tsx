import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { Tabbed } from "../components/Shell";
import { Art } from "../components/Art";
import { Icon } from "../components/Icon";
import { Mark } from "../components/fx";
import { Btn, Dari, IconBtn, Press } from "../components/ui";
import { useApp, type Certificate } from "../state/app";
import { useLang, SEP } from "../lib/i18n";
import { saveFile } from "../lib/files";
import { SUBJECTS, type SubjectKey } from "../content/subjects";

const fmtId = (id: string) => id.match(/.{1,4}/g)!.join(" · ");

function useQr(text: string, size: number) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    QRCode.toString(text, { type: "svg", margin: 0, width: size, color: { dark: "#1C1433", light: "#FFFFFF" }, errorCorrectionLevel: "M" }).then(setSvg);
  }, [text, size]);
  return svg;
}

/** 20 Certificate: "Learning verified". Dignified, not crypto. No name on it. */
export function Certificates() {
  const { school } = useApp();
  const { m, t, num } = useLang();
  const go = useNavigate();
  const [i, setI] = useState(0);
  const [sheet, setSheet] = useState<null | "qr" | "how">(null);
  const certs = school.certificates;
  const c = certs[i];
  if (!c) return <NoCertificates />;
  const sj = SUBJECTS[c.subject as SubjectKey];
  const payload = JSON.stringify({ v: 1, record: c.recordId, sha256: c.sha256, grade: c.grade, subject: c.subject, score: c.score, date: c.date });

  return (
    <Tabbed tab="me">
      <div className="screen">
        <div className="col" style={{ maxWidth: 560, paddingTop: "var(--safe-top)", display: "flex", flexDirection: "column", minHeight: "calc(100dvh - var(--nav-h))" }}>
          <div style={{ height: 56, display: "flex", alignItems: "center", gap: 8, padding: "0 14px 0 6px" }}>
            <IconBtn n="back" label={t("back")} onClick={() => go(-1)} />
            <h1 style={{ flex: 1, margin: 0, font: "900 18px/1 var(--font-latin)", color: "#1C1433" }}>{m({ en: "My certificates", fa: "تصدیق‌نامه‌های من" })}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              {certs.length > 1 && <IconBtn n="back" s={20} size={36} label="Previous" disabled={i === 0} onClick={() => setI(i - 1)} />}
              <div style={{ font: "800 13px/1 var(--font-latin)", color: "#6F6A88" }}>{num(i + 1)} {m({ en: "of", fa: "از" })} {num(certs.length)}</div>
              {certs.length > 1 && <IconBtn n="next" s={20} size={36} label="Next" disabled={i === certs.length - 1} onClick={() => setI(i + 1)} />}
            </div>
          </div>

          <CertCard key={c.id} c={c} payload={payload} />

          <div style={{ margin: "14px 16px 0", display: "flex", alignItems: "center", gap: 8 }}>
            {[
              [m({ en: "Proof saved", fa: "مدرک ذخیره شد" }), true, 1],
              [m({ en: "Confirming", fa: "در حال تایید" }), c.status !== "saved", 1],
              [m({ en: "Record confirmed", fa: "سند تایید شد" }), c.status === "confirmed", 1.3],
            ].map(([label, on, flex], k) => (
              <div key={k} className="u-fade" style={{ ["--i" as string]: 6 + k * 2, flex: flex as number, display: "flex", alignItems: "center", gap: 6, font: "800 12px/1.2 var(--font-latin)", color: on ? "#146B2D" : "#6F6A88" } as React.CSSProperties}>
                <div style={{ width: 20, height: 20, borderRadius: 10, background: on ? "#1F8F3F" : "transparent", border: on ? 0 : "3px solid #D9CDBB", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", animation: on ? `uPop 320ms var(--ease-pop) ${600 + k * 280}ms both` : undefined }}>
                  {on && <Icon n="check" s={12} c="#FFFFFF" w={3.4} />}
                </div>
                {label as string}
              </div>
            ))}
          </div>
          {c.status === "saved" && <div className="u-fade" style={{ margin: "10px 16px 0", font: "600 12px/1.45 var(--font-latin)", color: "#6F6A88" }}>{m({ en: "Confirming starts when a copy of this file reaches a computer with a connection. This phone never goes online.", fa: "تایید وقتی شروع می‌شود که نسخه این فایل به کمپیوتری با اتصال برسد. این گوشی هرگز آنلاین نمی‌شود." })}</div>}

          <div style={{ flex: 1, minHeight: 20 }} />
          <div style={{ padding: "0 16px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn tone="teal" icon="sdcard" fs={15} style={{ flex: 1, gap: 8 }} onClick={() => saveFile(`record-${c.recordId}.json`, JSON.stringify({ ...JSON.parse(payload), curriculum: "Afghan national curriculum", holder: null }, null, 2))}>{m({ en: "Save a copy", fa: "ذخیره نسخه" })}</Btn>
              <Btn tone="outline" icon="qr" fs={15} style={{ flex: 1, gap: 8 }} onClick={() => setSheet("qr")}>{m({ en: "Show QR", fa: "نمایش QR" })}</Btn>
            </div>
            <button className="press flat" onClick={() => setSheet("how")} style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center", font: "800 14px/1 var(--font-latin)", color: "#00827E" }}>{m({ en: "How is this checked?", fa: "این چگونه بررسی می‌شود؟" })}</button>
          </div>
        </div>
      </div>
      {sheet && (
        <>
          <div className="scrim" onClick={() => setSheet(null)} />
          <div className="sheet" role="dialog" aria-modal="true" style={{ padding: "14px 24px 28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ width: 44, height: 5, borderRadius: 3, background: "#E6DCCD" }} />
            {sheet === "qr" ? <BigQr payload={payload} id={c.recordId} /> : <HowChecked />}
            <Btn tone="saf" style={{ alignSelf: "stretch" }} onClick={() => setSheet(null)}>{m({ en: "Done", fa: "تمام" })}</Btn>
          </div>
        </>
      )}
    </Tabbed>
  );
}

function CertCard({ c, payload }: { c: Certificate; payload: string }) {
  const { m, num } = useLang();
  const qr = useQr(payload, 104);
  const sj = SUBJECTS[c.subject as SubjectKey];
  const date = new Date(c.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="u-enter-far" style={{ margin: "8px 16px 0", background: "#FFFFFF", borderRadius: 28, overflow: "hidden", boxShadow: "0 6px 0 #E6DCCD" }}>
      <div style={{ height: 92, position: "relative", overflow: "visible" }}>
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}><Art seed="band-home" w={390} h={130} cols={6} bg="#00827E" /></div>
        <div className="u-pop" style={{ ["--i" as string]: 3, position: "absolute", insetInlineEnd: 18, bottom: -26, width: 92, height: 92, borderRadius: 46, background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 0 #E6DCCD" } as React.CSSProperties}><Mark size={70} /></div>
      </div>
      <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "inline-flex", alignSelf: "flex-start", alignItems: "center", gap: 6, height: 28, padding: "0 10px", borderRadius: 999, background: c.status === "confirmed" ? "#E0F2DF" : "#FFF1CC", font: "800 12px/1 var(--font-latin)", color: c.status === "confirmed" ? "#146B2D" : "#7A4E00" }}>
          <Icon n={c.status === "confirmed" ? "verified" : "hourglass"} s={15} c={c.status === "confirmed" ? "#146B2D" : "#7A4E00"} w={2.6} />
          {c.status === "confirmed" ? m({ en: "Learning verified", fa: "آموزش تایید شد" }) : m({ en: "Proof saved", fa: "مدرک ذخیره شد" })}
        </div>
        <div style={{ font: "600 13px/1.5 var(--font-latin)", color: "#6F6A88", marginTop: 6 }}>{m({ en: "The holder of this record completed", fa: "دارنده این سند تکمیل کرده است" })}</div>
        <div style={{ font: "900 30px/1.05 var(--font-latin)", letterSpacing: "-.02em", color: "#1C1433" }}>Grade {c.grade}{SEP}{sj.name.en}</div>
        <Dari style={{ font: "800 18px/1.6 var(--font-rtl)", color: "#1C1433" }}>{sj.name.fa} صنف {new Intl.NumberFormat("fa-AF").format(c.grade)} · نصاب ملی افغانستان</Dari>
        <div style={{ font: "700 14px/1.5 var(--font-latin)", color: "#4E4868" }}>Afghan national curriculum · score {num(c.score)}% · {date}</div>
        <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 10, paddingTop: 14, borderTop: "2px dashed #EFE6DA" }}>
          <div style={{ padding: 6, background: "#FFFFFF", border: "2px solid #EFE6DA", borderRadius: 12, width: 120, height: 120, flex: "none" }} dangerouslySetInnerHTML={{ __html: qr }} aria-label="QR code" role="img" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
            <div className="eyebrow" style={{ fontSize: 11, color: "#6F6A88" }}>{m({ en: "Record", fa: "سند" })}</div>
            <div style={{ font: "700 13px/1.3 ui-monospace,Menlo,monospace", color: "#1C1433" }}>{fmtId(c.recordId)}</div>
            <div style={{ font: "600 12px/1.45 var(--font-latin)", color: "#6F6A88" }}>{m({ en: "No name on it. Only the person holding this file can show it is hers.", fa: "نامی روی آن نیست. فقط کسی که این فایل را دارد می‌تواند نشان دهد که از اوست." })}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BigQr({ payload, id }: { payload: string; id: string }) {
  const svg = useQr(payload, 260);
  return (
    <>
      <div className="u-pop" style={{ width: 280, height: 280, padding: 10, borderRadius: 22, background: "#FFFFFF", border: "3px solid #EFE6DA" }} dangerouslySetInnerHTML={{ __html: svg }} role="img" aria-label="QR code" />
      <div style={{ font: "700 15px/1.3 ui-monospace,Menlo,monospace", color: "#1C1433" }}>{fmtId(id)}</div>
    </>
  );
}

function HowChecked() {
  const { m } = useLang();
  const steps = [
    { en: "When you finish a grade, your phone writes a small record: grade, subject, score, date. No name.", fa: "وقتی صنفی را تمام کنی، گوشی سند کوچکی می‌نویسد: صنف، مضمون، نمره، تاریخ. بدون نام." },
    { en: "It makes a fingerprint of that record (SHA-256). Change one letter and the fingerprint changes.", fa: "از آن سند یک اثر انگشت می‌سازد (SHA-256). یک حرف تغییر کند، اثر انگشت تغییر می‌کند." },
    { en: "When a copy reaches a computer with a connection, the fingerprint is stamped on Bitcoin with OpenTimestamps. That stamp can't be erased.", fa: "وقتی نسخه‌ای به کمپیوتری با اتصال برسد، اثر انگشت با OpenTimestamps روی بیت‌کوین مهر می‌شود. آن مهر پاک نمی‌شود." },
    { en: "A school or employer scans the QR and checks the fingerprint against the stamp.", fa: "یک مکتب یا کارفرما QR را اسکن می‌کند و اثر انگشت را با مهر مقایسه می‌کند." },
  ];
  return (
    <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ font: "900 22px/1.2 var(--font-latin)", color: "#1C1433" }}>{m({ en: "How is this checked?", fa: "این چگونه بررسی می‌شود؟" })}</div>
      {steps.map((s, i) => (
        <div key={i} className="u-enter" style={{ ["--i" as string]: i, display: "flex", gap: 10 } as React.CSSProperties}>
          <div style={{ width: 28, height: 28, borderRadius: 14, background: "#DDF6F3", color: "#005F5B", display: "flex", alignItems: "center", justifyContent: "center", font: "900 13px/1 var(--font-latin)", flex: "none" }}>{i + 1}</div>
          <div style={{ font: "500 15px/1.5 var(--font-latin)", color: "#1C1433" }}>{m(s)}</div>
        </div>
      ))}
    </div>
  );
}

export { Press };

/** Before the first certificate: how one is earned. */
function NoCertificates() {
  const { m, t } = useLang();
  const go = useNavigate();
  return (
    <Tabbed tab="me">
      <div className="screen">
        <div className="col" style={{ maxWidth: 560, paddingTop: "var(--safe-top)", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ height: 56, display: "flex", alignItems: "center", gap: 8, padding: "0 14px 0 6px" }}>
            <IconBtn n="back" label={t("back")} onClick={() => go(-1)} />
            <h1 style={{ flex: 1, margin: 0, font: "900 18px/1 var(--font-latin)", color: "#1C1433" }}>{m({ en: "My certificates", fa: "تصدیق‌نامه‌های من" })}</h1>
          </div>
          <div className="u-enter" style={{ margin: "0 16px", background: "#FFFFFF", borderRadius: 28, boxShadow: "0 6px 0 #E6DCCD", padding: 20, display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-start" }}>
            <Mark size={64} />
            <div style={{ font: "900 22px/1.3 var(--font-latin)", color: "#1C1433" }}>{m({ en: "No certificates yet", fa: "هنوز تصدیق‌نامه‌ای نیست" })}</div>
            <div style={{ font: "600 15px/1.6 var(--font-latin)", color: "#4E4868" }}>{m({ en: "Practise every chapter of a book and a certificate record is made here: grade, subject, score and date, with no name on it.", fa: "همهٔ فصل‌های یک کتاب را تمرین کنید تا سند آن اینجا ساخته شود: صنف، مضمون، نمره و تاریخ، بدون نام." })}</div>
            <Btn tone="saf" icon="practice" onClick={() => go("/practice")}>{m({ en: "Go to practice", fa: "رفتن به تمرین" })}</Btn>
          </div>
        </div>
      </div>
    </Tabbed>
  );
}
