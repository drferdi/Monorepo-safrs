import { parseDifyEventStream } from "./sse-parser";
import type {
  DifyChatCallbacks,
  DifyChatRequestBody,
  DifyFeedbackRequest,
  DifyMessageEndMetadata,
} from "./types";

export interface DifyClientOptions {
  apiEndpoint?: string;
  fetchFn?: typeof fetch;
  signal?: AbortSignal;
}

const DEFAULT_API_ENDPOINT = "/api/dify/chat";

export async function sendDifyChatMessage(
  params: {
    query: string;
    conversationId?: string;
    user: string;
    inputs?: Record<string, unknown>;
  },
  callbacks: DifyChatCallbacks = {},
  options: DifyClientOptions = {}
): Promise<{
  answer: string;
  conversationId: string;
  messageId: string;
  metadata: DifyMessageEndMetadata;
}> {
  const fetchFn = options.fetchFn ?? fetch;
  const endpoint = options.apiEndpoint ?? DEFAULT_API_ENDPOINT;

  const payload: DifyChatRequestBody = {
    query: params.query,
    user: params.user,
    conversation_id: params.conversationId,
    inputs: params.inputs ?? {},
    response_mode: "streaming",
  };

  const response = await fetchFn(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(payload),
    signal: options.signal,
  });

  if (!response.ok) {
    let errMsg = `Gagal mengirim pesan (HTTP ${response.status})`;
    try {
      const errData = (await response.json()) as { error?: { message?: string } };
      if (errData.error?.message) errMsg = errData.error.message;
    } catch {
      // ignore
    }
    const err = { code: "HTTP_ERROR", message: errMsg, status: response.status };
    callbacks.onError?.(err);
    throw new Error(errMsg);
  }

  if (!response.body) {
    const err = { code: "NO_STREAM_BODY", message: "Respons stream kosong.", status: 502 };
    callbacks.onError?.(err);
    throw new Error("Respons stream kosong.");
  }

  let fullAnswer = "";
  let finalConversationId = params.conversationId ?? "";
  let finalMessageId = "";
  let finalMetadata: DifyMessageEndMetadata = {};

  try {
    for await (const event of parseDifyEventStream(response.body)) {
      if (options.signal?.aborted) break;

      switch (event.event) {
        case "message":
        case "agent_message": {
          if (event.answer) {
            fullAnswer += event.answer;
            callbacks.onChunk?.(event.answer);
          }
          if ("conversation_id" in event && event.conversation_id) {
            finalConversationId = event.conversation_id;
          }
          if (event.message_id) finalMessageId = event.message_id;
          break;
        }

        case "message_replace": {
          fullAnswer = event.answer;
          callbacks.onChunk?.(event.answer);
          if (event.conversation_id) finalConversationId = event.conversation_id;
          if (event.message_id) finalMessageId = event.message_id;
          break;
        }

        case "agent_thought": {
          callbacks.onThought?.(event);
          if (event.message_id) finalMessageId = event.message_id;
          break;
        }

        case "message_end": {
          finalMetadata = event.metadata ?? {};
          if (event.conversation_id) finalConversationId = event.conversation_id;
          if (event.message_id) finalMessageId = event.message_id;
          if (event.metadata?.retriever_resources) {
            callbacks.onResource?.(event.metadata.retriever_resources);
          }
          break;
        }

        case "error": {
          callbacks.onError?.({
            code: event.code,
            message: event.message,
            status: event.status,
          });
          throw new Error(`Dify Error [${event.code}]: ${event.message}`);
        }

        default:
          break;
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      // Aborted by caller
      return {
        answer: fullAnswer,
        conversationId: finalConversationId,
        messageId: finalMessageId,
        metadata: finalMetadata,
      };
    }
    throw err;
  }

  const result = {
    answer: fullAnswer,
    conversationId: finalConversationId,
    messageId: finalMessageId,
    metadata: finalMetadata,
  };

  callbacks.onEnd?.(result);
  return result;
}

export async function sendDifyMessageFeedback(
  params: {
    messageId: string;
    rating: "like" | "dislike" | null;
    user: string;
    content?: string;
  },
  options: { feedbackEndpoint?: string; fetchFn?: typeof fetch } = {}
): Promise<{ result: "success" }> {
  const fetchFn = options.fetchFn ?? fetch;
  const endpoint = options.feedbackEndpoint ?? "/api/dify/feedback";

  const payload: DifyFeedbackRequest & { messageId: string } = {
    messageId: params.messageId,
    rating: params.rating,
    user: params.user,
    content: params.content,
  };

  const response = await fetchFn(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Gagal mengirim feedback (HTTP ${response.status})`);
  }

  return (await response.json()) as { result: "success" };
}
