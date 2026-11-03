import { describe, expect, it } from "vitest";
import { applyMark, paneDocuments, paneOpensFor } from "../src/lib/document-pane";
import type { Message } from "../src/lib/workspace";
import type { ModeId } from "../src/lib/drafts";

let next = 0;
const message = (role: Message["role"], mode: ModeId): Message => ({ id: `m${++next}`, role, mode, content: `# ${mode}`, createdAt: "2026-11-04T05:00:00.000Z" });
const u = (mode: ModeId) => message("user", mode);
const a = (mode: ModeId) => message("assistant", mode);

describe("the document pane", () => {
  it("pane documents are assistant messages of every mode but question, in order", () => {
    const e = { messages: [u("question"), a("question"), u("ddx"), a("ddx"), a("clinic")] };
    expect(paneDocuments(e).map(m => m.mode)).toEqual(["ddx", "clinic"]);
    expect(paneOpensFor({ messages: [u("question"), a("question")] })).toBe(false);
    expect(paneOpensFor(e)).toBe(true);
    expect(paneOpensFor(undefined)).toBe(false);
  });
  it("an AADI analysis is a pane document even when the question mode sent it", () => {
    const analysis: Message = { ...a("question"), sourceText: JSON.stringify({ kind: "AADI", contractVersion: "1" }) };
    expect(paneDocuments({ messages: [u("question"), analysis, a("question")] })).toEqual([analysis]);
  });
  it("applyMark leaves an empty bold or italic selection between the marks", () => {
    expect(applyMark("ab", 1, 1, "bold")).toEqual({ text: "a****b", start: 3, end: 3 });
    expect(applyMark("ab", 1, 1, "italic")).toEqual({ text: "a**b", start: 2, end: 2 });
  });
  it("applyMark makes every selected line a list item", () => {
    expect(applyMark("a\nb\nc", 0, 5, "list")).toEqual({ text: "- a\n- b\n- c", start: 2, end: 11 });
    expect(applyMark("a\n- b\nc", 2, 7, "list")).toEqual({ text: "a\n- b\n- c", start: 2, end: 9 });
  });
  it("applyMark does not double a heading or list prefix the line already has", () => {
    expect(applyMark("## a", 4, 4, "heading")).toEqual({ text: "## a", start: 4, end: 4 });
    expect(applyMark("x\n- y", 4, 5, "list")).toEqual({ text: "x\n- y", start: 4, end: 5 });
  });
  it("applyMark wraps a selection and places the caret after it", () => {
    expect(applyMark("abc def", 4, 7, "bold")).toEqual({ text: "abc **def**", start: 4, end: 11 });
    expect(applyMark("abc", 0, 0, "heading")).toEqual({ text: "## abc", start: 3, end: 3 });
    expect(applyMark("x\ny", 2, 3, "list")).toEqual({ text: "x\n- y", start: 4, end: 5 });
    expect(applyMark("abc def", 0, 3, "italic")).toEqual({ text: "*abc* def", start: 0, end: 5 });
  });
});
