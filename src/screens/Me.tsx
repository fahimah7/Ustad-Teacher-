import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabbed } from "../components/Shell";
import { Art } from "../components/Art";
import { Icon } from "../components/Icon";
import { Btn, Press, Segmented } from "../components/ui";
import { useApp } from "../state/app";
import { useLang, type Lang } from "../lib/i18n";
import type { IconName } from "../lib/icons";
import { PLACED_GRADE } from "../content/library";
import { wipeVault } from "../lib/store";

/** Me / My learning. Not in the artboards; built in the same system. */
export function Me() {
  const { m, num, lang, setLang } = useLang();
  const { school } = useApp();
  const go = useNavigate();
  const [confirm, setConfirm] = useState(false);

  const rows: { icon: IconName; bg: string; c: string; title: string; sub: string; to: string }[] = [
    { icon: "cert", bg: "#E0F2DF", c: "#146B2D", title: m({ en: "My certificates", fa: "تصدیق‌نامه‌های من" }), sub: m({ en: `${school.certificates.length} records · no name on them`, fa: `${num(school.certificates.length)} سند · بدون نام` }), to: "/certificates" },
    { icon: "box", bg: "#FFF1CC", c: "#7A4E00", title: m({ en: "Learning packs", fa: "بسته‌های آموزشی" }), sub: m({ en: "Share or receive grades without internet", fa: "صنف‌ها را بدون انترنت بفرست یا بگیر" }), to: "/packs" },
    { icon: "ask", bg: "#FFE3EA", c: "#9A1240", title: m({ en: "Your questions", fa: "سوال‌های تو" }), sub: m({ en: `${school.questions.length} saved on this phone`, fa: `${num(school.questions.length)} در این گوشی` }), to: "/ask" },
  ];

  return (
    <Tabbed tab="me">
      <div className="screen">
        <div className="col" style={{ background: "#7443F0", padding: "max(var(--safe-top), 28px) 0 70px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", insetInline: 0, bottom: 0, height: 130, opacity: 0.3 }}><Art seed="band-me" w={390} h={130} cols={6} bg="#7443F0" anim /></div>
          <div className="desk-pad u-enter" style={{ padding: "22px 20px 0", position: "relative" }}>
            <h1 style={{ margin: 0, font: "900 34px/1.02 var(--font-latin)", letterSpacing: "-.02em", color: "#FFFFFF" }}>{m({ en: "My learning", fa: "آموزش من" })}</h1>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <div style={{ height: 30, padding: "0 12px", borderRadius: 999, background: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", font: "800 12px/1 var(--font-latin)", color: "#FFFFFF" }}>{m({ en: "Grade", fa: "صنف" })} {num(PLACED_GRADE)}</div>
              <div style={{ height: 30, padding: "0 12px", borderRadius: 999, background: "#FFB31A", display: "flex", alignItems: "center", gap: 5, font: "800 12px/1 var(--font-latin)", color: "#1C1433" }}><Icon n="star" s={14} c="#1C1433" f="#1C1433" />{num(school.stars)} {m({ en: "stars", fa: "ستاره" })}</div>
            </div>
          </div>
        </div>
        <div className="col desk-pad" style={{ margin: "-44px 0 0", padding: "0 16px 24px", position: "relative", display: "flex", flexDirection: "column", gap: 10, maxWidth: 720 }}>
          {rows.map((r, i) => (
            <Press key={r.to} ledge={4} className="u-enter" onClick={() => go(r.to)} style={{ ["--i" as string]: i + 1, background: "#FFFFFF", borderRadius: 22, boxShadow: "0 4px 0 #EFE6DA", padding: 14, display: "flex", alignItems: "center", gap: 12, textAlign: "start" } as React.CSSProperties}>
              <div style={{ width: 44, height: 48, borderRadius: "22px 22px 10px 10px", background: r.bg, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon n={r.icon} s={24} c={r.c} w={2.4} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: "800 17px/1.2 var(--font-latin)", color: "#1C1433" }}>{r.title}</div>
                <div style={{ font: "600 13px/1.4 var(--font-latin)", color: "#6F6A88" }}>{r.sub}</div>
              </div>
              <Icon n="next" s={20} c="#6F6A88" w={2.4} />
            </Press>
          ))}

          <div className="u-enter" style={{ ["--i" as string]: 5, background: "#FFFFFF", borderRadius: 22, padding: 14, display: "flex", flexDirection: "column", gap: 10, marginTop: 6 } as React.CSSProperties}>
            <div style={{ font: "800 15px/1 var(--font-latin)", color: "#1C1433" }}>{m({ en: "Language", fa: "زبان" })}</div>
            <Segmented<Lang> value={lang} onChange={setLang} options={[{ v: "fa", label: "دری", fa: true }, { v: "ps", label: "پښتو", fa: true, soon: m({ en: "Soon", fa: "به‌زودی" }) }, { v: "en", label: "English" }]} />
          </div>

          <div className="u-enter" style={{ ["--i" as string]: 6, background: "#E3F7F4", borderRadius: 22, padding: 14, display: "flex", gap: 12, alignItems: "flex-start" } as React.CSSProperties}>
            <Icon n="ondevice" s={22} c="#005F5B" w={2.4} />
            <div style={{ font: "600 14px/1.5 var(--font-latin)", color: "#005F5B" }}>{m({ en: "Everything here stays on this phone, locked. No account, no name, no internet: the app never connects.", fa: "همه چیز در همین گوشی و قفل‌شده می‌ماند. بدون حساب، بدون نام، بدون انترنت: این برنامه هرگز وصل نمی‌شود." })}</div>
          </div>

          <button className="press flat u-fade" onClick={() => setConfirm(true)} style={{ ["--i" as string]: 7, height: 48, font: "800 14px/1 var(--font-latin)", color: "#6F6A88", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 } as React.CSSProperties}>
            <Icon n="trash" s={18} c="#6F6A88" w={2.4} />{m({ en: "Clear everything on this phone", fa: "همه چیز را از این گوشی پاک کن" })}
          </button>
        </div>
      </div>
      {confirm && (
        <>
          <div className="scrim" onClick={() => setConfirm(false)} />
          <div className="sheet" role="dialog" aria-modal="true" style={{ padding: "14px 20px 26px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ width: 44, height: 5, borderRadius: 3, background: "#E6DCCD", alignSelf: "center" }} />
            <div style={{ font: "900 22px/1.2 var(--font-latin)", color: "#1C1433", marginTop: 8 }}>{m({ en: "Clear everything?", fa: "همه چیز پاک شود؟" })}</div>
            <div style={{ font: "500 15px/1.5 var(--font-latin)", color: "#4E4868" }}>{m({ en: "Your progress, questions, stars and everything behind any door will be gone from this phone. Books stay.", fa: "پیشرفت، سوال‌ها، ستاره‌ها و هر چه پشت هر دری است از این گوشی پاک می‌شود. کتاب‌ها می‌مانند." })}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn tone="outline" style={{ flex: 1 }} onClick={() => setConfirm(false)}>{m({ en: "Keep", fa: "بماند" })}</Btn>
              <Btn tone="ink" style={{ flex: 1 }} onClick={async () => { await wipeVault("school"); await wipeVault("voice"); location.reload(); }}>{m({ en: "Clear", fa: "پاک کن" })}</Btn>
            </div>
          </div>
        </>
      )}
    </Tabbed>
  );
}
