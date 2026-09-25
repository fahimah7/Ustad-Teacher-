import { ICONS, type IconName } from "../lib/icons";
import { useLang } from "../lib/i18n";

const MIRRORED = new Set<IconName>(["back", "next", "arrow", "send", "replay"]);

export type IconProps = {
  n: IconName;
  s?: number;
  c?: string;
  w?: number;
  f?: string;
  className?: string;
  style?: React.CSSProperties;
};

export function Icon({ n, s = 24, c = "currentColor", w = 2, f = "none", className, style }: IconProps) {
  const { rtl } = useLang();
  const flip = rtl && MIRRORED.has(n);
  return (
    <svg
      viewBox="0 0 24 24"
      width={s}
      height={s}
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ flex: "none", transform: flip ? "scaleX(-1)" : undefined, ...style }}
    >
      <path d={ICONS[n]} stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" fill={f} />
    </svg>
  );
}
