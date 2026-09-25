import { memo, useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { splitMath } from "../tutor/mathText";

const cache = new Map<string, string>();
function tex(t: string, display: boolean): string {
  const key = (display ? "D" : "I") + t;
  let html = cache.get(key);
  if (html === undefined) {
    html = katex.renderToString(t, { displayMode: display, throwOnError: false, output: "html", strict: "ignore" });
    if (cache.size > 2000) cache.clear();
    cache.set(key, html);
  }
  return html;
}

/** Right-to-left when most of its letters (outside formulas) are Dari, so an English answer that
 *  quotes the book's Dari terms still reads left to right. */
export function isRtlText(s: string): boolean {
  const words = s.replace(/\$[^$]*\$/g, "");
  const dari = words.match(/[؀-ۿ]/g)?.length ?? 0;
  const latin = words.match(/[A-Za-z]/g)?.length ?? 0;
  return dari > latin;
}

/** Dari or English text with inline `$...$` and display `$$...$$` LaTeX, as the teacher and the
 *  page notes write it. Each formula is its own left-to-right island inside the line. Short
 *  formulas never break; long ones may break after "=" or "+" (as KaTeX allows) instead of
 *  running past the edge of the card. */
export const MathText = memo(function MathText({ text, dir, clean = true, style, className }: { text: string; dir?: "rtl" | "ltr"; clean?: boolean; style?: React.CSSProperties; className?: string }) {
  const d = dir ?? (isRtlText(text) ? "rtl" : "ltr");
  const paragraphs = useMemo(() => text.split(/\n+/).filter((p) => p.trim()), [text]);
  return (
    <div dir={d} className={className} style={{ textAlign: "start", ...style }}>
      {paragraphs.map((p, i) => (
        <div key={i} style={{ marginTop: i ? "0.45em" : 0, overflowWrap: "anywhere" }}>
          <Line text={p} clean={clean} />
        </div>
      ))}
    </div>
  );
});

export function Line({ text, clean = true }: { text: string; clean?: boolean }) {
  const pieces = useMemo(() => splitMath(text, clean), [text, clean]);
  return (
    <>
      {pieces.map((p, i) =>
        p.math ? (
          <span key={i} dir="ltr" className={p.display ? "math-display" : "math-inline"} style={p.display ? { display: "block", textAlign: "center", margin: "6px 0", overflowX: "auto" } : { unicodeBidi: "isolate", whiteSpace: p.text.length > 24 ? "normal" : "nowrap" }} dangerouslySetInnerHTML={{ __html: tex(p.text, p.display) }} />
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}
