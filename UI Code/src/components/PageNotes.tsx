import { useState } from "react";
import { Icon } from "./Icon";
import { MathText } from "./MathText";
import { FigureCrop } from "./FigureCrop";
import type { Book } from "../content/schema";
import { SUBJECTS } from "../content/subjects";
import { useLang } from "../lib/i18n";
import { faNum } from "../tutor/fa";

/** The study notes for one page (made from the textbook by AI, in Dari): summary, key points,
 *  formulas, terms, figures, worked examples and exercises with hidden solutions. Tapping a
 *  block asks Ustad about it. */
export function PageNotes({ book, pdfPage, onAsk, big }: { book: Book; pdfPage: number; onAsk: (question: string) => void; big?: boolean }) {
  const { m } = useLang();
  const text = book.text!;
  const pkg = text.pkg(pdfPage);
  const s = SUBJECTS[book.subject];
  const body = big ? "500 17px/1.9 var(--font-rtl)" : "500 16px/1.85 var(--font-rtl)";
  if (!pkg) {
    return <Card><div style={{ font: body, color: "#4E4868" }}>{m({ en: "There are no notes for this page. Switch to the book to read it.", fa: "برای این صفحه یادداشتی نیست. برای خواندن به کتاب بروید." })}</div></Card>;
  }
  const ch = text.chapter(pkg.chapter);
  const ask = (q: string) => () => onAsk(q);
  return (
    <div dir="rtl" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="u-enter" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {ch && <Pill bg={s.tint} c={s.ink}>{`فصل ${faNum(ch.number)}: ${ch.titleFa}`}</Pill>}
        {pkg.printedPage !== null && <Pill bg="#FFF1CC" c="#7A4E00">{`صفحهٔ ${faNum(pkg.printedPage)} کتاب`}</Pill>}
      </div>
      {pkg.sectionFa && <h2 className="u-enter" style={{ margin: 0, font: big ? "900 28px/1.5 var(--font-rtl)" : "900 23px/1.5 var(--font-rtl)", color: "#1C1433" }}><MathText text={pkg.sectionFa} /></h2>}

      <Tap onClick={ask("این صفحه را ساده توضیح بدهید.")}>
        <div style={{ background: "#FFF1CC", borderRadius: 20, padding: "14px 16px", display: "flex", gap: 12 }}>
          <div style={{ width: 32, height: 36, borderRadius: "16px 16px 8px 8px", background: "#FFB31A", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon n="star" s={16} c="#1C1433" f="#1C1433" /></div>
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow" style={{ color: "#7A4E00" }}>خلاصهٔ صفحه</div>
            <MathText text={pkg.summaryFa} style={{ font: body, color: "#1C1433", marginTop: 4 }} />
          </div>
        </div>
      </Tap>

      {pkg.keyPoints.length > 0 && (
        <Card title="نکات مهم">
          <ul style={{ margin: 0, paddingInlineStart: 20, display: "flex", flexDirection: "column", gap: 6 }}>
            {pkg.keyPoints.map((k, i) => <li key={i} style={{ font: body, color: "#1C1433" }}><MathText text={k} /></li>)}
          </ul>
        </Card>
      )}

      {pkg.formulas.length > 0 && (
        <Card title="فورمول‌ها">
          {pkg.formulas.map((f, i) => (
            <Tap key={i} onClick={ask(`فورمول «${f.meaning_fa ?? ""}» را توضیح بدهید: $${f.latex}$`)}>
              <div style={{ borderRadius: 14, background: "#F7F1E8", padding: "10px 12px" }}>
                <MathText text={`$$${f.latex}$$`} />
                {f.meaning_fa && <div style={{ font: "600 14px/1.7 var(--font-rtl)", color: "#6F6A88", textAlign: "center" }}>{f.meaning_fa}</div>}
              </div>
            </Tap>
          ))}
        </Card>
      )}

      {pkg.terms.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {pkg.terms.map((t, i) => (
            <button key={i} className="press flat" onClick={ask(`«${t.fa}» یعنی چه؟`)} style={{ minHeight: 34, padding: "4px 12px", borderRadius: 999, background: s.tint, font: "800 14px/1.5 var(--font-rtl)", color: s.ink }}>
              {t.fa}{t.en ? <span dir="ltr" style={{ font: "700 12px/1 var(--font-latin)", opacity: 0.75, marginInlineStart: 6 }}>{t.en}</span> : null}
            </button>
          ))}
        </div>
      )}

      {pkg.figures.filter((f) => f.bbox?.length === 4).map((f, i) => (
        <Card key={i} title={`شکل ${faNum(i + 1)}`}>
          <FigureCrop bookId={book.id} image={text.images[pdfPage - 1]} aspect={text.pageAspects[pdfPage - 1]} bbox={f.bbox!} />
          {f.description_fa && <MathText text={f.description_fa} style={{ font: "500 15px/1.8 var(--font-rtl)", color: "#4E4868" }} />}
        </Card>
      ))}

      {pkg.workedExamples.map((e, i) => (
        <Card key={`e${i}`} title={`مثال ${faNum(i + 1)}${e.label_fa ? ` — ${e.label_fa}` : ""}`} accent="#00827E">
          <MathText text={e.problem_fa ?? ""} style={{ font: body, color: "#1C1433" }} />
          <Solution steps={e.steps_fa ?? []} answer={e.answer} open onAsk={ask(`مثال ${faNum(i + 1)} این صفحه را قدم به قدم توضیح بدهید.`)} />
        </Card>
      ))}

      {pkg.exercises.map((e, i) => {
        const label = e.label_fa ?? "";
        const name = /^[0-9۰-۹]/.test(label) ? `تمرین ${label}` : label || `تمرین ${faNum(i + 1)}`;
        return (
          <Card key={`x${i}`} title={name} accent="#7443F0">
            <MathText text={e.problem_fa ?? ""} style={{ font: body, color: "#1C1433" }} />
            <Solution steps={e.solution_steps_fa ?? []} answer={e.answer} onAsk={ask(`${name} را قدم به قدم حل کنید.`)} />
          </Card>
        );
      })}

      <div style={{ display: "inline-flex", alignSelf: "flex-start", alignItems: "center", gap: 6, minHeight: 28, padding: "4px 10px", borderRadius: 999, border: "2px solid #EFE6DA", font: "700 12px/1.5 var(--font-latin)", color: "#6F6A88" }}>
        <Icon n="info" s={14} c="#6F6A88" w={2.4} />
        {m({ en: "Notes made from the textbook by AI, not yet checked by a teacher. The book page is the source.", fa: "این یادداشت‌ها را هوش مصنوعی از کتاب ساخته و هنوز معلمی آن‌ها را ندیده است. صفحهٔ کتاب منبع اصلی است." })}
      </div>
    </div>
  );
}

function Solution({ steps, answer, open, onAsk }: { steps: string[]; answer?: string | null; open?: boolean; onAsk: () => void }) {
  const [shown, setShown] = useState(!!open);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {shown && (
        <ol style={{ margin: 0, paddingInlineStart: 22, display: "flex", flexDirection: "column", gap: 4 }}>
          {steps.map((st, i) => <li key={i} style={{ font: "500 15px/1.85 var(--font-rtl)", color: "#4E4868" }}><MathText text={st} /></li>)}
        </ol>
      )}
      {shown && answer && <div style={{ font: "800 15px/1.8 var(--font-rtl)", color: "#146B2D", display: "flex", gap: 6 }}><span>جواب:</span><MathText text={answer} /></div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {!open && <button className="press flat" onClick={() => setShown((x) => !x)} style={{ height: 36, padding: "0 12px", borderRadius: 12, background: "#F3ECE2", font: "800 13px/1 var(--font-rtl)", color: "#1C1433" }}>{shown ? "پنهان کردن حل" : "نشان دادن حل"}</button>}
        <button className="press flat" onClick={onAsk} style={{ height: 36, padding: "0 12px", borderRadius: 12, background: "#FFE3EA", display: "flex", alignItems: "center", gap: 6, font: "800 13px/1 var(--font-rtl)", color: "#9A1240" }}><Icon n="ask" s={16} c="#9A1240" w={2.4} />از استاد بپرسید</button>
      </div>
    </div>
  );
}

function Card({ title, children, accent = "#6F6A88" }: { title?: string; children: React.ReactNode; accent?: string }) {
  return (
    <div className="u-enter" style={{ background: "#FFFFFF", borderRadius: 20, padding: "14px 16px", boxShadow: "0 4px 0 #EFE6DA", display: "flex", flexDirection: "column", gap: 10 }}>
      {title && <div style={{ font: "900 15px/1.6 var(--font-rtl)", color: accent }}><MathText text={title} /></div>}
      {children}
    </div>
  );
}

function Tap({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button className="press flat" onClick={onClick} title="Ask Ustad about this" style={{ display: "block", width: "100%", textAlign: "start" }}>{children}</button>;
}

function Pill({ bg, c, children }: { bg: string; c: string; children: React.ReactNode }) {
  return <span style={{ minHeight: 30, padding: "4px 12px", borderRadius: 999, background: bg, color: c, font: "800 13px/1.6 var(--font-rtl)", display: "inline-flex", alignItems: "center" }}>{children}</span>;
}
