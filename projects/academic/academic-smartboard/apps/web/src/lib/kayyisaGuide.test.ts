import { describe, expect, it } from "vitest";
import { answerKayyisa, KAYYISA_QUICK_PROMPTS, KAYYISA_TOPICS } from "./kayyisaGuide";

describe("kayyisaGuide", () => {
  it("has guide topics and quick prompts", () => {
    expect(KAYYISA_TOPICS.length).toBeGreaterThan(5);
    expect(KAYYISA_QUICK_PROMPTS.length).toBeGreaterThan(0);
  });

  it("answers empty with welcome", () => {
    const r = answerKayyisa("");
    expect(r.reply).toMatch(/Kak Kayyisa/i);
    expect(r.topic).toBeNull();
  });

  it("matches dashboard keywords", () => {
    const r = answerKayyisa("ringkasan smartboard");
    expect(r.topic?.id).toBe("dashboard-overview");
    expect(r.reply).toMatch(/Smartboard/i);
  });

  it("falls back when no keyword", () => {
    const r = answerKayyisa("xyzzy unrelated nonsense");
    expect(r.topic).toBeNull();
    expect(r.reply).toMatch(/belum menemukan/i);
  });
});
