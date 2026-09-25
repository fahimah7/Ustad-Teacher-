/** Splits a teacher answer (Dari or English with inline `$...$` / display `$$...$$` LaTeX) into
 *  text runs and formulas, repairing what the math fonts can't draw: Dari words inside a
 *  formula become ordinary text, typed Unicode symbols become LaTeX commands, and formulas
 *  separated only by spaces are joined (separate formulas in a right-to-left line would be shown
 *  in reverse order). Port of splitMath in app/lib/ui/math_text.dart. */

export type MathPiece = { text: string; math: boolean; display: boolean };

const text = (t: string): MathPiece => ({ text: t, math: false, display: false });
const formula = (t: string, display: boolean): MathPiece => ({ text: t, math: true, display });

/** Small models like Markdown; the chat shows plain text, so drop the markers. */
export const cleanMarkdown = (s: string) =>
  s.replace(/\*\*/g, "").replace(/^[ \t]*[-*][ \t]+/gm, "• ").replace(/^#+[ \t]*/gm, "");

const MATH_SEGMENT = /\$\$([^$]+)\$\$|\$([^$]+)\$/g;

export function splitMath(input: string, clean = true): MathPiece[] {
  const source = clean ? cleanMarkdown(input) : input;
  const pieces: MathPiece[] = [];
  let last = 0;
  for (const m of source.matchAll(MATH_SEGMENT)) {
    const start = m.index!;
    if (start > last) pieces.push(text(source.slice(last, start)));
    const display = m[1] !== undefined;
    pieces.push(...formulaPieces((m[1] ?? m[2])!, display));
    last = start + m[0].length;
  }
  if (last < source.length) pieces.push(text(source.slice(last)));
  return joinAdjacentFormulas(pieces);
}

// Dari words inside a formula — in \text{...} or bare — become ordinary text between formulas.
const DARI_IN_FORMULA =
  /\\(?:text|mathrm|textrm|textbf|mbox)\s*\{([^{}]*[؀-ۿ][^{}]*)\}|([؀-ۿ](?:[؀-ۿ‌ ]*[؀-ۿ])?)/g;

function formulaPieces(tex: string, display: boolean): MathPiece[] {
  const pieces: MathPiece[] = [];
  const t = unicodeToTex(tex);
  let last = 0;
  const addMath = (s: string) => {
    if (s.trim()) pieces.push(formula(s.trim(), display));
  };
  for (const m of t.matchAll(DARI_IN_FORMULA)) {
    addMath(t.slice(last, m.index!));
    pieces.push(text(` ${(m[1] ?? m[2])!.trim()} `));
    last = m.index! + m[0].length;
  }
  addMath(t.slice(last));
  return pieces;
}

const SYMBOLS: Record<string, string> = {
  "ε": "\\epsilon", "ϵ": "\\epsilon", "δ": "\\delta", "Δ": "\\Delta", "α": "\\alpha", "β": "\\beta",
  "γ": "\\gamma", "θ": "\\theta", "λ": "\\lambda", "μ": "\\mu", "π": "\\pi", "σ": "\\sigma",
  "Σ": "\\Sigma", "φ": "\\varphi", "ω": "\\omega", "Ω": "\\Omega", "≤": "\\le", "≥": "\\ge",
  "≠": "\\ne", "≈": "\\approx", "→": "\\to", "←": "\\leftarrow", "⇒": "\\Rightarrow", "∞": "\\infty",
  "×": "\\times", "÷": "\\div", "±": "\\pm", "∈": "\\in", "∫": "\\int", "∑": "\\sum", "·": "\\cdot",
  "√": "\\sqrt", "°": "^\\circ", "−": "-",
};

/** Typed Unicode symbols → LaTeX commands; Dari/Arabic digits → 0-9. */
function unicodeToTex(tex: string): string {
  let out = "";
  for (const c of tex) {
    const r = c.codePointAt(0)!;
    const command = SYMBOLS[c];
    if (command) out += ` ${command} `;
    else if (r >= 0x06f0 && r <= 0x06f9) out += String.fromCharCode(0x30 + r - 0x06f0);
    else if (r >= 0x0660 && r <= 0x0669) out += String.fromCharCode(0x30 + r - 0x0660);
    else out += c;
  }
  return out.replace(/ {2,}/g, " ");
}

const SIMPLE_SEPARATOR = /^[\s\-–=+,.:;<>()/]*$/;

function joinAdjacentFormulas(pieces: MathPiece[]): MathPiece[] {
  const out: MathPiece[] = [];
  for (const piece of pieces) {
    if (piece.math && out.length) {
      const prev = out[out.length - 1];
      if (prev.math && prev.display === piece.display) {
        out[out.length - 1] = formula(`${prev.text} ${piece.text}`, piece.display);
        continue;
      }
      const before = out[out.length - 2];
      if (!prev.math && prev.text.length <= 6 && SIMPLE_SEPARATOR.test(prev.text) && before?.math && before.display === piece.display) {
        out.splice(out.length - 2, 2, formula(`${before.text} ${prev.text.trim()} ${piece.text}`.replace(/ {2,}/g, " "), piece.display));
        continue;
      }
    }
    out.push(piece);
  }
  return out;
}

/** Plain words for read-aloud and captions: formulas become readable text. */
export function speakable(input: string): string {
  return splitMath(input)
    .map((p) => (p.math ? texToWords(p.text) : p.text))
    .join("")
    .replace(/•/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function texToWords(tex: string): string {
  let s = tex;
  for (let i = 0; i < 4; i++) s = s.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)");
  return s
    .replace(/\\sqrt\s*\{([^{}]*)\}/g, "√($1)")
    .replace(/\\(left|right|displaystyle|,|;|!|quad|qquad)/g, " ")
    .replace(/\\lim_\{([^{}]*)\}/g, "lim $1 ")
    .replace(/\\to\b/g, "→").replace(/\\infty\b/g, "∞").replace(/\\le(q)?\b/g, "≤").replace(/\\ge(q)?\b/g, "≥")
    .replace(/\\ne(q)?\b/g, "≠").replace(/\\cdot\b|\\times\b/g, "×").replace(/\\pi\b/g, "π").replace(/\\Delta\b/g, "Δ")
    .replace(/\\([a-zA-Z]+)/g, "$1")
    .replace(/[{}]/g, "")
    .replace(/\^/g, "^");
}
