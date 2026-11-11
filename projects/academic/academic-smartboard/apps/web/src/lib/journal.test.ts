import { describe, expect, it } from "vitest";
import {
  isJournalAuthorRole,
  isJournalParentRole,
  journalStatusLabel,
} from "./journal.ts";

describe("journal helpers", () => {
  it("maps known status labels", () => {
    expect(journalStatusLabel("terbuka")).toBe("Terbuka");
    expect(journalStatusLabel("selesai")).toBe("Selesai");
    expect(journalStatusLabel("custom")).toBe("custom");
  });

  it("classifies author vs parent roles", () => {
    expect(isJournalAuthorRole("tentor")).toBe(true);
    expect(isJournalAuthorRole("murid_ortu")).toBe(false);
    expect(isJournalParentRole("murid_ortu")).toBe(true);
    expect(isJournalParentRole("owner")).toBe(false);
  });
});
