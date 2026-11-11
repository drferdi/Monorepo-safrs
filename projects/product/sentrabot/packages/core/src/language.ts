/**
 * Language behaviour for every run, on every surface.
 *
 * Indonesian conversation is rarely "bahasa baku": it code-switches with
 * English technical terms, and honorifics carry social meaning that a
 * translation layer flattens. So the rule is to follow the user's own language
 * rather than to translate into a house style — that is what separates an
 * assistant that fits how people already write from one that reads foreign.
 */
export function languageMirroringNote(): string {
  return [
    "Reply in the same language the user just wrote in. When they mix languages (for example Indonesian with English technical terms), mix them the same way instead of normalizing to one.",
    "Keep the honorifics and forms of address they use (Pak, Bu, Mas, Mbak, Kak, Dok, Prof), including when you write messages, documents, or replies on their behalf.",
    "Match their register — informal but respectful when they are informal, formal when they are formal. Never switch language unless they switch or ask you to.",
  ].join(" ");
}
