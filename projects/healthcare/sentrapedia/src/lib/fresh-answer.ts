import type { Message } from "./workspace";

// Answers already revealed on this page: a fresh answer enters once (an analysis by typing out), a reopened one appears at once.
const revealed = new Set<string>();
export const freshAnswerMs = 20000;
export const freshAnswer = (message: Message) => !revealed.has(message.id) && Date.now() - Date.parse(message.createdAt) < freshAnswerMs;
export const markRevealed = (id: string) => { revealed.add(id); };
