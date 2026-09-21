import { Chat } from "chat";
import { createMemoryState } from "@chat-adapter/state-memory";

export const chat = new Chat({
  userName: "unicom-agent",
  adapters: {},
  state: createMemoryState(),
  logger: "info",
});
