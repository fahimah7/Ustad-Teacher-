import { faNum, parseFaInt } from "./fa";
import type { Exercise, PagePackage, WorkedExample } from "./book";
import type { ChatMessage, PromptBuilder, TutorTurn } from "./promptBuilder";

/** What a small model needs to hear to keep a conversation moving. Left alone, it answers every
 *  follow-up ("simpler", "no, explain more clearly", "teach me") by summarising the page again,
 *  copies its own earlier answers, and solves the page's example when she asks for "problem 1".
 *  So each question is read first: a follow-up or a numbered problem gets a short note to the
 *  teacher, and earlier answers are shortened so they can't be copied. */

export type FollowUp = "again" | "more" | "teach";
/** She wants the teacher's own problem: made up and solved ("create"), made up for her to try
 *  ("quiz"), or the one the teacher just made, solved ("solveOwn"). */
export type MakeRequest = "create" | "quiz" | "solveOwn";
type Lang = "fa" | "en";

const AGAIN = [
  /\b(simpler|easier|more simply|more clearly|clearer|again|confus\w*|lost)\b/i,
  /\b(don'?t|didn'?t|do not|did not) (get|understand|follow)\b/i,
  /\bnot clear\b|\bwhat do you mean\b|\bexplain (it|that|this)? ?(better|differently|more)\b/i,
  /^\s*(no|nope)\b\s*[,.!]/i, // "no, explain more clearly"
  /^\s*(no|nope|huh|what)\s*[?!.]*\s*$/i, // a bare "what?"
  /ساده[‌ ]?تر|واضح[‌ ]?تر|روشن[‌ ]?تر|نفهمیدم|نمی[‌ ]?فهمم|متوجه نشدم|دوباره (توضیح|بگو)|یک بار دیگر|باز هم|گیج/,
  /^\s*نه\b/,
];
const MORE = [/\bwhat else\b|\banything else\b|\bwhat more\b|\bmore from this page\b/i, /دیگر چه|دیگه چی|دیگر چی|چه چیز دیگری|دیگر چیست/];
const TEACH = [/\bteach me\b|\bgive me a lesson\b|\bexplain (the whole|everything)\b/i, /یادم بده|یاد بدهید|درس بده|درس بدهید|تدریس|به من یاد/];

/** "again" (she didn't understand the last answer), "more" (what else is on this page), "teach"
 *  (a lesson on this page), or null for an ordinary question. */
export function followUpOf(question: string): FollowUp | null {
  if (TEACH.some((r) => r.test(question))) return "teach";
  if (MORE.some((r) => r.test(question))) return "more";
  if (AGAIN.some((r) => r.test(question))) return "again";
  return null;
}

// «یک سوال تازه بساز», «از خودتان یک مثال بدهید», "make up a problem", "give me a new question".
const ITEM_FA = "(?:سوال|سؤال|تمرین|مثال|مسئله|مسأله|پرابلم|جمله)";
const MAKE_FA = "(?:بساز|بسازید|بسازین|طرح کن|طرح کنید|درست کن|درست کنید|جور کن|جور کنید|ایجاد کن|ایجاد کنید)";
const GIVE_FA = "(?:بده|بدهید|بدین|بیاور|بیاورید|بنویس|بنویسید|بپرس|بپرسید|مطرح کن|مطرح کنید)";
const NEW_FA = "(?:تازه|جدید|نو|دیگر|دیگری|دیگه|مشابه|شبیه|از خودت|از خودتان|از خود)";
const CREATE = [
  new RegExp(`${ITEM_FA}[^.؟?!\\n]{0,30}${MAKE_FA}`),
  new RegExp(`${MAKE_FA}[^.؟?!\\n]{0,15}${ITEM_FA}`),
  new RegExp(`(?:${NEW_FA}[^.؟?!\\n]{0,12}${ITEM_FA}|${ITEM_FA}[^.؟?!\\n]{0,12}${NEW_FA})[^.؟?!\\n]{0,25}${GIVE_FA}`),
  /\b(make|create|invent|write|think of|come up with|set)\b[^.?!\n]{0,25}\b(problems?|questions?|exercises?|examples?|sentences?)\b/i,
  /\b(give|show|ask)\b[^.?!\n]{0,12}\b(me|us)\b[^.?!\n]{0,15}\b(new|another|different|similar|own|fresh|practice)\b[^.?!\n]{0,12}\b(problems?|questions?|exercises?|examples?)\b/i,
];
// She wants to answer it herself: "quiz me", «امتحانم کنید», «خودم حل کنم».
const QUIZ = [
  /\b(quiz|test) me\b|\bask me\b[^.?!\n]{0,20}\b(questions?|problems?)\b|\blet me (try|solve)\b|\bi('ll| will) (try|solve)\b/i,
  /امتحانم کن|امتحانم کنید|امتحان بگیر|امتحان کنید از من|(?:مرا|من را) امتحان|از من[^.؟?!\n]{0,15}(?:سوال|سؤال)[^.؟?!\n]{0,10}(?:بپرس|بپرسید)|خودم حل|خودم جواب|من حل می[‌ ]?کنم/,
];
const SOLVE = /حل|جواب|\bsolve\b|\bsolution\b|\banswer\b|\bwork (it )?out\b/i;
// "solve it", «حلش کن», «جوابش چیست»: the problem in front of her, with no number.
const SOLVE_IT = [/\b(solve|answer|work out|do) (it|this|that|this one|that one)\b|\bshow (me )?the (solution|answer)\b|\bwhat('s| is) the answer\b/i, /حلش|جوابش|حل آن|جواب آن|حل کنید$|حل کن$|حل را نشان|جواب را بگو|جواب را بگویید|جواب چیست/];

/** Whether she asks the teacher to make up a problem: solved for her ("create", when she asks for
 *  the solution too) or for her to try first ("quiz"). A numbered one («تمرین ۲») is the book's,
 *  so it is not a made-up request. */
export function makeRequestOf(question: string): Exclude<MakeRequest, "solveOwn"> | null {
  if (referenceOf(question)) return null;
  if (QUIZ.some((r) => r.test(question))) return "quiz";
  // An example comes with its solution; a problem or question without "solve" is for her to try.
  if (CREATE.some((r) => r.test(question))) return SOLVE.test(question) || /مثال|\bexamples?\b/i.test(question) ? "create" : "quiz";
  return null;
}

/** The problem in the teacher's last answer: what follows «سوال:» / "Problem:", else its start. */
export function ownProblemOf(answer: string): string {
  const m = answer.match(/(?:سوال|سؤال|problem|question)\s*[:：]\s*([\s\S]*?)(?:\n\s*(?:حل|solution|راهنمایی|hint)\s*[:：]|$)/i);
  const text = (m ? m[1] : answer).trim();
  return text.length > 400 ? `${text.slice(0, 400).trimEnd()} …` : text;
}

/** What she asks of a problem the teacher made in the previous turn: solve it now, or (after a
 *  quiz) check her answer. null when the last turn was not a made-up problem. */
function ownProblemFollowUp(question: string, history: ChatMessage[]): { mode: "solve" | "check"; problem: string } | null {
  const lastAsked = [...history].reverse().find((m) => m.role === "user");
  const lastAnswer = [...history].reverse().find((m) => m.role === "assistant");
  if (!lastAsked || !lastAnswer) return null;
  const made = makeRequestOf(lastAsked.content);
  if (!made) return null;
  const problem = ownProblemOf(lastAnswer.content);
  if (SOLVE_IT.some((r) => r.test(question.trim()))) return { mode: "solve", problem };
  if (made === "quiz" && !followUpOf(question) && !referenceOf(question)) return { mode: "check", problem };
  return null;
}

const ORD_EN: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, one: 1, two: 2, three: 3, four: 4, five: 5 };
const ORD_FA: Record<string, number> = { اول: 1, دوم: 2, سوم: 3, چهارم: 4, پنجم: 5, ششم: 6, هفتم: 7, هشتم: 8, نهم: 9, دهم: 10 };
const NUM = "([0-9۰-۹٠-٩]+)";
const ORD_EN_RE = Object.keys(ORD_EN).join("|");
const ORD_FA_RE = Object.keys(ORD_FA).join("|");

type Ref = { kind: "exercise" | "example"; n: number };

/** "problem 1", "the second question", «سوال اول», «تمرین ۲», «مثال ۱» → which one she means. */
export function referenceOf(question: string): Ref | null {
  const q = question.toLowerCase();
  const tries: [RegExp, Ref["kind"], (m: RegExpMatchArray) => number | null][] = [
    [new RegExp(`\\b(?:problem|exercise|question|task|q)\\s*(?:no\\.?|number|#)?\\s*${NUM}`), "exercise", (m) => parseFaInt(m[1])],
    [new RegExp(`\\b(${ORD_EN_RE})\\s+(?:problem|exercise|question|task|one)\\b`), "exercise", (m) => ORD_EN[m[1]]],
    [new RegExp(`\\bexample\\s*(?:no\\.?|number|#)?\\s*${NUM}`), "example", (m) => parseFaInt(m[1])],
    [new RegExp(`\\b(${ORD_EN_RE})\\s+example\\b`), "example", (m) => ORD_EN[m[1]]],
    [new RegExp(`(?:تمرین|سوال|سؤال)\\s*(?:شماره\\s*)?${NUM}`), "exercise", (m) => parseFaInt(m[1])],
    [new RegExp(`(?:تمرین|سوال|سؤال)\\s*(?:ی\\s*)?(${ORD_FA_RE})`), "exercise", (m) => ORD_FA[m[1]]],
    [new RegExp(`(${ORD_FA_RE})ین\\s*(?:تمرین|سوال|سؤال)`), "exercise", (m) => ORD_FA[m[1]]],
    [new RegExp(`مثال\\s*(?:شماره\\s*)?${NUM}`), "example", (m) => parseFaInt(m[1])],
    [new RegExp(`مثال\\s*(${ORD_FA_RE})`), "example", (m) => ORD_FA[m[1]]],
  ];
  for (const [re, kind, num] of tries) {
    const m = q.match(re);
    const n = m ? num(m) : null;
    if (n) return { kind, n };
  }
  return null;
}

/** The leading number of a label: «تمرین ۱ (۲)» → [1, 2], «۳» → [3], «مثال» → []. */
const labelNumbers = (label = "") => [...label.matchAll(/[0-9۰-۹٠-٩]+/g)].map((m) => parseFaInt(m[0])!).filter((n) => n !== null);

type Item = { label: string; problem: string; parts: number };

/** The exercise or example she means on this page: by the number printed in its label first
 *  («تمرین ۲» for "problem 2"), else by position. For an exercise in parts, the first part. */
export function resolveReference(pkg: PagePackage, ref: Ref): Item | null {
  const list: (Exercise | WorkedExample)[] = ref.kind === "exercise" ? pkg.exercises : pkg.workedExamples;
  if (!list.length) return null;
  const byLabel = list.filter((x) => labelNumbers(x.label_fa)[0] === ref.n);
  const pick = byLabel[0] ?? list[ref.n - 1];
  if (!pick) return null;
  return { label: pick.label_fa?.trim() || (ref.kind === "exercise" ? `تمرین ${faNum(ref.n)}` : `مثال ${faNum(ref.n)}`), problem: pick.problem_fa ?? "", parts: Math.max(1, byLabel.length) };
}

/** Maths written the same way whatever the language: "\frac{\Delta y}{\Delta x}" → "\frac{\Deltay}{\Deltax}". */
const flat = (s: string) => s.replace(/\\(left|right)/g, "").replace(/\s+/g, "");
const mathOf = (s: string) => [...s.matchAll(/\$([^$]+)\$/g)].map((m) => flat(m[1])).filter((m) => m.length > 2);
/** Dari words of a piece of text (English answers carry the book's terms in brackets). */
const dariWords = (s: string) => new Set(s.match(/[؀-ۿ‌]{3,}/g) ?? []);

/** Whether earlier answers already went through a part of the page: by its maths when it has
 *  any (the answers may be in English, the notes are in Dari), else by its Dari words. */
function covered(part: string, earlierFlat: string, earlierWords: Set<string>): boolean {
  // Each side of a formula counts on its own: "\frac{\Delta y}{\Delta x}" said alone covers
  // "\frac{\Delta y}{\Delta x} = \frac{f(x_2) - f(x_1)}{x_2 - x_1}".
  const math = mathOf(part).flatMap((m) => m.split("=").filter((side) => side.length > 4));
  if (math.length) return math.some((m) => earlierFlat.includes(m));
  const words = [...dariWords(part)];
  return words.length > 0 && words.filter((w) => earlierWords.has(w)).length / words.length >= 0.6;
}

/** What the page holds that the earlier answers have not talked about yet, for "what else can I
 *  learn": its ideas first, then its examples and exercises. Everything, if they covered it all. */
export function uncoveredParts(pkg: PagePackage, earlier: string): string[] {
  const earlierFlat = flat(earlier);
  const earlierWords = dariWords(earlier);
  const parts = [
    ...pkg.keyPoints,
    ...pkg.formulas.map((f) => `$${f.latex}$ — ${f.meaning_fa ?? ""}`),
    ...pkg.workedExamples.map((e) => `${e.label_fa ?? "مثال"}: ${e.problem_fa ?? ""}`),
    ...pkg.exercises.map((e) => `${e.label_fa ?? "تمرین"}: ${e.problem_fa ?? ""}`),
  ].filter((p) => p.trim());
  const fresh = parts.filter((p) => !covered(p, earlierFlat, earlierWords));
  return (fresh.length ? fresh : parts).slice(0, 5);
}

const NOTE = { en: "[Note for the teacher, not from the student]", fa: "[یادداشت برای معلم، نه از طرف شاگرد]" };

/** The note added under her question, or "" for an ordinary question. `history` is the
 *  conversation on this page so far. */
export function guideFor(question: string, pkg: PagePackage | null, history: ChatMessage[], lang: Lang): string {
  const made = makeGuide(question, history, lang);
  if (made) return made;
  const hasEarlierAnswer = history.some((m) => m.role === "assistant");
  const ref = pkg ? referenceOf(question) : null;
  const item = ref && pkg ? resolveReference(pkg, ref) : null;
  const kind = followUpOf(question);
  // "I didn't understand" right after a solved problem: explain that problem again, differently.
  if (!item && kind === "again" && pkg) {
    const lastAsked = [...history].reverse().find((m) => m.role === "user");
    const prevRef = lastAsked ? referenceOf(lastAsked.content) : null;
    const prev = prevRef ? resolveReference(pkg, prevRef) : null;
    if (prev) {
      return lang === "en"
        ? `${NOTE.en}\nThe student did not understand your solution of «${prev.label}»: ${prev.problem}\nSolve this same problem again, much more clearly: first say in one sentence what we are looking for, then use very small steps, one idea per step, and say WHY each step is done. Use different wording from your last answer. At the end, give the answer on its own line.`
        : `${NOTE.fa}\nشاگرد حل شما از «${prev.label}» را نفهمیده است: ${prev.problem}\nهمین سوال را دوباره و خیلی واضح‌تر حل کنید: اول در یک جمله بگویید دنبال چه هستیم، بعد با قدم‌های خیلی کوچک، در هر قدم فقط یک کار، و بگویید چرا آن قدم را برمی‌داریم. کلمه‌های جواب قبلی را تکرار نکنید. در آخر، جواب را در یک سطر جداگانه بنویسید.`;
    }
  }
  if (item) {
    const more = item.parts > 1;
    return lang === "en"
      ? `${NOTE.en}\nThe student means «${item.label}» on this page: ${item.problem}\nSolve exactly this one, step by step, following its solution in the page information. Do not solve a different example or exercise instead. Explain every step in one short, simple English sentence.${more ? " It is part of an exercise with several parts: solve this part, then offer to do the next part." : ""}`
      : `${NOTE.fa}\nمنظور شاگرد «${item.label}» همین صفحه است: ${item.problem}\nدقیقاً همین را، قدم به قدم و با همان حلی که در معلومات صفحه آمده، حل کنید. مثال یا تمرین دیگری را به جای آن حل نکنید. هر قدم را با یک جملهٔ کوتاه و ساده توضیح بدهید.${more ? " این یک بخش از تمرینی چندبخشی است: همین بخش را حل کنید و پیشنهاد کنید بخش بعدی را هم حل کنید." : ""}`;
  }
  if (!kind) return "";
  if (kind === "again" && hasEarlierAnswer) {
    return lang === "en"
      ? `${NOTE.en}\nThe student did not understand your last answer. Explain the same thing again in a completely different way: start from something she already knows, use one everyday comparison (money, bread, walking to school), then go in very short numbered steps with small, easy numbers. Do not repeat sentences from your last answer and do not summarise the whole page again. At most eight short sentences.`
      : `${NOTE.fa}\nشاگرد جواب قبلی شما را نفهمیده است. همان موضوع را دوباره و به شکلی کاملاً متفاوت توضیح بدهید: از چیزی که او می‌داند شروع کنید، یک مقایسهٔ روزمره بیاورید (پول، نان، راه رفتن تا مکتب) و بعد با قدم‌های خیلی کوتاه و شماره‌دار و عددهای کوچک و ساده توضیح بدهید. جمله‌های جواب قبلی را تکرار نکنید و خلاصهٔ تمام صفحه را دوباره نگویید. حداکثر هشت جملهٔ کوتاه.`;
  }
  if (kind === "more" && pkg) {
    // One part, chosen here: given a list, the small model drifts back to the page's main idea.
    const next = uncoveredParts(pkg, history.filter((m) => m.role === "assistant").map((m) => m.content).join("\n"))[0];
    return lang === "en"
      ? `${NOTE.en}\nThe student wants to learn something NEW from this page. Teach her only this part of the page, which you have not explained yet:\n${next}\nExplain this one thing with a small example. Do not repeat anything you already explained in this conversation, and do not summarise the page.`
      : `${NOTE.fa}\nشاگرد می‌خواهد از این صفحه چیز تازه‌ای یاد بگیرد. فقط این بخش صفحه را که هنوز توضیح نداده‌اید درس بدهید:\n${next}\nهمین یک موضوع را با یک مثال کوچک توضیح بدهید. چیزی را که قبلاً در این گفتگو گفته‌اید تکرار نکنید و خلاصهٔ صفحه را نگویید.`;
  }
  if (kind === "teach") {
    return lang === "en"
      ? `${NOTE.en}\nTeach this page as a short lesson, in this order: 1) the main idea in one or two simple sentences with an everyday comparison; 2) the key formula and what each part of it means; 3) the page's example, step by step; 4) one small exercise from this page for her to try herself. Short sentences.`
      : `${NOTE.fa}\nاین صفحه را مثل یک درس کوتاه، به این ترتیب درس بدهید: ۱) ایدهٔ اصلی در یک یا دو جملهٔ ساده با یک مقایسهٔ روزمره؛ ۲) فورمول اصلی و معنی هر بخش آن؛ ۳) مثال صفحه، قدم به قدم؛ ۴) یک تمرین کوچک از همین صفحه تا خودش امتحان کند. جمله‌ها کوتاه باشند.`;
  }
  return "";
}

/** The note for a made-up problem: make one and solve it, make one for her to try, solve the one
 *  just made, or check her answer to it. "" when the question is none of these. */
function makeGuide(question: string, history: ChatMessage[], lang: Lang): string {
  const own = ownProblemFollowUp(question, history);
  if (own?.mode === "solve") {
    return lang === "en"
      ? `${NOTE.en}\nThe student wants you to solve the problem you made up in your last answer: ${own.problem}\nSolve exactly that problem step by step, one short sentence per step, check the result (for example by putting it back into the problem), and end with "Answer:" on its own line. Praise her for working with you.`
      : `${NOTE.fa}\nشاگرد می‌خواهد سوالی را که خودتان در جواب قبلی ساختید حل کنید: ${own.problem}\nدقیقاً همان سوال را قدم به قدم حل کنید، هر قدم با یک جملهٔ کوتاه، نتیجه را امتحان کنید (مثلاً دوباره در سوال بگذارید) و در آخر «جواب:» را در یک سطر جداگانه بنویسید.`;
  }
  if (own?.mode === "check") {
    return lang === "en"
      ? `${NOTE.en}\nThe student is answering the problem you gave her in your last answer: ${own.problem}\nFirst solve it yourself silently, then compare her answer with yours. If she is right, praise her warmly and specifically, and offer a slightly harder one. If she is wrong or stuck, kindly say which step went wrong, give one small hint and let her try again; show the full solution only if she asks or has already tried twice.`
      : `${NOTE.fa}\nشاگرد به سوالی که شما در جواب قبلی به او دادید جواب می‌دهد: ${own.problem}\nاول خودتان در ذهن سوال را حل کنید و بعد جواب شاگرد را با آن مقایسه کنید. اگر درست است، گرم و مشخص تشویقش کنید (مثلاً «آفرین! درست است») و یک سوال کمی سخت‌تر پیشنهاد کنید. اگر نادرست است یا گیر مانده، با مهربانی بگویید کدام قدم اشتباه شده، یک راهنمایی کوچک بدهید و بگذارید دوباره امتحان کند؛ حل کامل را فقط وقتی بگویید که خودش بخواهد یا دو بار کوشش کرده باشد.`;
  }
  const make = makeRequestOf(question);
  const earlier = history.some((m) => m.role === "assistant") ? (lang === "en" ? " Make it different from any problem already in this conversation." : " سوالی بسازید که با سوال‌های قبلی همین گفتگو فرق داشته باشد.") : "";
  if (make === "create") {
    return lang === "en"
      ? `${NOTE.en}\nThe student asks YOU to make up a new problem on this page's topic and solve it. Invent a fresh problem yourself: do not copy the book's examples or exercises; choose new numbers or a new situation, if possible from daily life in Afghanistan (the bazaar, bread, a garden, school, a journey).${earlier} Write it after "Problem:", then solve it after "Solution:" step by step, one short sentence per step, check the result, and end with "Answer:" on its own line. The length limit does not apply to this solution. Finish with one friendly line inviting her to try a similar one.`
      : `${NOTE.fa}\nشاگرد از شما می‌خواهد خودتان یک سوال تازه از موضوع همین صفحه بسازید و حل کنید. سوال را خودتان طرح کنید: از مثال‌ها و تمرین‌های کتاب کپی نکنید، عددها یا موقعیت تازه انتخاب کنید و اگر می‌شود از زندگی روزمرهٔ افغانستان بگیرید (بازار، نان، باغ، مکتب، سفر).${earlier} سوال را بعد از «سوال:» بنویسید، بعد از «حل:» آن را قدم به قدم حل کنید، هر قدم با یک جملهٔ کوتاه، نتیجه را امتحان کنید و در آخر «جواب:» را در یک سطر جداگانه بنویسید. محدودیت پنج تا هشت جمله برای این حل نیست. در آخر با یک جملهٔ گرم او را دعوت کنید که سوال مشابهی را خودش امتحان کند.`;
  }
  if (make === "quiz") {
    return lang === "en"
      ? `${NOTE.en}\nThe student wants a new problem on this page's topic to solve herself. Invent a fresh, clear problem yourself (do not copy the book's examples or exercises; if possible use daily life in Afghanistan).${earlier} Write it after "Problem:" and do NOT give the solution or the answer. Then tell her in one cheerful line to try it and write her answer, and that you will check it (she can also ask you to solve it).`
      : `${NOTE.fa}\nشاگرد می‌خواهد یک سوال تازه از موضوع همین صفحه را خودش حل کند. یک سوال روشن و تازه خودتان بسازید (از مثال‌ها و تمرین‌های کتاب کپی نکنید؛ اگر می‌شود از زندگی روزمرهٔ افغانستان).${earlier} سوال را بعد از «سوال:» بنویسید و حل یا جواب آن را ننویسید. بعد با یک جملهٔ گرم بگویید که خودش امتحان کند و جوابش را بنویسد تا شما ببینید (و اگر خواست، شما حلش می‌کنید).`;
  }
  return "";
}

/** How freely the teacher may write: a made-up problem needs some imagination, everything else
 *  (explaining, solving, checking) needs care. */
export function temperatureFor(question: string, history: ChatMessage[]): number {
  return !ownProblemFollowUp(question, history) && makeRequestOf(question) ? 0.7 : 0.3;
}

/** Earlier turns, shortened: the last answer keeps its start (so "explain that again" knows what
 *  "that" is), older answers only a line. The model then can't copy them word for word. */
export function shapeHistory(history: ChatMessage[], name = "", max = 6): ChatMessage[] {
  const recent = history.slice(-max);
  while (recent.length && recent[0].role !== "user") recent.shift();
  const lastAnswer = recent.map((m) => m.role).lastIndexOf("assistant");
  return recent.map((m, i) => {
    if (m.role !== "assistant") return m;
    const text = stripName(m.content, name);
    const limit = i === lastAnswer ? 500 : 160;
    return { role: m.role, content: text.length > limit ? `${text.slice(0, limit).trimEnd()} …` : text };
  });
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function stripName(text: string, name: string): string {
  const n = name.trim();
  if (!n) return text;
  return text.replace(new RegExp(`^\\s*${escape(n)}(\\s*جان)?\\s*[,،!:]?\\s*`), "");
}

/** Cleans an answer: after the first answer she is not called by name at the start of every
 *  reply, and lines that talk about the teacher's notes instead of the lesson are dropped. */
export function tidyAnswer(text: string, name: string, notFirst: boolean): string {
  let t = text.trim();
  if (notFirst) t = stripName(t, name);
  t = t
    .split("\n")
    .filter((line) => !/^\s*(here is|here's) (the )?(information|what the (page|notes) say)|«?معلومات صفحه»?\s*[:：]\s*$|^\s*(you are|you're) (looking at|on) (pdf )?page\s*\d+[^.]*\.\s*$/i.test(line))
    .join("\n")
    .trim();
  return t ? t[0].toUpperCase() + t.slice(1) : text.trim();
}

/** The whole turn the model sees for one question. */
export function prepareTurn(o: { builder: PromptBuilder; page: number; question: string; history: ChatMessage[]; lang: Lang; name?: string }): TutorTurn & { temperature: number } {
  const pkg = o.builder.book.pkg(o.page);
  const guide = guideFor(o.question, pkg, o.history, o.lang);
  const turn = o.builder.build(o.page, o.question, shapeHistory(o.history, o.name ?? ""), guide);
  return { ...turn, temperature: temperatureFor(o.question, o.history) };
}
