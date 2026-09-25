import { Channel, invoke } from "@tauri-apps/api/core";
import type { BookJson } from "../tutor/book";
import type { ChatMessage } from "../tutor/promptBuilder";

/** The one door between the page and the device. In the app it is Tauri IPC to the native
 *  backend (src-tauri): books from disk, the local llama.cpp teacher, learning packs. In
 *  `npm run dev` in a browser, the same calls go to the Vite dev server (vite.backend.ts), which
 *  reads the same content folder and relays to the same local llama-server. Nothing here can
 *  reach a network: the native side only talks to 127.0.0.1. */

export type BookSummary = {
  id: string; grade: number; subject: string; titleFa: string; subjectFa: string;
  pageCount: number; sizeBytes: number; received: boolean;
};

export type PracticeSetJson = {
  schema: string; book_id: string; chapter: number;
  title: { en: string; fa: string };
  questions: { pdf_page: number; q: { en: string; fa: string }; options: { en: string; fa: string }[]; answer: number; why: { en: string; fa: string }; idea: { en: string; fa: string } }[];
};

export type TitlesEn = { chapters?: Record<string, string>; sections?: Record<string, string> };

/** The book's own words (content/<id>/glossary.json): the teacher uses "book", never "avoid". */
export type Glossary = { terms?: { book: string; avoid?: string[]; en?: string }[]; style_notes_fa?: string };

export type BookData = {
  book: BookJson;
  packages: (Record<string, unknown> | null)[];
  practice: PracticeSetJson[];
  titlesEn: TitlesEn | null;
  glossary?: Glossary | null;
};

export type TutorState = "starting" | "ready" | "error" | "unavailable";
export type TutorStatus = { state: TutorState; message?: string };

export type Storage = { contentBytes: number; freeBytes: number | null };

type ChatEvent = { kind: "delta"; text: string } | { kind: "done" } | { kind: "error"; message: string };

export const isNativeApp = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
const devBackend = () => !isNativeApp() && import.meta.env.DEV;

const DEV = "/__ustad";

async function devGet<T>(path: string): Promise<T> {
  const r = await fetch(DEV + path);
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<T>;
}

function unavailable(): never {
  throw new Error("Open Ustad as an app to use this.");
}

export async function listBooks(): Promise<BookSummary[]> {
  if (isNativeApp()) return invoke<BookSummary[]>("list_books");
  if (devBackend()) return devGet<BookSummary[]>("/books");
  return [];
}

export async function loadBook(id: string): Promise<BookData> {
  if (isNativeApp()) return invoke<BookData>("load_book", { id });
  if (devBackend()) return devGet<BookData>(`/book/${encodeURIComponent(id)}`);
  return unavailable();
}

/** URL of a page image. The native side serves only files inside a known book's pages folder. */
export function pageImageUrl(bookId: string, image: string): string {
  const path = `${encodeURIComponent(bookId)}/${image.split("/").map(encodeURIComponent).join("/")}`;
  if (isNativeApp()) {
    // Tauri maps custom schemes to http://<scheme>.localhost on Windows and Android.
    return /Windows|Android/i.test(navigator.userAgent) ? `http://book.localhost/${path}` : `book://localhost/${path}`;
  }
  return `${DEV}/content/${path}`;
}

export async function tutorStatus(): Promise<TutorStatus> {
  if (isNativeApp()) return invoke<TutorStatus>("tutor_status");
  if (devBackend()) return devGet<TutorStatus>("/status").catch(() => ({ state: "error", message: "dev server" }));
  return { state: "unavailable", message: "Ustad's teacher runs in the app." };
}

let nextChat = 1;

/** Streams the teacher's reply from the local model. Resolves when the reply is complete;
 *  aborting the signal stops the model mid-answer. */
export async function chat(messages: ChatMessage[], onDelta: (text: string) => void, signal?: AbortSignal): Promise<void> {
  if (isNativeApp()) {
    const id = nextChat++;
    const channel = new Channel<ChatEvent>();
    let failure: string | null = null;
    channel.onmessage = (e) => {
      if (e.kind === "delta") onDelta(e.text);
      else if (e.kind === "error") failure = e.message;
    };
    const onAbort = () => { invoke("tutor_cancel", { id }).catch(() => {}); };
    signal?.addEventListener("abort", onAbort);
    try {
      await invoke("tutor_chat", { id, messages, onEvent: channel });
    } finally {
      signal?.removeEventListener("abort", onAbort);
    }
    if (failure && !signal?.aborted) throw new Error(failure);
    return;
  }
  if (!devBackend()) unavailable();
  const r = await fetch(`${DEV}/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages }), signal });
  if (!r.ok || !r.body) throw new Error(`teacher ${r.status}: ${await r.text()}`);
  await readSse(r.body, onDelta, signal);
}

/** Reads an OpenAI-style server-sent-event stream (llama-server) and yields content deltas. */
async function readSse(body: ReadableStream<Uint8Array>, onDelta: (t: string) => void, signal?: AbortSignal) {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done || signal?.aborted) break;
      buf += dec.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") return;
        const json = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
        for (const c of json.choices ?? []) if (c.delta?.content) onDelta(c.delta.content);
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

export async function storage(): Promise<Storage> {
  if (isNativeApp()) return invoke<Storage>("storage");
  if (devBackend()) return devGet<Storage>("/storage");
  return { contentBytes: 0, freeBytes: null };
}

/** Writes every installed book of a grade into one pack file (in Downloads). Returns its path. */
export async function exportPack(grade: number): Promise<{ path: string; bytes: number }> {
  if (isNativeApp()) return invoke("export_pack", { grade });
  return unavailable();
}

/** Installs the books inside a received pack file. Returns the ids of the books installed. */
export async function importPack(file: File): Promise<string[]> {
  if (isNativeApp()) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    return invoke<string[]>("import_pack", bytes, { headers: { "x-file-name": encodeURIComponent(file.name) } });
  }
  return unavailable();
}

export const canUsePacks = isNativeApp;
