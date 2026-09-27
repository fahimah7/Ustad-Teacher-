import { useLang, type Lang } from "../lib/i18n";

/** A slim bar on top of every screen with the language switch, so the whole interface can
 *  change between Dari and English at any moment (Pashto joins when it is ready). */
export function LangBar() {
  const { lang, setLang } = useLang();
  const opt = (l: Lang, label: string, font: string) => {
    const on = lang === l;
    return (
      <button key={l} onClick={() => setLang(l)} aria-pressed={on} lang={l === "fa" ? "fa-AF" : "en"} className="press flat"
        style={{ height: 26, padding: "0 12px", borderRadius: 8, background: on ? "#1C1433" : "transparent", color: on ? "#FFFFFF" : "#4E4868", font: `800 13px/1 ${font}`, transition: "background-color 160ms" }}>
        {label}
      </button>
    );
  };
  return (
    <div className="lang-bar" dir="ltr">
      <div role="group" aria-label={lang === "en" ? "Language" : "زبان"} style={{ display: "flex", gap: 2, padding: 3, borderRadius: 11, background: "#F3ECE2" }}>
        {opt("fa", "دری", "var(--font-rtl)")}
        {opt("en", "English", "var(--font-latin)")}
      </div>
    </div>
  );
}
