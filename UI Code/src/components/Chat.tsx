import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "./Icon";
import { ActChip, IconBtn, LetterBadge, Press, Segmented, SourceChip, Thumb, UstadAvatar } from "./ui";
import { MicGlyph, Typing, Wave } from "./fx";
import { MathText, isRtlText } from "./MathText";
import { FigureCrop } from "./FigureCrop";
import { useApp, uid, type ChatMsg } from "../state/app";
import { askTeacher, flashcards, historyOnThisPage, pageLabel, plainText, questionFor, quickCheck, showMe, suggestionsFor, useTutorStatus, type Intent, type Reply, type TeacherLang } from "../lib/tutor";
import { bookById, lessonById, lessonForPage } from "../content/library";
import { SUBJECTS } from "../content/subjects";
import { useLang, SEP } from "../lib/i18n";
import { canRecognizeLocally, fmtDur, recognizeLocally, record, speak, type Recording } from "../lib/speech";

type Variant = "screen" | "panel";

const LOCAL: Intent[] = ["flashcards", "showMe", "quiz"];

/** Books whose earlier conversation she has already chosen to continue or put away since the app
 *  opened. Memory only: every time the app starts, she is asked again. */
const chosen = new Set<string>();
const fa = (s: string) => /[؀-ۿ]/.test(s);

/** Where Ustad is looking: the book of a lesson and the page of it in view. */
function useLooking(lessonId: string) {
  const { school } = useApp();
  return useMemo(() => {
    const lesson = lessonById(lessonId);
    const book = lesson ? bookById(lesson.bookId) : undefined;
    if (!lesson || !book?.text) return null;
    const page = school.pages[book.id] ?? lesson.pdf.start;
    return { book, page, lesson: lessonForPage(book, page) ?? lesson };
  }, [lessonId, school.pages]);
}

/** Chat with Ustad (screens 02 and 03, and the desktop panel beside the book). Every question is
 *  asked about the page in view. */
export function Chat({ lessonId, variant = "screen", onBack, showContext = true, initial, initialIntent }: { lessonId: string; variant?: Variant; onBack?: () => void; showContext?: boolean; initial?: string; initialIntent?: Intent }) {
  const { school, update, name } = useApp();
  const { m, t, lang, num } = useLang();
  const go = useNavigate();
  const here = useLooking(lessonId);
  const status = useTutorStatus();
  const bookId = here?.book.id ?? "";
  const page = here?.page ?? 1;
  const msgs = useMemo(() => (bookId ? school.chats[bookId] ?? [] : []), [bookId, school.chats]);
  const [live, setLive] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);
  const seen = useRef(new Set(msgs.map((x) => x.id)));
  const checks = useRef(0);
  const busy = live !== null;
  const ready = status.state === "ready";
  const [, rechoose] = useState(0);
  const choosing = !!bookId && msgs.some((x) => x.from !== "page") && !chosen.has(bookId) && !initial;
  const choose = (keep: boolean) => {
    chosen.add(bookId);
    if (!keep) update((s) => ({ ...s, chats: { ...s.chats, [bookId]: [] } }));
    rechoose((n) => n + 1);
  };

  // Other parts of the screen (the book, the dark tray) ask through here.
  const sendRef = useRef<(text: string, o?: { intent?: Intent }) => void>(() => {});
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ bookId: string; text: string; intent?: Intent }>).detail;
      if (d.bookId === bookId) sendRef.current(d.text, { intent: d.intent });
    };
    window.addEventListener("ustad:ask", on);
    return () => window.removeEventListener("ustad:ask", on);
  }, [bookId]);

  // A question passed in the address (from the Ask hub or search) is asked once the teacher is ready.
  const sentInitial = useRef(false);
  useEffect(() => {
    if (!initial || sentInitial.current || !here) return;
    if (!ready && !LOCAL.includes(initialIntent ?? "ask")) return;
    sentInitial.current = true;
    send(initial, { intent: initialIntent });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, ready, here]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const id = window.setTimeout(() => el.scrollTo({ top: el.scrollHeight, behavior: busy ? "auto" : "smooth" }), 40);
    return () => window.clearTimeout(id);
  }, [msgs.length, live, busy]);

  useEffect(() => () => abort.current?.abort(), []);

  const push = (...add: ChatMsg[]) => update((s) => ({ ...s, chats: { ...s.chats, [bookId]: [...(s.chats[bookId] ?? []), ...add].slice(-80) } }));
  const patch = (id: string, fn: (x: ChatMsg) => ChatMsg) => update((s) => ({ ...s, chats: { ...s.chats, [bookId]: (s.chats[bookId] ?? []).map((x) => (x.id === id ? fn(x) : x)) } }));

  const send = async (text: string, opts: { intent?: Intent; voice?: { seconds: number; url?: string } } = {}) => {
    const q = text.trim();
    if (!q || busy || !here) return;
    chosen.add(bookId);
    const intent = opts.intent ?? "ask";
    setDraft("");

    // Mark in the conversation when she asks about another page than last time.
    const lastAsked = [...msgs].reverse().find((x) => x.from === "me" || x.from === "page");
    const lastPage = lastAsked ? (lastAsked.from === "page" ? lastAsked.page : lastAsked.page) : undefined;
    const moved = lastPage !== undefined && lastPage !== page;
    const before: ChatMsg[] = moved ? [{ id: uid(), from: "page", page }] : [];
    const mine: ChatMsg = { id: uid(), from: "me", text: q, page, voice: opts.voice };

    if (LOCAL.includes(intent)) {
      const reply = intent === "flashcards" ? flashcards(bookId, page) : intent === "showMe" ? showMe(bookId, page) : quickCheck(bookId, page, checks.current++);
      push(...before, mine, { id: uid(), from: "ustad", reply, page });
      return;
    }
    if (!ready) return;

    push(...before, mine);
    const history = moved ? [] : historyOnThisPage(msgs);
    const question = intent === "ask" ? q : questionFor(intent, lang);
    const ctrl = new AbortController();
    abort.current = ctrl;
    setLive("");
    const reply = await askTeacher({ bookId, page, question, history, lang, name, onText: (tx) => setLive(tx), signal: ctrl.signal });
    abort.current = null;
    setLive(null);
    push({ id: uid(), from: "ustad", reply, page });
    if (intent === "ask" && !reply.failed) {
      update((s) => ({
        ...s,
        questions: [{ id: uid(), q, lessonId: here.lesson.id, page, answer: reply.text }, ...s.questions.filter((x) => x.q.toLowerCase() !== q.toLowerCase())].slice(0, 30),
      }));
    }
  };
  sendRef.current = send;

  const isPanel = variant === "panel";
  const where = here ? `${m(SUBJECTS[here.book.subject].short)} ${num(here.book.grade)}${SEP}${m({ en: "Chapter", fa: "فصل" })} ${num(here.lesson.unit.n)}${SEP}${pageLabel(bookId, page, lang)}` : "";
  const statusLine = !here
    ? m({ en: "Open a book to begin", fa: "برای شروع یک کتاب را باز کنید" })
    : status.state === "ready"
      ? m({ en: `Looking at ${pageLabel(bookId, page, "en", true)} with you`, fa: `${pageLabel(bookId, page, "fa")} را با شما می‌بینم` })
      : status.state === "starting"
        ? m({ en: "Getting ready… (loading the teacher model)", fa: "آماده می‌شوم… (مدل معلم بار می‌شود)" })
        : status.state === "unavailable"
          ? m({ en: "The teacher model isn't on this device", fa: "مدل معلم در این دستگاه نیست" })
          : m({ en: "The teacher stopped. Restarting…", fa: "معلم متوقف شد. دوباره شروع می‌شود…" });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, background: "#FFF8EF" }}>
      {/* header */}
      <div style={{ background: "#FFFFFF", borderBottom: "2px solid #F3ECE2", flex: "none" }} className={isPanel ? undefined : "safe-top"}>
        <div style={{ height: isPanel ? 72 : 60, display: "flex", alignItems: "center", gap: isPanel ? 12 : 10, padding: isPanel ? "0 18px" : "0 12px 0 6px" }}>
          {!isPanel && <IconBtn n="back" label={t("back")} onClick={onBack ?? (() => go(-1))} />}
          <UstadAvatar w={isPanel ? 44 : 42} h={isPanel ? 48 : 46} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `900 ${isPanel ? 19 : 18}px/1.1 var(--font-latin)`, color: "#1C1433" }}>{m({ en: "Ustad", fa: "استاد" })}</div>
            <div title={status.message} style={{ font: `600 ${isPanel ? 13 : 12}px/1.4 var(--font-latin)`, color: status.state === "ready" || !here ? "#6F6A88" : "#9A5B00", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {here && status.state !== "ready" && <span style={{ width: 8, height: 8, borderRadius: 4, background: "#FFB31A", flex: "none", animation: "qTwinkle 1.2s ease-in-out infinite" }} />}
              {statusLine}
            </div>
          </div>
          {isPanel ? (
            <div style={{ width: 150 }}>
              <Segmented value="chat" h={34} r={9} gap={4} onChange={(v) => v === "talk" && here && go(`/talk/${here.lesson.id}`)} options={[{ v: "chat", label: m({ en: "Chat", fa: "چت" }) }, { v: "talk", label: m({ en: "Talk", fa: "گفتگو" }), icon: "wave" }]} />
            </div>
          ) : (
            here && <IconBtn n="wave" bg="#FFE3EA" c="#D81E57" w={2.6} label={m({ en: "Talk with Ustad", fa: "گفتگو با استاد" })} onClick={() => go(`/talk/${here.lesson.id}`)} />
          )}
        </div>
      </div>

      {/* context bar */}
      {showContext && here && !isPanel && (
        <div style={{ padding: "10px 16px 0", flex: "none" }}>
          <div style={{ height: 42, borderRadius: 14, background: "#FFFFFF", border: "2px solid #EFE6DA", display: "flex", alignItems: "center", gap: 10, padding: "0 6px" }}>
            <Thumb subject={here.book.subject} grade={here.book.grade} w={26} h={32} r="9px 9px 4px 4px" />
            <div style={{ flex: 1, minWidth: 0, font: "700 13px/1 var(--font-latin)", color: "#1C1433", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{where}</div>
            <button className="press flat" onClick={() => go(`/lesson/${here.lesson.id}?page=${page}`)} style={{ font: "800 12px/1 var(--font-latin)", color: "#00827E", padding: "10px 6px" }}>{m({ en: "Open page", fa: "باز کردن صفحه" })}</button>
          </div>
        </div>
      )}

      {/* thread */}
      <div ref={listRef} className="vscroll" style={{ flex: 1, minHeight: 0, overflowX: "hidden", display: "flex", flexDirection: "column", gap: 12, padding: isPanel ? 20 : "14px 16px" }} aria-live="polite">
        {msgs.length === 0 && !busy && here && <Welcome bookId={bookId} page={page} name={name} onPick={(q) => send(q)} ready={ready} />}
        {!here && <Empty />}
        {choosing && here && <ResumeChoice bookId={bookId} msgs={msgs} onChoose={choose} />}
        {!choosing && msgs.map((msg) => {
          const fresh = !seen.current.has(msg.id);
          seen.current.add(msg.id);
          if (msg.from === "page") return <PageDivider key={msg.id} label={pageLabel(bookId, msg.page, lang)} />;
          if (msg.from === "me") return <MeBubble key={msg.id} msg={msg} fresh={fresh} />;
          return <UstadMsg key={msg.id} msg={msg} fresh={fresh} bookId={bookId} onPick={(i) => patch(msg.id, (x) => ({ ...x, picked: i }))} onAction={(intent, label) => send(label, { intent })} canAsk={ready && !busy} />;
        })}
        {busy && (live ? <TeacherCard text={live} lang={lang === "en" ? "en" : "fa"} streaming /> : <Typing className="u-enter" />)}
      </div>

      <Composer
        draft={draft} setDraft={setDraft} disabled={busy || !here} canSend={ready} busy={busy} onStop={() => abort.current?.abort()}
        placeholder={here ? m({ en: `Ask about ${pageLabel(bookId, page, "en", true)}…`, fa: `دربارهٔ ${pageLabel(bookId, page, "fa")} بپرسید…` }) : m({ en: "Ask anything…", fa: "هر چه می‌خواهید بپرسید…" })}
        onSend={(text, voice) => send(text, { voice })}
        chips={[
          { label: m({ en: "Explain this page", fa: "این صفحه را توضیح بده" }), intent: "explain" },
          { label: m({ en: "Solve an example", fa: "یک مثال را حل کن" }), intent: "example" },
          { label: m({ en: "Flashcards", fa: "کارت‌ها" }), intent: "flashcards" },
          { label: m({ en: "Quiz me", fa: "امتحانم کن" }), intent: "quiz" },
        ]}
        onChip={(label, intent) => send(label, { intent })}
        panel={isPanel}
      />
    </div>
  );
}

function Empty() {
  const { m } = useLang();
  const go = useNavigate();
  return (
    <div className="u-enter" style={{ background: "#FFFFFF", border: "2px dashed #D9CDBB", borderRadius: 20, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ font: "600 15px/1.5 var(--font-latin)", color: "#4E4868" }}>{m({ en: "Open a book and I'll read it with you, page by page.", fa: "یک کتاب را باز کنید تا صفحه به صفحه با شما بخوانم." })}</div>
      <Press flat onClick={() => go("/library")} style={{ alignSelf: "flex-start", height: 40, padding: "0 14px", borderRadius: 12, background: "#DDF6F3", font: "800 13px/1 var(--font-latin)", color: "#005F5B" }}>{m({ en: "Open the library", fa: "باز کردن کتابخانه" })}</Press>
    </div>
  );
}

function Welcome({ bookId, page, name, onPick, ready }: { bookId: string; page: number; name: string; onPick: (q: string) => void; ready: boolean }) {
  const { m, lang } = useLang();
  const qs = suggestionsFor(bookId, page);
  return (
    <div className="u-enter" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ ...cardStyle, maxWidth: 440, font: fa(m({ en: "", fa: "ا" })) ? "500 16px/1.7 var(--font-rtl)" : "500 16px/1.5 var(--font-latin)" }}>
        {m({
          en: `Salaam${name ? ", " + name : ""}. I'm reading ${pageLabel(bookId, page, "en", true)} with you. Ask me anything on it: I can explain it, solve its examples and exercises, or find where the book teaches something else.`,
          fa: `سلام${name ? " " + name + " جان" : ""}. من ${pageLabel(bookId, page, "fa")} را با شما می‌خوانم. هر سوالی دربارهٔ آن دارید بپرسید: توضیح می‌دهم، مثال‌ها و تمرین‌هایش را حل می‌کنم، یا پیدا می‌کنم که کتاب موضوع دیگری را کجا درس داده است.`,
        })}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {qs.map((s, i) => (
          <Press key={i} flat disabled={!ready} onClick={() => onPick(m(s.q))} className="u-enter" style={{ ["--i" as string]: i + 1, minHeight: 40, padding: "8px 14px", borderRadius: 12, background: "#DDF6F3", font: lang === "en" ? "800 13px/1.3 var(--font-latin)" : "800 14px/1.5 var(--font-rtl)", color: "#005F5B" } as React.CSSProperties}>
            {m(s.q)}
          </Press>
        ))}
      </div>
    </div>
  );
}

/** When the app opens again and this book has an earlier conversation: carry on, or start fresh. */
function ResumeChoice({ bookId, msgs, onChoose }: { bookId: string; msgs: ChatMsg[]; onChoose: (keep: boolean) => void }) {
  const { m, lang, num } = useLang();
  const book = bookById(bookId);
  const last = [...msgs].reverse().find((x) => x.from === "me") as Extract<ChatMsg, { from: "me" }> | undefined;
  const asked = msgs.filter((x) => x.from === "me").length;
  const where = last?.page != null ? pageLabel(bookId, last.page, lang, true) : "";
  const title = book?.title ? m(book.title) : "";
  const btn: React.CSSProperties = { flex: 1, minHeight: 48, padding: "8px 14px", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, font: lang === "en" ? "800 15px/1.2 var(--font-latin)" : "800 15px/1.4 var(--font-rtl)" };
  return (
    <div className="u-enter" role="group" aria-label={m({ en: "Your earlier conversation", fa: "گفتگوی قبلی شما" })} style={{ ...cardStyle, gap: 12 }}>
      <div style={{ font: lang === "en" ? "900 18px/1.3 var(--font-latin)" : "900 18px/1.6 var(--font-rtl)", color: "#1C1433" }}>{m({ en: "Welcome back!", fa: "دوباره خوش آمدید!" })}</div>
      <div style={{ font: lang === "en" ? "500 15px/1.55 var(--font-latin)" : "500 15.5px/1.85 var(--font-rtl)", color: "#4E4868" }}>
        {m({
          en: `Last time we talked about ${title}${where ? `, on ${where}` : ""} (${asked} ${asked === 1 ? "question" : "questions"}). Do you want to continue that conversation, or start a new one?`,
          fa: `دفعهٔ گذشته دربارهٔ ${title}${where ? `، در ${where}` : ""} صحبت کردیم (${num(asked)} سوال). می‌خواهید همان گفتگو را ادامه بدهید یا یک گفتگوی تازه شروع کنید؟`,
        })}
      </div>
      {last && (
        <div dir="auto" style={{ background: "#F7F1E8", borderRadius: 12, padding: "8px 12px", font: /[؀-ۿ]/.test(last.text) ? "600 14px/1.7 var(--font-rtl)" : "600 14px/1.5 var(--font-latin)", color: "#4E4868", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {isRtlText(last.text) ? `«${last.text}»` : `“${last.text}”`}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Press ledge={4} onClick={() => onChoose(true)} style={{ ...btn, background: "#00827E", boxShadow: "0 4px 0 #005F5B", color: "#FFFFFF" }}>
          <Icon n="arrow" s={18} c="#FFFFFF" w={2.6} />{m({ en: "Continue our chat", fa: "ادامهٔ گفتگو" })}
        </Press>
        <Press ledge={4} onClick={() => onChoose(false)} style={{ ...btn, background: "#FFFFFF", border: "2px solid #EFE6DA", boxShadow: "0 4px 0 #EFE6DA", color: "#1C1433" }}>
          <Icon n="plus" s={18} c="#1C1433" w={2.6} />{m({ en: "Start a new chat", fa: "گفتگوی تازه" })}
        </Press>
      </div>
    </div>
  );
}

function PageDivider({ label }: { label: string }) {
  return (
    <div role="separator" style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0" }}>
      <div style={{ flex: 1, height: 2, background: "#EFE6DA" }} />
      <div style={{ height: 26, padding: "0 12px", borderRadius: 999, background: "#F3ECE2", display: "flex", alignItems: "center", gap: 6, font: "800 12px/1 var(--font-rtl)", color: "#6F6A88" }}><Icon n="book" s={14} c="#6F6A88" w={2.4} />{label}</div>
      <div style={{ flex: 1, height: 2, background: "#EFE6DA" }} />
    </div>
  );
}

function MeBubble({ msg, fresh }: { msg: Extract<ChatMsg, { from: "me" }>; fresh: boolean }) {
  const { m } = useLang();
  const audio = useRef<HTMLAudioElement | null>(null);
  const font = fa(msg.text) ? "700 16px/1.6 var(--font-rtl)" : "700 16px/1.4 var(--font-latin)";
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
        <div dir="auto" style={{ font: "600 13px/1.4 var(--font-latin)", color: "#4E4868", maxWidth: 260, textAlign: "end" }}>"{msg.text}"</div>
      </div>
    );
  }
  return (
    <div dir="auto" className={fresh ? "u-enter" : undefined} style={{ alignSelf: "flex-end", maxWidth: "85%", background: "#00827E", color: "#FFFFFF", borderRadius: 20, borderEndEndRadius: 6, padding: "12px 16px", font, boxShadow: "0 4px 0 #005F5B", whiteSpace: "pre-wrap" }}>
      {msg.text}
    </div>
  );
}

const cardStyle: React.CSSProperties = { minWidth: 0, maxWidth: "100%", background: "#FFFFFF", border: "2px solid #EFE6DA", borderRadius: 20, borderEndStartRadius: 6, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, boxShadow: "0 4px 0 #EFE6DA" };

/** The answer reads in the direction of the language it was asked in; older answers without one
 *  go by their letters. */
function TeacherCard({ text, lang, streaming, children, fresh, failed }: { text: string; lang?: TeacherLang; streaming?: boolean; children?: React.ReactNode; fresh?: boolean; failed?: boolean }) {
  const rtl = lang ? lang === "fa" : isRtlText(text);
  return (
    <div className={fresh ? "u-enter" : undefined} style={{ ...cardStyle, ...(failed ? { border: "2px dashed #FFB31A" } : null) }}>
      <MathText text={text + (streaming ? " ▍" : "")} dir={rtl ? "rtl" : "ltr"} style={{ font: rtl ? "500 16.5px/1.85 var(--font-rtl)" : "500 16px/1.55 var(--font-latin)", color: "#1C1433" }} />
      {children}
    </div>
  );
}

function UstadMsg({ msg, fresh, bookId, onPick, onAction, canAsk }: { msg: Extract<ChatMsg, { from: "ustad" }>; fresh: boolean; bookId: string; onPick: (i: number) => void; onAction: (intent: Intent, label: string) => void; canAsk: boolean }) {
  const { m, lang } = useLang();
  const go = useNavigate();
  const r = msg.reply;
  const [speaking, setSpeaking] = useState(false);
  const openPage = (pdf: number) => {
    const book = bookById(bookId);
    const l = book && lessonForPage(book, pdf);
    if (l) go(`/lesson/${l.id}?page=${pdf}`);
  };

  if (r.kind === "teacher") {
    const listen = () => {
      if (speaking) { speechSynthesis.cancel(); setSpeaking(false); return; }
      const h = speak(plainText(r.text), { lang: r.lang ?? (isRtlText(r.text) ? "fa" : "en"), onEnd: () => setSpeaking(false) });
      setSpeaking(!!h);
    };
    return (
      <TeacherCard text={r.text || "…"} lang={r.lang} fresh={fresh} failed={r.failed}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <SourceChip onClick={() => openPage(r.page)}>{m({ en: "On", fa: "در" })} {pageLabel(bookId, r.page, lang)}</SourceChip>
          {r.links.map((l) => (
            <SourceChip key={l.pdfPage} onClick={() => openPage(l.pdfPage)}>{m({ en: "Open", fa: "باز کردن" })} {l.label}</SourceChip>
          ))}
        </div>
        {r.stopped && <div style={{ font: "700 12px/1.4 var(--font-latin)", color: "#6F6A88" }}>{m({ en: "Stopped", fa: "متوقف شد" })}</div>}
        {!r.failed && (
          <div className="hscroll" style={{ gap: 8 }}>
            <ActChip tone="vio" icon="shapes" onClick={() => onAction("showMe", m({ en: "Show me", fa: "نشانم بده" }))}>{m({ en: "Show me", fa: "نشانم بده" })}</ActChip>
            <ActChip tone="teal" icon="lines" disabled={!canAsk} onClick={() => onAction("simpler", m({ en: "Simpler, please", fa: "ساده‌تر لطفا" }))}>{m({ en: "Simpler", fa: "ساده‌تر" })}</ActChip>
            <ActChip tone="pom" icon={speaking ? "stop" : "speaker"} onClick={listen}>{speaking ? m({ en: "Stop", fa: "بس" }) : m({ en: "Listen", fa: "بشنو" })}</ActChip>
          </div>
        )}
      </TeacherCard>
    );
  }

  if (r.kind === "cards") return <Flashcards cards={r.cards} fresh={fresh} label={pageLabel(bookId, r.page, lang)} />;

  if (r.kind === "figures") {
    const book = bookById(bookId);
    return (
      <div className={fresh ? "u-enter" : undefined} style={cardStyle}>
        {r.figures.map((f, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {book?.text && <FigureCrop bookId={bookId} image={book.text.images[f.pdfPage - 1]} aspect={book.text.pageAspects[f.pdfPage - 1]} bbox={f.bbox} />}
            {f.description && <MathText text={f.description} style={{ font: "500 15px/1.8 var(--font-rtl)", color: "#4E4868" }} />}
          </div>
        ))}
        <SourceChip onClick={() => openPage(r.figures[0].pdfPage)}>{m({ en: "From", fa: "از" })} {pageLabel(bookId, r.figures[0].pdfPage, lang)}</SourceChip>
      </div>
    );
  }

  if (r.kind === "check") return <QuickCheck check={r.check} picked={msg.picked} onPick={onPick} fresh={fresh} />;

  return (
    <div className={fresh ? "u-enter" : undefined} style={cardStyle}>
      <div style={{ font: lang === "en" ? "500 16px/1.5 var(--font-latin)" : "500 16px/1.8 var(--font-rtl)", color: "#1C1433" }}>{m(r.text)}</div>
    </div>
  );
}

function QuickCheck({ check, picked, onPick, fresh }: { check: Extract<Reply, { kind: "check" }>["check"]; picked?: number; onPick: (i: number) => void; fresh: boolean }) {
  const { m, t } = useLang();
  const done = picked !== undefined;
  const right = picked === check.answer;
  return (
    <div className={fresh ? "u-enter" : undefined} style={{ ["--i" as string]: 2, background: "#7443F0", borderRadius: 20, borderEndStartRadius: 6, padding: "14px 16px", boxShadow: "0 5px 0 #4F24B8", display: "flex", flexDirection: "column", gap: 10, position: "relative" } as React.CSSProperties}>
      <div className="eyebrow" style={{ color: "#E4DBFF" }}>{m({ en: "Quick check", fa: "یک امتحان کوتاه" })}</div>
      <MathText text={m(check.question)} style={{ font: "800 17px/1.6 var(--font-rtl)", color: "#FFFFFF", paddingInlineEnd: right ? 90 : 0 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {check.options.map((o, i) => {
          const isRight = done && i === check.answer && right;
          const quiet = done && i === picked && !right;
          return (
            <button key={i} disabled={done && right} onClick={() => onPick(i)} className="press flat locked" style={{ minHeight: 48, borderRadius: 14, background: isRight ? "#1F8F3F" : quiet ? "#F3ECE2" : "rgba(255,255,255,.16)", boxShadow: isRight ? "0 4px 0 #146B2D" : undefined, display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", font: "800 15px/1 var(--font-latin)", color: quiet ? "#4E4868" : "#FFFFFF", transition: "background-color 200ms", animation: isRight ? "uCorrect 360ms var(--ease-pop)" : undefined }}>
              {isRight ? <Icon n="check" s={22} c="#FFFFFF" w={3} style={{ animation: "uCheck 360ms var(--ease-pop)" }} /> : <LetterBadge i={i} w={26} h={28} fs={13} />}
              <MathText text={m(o)} style={{ flex: 1 }} />
            </button>
          );
        })}
      </div>
      {done && !right && <div className="u-fade" style={{ font: "700 13px/1.4 var(--font-latin)", color: "#E4DBFF" }}>{t("notThisOne")}{SEP}{m({ en: "try another one", fa: "یکی دیگر را امتحان کنید" })}</div>}
      {right && <MathText text={m(check.why)} style={{ font: "600 14px/1.7 var(--font-rtl)", color: "#E4DBFF" }} />}
      {right && (
        <div className="u-pop" style={{ position: "absolute", insetInlineEnd: 12, top: 10, height: 34, padding: "0 12px", borderRadius: 999, background: "#FFB31A", boxShadow: "0 3px 0 #C98300", display: "flex", alignItems: "center", gap: 6, font: "900 15px/1 var(--font-latin)", color: "#1C1433" }}>
          <Icon n="star" s={18} c="#1C1433" f="#1C1433" />{t("afarin")}
        </div>
      )}
    </div>
  );
}

function Flashcards({ cards, fresh, label }: { cards: { front: string; back: string }[]; fresh: boolean; label: string }) {
  const { m, num } = useLang();
  const [flip, setFlip] = useState<Record<number, boolean>>({});
  return (
    <div className={fresh ? "u-enter" : undefined} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="hscroll" style={{ gap: 10, paddingBottom: 6 }}>
        {cards.map((c, i) => (
          <button key={i} onClick={() => setFlip((f) => ({ ...f, [i]: !f[i] }))} className="press" style={{ ["--lh" as string]: "5px", flex: "none", width: 220, minHeight: 140, borderRadius: 22, padding: 16, background: flip[i] ? "#FFFFFF" : "#FFB31A", boxShadow: flip[i] ? "0 5px 0 #EFE6DA" : "0 5px 0 #C98300", border: flip[i] ? "2px solid #EFE6DA" : "0", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 8, textAlign: "start", animation: fresh ? `uTileIn 420ms var(--ease-pop) ${i * 90}ms backwards` : undefined } as React.CSSProperties}>
            <div className="eyebrow" style={{ color: flip[i] ? "#6F6A88" : "#7A4E00" }}>{flip[i] ? m({ en: "Meaning", fa: "معنا" }) : m({ en: "Term", fa: "واژه" })}{SEP}{num(i + 1)}/{num(cards.length)}</div>
            <MathText text={flip[i] ? c.back : c.front} style={{ font: flip[i] ? "600 14px/1.7 var(--font-rtl)" : "900 19px/1.5 var(--font-rtl)", color: "#1C1433" }} />
          </button>
        ))}
      </div>
      <SourceChip>{m({ en: "From", fa: "از" })} {label}</SourceChip>
    </div>
  );
}

/* ── composer: suggestion chips, input, pulsing mic ─────────────── */

export function Composer({ draft, setDraft, onSend, chips, onChip, disabled, canSend = true, busy, onStop, placeholder, panel }: {
  draft: string; setDraft: (s: string) => void; onSend: (text: string, voice?: { seconds: number; url?: string }) => void;
  chips: { label: string; intent: Intent }[]; onChip: (label: string, intent: Intent) => void; disabled?: boolean; canSend?: boolean; busy?: boolean; onStop?: () => void; placeholder: string; panel?: boolean;
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
    if (!r) { setHint(m({ en: "The microphone isn't available. You can type instead.", fa: "میکروفون در دسترس نیست. می‌توانید بنویسید." })); input.current?.focus(); return; }
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
      setHint(m({ en: "Your voice note is saved. Write what you asked, then send.", fa: "یادداشت صوتی ذخیره شد. سوال خود را بنویسید و بفرستید." }));
      setTimeout(() => input.current?.focus(), 50);
    }
  };

  const submit = () => {
    if (!draft.trim() || disabled || !canSend) return;
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
          <Press key={c.label} flat disabled={disabled || (!canSend && !LOCAL.includes(c.intent))} onClick={() => onChip(c.label, c.intent)} style={{ flex: "none", height: 36, padding: "0 12px", borderRadius: 12, border: "2px solid #EFE6DA", display: "flex", alignItems: "center", font: lang === "en" ? "700 13px/1 var(--font-latin)" : "700 14px/1 var(--font-rtl)", color: "#1C1433", background: "#FFFFFF" }}>{c.label}</Press>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <label style={{ flex: 1, height: panel ? 54 : 52, borderRadius: 18, background: "#F7F1E8", border: "2px solid #EFE6DA", display: "flex", alignItems: "center", padding: "0 16px" }}>
          <span className="sr">{placeholder}</span>
          <input ref={input} dir="auto" className="plain-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} style={{ font: lang === "en" ? "600 16px/1 var(--font-latin)" : "600 16px/1.2 var(--font-rtl)", width: "100%" }} enterKeyHint="send" />
        </label>
        {busy ? (
          <Press aria-label={m({ en: "Stop", fa: "بس کن" })} title={m({ en: "Stop", fa: "بس کن" })} onClick={onStop} style={{ width: 52, height: 52, borderRadius: 26, background: "#1C1433", boxShadow: "0 5px 0 #0A0714", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            <Icon n="stop" s={22} c="#FFFFFF" w={2.4} />
          </Press>
        ) : draft.trim() ? (
          <Press type="submit" aria-label={m({ en: "Send", fa: "بفرست" })} disabled={disabled || !canSend} style={{ width: 52, height: 52, borderRadius: 26, background: "#D81E57", boxShadow: "0 5px 0 #9A1240", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            <Icon n="send" s={24} c="#FFFFFF" w={2.4} />
          </Press>
        ) : (
          <MicButton size={52} label={m({ en: "Hold to talk, or tap", fa: "نگه دارید و بگویید، یا بزنید" })}
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
export function askPanel(bookId: string, text: string, intent?: Intent) {
  window.dispatchEvent(new CustomEvent("ustad:ask", { detail: { bookId, text, intent } }));
}
