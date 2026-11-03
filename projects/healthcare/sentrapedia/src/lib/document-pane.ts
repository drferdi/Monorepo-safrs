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

// The editor toolbar: bold and italic wrap the selection (an empty one leaves the caret between the marks); a heading
// prefixes the line the selection starts on, a list item every selected line. A line already marked is left as it is.
const wraps = { bold: "**", italic: "*" } as const;
const prefixes = { heading: "## ", list: "- " } as const;
export function applyMark(text: string, start: number, end: number, mark: "heading" | "bold" | "italic" | "list"): { text: string; start: number; end: number } {
  if (mark === "bold" || mark === "italic") {
    const wrap = wraps[mark], marked = text.slice(0, start) + wrap + text.slice(start, end) + wrap + text.slice(end);
    return start === end ? { text: marked, start: start + wrap.length, end: start + wrap.length } : { text: marked, start, end: end + wrap.length * 2 };
  }
  const prefix = prefixes[mark], first = start > 0 ? text.lastIndexOf("\n", start - 1) + 1 : 0;
  const lines = [first];
  if (mark === "list") for (let at = text.indexOf("\n", first); at >= 0 && at + 1 < end; at = text.indexOf("\n", at + 1)) lines.push(at + 1);
  const added = lines.filter((line) => !text.startsWith(prefix, line));
  let next = text;
  for (const line of [...added].reverse()) next = next.slice(0, line) + prefix + next.slice(line);
  return { text: next, start: start + (added.includes(first) ? prefix.length : 0), end: end + added.length * prefix.length };
}
