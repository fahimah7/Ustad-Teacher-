import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { TextBook } from "./book";
import { PromptBuilder } from "./promptBuilder";

// The prompts this port builds for the real Grade 12 book must be identical, character for
// character, to the ones the Dart app built and that were evaluated with the model.
// Regenerate the reference with: (in app/) dart run tool/dump_prompts.dart > ../eval/prompts_dart.json
const root = join(import.meta.dirname, "..", "..", "..");
const reference = join(root, "eval", "prompts_dart.json");
const bookDir = join(root, "content", "g12-math");

test.skipIf(!existsSync(reference) || !existsSync(bookDir))("prompts match the evaluated Dart prompt builder on the real book", () => {
  const json = JSON.parse(readFileSync(join(bookDir, "book.json"), "utf8"));
  const packages = Array.from({ length: json.page_count }, (_, i) => {
    const p = join(bookDir, "packages", `${String(i + 1).padStart(4, "0")}.json`);
    return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
  });
  const builder = new PromptBuilder(new TextBook(json, packages), "RULES");
  const cases = JSON.parse(readFileSync(reference, "utf8")) as { page: number; question: string; sources: number[]; messages: { role: string; content: string }[] }[];
  expect(cases.length).toBeGreaterThan(5);
  for (const c of cases) {
    expect(builder.build(c.page, c.question).sourcePages, `${c.page}: ${c.question}`).toEqual(c.sources);
    const turn = builder.build(c.page, c.question, [{ role: "user", content: "قبلی" }, { role: "assistant", content: "جواب قبلی" }]);
    expect(turn.messages, `${c.page}: ${c.question}`).toEqual(c.messages);
  }
});
