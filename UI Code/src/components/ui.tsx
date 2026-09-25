import { forwardRef } from "react";
import { Icon, type IconProps } from "./Icon";
import { Art, coverSeed } from "./Art";
import type { IconName } from "../lib/icons";
import { useLang, type Multi } from "../lib/i18n";
import { SUBJECTS, type SubjectKey } from "../content/subjects";

/* Shared pieces, each lifted straight from the artboards. */

type PressProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { ledge?: number; flat?: boolean };

/** Every pressable has a solid ledge; pressed sinks by the ledge in 90 ms. */
export const Press = forwardRef<HTMLButtonElement, PressProps>(function Press({ ledge = 5, flat, className, style, type = "button", ...rest }, ref) {
  return <button ref={ref} type={type} className={`press${flat ? " flat" : ""}${className ? " " + className : ""}`} style={{ ["--lh" as string]: `${ledge}px`, ...style }} {...rest} />;
});

type Tone = "saf" | "pom" | "teal" | "vio" | "ink" | "leaf" | "white" | "outline" | "glass";
const TONES: Record<Tone, { bg: string; fg: string; ledge: string; border?: string }> = {
  saf: { bg: "#FFB31A", fg: "#1C1433", ledge: "#C98300" },
  pom: { bg: "#D81E57", fg: "#FFFFFF", ledge: "#9A1240" },
  teal: { bg: "#00827E", fg: "#FFFFFF", ledge: "#005F5B" },
  vio: { bg: "#7443F0", fg: "#FFFFFF", ledge: "#4F24B8" },
  ink: { bg: "#1C1433", fg: "#FFFFFF", ledge: "#0A0714" },
  leaf: { bg: "#1F8F3F", fg: "#FFFFFF", ledge: "#146B2D" },
  white: { bg: "#FFFFFF", fg: "#146B2D", ledge: "#146B2D" },
  outline: { bg: "#FFFFFF", fg: "#1C1433", ledge: "#EFE6DA", border: "3px solid #EFE6DA" },
  glass: { bg: "rgba(255,255,255,.16)", fg: "#FFFFFF", ledge: "transparent" },
};

export function Btn({ tone = "saf", icon, iconEnd, h = 56, r = 16, fs = 18, fg, children, style, ledge, ...rest }: PressProps & { tone?: Tone; icon?: IconName; iconEnd?: IconName; h?: number; r?: number; fs?: number; fg?: string }) {
  const t = TONES[tone];
  const L = ledge ?? (tone === "glass" ? 0 : 5);
  const color = fg ?? t.fg;
  return (
    <Press
      ledge={L}
      style={{
        height: h, borderRadius: r, background: t.bg, border: t.border, boxShadow: L ? `0 ${L}px 0 ${t.ledge}` : undefined,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "0 18px",
        font: `800 ${fs}px/1 var(--font-latin)`, color, ...style,
      }}
      {...rest}
    >
      {icon && <Icon n={icon} s={fs + 4} c={color} w={2.4} />}
      {children}
      {iconEnd && <Icon n={iconEnd} s={fs + 4} c={color} w={2.6} />}
    </Press>
  );
}

/** Round icon button used in top bars (44 × 44). */
export function IconBtn({ n, bg, c = "#1C1433", s = 24, w = 2.4, f, size = 44, label, ...rest }: PressProps & { n: IconName; bg?: string; c?: string; s?: number; w?: number; f?: string; size?: number; label: string }) {
  return (
    <Press flat aria-label={label} title={label} style={{ width: size, height: size, borderRadius: size / 2, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }} {...rest}>
      <Icon n={n} s={s} c={c} w={w} f={f} />
    </Press>
  );
}

/** "From your lesson · Chemistry 12 · 2.3" — saffron tint, one per answer. */
export function SourceChip({ children, h = 32, fs = 12, onClick }: { children: React.ReactNode; h?: number; fs?: number; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className={onClick ? "press flat" : undefined} style={{ display: "inline-flex", alignSelf: "flex-start", alignItems: "center", gap: 8, height: h, padding: "0 12px 0 8px", borderRadius: 999, background: "#FFF1CC", font: `800 ${fs}px/1 var(--font-latin)`, color: "#7A4E00" }}>
      <Icon n="book" s={h === 32 ? 16 : 15} c="#7A4E00" w={2.4} />
      {children}
    </Tag>
  );
}

const ACT = {
  vio: { bg: "#EEE7FF", c: "#4F24B8" },
  teal: { bg: "#DDF6F3", c: "#005F5B" },
  pom: { bg: "#FFE3EA", c: "#9A1240" },
};
export function ActChip({ tone, icon, children, h = 36, ...rest }: PressProps & { tone: keyof typeof ACT; icon: IconName; h?: number }) {
  const t = ACT[tone];
  return (
    <Press flat style={{ height: h, padding: "0 12px", borderRadius: 12, background: t.bg, display: "flex", alignItems: "center", gap: 6, font: "800 13px/1 var(--font-latin)", color: t.c, flex: "none" }} {...rest}>
      <Icon n={icon} s={16} c={t.c} w={2.4} />
      {children}
    </Press>
  );
}

/** Answer-letter badge in an arch: A B C D, or الف ب ج د in Dari. */
export const LETTERS_EN = ["A", "B", "C", "D"];
export const LETTERS_FA = ["الف", "ب", "ج", "د"];
export function LetterBadge({ i, w = 36, h = 40, fs = 18, bg = "#FFFFFF", fg = "#1C1433" }: { i: number; w?: number; h?: number; fs?: number; bg?: string; fg?: string }) {
  const { rtl } = useLang();
  return (
    <span aria-hidden="true" style={{ width: w, height: h, borderRadius: `${w / 2}px ${w / 2}px ${w * 0.22}px ${w * 0.22}px`, background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", font: `900 ${rtl ? fs * 0.8 : fs}px/1 ${rtl ? "var(--font-rtl)" : "var(--font-latin)"}`, flex: "none" }}>
      {rtl ? LETTERS_FA[i] : LETTERS_EN[i]}
    </span>
  );
}

/** Book cover: generative art, grade badge, subject in English and Dari. */
export function Cover({ subject, grade, badge = 32, radius = "16px 16px 8px 8px", ledge = true, label = true, fs = 12 }: { subject: SubjectKey; grade: number; badge?: number; radius?: string; ledge?: boolean; label?: boolean; fs?: number }) {
  const s = SUBJECTS[subject];
  const { num } = useLang();
  const faGrade = new Intl.NumberFormat("fa-AF").format(grade);
  return (
    <div style={{ position: "relative", aspectRatio: "4/5", borderRadius: radius, overflow: "hidden", boxShadow: ledge ? "0 5px 0 rgba(28,20,51,.18)" : undefined, width: "100%" }}>
      <div style={{ position: "absolute", inset: 0 }}><Art seed={coverSeed(subject, grade)} w={120} h={150} cols={2} bg={s.bg} /></div>
      <div style={{ position: "absolute", top: badge > 28 ? 7 : 5, insetInlineStart: badge > 28 ? 7 : 5, minWidth: badge, height: badge * 1.19, borderRadius: `${badge / 2}px ${badge / 2}px ${badge / 4}px ${badge / 4}px`, background: "#1C1433", border: "2px solid #FFF8EF", display: "flex", alignItems: "center", justifyContent: "center", font: `900 ${Math.round(badge * 0.53)}px/1 var(--font-latin)`, color: "#FFB31A", padding: "0 4px" }}>{num(grade)}</div>
      {label && (
        <div style={{ position: "absolute", insetInline: 6, bottom: 6, background: "#FFF8EF", borderRadius: 10, padding: "6px 7px" }}>
          <div dir="ltr" style={{ font: `800 ${fs}px/1.15 var(--font-latin)`, color: "#1C1433", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "start" }}>{s.name.en}</div>
          <div dir="rtl" className="fa" style={{ font: `800 12px/1.4 var(--font-rtl)`, color: "#1C1433", textAlign: "start" }}>{s.name.fa} صنف {faGrade}</div>
        </div>
      )}
    </div>
  );
}

/** Small art thumbnail in an arch (chat context bar, question list…). */
export function Thumb({ subject, grade, w, h, r }: { subject: SubjectKey; grade: number; w: number; h: number; r: string }) {
  return (
    <div style={{ width: w, height: h, borderRadius: r, overflow: "hidden", flex: "none" }}>
      <Art seed={coverSeed(subject, grade)} w={120} h={150} cols={2} bg={SUBJECTS[subject].bg} />
    </div>
  );
}

/** Ustad's avatar: pomegranate arch with a book. */
export function UstadAvatar({ w = 42, h = 46 }: { w?: number; h?: number }) {
  return (
    <div aria-hidden="true" style={{ width: w, height: h, borderRadius: `${w / 2}px ${w / 2}px 10px 10px`, background: "#D81E57", boxShadow: "0 4px 0 #9A1240", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
      <Icon n="book" s={24} c="#FFFFFF" w={2.2} />
    </div>
  );
}

/** Segmented control on sand (language switch, Protected / Original, Chat / Talk). */
/** `soon` marks an option that is shown but can't be picked yet (e.g. Pashto), with that word as a tag. */
export function Segmented<T extends string>({ value, options, onChange, h = 36, r = 11, gap = 6 }: { value: T; options: { v: T; label: React.ReactNode; fa?: boolean; icon?: IconName; soon?: string }[]; onChange: (v: T) => void; h?: number; r?: number; gap?: number }) {
  return (
    <div role="tablist" style={{ display: "flex", gap, background: "#F3ECE2", borderRadius: r + 3, padding: 4 }}>
      {options.map((o) => {
        const on = o.v === value && !o.soon;
        return (
          <button key={o.v} role="tab" aria-selected={on} aria-disabled={!!o.soon} disabled={!!o.soon} onClick={() => !o.soon && onChange(o.v)} className={o.soon ? "flat" : "press flat"}
            style={{ flex: 1, height: h, padding: "0 12px", borderRadius: r, background: on ? "#FFFFFF" : "transparent", boxShadow: on ? "0 2px 0 #E6DCCD" : undefined, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, font: `${on ? 800 : 700} 14px/1 ${o.fa ? "var(--font-rtl)" : "var(--font-latin)"}`, color: on ? "#1C1433" : "#6F6A88", opacity: o.soon ? 0.6 : 1, cursor: o.soon ? "default" : undefined, transition: "background-color 160ms, box-shadow 160ms" }}>
            {o.icon && <Icon n={o.icon} s={16} c={on ? "#1C1433" : "#6F6A88"} w={2.6} />}
            {o.label}
            {o.soon && <span style={{ padding: "3px 6px", borderRadius: 999, background: "#E6DCCD", font: "800 10px/1 var(--font-latin)", color: "#4E4868" }}>{o.soon}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Progress bar that fills when it appears. */
export function Bar({ pct, h = 14, bg = "#F3ECE2", fill = "#FFB31A", delay = 150 }: { pct: number; h?: number; bg?: string; fill?: string; delay?: number }) {
  return (
    <div style={{ flex: 1, height: h, borderRadius: h / 2, background: bg, overflow: "hidden" }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${pct}%`, height: "100%", borderRadius: h / 2, background: fill, transformOrigin: "left", animation: `uBarX 900ms var(--ease-settle) ${delay}ms both` }} />
    </div>
  );
}

/** Renders **bold** from lesson text. */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return <>{parts.map((p, i) => (p.startsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>))}</>;
}

/** Bilingual line: English plus the Dari under it, as on screens 07, 08, 15. */
export function Dari({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div dir="rtl" className="fa" style={{ textAlign: "start", ...style }}>{children}</div>;
}

export function useM() {
  const { m } = useLang();
  return (v: Multi) => m(v);
}

export type { IconProps };
