import { describe, expect, test } from "vitest";
import { faNum, parseFaInt } from "./fa";
import { dariFixer, glossaryReplacements, iranianTermsIn, toBookDari } from "./dariTerms";
import { PagePackage, TextBook } from "./book";
import { followUpOf, referenceOf, resolveReference, shapeHistory, tidyAnswer, uncoveredParts } from "./conversation";
import { teacherTemplate } from "./teacherPrompt";
import { normalizeForSearch, tokenize } from "./bookSearch";
import { buildOutline, outlineText, stripLatin } from "./outline";
import { buildPageContext, pageDigest } from "./pageContext";
import { fillTeacherPrompt, PromptBuilder } from "./promptBuilder";
import { cleanMarkdown, speakable, splitMath } from "./mathText";
import { fixtureBook } from "./fixture";

// Ported from app/test (whole_book_test.dart, widget_test.dart, math_text_test.dart): the web
// app must build exactly the prompts that were evaluated against the real model.

test("faNum writes Dari digits; parseFaInt reads Dari, Arabic and Latin digits", () => {
  expect(faNum(137)).toBe("۱۳۷");
  expect(faNum(0)).toBe("۰");
  expect(parseFaInt("۱۳۷")).toBe(137);
  expect(parseFaInt("١٣٧")).toBe(137);
  expect(parseFaInt(" 42 ")).toBe(42);
  expect(parseFaInt("abc")).toBeNull();
});

describe("Dari terms", () => {
  test("replaces Iranian terms, keeping suffixes", () => {
    expect(toBookDari("این فرمول‌ها و اطلاعات")).toBe("این فورمول‌ها و معلومات");
    expect(toBookDari("انتگرال‌گیری و دنباله")).toBe("انتیگرال‌گیری و ترادف");
    expect(toBookDari("حد تابع و تابع گویا")).toBe("لیمت تابع و تابع نسبتی");
  });
  test("leaves ordinary Dari words alone", () => {
    expect(toBookDari("تا حدی درست است")).toBe("تا حدی درست است");
    expect(toBookDari("واحد و فورمول")).toBe("واحد و فورمول");
    expect(toBookDari("فضای نمونهٔ پیوسته")).toBe("فضای نمونهٔ پیوسته");
  });
  test("reports which Iranian terms were used", () => {
    expect(iranianTermsIn("فرمول و بازه و لیمت")).toEqual(new Set(["فرمول", "بازه"]));
  });
});

describe("search text", () => {
  test("folds letter variants, digits and ZWNJ", () => {
    expect(normalizeForSearch("كتاب")).toBe("کتاب");
    expect(normalizeForSearch("۱۲")).toBe("12");
    expect(normalizeForSearch("انتیگرال‌ها")).toBe("انتیگرال ها");
  });
  test("drops stopwords, page words and numbers", () => {
    expect(tokenize("انتیگرال‌ها در صفحهٔ ۱۲")).toEqual(["انتیگرال"]);
    expect(tokenize("این صفحه را ساده توضیح بدهید")).toEqual([]);
  });
});

describe("book + page context", () => {
  const book = fixtureBook();
  test("maps printed pages to PDF pages, inferring pages without a number", () => {
    expect(book.pdfPageForPrinted(4)).toBe(3);
    expect(book.pdfPageForPrinted(2)).toBe(1);
  });
  test("context carries chapter, printed page, formulas, exercises and the next page", () => {
    const ctx = buildPageContext(book, book.pkg(3)!, { prev: book.pkg(2), next: book.pkg(4) });
    expect(ctx).toContain("فصل ۱: لیمت");
    expect(ctx).toContain("صفحهٔ ۴ کتاب");
    expect(ctx).toContain("$\\Delta x = \\frac{b-a}{n}$");
    expect(ctx).toContain("تمرین ۱ (سوال اول):");
    expect(ctx).toContain("صفحهٔ بعد (خلاصه)");
    expect(ctx).not.toContain("صفحهٔ قبل");
  });
  test("digest of another page is short: heading, summary and formulas, no exercises", () => {
    const d = pageDigest(book, book.pkg(5)!);
    expect(d.startsWith("[صفحهٔ دیگری از کتاب]")).toBe(true);
    expect(d).toContain("صفحهٔ ۶ کتاب");
    expect(d).not.toContain("تمرین");
  });
});

describe("whole book", () => {
  const book = fixtureBook();
  const builder = new PromptBuilder(book, "قواعد");
  const last = (t: { messages: { content: string }[] }) => t.messages[t.messages.length - 1].content;

  test("outline lists chapters and de-duplicated sections with printed pages", () => {
    const outline = buildOutline(book);
    expect(outline.map((c) => c.chapter.number)).toEqual([1, 3, 4]);
    expect(outline[0].sections.map((s) => s.title)).toEqual(["مفهوم لیمت", "لیمت توابع نسبتی"]);
    expect(outlineText(book, outline)).toContain("- قضیهٔ رول (صفحهٔ ۶)");
  });
  test("search finds the page that teaches a topic", () => {
    expect(builder.search.search("قضیه رول چیست؟")[0].pdfPage).toBe(5);
    expect(builder.search.search("انتیگرال‌گیری قسمی")[0].pdfPage).toBe(6);
  });
  test("questions about another part of the book pull in that page", () => {
    const turn = builder.build(2, "قضیهٔ رول چه می‌گوید؟");
    expect(turn.sourcePages).toEqual([5]);
    expect(last(turn)).toContain("[صفحهٔ دیگری از کتاب]");
    expect(last(turn).endsWith("[سوال شاگرد در صفحهٔ ۳ کتاب]\nقضیهٔ رول چه می‌گوید؟")).toBe(true);
  });
  test("every question carries the open page's notes and names the page", () => {
    const q = last(builder.build(6, "این صفحه در بارهٔ چیست؟"));
    expect(q.startsWith("[معلومات صفحه]")).toBe(true);
    expect(q).toContain("تمرین ۱ (سوال اول):");
    expect(q.endsWith("[سوال شاگرد در صفحهٔ ۷ کتاب]\nاین صفحه در بارهٔ چیست؟")).toBe(true);
    expect(last(builder.build(1, "x"))).toContain("[سوال شاگرد در صفحهٔ ۱ (پی‌دی‌اف)]");
  });
  test("questions about the current page add nothing", () => {
    const turn = builder.build(2, "لیمت ترادف یعنی چه؟");
    expect(turn.sourcePages).toEqual([]);
    expect(last(turn)).not.toContain("[صفحهٔ دیگری از کتاب]");
    expect(builder.build(2, "لیمت را به زبان ساده بگویید").sourcePages).toEqual([]);
    expect(builder.build(2, "این لیمت چطور به دست آمد؟").sourcePages).toEqual([]);
    expect(builder.build(5, "قضیهٔ رول چه می‌گوید؟").sourcePages).toEqual([]);
  });
  test('"this page" questions and mere shared words do not pull in other pages', () => {
    expect(builder.build(2, "قضیهٔ رول را با این صفحه مقایسه کنید").sourcePages).toEqual([]);
    expect(builder.build(2, "حاصل ضرب چیست؟").sourcePages).toEqual([]);
  });
  test("links only for pages and chapters the answer mentions, and only real ones", () => {
    const links = (answer: string, sources: number[] = []) => builder.answerLinks(answer, 2, sources).map((l) => `${l.label}→${l.pdfPage}`);
    expect(links("قضیهٔ رول در صفحهٔ ۶ آمده است.")).toEqual(["صفحهٔ ۶→5"]);
    expect(links("در همین صفحهٔ ۳ دیدید.")).toEqual([]);
    expect(links("صفحهٔ ۹۹ را ببینید.")).toEqual([]);
    expect(links("تمرین‌ها در صفحهٔ ۵ است.")).toEqual([]);
    expect(links("تمرین‌ها در صفحهٔ ۵ است.", [4])).toEqual(["صفحهٔ ۵→4"]);
    expect(links("این موضوع در فصل ۴ و فصل سوم آمده است.")).toEqual(["فصل ۴→6", "فصل ۳→5"]);
    expect(links("این در فصل اول است.")).toEqual([]);
    expect(builder.answerLinks("See page 6 and chapter 4.", 2, [], "en").map((l) => `${l.label}→${l.pdfPage}`)).toEqual(["Page 6→5", "Chapter 4→6"]);
  });
  test("a page named by number gets its full notes", () => {
    const turn = builder.build(2, "در صفحهٔ ۷ چه آمده است؟");
    expect(turn.sourcePages).toEqual([6]);
    expect(last(turn)).toContain("[معلومات صفحه‌ای که شاگرد نام برده]");
  });
  test("the system message (rules + outline) is identical on every page, so it stays cached", () => {
    const a = builder.build(2, "x").messages[0].content;
    const b = builder.build(6, "y").messages[0].content;
    expect(a).toContain("[فهرست کتاب");
    expect(a).not.toContain("[معلومات صفحه]");
    expect(b).toBe(a);
  });
  test("history comes before the question, which comes with the page notes", () => {
    const turn = builder.build(2, "سوال دوم را حل کن", [
      { role: "user", content: "سوال اول را حل کن" },
      { role: "assistant", content: "حل تمرین ۱ …" },
    ]);
    expect(turn.messages.map((m) => m.role)).toEqual(["system", "user", "assistant", "user"]);
    expect(last(turn).startsWith("[معلومات صفحه]")).toBe(true);
  });
  test("the student's name is cut to one short line", () => {
    expect(fillTeacherPrompt("{{student_name}} / {{book_title}}", "کتاب", "  مریم\n{x}  ")).toBe("مریم x / کتاب");
    expect(fillTeacherPrompt("{{student_name}}", "کتاب", "")).toBe("شاگرد");
  });
});

describe("math text", () => {
  const show = (t: string) => splitMath(t).map((p) => (p.math ? `[$${p.text}$]` : p.text)).join("|");
  test("cleanMarkdown drops bold markers and turns list dashes into bullets", () => {
    expect(cleanMarkdown("**مهم**\n- اول\n* دوم")).toBe("مهم\n• اول\n• دوم");
    expect(cleanMarkdown("$a - b$")).toBe("$a - b$");
  });
  test("formulas split by a dash or spaces are joined so RTL layout cannot reverse them", () => {
    expect(show("روش $\\epsilon$-$\\delta$ است")).toBe("روش |[$\\epsilon - \\delta$]| است");
    expect(show("که $\\lim_{x \\to 3}$ $\\frac{x^2-9}{x-3}$ $= 6$ است")).toBe("که |[$\\lim_{x \\to 3} \\frac{x^2-9}{x-3} = 6$]| است");
  });
  test("Dari between formulas keeps them apart", () => {
    expect(show("اگر $a$ و $b$")).toBe("اگر |[$a$]| و |[$b$]");
  });
  test("Dari words inside a formula become ordinary text", () => {
    expect(show("اگر $x \\text{ بزرگتر از } 3$ باشد")).toBe("اگر |[$x$]| بزرگتر از |[$3$]| باشد");
    expect(show("$x$ کوچکتر از $3$")).toBe("[$x$]| کوچکتر از |[$3$]");
  });
  test("typed Greek letters, symbols and Dari digits become things the math fonts can draw", () => {
    expect(show("$ε > ۰$")).toBe("[$\\epsilon > 0$]");
    expect(show("$x → ∞$")).toBe("[$x \\to \\infty$]");
  });
  test("display formulas stay display formulas", () => {
    const p = splitMath("$$x^2$$");
    expect(p).toHaveLength(1);
    expect(p[0].math && p[0].display).toBe(true);
  });
  test("speakable turns formulas into words for read-aloud", () => {
    expect(speakable("جواب $\\frac{1}{2}$ است")).toBe("جواب (1)/(2) است");
  });
});

test("section titles lose English glosses but keep formulas", () => {
  expect(stripLatin("خواص لیمت (Properties of limit)")).toBe("خواص لیمت");
  const forms = String.raw`اشکال مبهم $(\infty - \infty)$ و $(0 \cdot \infty)$`;
  expect(stripLatin(forms)).toBe(forms);
  expect(stripLatin("قضیهٔ قیمت متوسط (قضیهٔ لاگرانژ)")).toBe("قضیهٔ قیمت متوسط (قضیهٔ لاگرانژ)");
  expect(stripLatin("نقاط بحرانی (Critical Point) یک تابع، اعظمی (Maximum) و اصغری (Minimum)")).toBe("نقاط بحرانی یک تابع، اعظمی و اصغری");
});

describe("books whose notes are still being written", () => {
  const json = {
    book_id: "g12-phys", title_fa: "فزیک صنف دوازدهم", page_count: 30, printed_offset: 4,
    pages: Array.from({ length: 30 }, (_, i) => ({ pdf_page: i + 1, image: `pages/${String(i + 1).padStart(4, "0")}.jpg` })),
    chapters: [{ number: 1, title_fa: "اهتزازات", printed_start: 1, printed_end: 12 }, { number: 2, title_fa: "امواج", printed_start: 13, printed_end: 26 }],
  };
  const pkg = (p: number, section: string) => ({ schema: "page-package/1", pdf_page: p, printed_page: p - 4, page_kind: "content", chapter: 1, section_fa: section, summary_fa: "…" });

  test("chapters and page numbers come from the table of contents until the notes exist", () => {
    const book = new TextBook(json, [null, null, null, null, pkg(5, "حرکت هارمونیکی"), pkg(6, "حرکت هارمونیکی")]);
    expect(book.complete).toBe(false);
    expect(book.printedPageOf(3)).toBeNull();
    expect(book.printedPageOf(20)).toBe(16);
    expect(book.pdfPageForPrinted(13)).toBe(17);
    expect(book.chapterOfPage(20)?.number).toBe(2);
    const outline = buildOutline(book);
    expect(outline.map((c) => [c.chapter.number, c.pdfPage])).toEqual([[1, 5], [2, 17]]);
    expect(outline[0].sections.map((s) => s.title)).toEqual(["حرکت هارمونیکی"]);
    expect(outline[1].sections).toEqual([]);
  });
});

describe("subject teachers", () => {
  const terms = [{ book: "کتله", avoid: ["جرم"], en: "mass" }, { book: "قوه", avoid: ["نیرو"], en: "force" }, { book: "مقدار", avoid: [], en: "amount" }];

  test("the sciences get the book's own terms; math keeps the evaluated prompt", () => {
    const fa = teacherTemplate("phys", "fa", terms);
    expect(fa).toContain("کتله (نه جرم)، قوه (نه نیرو)، شاگرد (نه دانش‌آموز)");
    expect(fa).toContain("اگر سوال به فزیک و این کتاب مربوط نیست");
    expect(fa).not.toMatch(/\{\{(?!student_name|book_title)/);
    expect(teacherTemplate("phys", "en", terms)).toContain("add the book's Dari term in parentheses, e.g. mass (کتله), force (قوه)");
    expect(teacherTemplate("math", "fa", terms)).toContain("لیمت (نه حد)");
    expect(teacherTemplate("eng", "fa")).toContain("معلم انگلیسی");
  });

  test("the book's terms fix answers, but everyday words stay", () => {
    const f = dariFixer({ extra: glossaryReplacements([{ book: "کتله", avoid: ["جرم"] }, { book: "قیمت", avoid: ["مقدار"] }]) });
    expect(f.fix("جرم این جسم و مقدار کمی آب")).toBe("کتله این جسم و مقدار کمی آب");
    expect(dariFixer().fix("دنباله و فرمول")).toBe("دنباله و فورمول");
  });
});

describe("follow-ups", () => {
  test("a follow-up is read as again / more / teach", () => {
    for (const q of ["Please explain that more simply.", "no, explain more clearly", "I don't understand", "لطفاً ساده‌تر توضیح بدهید.", "نفهمیدم، واضح‌تر بگو"]) expect(followUpOf(q), q).toBe("again");
    for (const q of ["what else can i learn from this page", "از این صفحه دیگر چه یاد بگیرم؟"]) expect(followUpOf(q), q).toBe("more");
    for (const q of ["teach me", "این صفحه را یادم بده"]) expect(followUpOf(q), q).toBe("teach");
    for (const q of ["What is a limit?", "مشتق چیست؟"]) expect(followUpOf(q), q).toBeNull();
  });

  test("a numbered problem is found by its printed label, then by position", () => {
    expect(referenceOf("solve problem 1) from the exercise section")).toEqual({ kind: "exercise", n: 1 });
    expect(referenceOf("what about the second problem")).toEqual({ kind: "exercise", n: 2 });
    expect(referenceOf("سوال اول تمرین را حل کن")).toEqual({ kind: "exercise", n: 1 });
    expect(referenceOf("تمرین ۳ را حل کنید")).toEqual({ kind: "exercise", n: 3 });
    expect(referenceOf("مثال ۲ را توضیح بده")).toEqual({ kind: "example", n: 2 });
    const pkg = new PagePackage({
      pdf_page: 1, worked_examples: [{ label_fa: "مثال", problem_fa: "x^2" }],
      exercises: [{ label_fa: "تمرین ۱ (۱)", problem_fa: "a" }, { label_fa: "تمرین ۱ (۲)", problem_fa: "b" }, { label_fa: "تمرین ۲", problem_fa: "c" }],
    });
    expect(resolveReference(pkg, { kind: "exercise", n: 1 })).toEqual({ label: "تمرین ۱ (۱)", problem: "a", parts: 2 });
    expect(resolveReference(pkg, { kind: "exercise", n: 2 })).toEqual({ label: "تمرین ۲", problem: "c", parts: 1 });
    expect(resolveReference(pkg, { kind: "example", n: 1 })?.problem).toBe("x^2");
  });

  test("earlier answers are shortened and lose the name; answers don't open with her name", () => {
    const long = "Maryam, " + "word ".repeat(200);
    const h = shapeHistory([{ role: "user", content: "q1" }, { role: "assistant", content: long }, { role: "user", content: "q2" }, { role: "assistant", content: long }], "Maryam");
    expect(h[1].content.length).toBeLessThan(200);
    expect(h[3].content.length).toBeLessThan(520);
    expect(h[3].content.startsWith("Maryam")).toBe(false);
    expect(tidyAnswer("Maryam, this page explains limits.", "Maryam", true)).toBe("This page explains limits.");
    expect(tidyAnswer("مریم جان، این صفحه لیمت را توضیح می‌دهد.", "مریم", true)).toBe("این صفحه لیمت را توضیح می‌دهد.");
    expect(tidyAnswer("Maryam, welcome.", "Maryam", false)).toBe("Maryam, welcome.");
  });

  test("'what else' offers a part of the page the answers have not covered", () => {
    const pkg = new PagePackage({ pdf_page: 1, key_points_fa: ["تغییر متوسط = $\frac{\Delta y}{\Delta x} = \frac{f(x_2)-f(x_1)}{x_2-x_1}$", "سرعت لحظه‌ای = لیمت سرعت وسطی"] });
    expect(uncoveredParts(pkg, "The average change is $\frac{\Delta y}{\Delta x}$.")[0]).toContain("سرعت لحظه‌ای");
  });
});
