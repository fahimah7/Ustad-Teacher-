/** Protecting a letter, on the phone.
 *
 *  Rules take out what could identify her: her name, other people's names,
 *  cities and provinces, school names, phone numbers, emails and exact dates.
 *  Nothing is sent anywhere to do this. She then reviews every change, and can
 *  edit more, before choosing to keep the letter or share it. */

export type Seg =
  | { t: "keep"; text: string }
  | { t: "removed"; text: string }
  | { t: "general"; from: string; to: string };

export type Change = { kind: "name" | "city" | "school" | "phone" | "email" | "date"; original: string; replacement?: string };

export type Scrubbed = { segments: Seg[]; changes: Change[]; cleaned: string };

const NAMES = [
  "Mariam", "Maryam", "Fatima", "Zahra", "Sara", "Sarah", "Parwana", "Nilofar", "Nilufar", "Laila", "Layla", "Shabnam", "Farzana", "Hamida", "Habiba", "Madina", "Marzia", "Mursal", "Nazanin", "Roya", "Sadaf", "Sahar", "Sana", "Soraya", "Tahmina", "Yalda", "Zainab", "Zarghona", "Freshta", "Fereshta", "Masooma", "Khadija", "Aisha", "Amina", "Arezo", "Arezoo", "Hasina", "Homa", "Karima", "Latifa", "Malalai", "Mahbooba", "Nargis", "Nasrin", "Nooria", "Parisa", "Rahima", "Razia", "Shakila", "Shukria", "Wahida", "Zakia", "Zohra",
  "Ahmad", "Mohammad", "Muhammad", "Ali", "Hassan", "Hussain", "Omar", "Karim", "Rahim", "Farid", "Jawad", "Javed", "Hamid", "Nasir", "Rashid", "Wahid", "Yusuf", "Idris", "Bilal", "Samir", "Tariq", "Zahir", "Naveed", "Khalid", "Mustafa",
  "مریم", "فاطمه", "زهرا", "سارا", "پروانه", "نیلوفر", "لیلا", "شبنم", "فرزانه", "حمیده", "مدینه", "مرضیه", "مرسل", "رویا", "صدف", "سحر", "ثریا", "تهمینه", "یلدا", "زینب", "فرشته", "معصومه", "خدیجه", "عایشه", "آرزو", "حسینا", "کریمه", "لطیفه", "ملالی", "نرگس", "نسرین", "ناهید", "احمد", "محمد", "علی", "حسن", "حسین", "عمر", "کریم", "رحیم", "فرید", "جواد", "حامد", "ناصر",
];

const PLACES = [
  "Kabul", "Herat", "Kandahar", "Mazar-i-Sharif", "Mazar-e-Sharif", "Mazar", "Jalalabad", "Kunduz", "Bamyan", "Bamiyan", "Ghazni", "Balkh", "Badakhshan", "Helmand", "Lashkar Gah", "Nangarhar", "Paktia", "Khost", "Panjshir", "Parwan", "Takhar", "Faryab", "Logar", "Wardak", "Kapisa", "Laghman", "Kunar", "Nuristan", "Samangan", "Sar-e Pol", "Jowzjan", "Baghlan", "Daikundi", "Uruzgan", "Zabul", "Farah", "Nimroz", "Ghor", "Badghis", "Paktika", "Charikar", "Pul-e-Khumri", "Fayzabad", "Taloqan", "Sheberghan", "Maimana", "Chaghcharan", "Qala-e-Naw",
  "کابل", "هرات", "قندهار", "مزار شریف", "مزار", "جلال‌آباد", "کندز", "بامیان", "غزنی", "بلخ", "بدخشان", "هلمند", "ننگرهار", "پکتیا", "خوست", "پنجشیر", "پروان", "تخار", "فاریاب", "لوگر", "وردک", "کاپیسا", "لغمان", "کنر", "نورستان", "سمنگان", "جوزجان", "بغلان", "دایکندی", "ارزگان", "زابل", "فراه", "نیمروز", "غور", "بادغیس", "پکتیکا",
];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const NAME_RE = new RegExp(`(?<![\\p{L}])(${NAMES.map(esc).join("|")})(?![\\p{L}])`, "giu");
const PLACE_RE = new RegExp(`(?<![\\p{L}])(${PLACES.slice().sort((a, b) => b.length - a.length).map(esc).join("|")})(?![\\p{L}])`, "giu");
const SCHOOL_RE = /((?:[A-Z][\p{L}'-]+\s+){1,4}?)(High School|Girls' School|Girls School|School|Lycée|Lycee|University|Academy|Institute)\b/gu;
const SCHOOL_FA_RE = /(لیسه|مکتب|دانشگاه|پوهنتون)\s+((?:[؀-ۿ‌]+\s?){1,3})/gu;
const PHONE_RE = /(?:\+?93|0)?[\s-]?7\d{2}[\s-]?\d{3}[\s-]?\d{3}|\b\d{9,}\b/g;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const DATE_RE = /\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/g;
const INTRO_RE = /^\s*(?:I am|I'm|my name is|this is|من|نام من|اسم من|زه)\s+/iu;

type Span = { start: number; end: number; seg: Seg; change: Change };

export function scrub(text: string): Scrubbed {
  const sentences = text.match(/[^.!?؟\n]+[.!?؟]*\s*|\n+/g) ?? [text];
  const segments: Seg[] = [];
  const changes: Change[] = [];

  for (const s of sentences) {
    // A self-introduction ("I am Mariam, from Herat.") goes as a whole.
    NAME_RE.lastIndex = 0;
    const introduces = INTRO_RE.test(s) && NAME_RE.test(s);
    NAME_RE.lastIndex = 0;
    if (introduces) {
      segments.push({ t: "removed", text: s.trimEnd() });
      const trail = s.slice(s.trimEnd().length);
      if (trail) segments.push({ t: "keep", text: trail });
      for (const m of s.matchAll(NAME_RE)) changes.push({ kind: "name", original: m[1] });
      for (const m of s.matchAll(PLACE_RE)) changes.push({ kind: "city", original: m[1] });
      continue;
    }
    const spans: Span[] = [];
    const add = (re: RegExp, make: (m: RegExpMatchArray) => { seg: Seg; change: Change; start?: number; len?: number }) => {
      re.lastIndex = 0;
      for (const m of s.matchAll(re)) {
        const r = make(m);
        const start = (m.index ?? 0) + (r.start ?? 0);
        const end = start + (r.len ?? m[0].length);
        if (spans.some((x) => start < x.end && end > x.start)) continue;
        spans.push({ start, end, seg: r.seg, change: r.change });
      }
    };
    add(SCHOOL_RE, (m) => {
      const kind = /university/i.test(m[2]) ? "university" : /high|lyc/i.test(m[2]) ? "high school" : "school";
      return { seg: { t: "general", from: m[0].trim(), to: kind }, change: { kind: "school", original: m[0].trim(), replacement: kind } };
    });
    add(SCHOOL_FA_RE, (m) => {
      const kind = m[1] === "دانشگاه" || m[1] === "پوهنتون" ? "دانشگاه" : "مکتب";
      return { seg: { t: "general", from: m[0].trim(), to: kind }, change: { kind: "school", original: m[0].trim(), replacement: kind } };
    });
    add(EMAIL_RE, (m) => ({ seg: { t: "removed", text: m[0] }, change: { kind: "email", original: m[0] } }));
    add(PHONE_RE, (m) => ({ seg: { t: "removed", text: m[0].trim() }, change: { kind: "phone", original: m[0].trim() } }));
    add(DATE_RE, (m) => ({ seg: { t: "general", from: m[0], to: "one day" }, change: { kind: "date", original: m[0], replacement: "one day" } }));
    add(PLACE_RE, (m) => {
      const fa = /[؀-ۿ]/.test(m[1]);
      return { seg: { t: "general", from: m[1], to: fa ? "شهرم" : "my city" }, change: { kind: "city", original: m[1], replacement: fa ? "شهرم" : "my city" } };
    });
    add(NAME_RE, (m) => ({ seg: { t: "removed", text: m[1] }, change: { kind: "name", original: m[1] } }));

    spans.sort((a, b) => a.start - b.start);
    let at = 0;
    for (const sp of spans) {
      if (sp.start > at) segments.push({ t: "keep", text: s.slice(at, sp.start) });
      segments.push(sp.seg);
      changes.push(sp.change);
      at = sp.end;
    }
    if (at < s.length) segments.push({ t: "keep", text: s.slice(at) });
  }

  const cleaned = segments
    .map((g) => (g.t === "keep" ? g.text : g.t === "general" ? g.to : ""))
    .join("")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,!?؟،])/g, "$1")
    .trim();
  return { segments: mergeKeeps(segments), changes: dedupe(changes), cleaned };
}

function mergeKeeps(segs: Seg[]): Seg[] {
  const out: Seg[] = [];
  for (const s of segs) {
    const last = out[out.length - 1];
    if (s.t === "keep" && last?.t === "keep") last.text += s.text;
    else out.push({ ...s });
  }
  return out;
}

function dedupe(c: Change[]): Change[] {
  const seen = new Set<string>();
  return c.filter((x) => {
    const k = x.kind + ":" + x.original.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
