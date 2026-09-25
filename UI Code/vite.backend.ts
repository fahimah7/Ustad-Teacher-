import type { Plugin } from "vite";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/** `npm run dev` only: stands in for the native side (src-tauri) so the UI can be worked on in a
 *  browser. Same content folder, same local teacher model (llama-server on 127.0.0.1:8080),
 *  same answers. Never part of a build. */

const CONTENT = resolve(process.env.SCHOOL_CONTENT_DIR ?? join(import.meta.dirname, "..", "content"));
const LLAMA = `http://127.0.0.1:${process.env.SCHOOL_LLAMA_PORT ?? 8080}`;
const VALID_ID = /^[A-Za-z0-9_-]{1,64}$/;

const readJson = (p: string) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };
const dirSize = (d: string): number => readdirSync(d, { withFileTypes: true }).reduce((a, e) => a + (e.isDirectory() ? dirSize(join(d, e.name)) : statSync(join(d, e.name)).size), 0);

function books() {
  if (!existsSync(CONTENT)) return [];
  return readdirSync(CONTENT, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => ({ dir: join(CONTENT, e.name), j: readJson(join(CONTENT, e.name, "book.json")) }))
    .filter(({ j }) => j && typeof j.grade === "number" && typeof j.title_fa === "string" && Array.isArray(j.chapters) && j.chapters.length && VALID_ID.test(j.book_id))
    .map(({ dir, j }) => ({ dir, summary: { id: j.book_id, grade: j.grade, subject: j.subject ?? "", titleFa: j.title_fa, subjectFa: j.subject_fa ?? j.title_fa, pageCount: j.page_count ?? 0, sizeBytes: dirSize(dir), received: false } }));
}

export function devBackend(): Plugin {
  return {
    name: "ustad-dev-backend",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? "/", "http://x");
        if (!url.pathname.startsWith("/__ustad/")) return next();
        const send = (code: number, body: unknown, type = "application/json") => {
          res.statusCode = code;
          res.setHeader("Content-Type", type);
          res.end(type === "application/json" ? JSON.stringify(body) : (body as Buffer));
        };
        const path = decodeURIComponent(url.pathname.slice("/__ustad/".length));
        try {
          if (path === "books") return send(200, books().map((b) => b.summary));
          if (path.startsWith("book/")) {
            const b = books().find((x) => x.summary.id === path.slice(5));
            if (!b) return send(404, "no such book");
            const book = readJson(join(b.dir, "book.json"));
            const packages = Array.from({ length: book.page_count }, (_, i) => readJson(join(b.dir, "packages", `${String(i + 1).padStart(4, "0")}.json`)));
            const pdir = join(b.dir, "practice");
            const practice = existsSync(pdir) ? readdirSync(pdir).filter((f) => f.endsWith(".json")).sort().map((f) => readJson(join(pdir, f))).filter(Boolean) : [];
            return send(200, { book, packages, practice, titlesEn: readJson(join(b.dir, "titles_en.json")), glossary: readJson(join(b.dir, "glossary.json")) });
          }
          const img = path.match(/^content\/([A-Za-z0-9_-]+)\/pages\/(\d{1,6}\.(jpg|jpeg|png|webp))$/);
          if (img) {
            const b = books().find((x) => x.summary.id === img[1]);
            const file = b && join(b.dir, "pages", img[2]);
            if (!file || !existsSync(file)) return send(404, "not found");
            res.setHeader("Cache-Control", "max-age=3600");
            return send(200, readFileSync(file), img[3] === "png" ? "image/png" : img[3] === "webp" ? "image/webp" : "image/jpeg");
          }
          if (path === "status") {
            const r = await fetch(`${LLAMA}/health`).catch(() => null);
            if (r?.ok) return send(200, { state: "ready" });
            if (r?.status === 503) return send(200, { state: "starting", message: "loading the model" });
            return send(200, { state: "unavailable", message: "Start the teacher: powershell -File scripts\\start_llama_server.ps1" });
          }
          if (path === "storage") return send(200, { contentBytes: books().reduce((a, b) => a + b.summary.sizeBytes, 0), freeBytes: null });
          if (path === "chat" && req.method === "POST") {
            let body = "";
            for await (const chunk of req) body += chunk;
            const { messages } = JSON.parse(body);
            const ctrl = new AbortController();
            res.on("close", () => ctrl.abort());
            const r = await fetch(`${LLAMA}/v1/chat/completions`, {
              method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
              body: JSON.stringify({ messages, stream: true, temperature: 0.3, max_tokens: 600, cache_prompt: true, chat_template_kwargs: { enable_thinking: false } }),
            });
            res.statusCode = r.status;
            res.setHeader("Content-Type", "text/event-stream");
            const reader = r.body!.getReader();
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(value);
            }
            return res.end();
          }
          return send(404, "unknown");
        } catch (e) {
          if (!res.headersSent) send(500, String(e));
          else res.end();
        }
      });
    },
  };
}
