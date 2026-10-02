import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "vitest";
import { TextBook } from "./book";
import { fillTeacherPrompt, PromptBuilder, type ChatMessage } from "./promptBuilder";
import { teacherTemplate } from "./teacherPrompt";
import { prepareTurn, tidyAnswer } from "./conversation";

// Replays whole conversations against the running teacher model (llama-server on 127.0.0.1:8080)
// and writes the answers to eval/conversations_<mode>.md for reading. Only runs when asked:
//   USTAD_EVAL=1 npx vitest run conversation.eval          (the app's current pipeline)
//   USTAD_EVAL=1 USTAD_EVAL_MODE=raw npx vitest run conversation.eval   (no follow-up handling)

const root = join(import.meta.dirname, "..", "..", "..");
const bookDir = join(root, "content", "g12-math");
const mode = process.env.USTAD_EVAL_MODE === "raw" ? "raw" : "app";

function loadBook(dir: string): TextBook {
  const json = JSON.parse(readFileSync(join(dir, "book.json"), "utf8"));
  const packages = Array.from({ length: json.page_count }, (_, i) => {
    const p = join(dir, "packages", `${String(i + 1).padStart(4, "0")}.json`);
    return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
  });
  return new TextBook(json, packages);
}

async function ask(messages: ChatMessage[], temperature = 0.3): Promise<{ text: string; tps: number }> {
  const r = await fetch("http://127.0.0.1:8080/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages, temperature, max_tokens: 1200, cache_prompt: true, chat_template_kwargs: { enable_thinking: false } }),
  });
  const j = (await r.json()) as { choices: { message: { content: string } }[]; timings?: { predicted_per_second?: number } };
  return { text: j.choices[0].message.content.trim(), tps: j.timings?.predicted_per_second ?? 0 };
}

// Optional: book (default g12-math) and subject (default math) of a conversation.
const CONVERSATIONS: { lang: "en" | "fa"; page: number; turns: string[]; book?: string; subject?: string }[] = [
  {
    lang: "fa", page: 53,
    turns: ["یک سوال تازه از همین درس بسازید و حل کنید", "یک سوال دیگر بسازید تا خودم حل کنم", "جواب من ۶ است", "حلش کنید"],
  },
  {
    lang: "en", page: 53,
    turns: ["Make up a new problem on this topic and solve it for me too", "quiz me", "I think the answer is 6", "solve it"],
  },
  {
    lang: "fa", page: 95, book: "g12-phys", subject: "phys",
    turns: ["این صفحه را ساده توضیح بدهید.", "یک سوال تازه از همین درس بسازید و حل کنید", "امتحانم کنید"],
  },
  {
    lang: "en", page: 53,
    turns: [
      "Explain this page simply.",
      "Please explain that more simply.",
      "what else can i learn from this page",
      "teach me",
      "solve problem 1) from the exercise section",
      "what about the second problem",
      "no, explain more clearly",
    ],
  },
  {
    lang: "fa", page: 53,
    turns: [
      "این صفحه را ساده توضیح بدهید.",
      "لطفاً ساده‌تر توضیح بدهید.",
      "از این صفحه دیگر چه یاد بگیرم؟",
      "سوال اول تمرین را حل کن",
      "نفهمیدم، واضح‌تر بگو",
    ],
  },
];

// USTAD_EVAL_TAG names the output (e.g. the model): eval/conversations_app_<tag>.md.
const tag = process.env.USTAD_EVAL_TAG ? `_${process.env.USTAD_EVAL_TAG.replace(/[^\w.-]/g, "")}` : "";

test.skipIf(!process.env.USTAD_EVAL || !existsSync(bookDir))("teacher conversations (live model)", async () => {
  const out: string[] = [`# Teacher conversations (${mode}${tag})`, ""];
  for (const c of CONVERSATIONS) {
    const dir = join(root, "content", c.book ?? "g12-math");
    if (!existsSync(dir)) continue;
    const book = loadBook(dir);
    const name = c.lang === "en" ? "Maryam" : "مریم";
    const builder = new PromptBuilder(book, fillTeacherPrompt(teacherTemplate(c.subject ?? "math", c.lang), book.titleFa, name, c.lang === "en" ? "student" : "شاگرد"));
    const history: ChatMessage[] = [];
    out.push(`## ${c.book ?? "g12-math"} · ${c.lang} · PDF page ${c.page}`, "");
    for (const q of c.turns) {
      const t0 = Date.now();
      const turn = mode === "raw"
        ? { ...builder.build(c.page, q, history.slice(-6)), temperature: 0.3 }
        : prepareTurn({ builder, page: c.page, question: q, history, lang: c.lang });
      const { text: raw, tps } = await ask(turn.messages, turn.temperature);
      const answer = mode === "raw" ? raw : tidyAnswer(raw, name, history.length > 0);
      history.push({ role: "user", content: q }, { role: "assistant", content: answer });
      const last = turn.messages[turn.messages.length - 1].content;
      const note = last.slice(Math.max(last.indexOf("[Note for the teacher"), last.indexOf("[یادداشت برای معلم")));
      out.push(`**Student:** ${q}`, "");
      if (/^\[(Note|یادداشت)/.test(note)) out.push("> " + note.replace(/\n/g, "\n> "), "");
      out.push(`**Ustad** (${((Date.now() - t0) / 1000).toFixed(1)} s, ${tps.toFixed(1)} tok/s):`, "", answer, "", "---", "");
    }
  }
  writeFileSync(join(root, "eval", `conversations_${mode}${tag}.md`), out.join("\n"), "utf8");
}, 3_600_000);
