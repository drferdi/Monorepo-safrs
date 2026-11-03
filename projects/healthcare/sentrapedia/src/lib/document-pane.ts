import type { Encounter, Message } from "./workspace";
import { hasAadiSource } from "./aadi/presentation";

// A document opens in the pane: every assistant answer but a question's prose. An AADI analysis is a document whatever
// mode sent it (spec 5: nothing of the report stays in the chat).
export const paneDocument = (message: Message) => message.role === "assistant" && (message.mode !== "question" || hasAadiSource(message));
export function paneDocuments(encounter?: Pick<Encounter, "messages">): Message[] {
  return encounter?.messages.filter(paneDocument) ?? [];
}
export function paneOpensFor(encounter?: Pick<Encounter, "messages">): boolean {
  return paneDocuments(encounter).length > 0;
}

// The editor toolbar: bold and italic wrap the selection; a heading or list item prefixes the line the selection starts on.
const wraps = { bold: "**", italic: "*" } as const;
const prefixes = { heading: "## ", list: "- " } as const;
export function applyMark(text: string, start: number, end: number, mark: "heading" | "bold" | "italic" | "list"): { text: string; start: number; end: number } {
  if (mark === "bold" || mark === "italic") {
    const wrap = wraps[mark];
    return { text: text.slice(0, start) + wrap + text.slice(start, end) + wrap + text.slice(end), start, end: end + wrap.length * 2 };
  }
  const prefix = prefixes[mark], line = start > 0 ? text.lastIndexOf("\n", start - 1) + 1 : 0;
  return { text: text.slice(0, line) + prefix + text.slice(line), start: start + prefix.length, end: end + prefix.length };
}
