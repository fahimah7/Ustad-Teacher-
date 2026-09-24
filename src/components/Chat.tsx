import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "./Icon";
import { ActChip, IconBtn, LetterBadge, Press, Rich, Segmented, SourceChip, Thumb, UstadAvatar } from "./ui";
import { MicGlyph, Typing, Wave } from "./fx";
import { Figure } from "./Figure";
import { useApp, uid, type ChatMsg } from "../state/app";
import { ask, stripMd, type Intent, type Reply } from "../lib/tutor";
import { lessonById } from "../content/library";
import { isFull } from "../content/schema";
import { SUBJECTS } from "../content/subjects";
import { useLang, type Multi, SEP } from "../lib/i18n";
import { canRecognizeLocally, fmtDur, recognizeLocally, record, speak, type Recording } from "../lib/speech";

type Variant = "screen" | "panel";

/** Chat with Ustad (screens 02 and 03, and the desktop panel in W1/W2). */
export function Chat({ lessonId, variant = "screen", onBack, showContext = true, initial }: { lessonId: string; variant?: Variant; onBack?: () => void; showContext?: boolean; initial?: string }) {
  const { school, update } = useApp();
  const { m, t, lang } = useLang();
  const go = useNavigate();
  const lesson = lessonById(lessonId);
  const msgs = school.chats[lessonId] ?? [];
  const [thinking, setThinking] = useState(false);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const lastExplain = useRef<number | undefined | undefined>(undefined);
  const seen = useRef(new Set(msgs.map((x) => x.id)));

  // Other parts of the screen (lesson blocks, the dark tray) ask through here.
  const sendRef = useRef<(text: string, o?: { intent?: Intent }) => void>(() => {});
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ lessonId: string; text: string; intent?: Intent }>).detail;
      if (d.lessonId === lessonId) sendRef.current(d.text, { intent: d.intent });
    };
    window.addEventListener("ustad:ask", on);
    return () => window.removeEventListener("ustad:ask", on);
  }, [lessonId]);

  const sentInitial = useRef(false);
  useEffect(() => {
    if (initial && !sentInitial.current) { sentInitial.current = true; send(initial); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    // Wait a frame so the new message has laid out, then follow it down.
    const id = window.setTimeout(() => el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }), 60);
    return () => window.clearTimeout(id);
  }, [msgs.length, thinking]);

  const push = (msg: ChatMsg) => update((s) => ({ ...s, chats: { ...s.chats, [lessonId]: [...(s.chats[lessonId] ?? []), msg] } }));
  const patch = (id: string, fn: (x: ChatMsg) => ChatMsg) => update((s) => ({ ...s, chats: { ...s.chats, [lessonId]: (s.chats[lessonId] ?? []).map((x) => (x.id === id ? fn(x) : x)) } }));

  const send = async (text: string, opts: { intent?: Intent; voice?: { seconds: number; url?: string }; silent?: boolean } = {}) => {
    const q = text.trim();
    if (!q || thinking) return;
    if (!opts.silent) push({ id: uid(), from: "me", text: q, voice: opts.voice });
    setDraft("");
    setThinking(true);
    const reply = await ask(q, lessonId, { intent: opts.intent, lastExplain: lastExplain.current, lang });
    if (reply.kind === "answer" && reply.explainIndex !== undefined) lastExplain.current = reply.explainIndex;
    push({ id: uid(), from: "ustad", reply });
    setThinking(false);
    if (!opts.intent && !opts.silent) {
      update((s) => ({
        ...s,
        questions: [{ id: uid(), q, lessonId, answer: reply.kind === "answer" ? reply.text : undefined }, ...s.questions.filter((x) => x.q.toLowerCase() !== q.toLowerCase())].slice(0, 30),
      }));
    }
  };

  sendRef.current = send;

  const title = lesson ? `${m({ en: "Lesson", fa: "درس" })} ${lesson.unit.n}.${lesson.lesson.n}${SEP}${m(lesson.lesson.title)}${SEP}${m(SUBJECTS[lesson.subject].short)} ${lesson.grade}` : "";
  const isPanel = variant === "panel";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, background: "#FFF8EF" }}>
      {/* header */}
      <div style={{ background: "#FFFFFF", borderBottom: "2px solid #F3ECE2", flex: "none" }} className={isPanel ? undefined : "safe-top"}>
        <div style={{ height: isPanel ? 72 : 60, display: "flex", alignItems: "center", gap: isPanel ? 12 : 10, padding: isPanel ? "0 18px" : "0 12px 0 6px" }}>
          {!isPanel && <IconBtn n="back" label={t("back")} onClick={onBack ?? (() => go(-1))} />}
          <UstadAvatar w={isPanel ? 44 : 42} h={isPanel ? 48 : 46} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `900 ${isPanel ? 19 : 18}px/1.1 var(--font-latin)`, color: "#1C1433" }}>Ustad</div>
            <div style={{ font: `600 ${isPanel ? 13 : 12}px/1.4 var(--font-latin)`, color: "#6F6A88" }}>
              {isPanel && lesson ? m({ en: `In lesson ${lesson.unit.n}.${lesson.lesson.n} with you`, fa: `با تو در درس ${lesson.unit.n}.${lesson.lesson.n}` }) : m({ en: "Answers from your lessons", fa: "پاسخ از درس‌های تو" })}
            </div>
          </div>
          {isPanel ? (
            <div style={{ width: 150 }}>
              <Segmented value="chat" h={34} r={9} gap={4} onChange={(v) => v === "talk" && go(`/talk/${lessonId}`)} options={[{ v: "chat", label: m({ en: "Chat", fa: "چت" }) }, { v: "talk", label: m({ en: "Talk", fa: "گفتگو" }), icon: "wave" }]} />
            </div>
          ) : (
            <IconBtn n="wave" bg="#FFE3EA" c="#D81E57" w={2.6} label={m({ en: "Talk with Ustad", fa: "گفتگو با استاد" })} onClick={() => go(`/talk/${lessonId}`)} />
          )}
        </div>
      </div>

      {/* context bar */}
      {showContext && lesson && !isPanel && (
        <div style={{ padding: "10px 16px 0", flex: "none" }}>
          <div style={{ height: 42, borderRadius: 14, background: "#FFFFFF", border: "2px solid #EFE6DA", display: "flex", alignItems: "center", gap: 10, padding: "0 6px" }}>
            <Thumb subject={lesson.subject} grade={lesson.grade} w={26} h={32} r="9px 9px 4px 4px" />
            <div style={{ flex: 1, minWidth: 0, font: "700 13px/1 var(--font-latin)", color: "#1C1433", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
            <button className="press flat" onClick={() => go("/library")} style={{ font: "800 12px/1 var(--font-latin)", color: "#00827E", padding: "10px 6px" }}>{m({ en: "Change", fa: "تغییر" })}</button>
          </div>
        </div>
      )}

      {/* thread */}
      <div ref={listRef} className="vscroll" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 12, padding: isPanel ? 20 : "14px 16px" }} aria-live="polite">
        {msgs.length === 0 && !thinking && <Welcome lessonId={lessonId} onPick={(q) => send(q)} />}
        {msgs.map((msg) => {
          const fresh = !seen.current.has(msg.id);
          seen.current.add(msg.id);
          return msg.from === "me"
            ? <MeBubble key={msg.id} msg={msg} fresh={fresh} />
            : <UstadMsg key={msg.id} msg={msg} fresh={fresh} lessonId={lessonId} onPick={(i) => patch(msg.id, (x) => ({ ...x, picked: i }))} onAction={(intent, label) => send(label, { intent })} onShort={() => showShort(msg)} />;
        })}
        {thinking && <Typing className="u-enter" />}
      </div>

      <Composer
        draft={draft} setDraft={setDraft} disabled={thinking}
        placeholder={isPanel ? m({ en: "Ask about this lesson…", fa: "درباره این درس بپرس…" }) : m({ en: "Ask anything…", fa: "هر چه می‌خواهی بپرس…" })}
        onSend={(text, voice) => send(text, { voice })}
        chips={[
          { label: m({ en: "Explain this lesson", fa: "این درس را توضیح بده" }), intent: "explain" },
          { label: m({ en: "Give an example", fa: "یک مثال بده" }), intent: "example" },
          { label: m({ en: "Make flashcards", fa: "کارت بساز" }), intent: "flashcards" },
        ]}
        onChip={(label, intent) => send(label, { intent })}
        panel={isPanel}
      />
    </div>
  );

  function showShort(msg: ChatMsg) {
    if (msg.from !== "ustad" || msg.reply.kind !== "notHere" || !msg.reply.shortAnswer) return;
    const r = msg.reply;
    push({ id: uid(), from: "ustad", reply: { kind: "text", text: r.shortAnswer! } });
  }
}

function Welcome({ lessonId, onPick }: { lessonId: string; onPick: (q: string) => void }) {
  const { m } = useLang();
  const l = lessonById(lessonId);
  if (!l || !isFull(l)) return null;
  const qs = (l.explain ?? []).slice(0, 3).map((e) => e.q[0]);
  return (
    <div className="u-enter" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ background: "#FFFFFF", border: "2px solid #EFE6DA", borderRadius: 20, borderEndStartRadius: 6, padding: "14px 16px", font: "500 16px/1.5 var(--font-latin)", color: "#1C1433", boxShadow: "0 4px 0 #EFE6DA", maxWidth: 420 }}>
        {m({ en: `Salaam. Ask me anything about ${l.lesson.title.en.toLowerCase()}. I answer from your lesson, and I'll tell you when it doesn't say.`, fa: `سلام. هر چه درباره ${l.lesson.title.fa} می‌خواهی بپرس. از درس تو جواب می‌دهم و اگر درس چیزی نگفته باشد، می‌گویم.` })}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {qs.map((q, i) => (
          <Press key={q} flat onClick={() => onPick(q.charAt(0).toUpperCase() + q.slice(1) + "?")} className="u-enter" style={{ ["--i" as string]: i + 1, height: 40, padding: "0 14px", borderRadius: 12, background: "#DDF6F3", font: "800 13px/1 var(--font-latin)", color: "#005F5B" } as React.CSSProperties}>
            {q.charAt(0).toUpperCase() + q.slice(1)}?
          </Press>
        ))}
      </div>
    </div>
  );
}

function MeBubble({ msg, fresh }: { msg: Extract<ChatMsg, { from: "me" }>; fresh: boolean }) {
  const { m } = useLang();
  const audio = useRef<HTMLAudioElement | null>(null);
  if (msg.voice) {
    return (
      <div className={fresh ? "u-enter" : undefined} style={{ alignSelf: "flex-end", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, maxWidth: "85%" }}>
        <div style={{ background: "#00827E", borderRadius: 20, borderEndEndRadius: 6, padding: "10px 14px 10px 10px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 4px 0 #005F5B" }}>
          <button aria-label={m({ en: "Play", fa: "پخش" })} className="press flat" onClick={() => { if (msg.voice?.url) { audio.current ??= new Audio(msg.voice.url); audio.current.currentTime = 0; audio.current.play().catch(() => {}); } }} style={{ width: 36, height: 36, borderRadius: 18, background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            <Icon n="play" s={18} c="#00827E" f="#00827E" />
          </button>
          <Wave n={22} color="#FFFFFF" h={26} still={!fresh} />
          <div style={{ font: "800 13px/1 var(--font-latin)", color: "#DDF6F3" }}>{fmtDur(msg.voice.seconds)}</div>
        </div>
        <div style={{ font: "600 13px/1.4 var(--font-latin)", color: "#4E4868", maxWidth: 260, textAlign: "end" }}>"{msg.text}"</div>
      </div>
    );
  }
  return (
    <div className={fresh ? "u-enter" : undefined} style={{ alignSelf: "flex-end", maxWidth: "85%", background: "#00827E", color: "#FFFFFF", borderRadius: 20, borderEndEndRadius: 6, padding: "12px 16px", font: "700 16px/1.4 var(--font-latin)", boxShadow: "0 4px 0 #005F5B" }}>
      {msg.text}
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: "#FFFFFF", border: "2px solid #EFE6DA", borderRadius: 20, borderEndStartRadius: 6, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, boxShadow: "0 4px 0 #EFE6DA" };

function UstadMsg({ msg, fresh, lessonId, onPick, onAction, onShort }: { msg: Extract<ChatMsg, { from: "ustad" }>; fresh: boolean; lessonId: string; onPick: (i: number) => void; onAction: (intent: Intent, label: string) => void; onShort: () => void }) {
  const { m, lang } = useLang();
  const go = useNavigate();
  const r = msg.reply;
  const enter = fresh ? "u-enter" : undefined;
  const [speaking, setSpeaking] = useState(false);

  if (r.kind === "answer") {
    const listen = () => {
      if (speaking) { speechSynthesis.cancel(); setSpeaking(false); return; }
      const h = speak(stripMd(m(r.text)) + (r.example ? " " + m(r.example) : ""), { lang, onEnd: () => setSpeaking(false) });
      setSpeaking(!!h);
    };
    return (
      <>
        <div className={enter} style={cardStyle}>
          <div style={{ font: "500 16px/1.5 var(--font-latin)", color: "#1C1433" }}><Rich text={m(r.text)} /></div>
          {r.example && <div style={{ font: "500 15px/1.5 var(--font-latin)", color: "#4E4868" }}><Rich text={m(r.example)} /></div>}
          <SourceChip onClick={() => go(`/lesson/${r.source.lessonId}`)}>{m({ en: "From your lesson", fa: "از درس تو" })}{SEP}{m(r.source.label)}</SourceChip>
          <div className="hscroll" style={{ gap: 8 }}>
            <ActChip tone="vio" icon="shapes" onClick={() => onAction("showMe", m({ en: "Show me", fa: "نشانم بده" }))}>{m({ en: "Show me", fa: "نشانم بده" })}</ActChip>
            <ActChip tone="teal" icon="lines" onClick={() => onAction("simpler", m({ en: "Simpler, please", fa: "ساده‌تر لطفا" }))}>{m({ en: "Simpler", fa: "ساده‌تر" })}</ActChip>
            <ActChip tone="pom" icon={speaking ? "stop" : "speaker"} onClick={listen}>{speaking ? m({ en: "Stop", fa: "بس" }) : m({ en: "Listen", fa: "بشنو" })}</ActChip>
          </div>
        </div>
        {r.check && <QuickCheck check={r.check} picked={msg.picked} onPick={onPick} fresh={fresh} />}
      </>
    );
  }

  if (r.kind === "notHere") {
    const e = r.elsewhere;
    return (
      <>
        <div className={enter} style={cardStyle}>
          <div style={{ display: "inline-flex", alignSelf: "flex-start", alignItems: "center", gap: 6, height: 28, padding: "0 10px", borderRadius: 999, border: "2px dashed #FFB31A", font: "800 12px/1 var(--font-latin)", color: "#7A4E00" }}>
            <Icon n="info" s={15} c="#7A4E00" w={2.4} />{m({ en: "Not in this lesson", fa: "در این درس نیست" })}
          </div>
          <div style={{ font: "500 16px/1.5 var(--font-latin)", color: "#1C1433" }}>
            {m({ en: "This lesson doesn't cover that. I can give you a short answer, or find it in another lesson.", fa: "این درس به آن نپرداخته. می‌توانم جواب کوتاهی بدهم، یا آن را در درس دیگری پیدا کنم." })}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Press ledge={4} disabled={!r.shortAnswer} onClick={onShort} style={{ flex: 1, height: 48, borderRadius: 14, background: "#00827E", boxShadow: "0 4px 0 #005F5B", display: "flex", alignItems: "center", justifyContent: "center", font: "800 15px/1 var(--font-latin)", color: "#FFFFFF" }}>{m({ en: "Short answer", fa: "جواب کوتاه" })}</Press>
            <Press ledge={4} onClick={() => go(`/search?q=${encodeURIComponent(r.question)}`)} style={{ flex: 1, height: 48, borderRadius: 14, background: "#FFFFFF", border: "3px solid #EFE6DA", boxShadow: "0 4px 0 #EFE6DA", display: "flex", alignItems: "center", justifyContent: "center", font: "800 15px/1 var(--font-latin)", color: "#00827E" }}>{m({ en: "Find a lesson", fa: "درس پیدا کن" })}</Press>
          </div>
        </div>
        {e && (
          <div className={fresh ? "u-enter" : undefined} style={{ ["--i" as string]: 2, background: "#FFFFFF", border: "2px solid #EFE6DA", borderRadius: 20, padding: 12, display: "flex", gap: 12, alignItems: "center", boxShadow: "0 4px 0 #EFE6DA" } as React.CSSProperties}>
            <Thumb subject={e.subject as keyof typeof SUBJECTS} grade={e.grade} w={52} h={64} r="14px 14px 6px 6px" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="eyebrow" style={{ letterSpacing: ".08em", color: "#6F6A88" }}>{m({ en: "Found in another lesson", fa: "در درس دیگری پیدا شد" })}</div>
              <div style={{ font: "800 16px/1.3 var(--font-latin)", color: "#1C1433", marginTop: 4 }}>{m(e.label)}</div>
              <div style={{ font: "600 13px/1.4 var(--font-latin)", color: "#6F6A88" }}>{m(e.snippet)}</div>
            </div>
            {e.onPhone ? (
              <Press flat onClick={() => go(`/lesson/${e.id}`)} style={{ height: 36, padding: "0 12px", borderRadius: 12, background: "#DDF6F3", display: "flex", alignItems: "center", gap: 6, font: "800 13px/1 var(--font-latin)", color: "#005F5B" }}>{m({ en: "Open", fa: "باز کن" })}</Press>
            ) : (
              <Press flat onClick={() => go("/packs")} style={{ height: 36, padding: "0 12px", borderRadius: 12, background: "#FFF1CC", display: "flex", alignItems: "center", gap: 6, font: "800 13px/1 var(--font-latin)", color: "#7A4E00" }}><Icon n="download" s={16} c="#7A4E00" w={2.4} />{m({ en: "Get", fa: "بگیر" })}</Press>
            )}
          </div>
        )}
      </>
    );
  }

  if (r.kind === "cards") return <Flashcards cards={r.cards} fresh={fresh} label={m(r.source.label)} />;

  // plain text (short answers, "show me" figure)
  const l = lessonById(lessonId);
  const fig = r.kind === "text" && l && isFull(l) ? l.blocks.find((b) => b.type === "figure") : undefined;
  return (
    <div className={enter} style={cardStyle}>
      <div style={{ font: "500 16px/1.5 var(--font-latin)", color: "#1C1433" }}><Rich text={m(r.text)} /></div>
      {fig && fig.type === "figure" && r.source && <div style={{ padding: "6px 0" }}><Figure spec={fig.spec} /></div>}
      {r.source && <SourceChip>{m({ en: "From your lesson", fa: "از درس تو" })}{SEP}{m(r.source.label)}</SourceChip>}
    </div>
  );
}

function QuickCheck({ check, picked, onPick, fresh }: { check: NonNullable<Extract<Reply, { kind: "answer" }>["check"]>; picked?: number; onPick: (i: number) => void; fresh: boolean }) {
  const { m, t } = useLang();
  const done = picked !== undefined;
  const right = picked === check.answer;
  return (
    <div className={fresh ? "u-enter" : undefined} style={{ ["--i" as string]: 2, background: "#7443F0", borderRadius: 20, borderEndStartRadius: 6, padding: "14px 16px", boxShadow: "0 5px 0 #4F24B8", display: "flex", flexDirection: "column", gap: 10, position: "relative" } as React.CSSProperties}>
      <div className="eyebrow" style={{ color: "#E4DBFF" }}>{m({ en: "Quick check", fa: "یک امتحان کوتاه" })}</div>
      <div style={{ font: "800 17px/1.35 var(--font-latin)", color: "#FFFFFF", maxWidth: 250 }}>{m(check.question)}</div>
      <div style={{ display: "flex", gap: 10 }}>
        {check.options.map((o, i) => {
          const isRight = done && i === check.answer && right;
          const quiet = done && i === picked && !right;
          return (
            <button key={i} disabled={done && right} onClick={() => onPick(i)} className="press flat locked" style={{ flex: 1, height: 48, borderRadius: 14, background: isRight ? "#1F8F3F" : quiet ? "#F3ECE2" : "rgba(255,255,255,.16)", boxShadow: isRight ? "0 4px 0 #146B2D" : undefined, display: "flex", alignItems: "center", gap: 8, padding: "0 10px", font: "800 15px/1 var(--font-latin)", color: quiet ? "#4E4868" : "#FFFFFF", transition: "background-color 200ms", animation: isRight ? "uCorrect 360ms var(--ease-pop)" : undefined }}>
              {isRight ? <Icon n="check" s={22} c="#FFFFFF" w={3} style={{ animation: "uCheck 360ms var(--ease-pop)" }} /> : <LetterBadge i={i} w={26} h={28} fs={13} />}
              <span style={{ textAlign: "start" }}>{m(o)}</span>
            </button>
          );
        })}
      </div>
      {done && !right && <div className="u-fade" style={{ font: "700 13px/1.4 var(--font-latin)", color: "#E4DBFF" }}>{t("notThisOne")}{SEP}{m({ en: "try the other one", fa: "آن دیگر را امتحان کن" })}</div>}
      {right && (
        <div className="u-pop" style={{ position: "absolute", insetInlineEnd: 12, top: 10, height: 34, padding: "0 12px", borderRadius: 999, background: "#FFB31A", boxShadow: "0 3px 0 #C98300", display: "flex", alignItems: "center", gap: 6, font: "900 15px/1 var(--font-latin)", color: "#1C1433" }}>
          <Icon n="star" s={18} c="#1C1433" f="#1C1433" />{t("afarin")}
        </div>
      )}
    </div>
  );
}

function Flashcards({ cards, fresh, label }: { cards: { front: Multi; back: Multi }[]; fresh: boolean; label: string }) {
  const { m } = useLang();
  const [flip, setFlip] = useState<Record<number, boolean>>({});
  return (
    <div className={fresh ? "u-enter" : undefined} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="hscroll" style={{ gap: 10, paddingBottom: 6 }}>
        {cards.map((c, i) => (
          <button key={i} onClick={() => setFlip((f) => ({ ...f, [i]: !f[i] }))} className="press" style={{ ["--lh" as string]: "5px", flex: "none", width: 200, minHeight: 130, borderRadius: 22, padding: 16, background: flip[i] ? "#FFFFFF" : "#FFB31A", boxShadow: flip[i] ? "0 5px 0 #EFE6DA" : "0 5px 0 #C98300", border: flip[i] ? "2px solid #EFE6DA" : "0", display: "flex", flexDirection: "column", justifyContent: "space-between", textAlign: "start", animation: fresh ? `uTileIn 420ms var(--ease-pop) ${i * 90}ms backwards` : undefined } as React.CSSProperties}>
            <div className="eyebrow" style={{ color: flip[i] ? "#6F6A88" : "#7A4E00" }}>{flip[i] ? m({ en: "Meaning", fa: "معنا" }) : m({ en: "Term", fa: "واژه" })}{SEP}{i + 1}/{cards.length}</div>
            <div style={{ font: flip[i] ? "600 14px/1.45 var(--font-latin)" : "900 22px/1.15 var(--font-latin)", color: "#1C1433" }}>{m(flip[i] ? c.back : c.front)}</div>
          </button>
        ))}
      </div>
      <SourceChip>{m({ en: "From your lesson", fa: "از درس تو" })}{SEP}{label}</SourceChip>
    </div>
  );
}

/* ── composer: suggestion chips, input, pulsing mic ─────────────── */

export function Composer({ draft, setDraft, onSend, chips, onChip, disabled, placeholder, panel }: {
  draft: string; setDraft: (s: string) => void; onSend: (text: string, voice?: { seconds: number; url?: string }) => void;
  chips: { label: string; intent: Intent }[]; onChip: (label: string, intent: Intent) => void; disabled?: boolean; placeholder: string; panel?: boolean;
}) {
  const { m, lang } = useLang();
  const [rec, setRec] = useState<null | { r: Recording; started: number; heard: string; local: boolean }>(null);
  const [level, setLevel] = useState(0);
  const [secs, setSecs] = useState(0);
  const [pendingVoice, setPendingVoice] = useState<null | { seconds: number; url: string }>(null);
  const [hint, setHint] = useState("");
  const recog = useRef<{ stop(): void } | null>(null);
  const downAt = useRef(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!rec) return;
    let raf = 0;
    const tick = () => { setLevel(rec.r.level()); setSecs((performance.now() - rec.started) / 1000); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [rec]);

  const startRec = async () => {
    if (rec || disabled) return;
    const r = await record();
    if (!r) { setHint(m({ en: "The microphone isn't available. You can type instead.", fa: "میکروفون در دسترس نیست. می‌توانی بنویسی." })); input.current?.focus(); return; }
    const local = await canRecognizeLocally(lang);
    const state = { r, started: performance.now(), heard: "", local };
    setRec(state);
    if (local) recog.current = recognizeLocally(lang, (text) => setRec((cur) => (cur ? { ...cur, heard: text } : cur)));
  };

  const finish = async (sendIt: boolean) => {
    if (!rec) return;
    const cur = rec;
    setRec(null);
    recog.current?.stop();
    recog.current = null;
    if (!sendIt) { cur.r.cancel(); return; }
    const { blob, seconds } = await cur.r.stop();
    const url = URL.createObjectURL(blob);
    if (cur.heard) onSend(cur.heard, { seconds, url });
    else {
      // No on-device recogniser: keep the note, and let her write what she asked.
      setPendingVoice({ seconds, url });
      setHint(m({ en: "Your voice note is saved. Write what you asked, then send.", fa: "یادداشت صوتی ذخیره شد. سوالت را بنویس و بفرست." }));
      setTimeout(() => input.current?.focus(), 50);
    }
  };

  const submit = () => {
    if (!draft.trim()) return;
    onSend(draft, pendingVoice ?? undefined);
    setPendingVoice(null);
    setHint("");
  };

  if (rec) {
    return (
      <div className="u-fade" style={{ flex: "none", background: "#D81E57", padding: "14px 16px calc(20px + var(--safe-bottom))", display: "flex", alignItems: "center", gap: 14 }}>
        <IconBtn n="close" bg="rgba(255,255,255,.18)" c="#FFFFFF" s={22} w={2.6} label={m({ en: "Cancel", fa: "لغو" })} onClick={() => finish(false)} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ font: "800 14px/1 var(--font-latin)", color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {rec.heard ? `"${rec.heard}"` : `${m({ en: "Listening…", fa: "گوش می‌دهم…" })} ${fmtDur(secs)}`}
          </div>
          <div style={{ overflow: "hidden" }}><Wave n={26} color="#FFFFFF" h={30} level={level > 0.04 ? 0.25 + level : undefined} /></div>
        </div>
        <Press aria-label={m({ en: "Send", fa: "بفرست" })} onPointerUp={() => finish(true)} style={{ width: 60, height: 60, borderRadius: 30, background: "#FFFFFF", boxShadow: "0 5px 0 #9A1240", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <Icon n="send" s={26} c="#D81E57" w={2.4} />
        </Press>
      </div>
    );
  }

  return (
    <div style={{ flex: "none", background: "#FFFFFF", borderTop: "2px solid #F3ECE2", padding: panel ? "14px 18px 18px" : "10px 12px calc(18px + var(--safe-bottom))", display: "flex", flexDirection: "column", gap: 10 }}>
      {hint && <div className="u-fade" style={{ font: "700 13px/1.4 var(--font-latin)", color: "#7A4E00", display: "flex", alignItems: "center", gap: 6 }}><Icon n={pendingVoice ? "mic" : "info"} s={16} c="#7A4E00" w={2.4} />{hint}</div>}
      <div className="hscroll" style={{ gap: 8 }}>
        {chips.map((c) => (
          <Press key={c.label} flat disabled={disabled} onClick={() => onChip(c.label, c.intent)} style={{ flex: "none", height: 36, padding: "0 12px", borderRadius: 12, border: "2px solid #EFE6DA", display: "flex", alignItems: "center", font: "700 13px/1 var(--font-latin)", color: "#1C1433", background: "#FFFFFF" }}>{c.label}</Press>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <label style={{ flex: 1, height: panel ? 54 : 52, borderRadius: 18, background: "#F7F1E8", border: "2px solid #EFE6DA", display: "flex", alignItems: "center", padding: "0 16px" }}>
          <span className="sr">{placeholder}</span>
          <input ref={input} className="plain-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} style={{ font: "600 16px/1 var(--font-latin)" }} enterKeyHint="send" />
        </label>
        {draft.trim() ? (
          <Press type="submit" aria-label={m({ en: "Send", fa: "بفرست" })} disabled={disabled} style={{ width: 52, height: 52, borderRadius: 26, background: "#D81E57", boxShadow: "0 5px 0 #9A1240", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            <Icon n="send" s={24} c="#FFFFFF" w={2.4} />
          </Press>
        ) : (
          <MicButton size={52} label={m({ en: "Hold to talk, or tap", fa: "نگه دار و بگو، یا بزن" })}
            onDown={() => { downAt.current = performance.now(); startRec(); }}
            onUp={() => { if (performance.now() - downAt.current > 400) finish(true); }} />
        )}
      </form>
    </div>
  );
}

/** Pomegranate mic that pulses (qPulse, 1.6 s). Hold to talk, or tap once and tap send. */
export function MicButton({ size, onDown, onUp, label, style }: { size: number; onDown: () => void; onUp?: () => void; label: string; style?: React.CSSProperties }) {
  return (
    <button type="button" aria-label={label} title={label} className="press"
      onPointerDown={(e) => { e.preventDefault(); onDown(); }} onPointerUp={onUp} onContextMenu={(e) => e.preventDefault()}
      style={{ ["--lh" as string]: "5px", width: size, height: size, borderRadius: size / 2, background: "#D81E57", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", animation: "qPulse 1.6s ease-out infinite", touchAction: "none", ...style } as React.CSSProperties}>
      <MicGlyph s={size * 0.48} />
    </button>
  );
}

/** Ask the Ustad panel from anywhere on the page (desktop). */
export function askPanel(lessonId: string, text: string, intent?: Intent) {
  window.dispatchEvent(new CustomEvent("ustad:ask", { detail: { lessonId, text, intent } }));
}

export function useChatLesson() {
  const { school } = useApp();
  return useMemo(() => school.reading, [school.reading]);
}
