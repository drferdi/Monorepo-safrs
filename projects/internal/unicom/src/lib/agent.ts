import { generateText } from "ai";
import type { Message } from "chat";
import { createChatTools, toAiMessages } from "chat/ai";
import { chat } from "./chat";

const tools = createChatTools({
  chat,
  preset: "messenger",
  requireApproval: false,
});

export async function runAgent(prompt: string) {
  const result = await generateText({
    model: "anthropic/claude-sonnet-4.6",
    tools,
    prompt,
  });

  return result.text;
}

export async function runAgentWithHistory(messages: Message[]) {
  const history = await toAiMessages(messages);

  const result = await generateText({
    model: "anthropic/claude-sonnet-4.6",
    tools,
    messages: history,
  });

  return result.text;
}
