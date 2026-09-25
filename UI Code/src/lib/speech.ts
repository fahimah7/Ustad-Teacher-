/** Voice, without a network.
 *
 *  Read-aloud uses only voices installed on the device (`localService`), so no
 *  text is ever sent to a cloud voice. Speech-to-text runs only where the
 *  platform can do it on the device (Chrome's `processLocally`, or a native
 *  recognizer in the mobile shell). Where it can't, her voice note is still
 *  recorded on the phone and she types or edits the transcript: the design
 *  already makes every transcript editable. */

export type Lang = "en" | "fa" | "ps";
const BCP47: Record<Lang, string[]> = { en: ["en-US", "en-GB", "en"], fa: ["fa-AF", "prs-AF", "fa-IR", "fa"], ps: ["ps-AF", "ps"] };

export function localVoices(): SpeechSynthesisVoice[] {
  if (!("speechSynthesis" in window)) return [];
  return speechSynthesis.getVoices().filter((v) => v.localService);
}

export function voiceFor(lang: Lang): SpeechSynthesisVoice | undefined {
  const vs = localVoices();
  for (const tag of BCP47[lang]) {
    const v = vs.find((x) => x.lang.toLowerCase().startsWith(tag.toLowerCase()));
    if (v) return v;
  }
  return undefined;
}

export const canSpeak = () => "speechSynthesis" in window;

export type SpeakHandle = { stop(): void; pause(): void; resume(): void };

export function speak(text: string, opts: { lang: Lang; rate?: number; onWord?: (charIndex: number) => void; onEnd?: () => void }): SpeakHandle | null {
  if (!canSpeak()) return null;
  const voice = voiceFor(opts.lang);
  // No local voice for this language: stay silent rather than reach for a cloud one.
  if (!voice) { opts.onEnd?.(); return null; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/\*\*/g, ""));
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = opts.rate ?? 1;
  u.onboundary = (e) => { if (e.name === "word" || e.charIndex !== undefined) opts.onWord?.(e.charIndex); };
  u.onend = () => opts.onEnd?.();
  u.onerror = () => opts.onEnd?.();
  speechSynthesis.speak(u);
  return { stop: () => speechSynthesis.cancel(), pause: () => speechSynthesis.pause(), resume: () => speechSynthesis.resume() };
}

/* ── on-device recognition ─────────────────────────────────────── */

type SR = {
  lang: string; interimResults: boolean; continuous: boolean; processLocally?: boolean;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null; onerror: ((e: unknown) => void) | null;
};
type SRCtor = { new (): SR; available?: (o: { langs: string[]; processLocally: boolean }) => Promise<string> };

function srCtor(): SRCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/** True only when recognition is already installed on this device. We never
 *  trigger a language download, and we never fall back to server recognition. */
export async function canRecognizeLocally(lang: Lang): Promise<boolean> {
  const C = srCtor();
  if (!C?.available) return false;
  try {
    return (await C.available({ langs: [BCP47[lang][0]], processLocally: true })) === "available";
  } catch {
    return false;
  }
}

export function recognizeLocally(lang: Lang, onText: (text: string, final: boolean) => void): { stop(): void } | null {
  const C = srCtor();
  if (!C) return null;
  const r = new C();
  r.lang = BCP47[lang][0];
  r.interimResults = true;
  r.continuous = true;
  r.processLocally = true;
  if (r.processLocally !== true) return null; // property unsupported: would use a server
  r.onresult = (e) => {
    let text = "", final = true;
    for (let i = 0; i < e.results.length; i++) { text += e.results[i][0].transcript; final = final && e.results[i].isFinal; }
    onText(text.trim(), final);
  };
  r.onerror = () => {};
  r.start();
  return { stop: () => r.stop() };
}

/* ── voice notes: recorded and kept on the phone ───────────────── */

export type Recording = { stop(): Promise<{ blob: Blob; seconds: number }>; level(): number; cancel(): void };

export async function record(): Promise<Recording | null> {
  if (!navigator.mediaDevices?.getUserMedia) return null;
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    return null;
  }
  const ctx = new AudioContext();
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  src.connect(analyser);
  const buf = new Uint8Array(analyser.frequencyBinCount);
  const chunks: Blob[] = [];
  const rec = new MediaRecorder(stream);
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const started = performance.now();
  rec.start();
  const end = () => { stream.getTracks().forEach((t) => t.stop()); ctx.close(); };
  return {
    level() {
      analyser.getByteTimeDomainData(buf);
      let peak = 0;
      for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
      return Math.min(1, peak / 64);
    },
    stop: () => new Promise((resolve) => {
      rec.onstop = () => { end(); resolve({ blob: new Blob(chunks, { type: rec.mimeType }), seconds: (performance.now() - started) / 1000 }); };
      rec.stop();
    }),
    cancel() { rec.onstop = null; try { rec.stop(); } catch { /* already stopped */ } end(); },
  };
}

export const fmtDur = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
