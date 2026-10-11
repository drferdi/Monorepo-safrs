import type {
  DifyChatBlockingResponse,
  DifyChatRequestBody,
  DifyConversation,
  DifyChatMessageHistory,
  DifyFeedbackRequest,
  DifyGatewayConfig,
} from "./types";
import { SENTRAPEDIA_README_GROUNDING } from "./sentrapedia-context";

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_BASE_URL = "https://api.dify.ai/v1";

export class DifyGatewayError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 500
  ) {
    super(message);
    this.name = "DifyGatewayError";
  }
}

export function createDifyGateway(config: DifyGatewayConfig = {}) {
  const fetchFn = config.fetchFn ?? fetch;
  const baseUrl = (config.baseUrl ?? process.env.DIFY_API_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const apiKey = (config.apiKey ?? process.env.DIFY_API_KEY ?? "").trim();
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  function ensureConfigured() {
    if (!apiKey) {
      throw new DifyGatewayError(
        "NOT_CONFIGURED",
        "Dify API Key belum dikonfigurasi pada server.",
        503
      );
    }
  }

  function getHeaders(): HeadersInit {
    return {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  return {
    isConfigured(): boolean {
      return Boolean(apiKey);
    },

    getBaseUrl(): string {
      return baseUrl;
    },

    /**
     * Proxies streaming chat completion from Dify Cloud, returning an SSE Response.
     */
    async chatStream(
      reqBody: DifyChatRequestBody,
      signal?: AbortSignal
    ): Promise<Response> {
      ensureConfigured();

      if (!reqBody.query?.trim()) {
        throw new DifyGatewayError("INVALID_QUERY", "Query tidak boleh kosong.", 400);
      }
      if (!reqBody.user?.trim()) {
        throw new DifyGatewayError("INVALID_USER", "Identifier user diperlukan.", 400);
      }

      const rawQuery = reqBody.query.trim();
      const enrichedQuery = rawQuery.includes("[Konteks Sistem]")
        ? rawQuery
        : `[Konteks Sistem:\n${SENTRAPEDIA_README_GROUNDING}]\n\n${rawQuery}`;

      const payload: DifyChatRequestBody = {
        ...reqBody,
        inputs: reqBody.inputs ?? {},
        query: enrichedQuery,
        response_mode: "streaming",
      };

      const controller = new AbortController();
      const combinedSignal = signal
        ? AbortSignal.any([signal, controller.signal, AbortSignal.timeout(timeoutMs)])
        : AbortSignal.any([controller.signal, AbortSignal.timeout(timeoutMs)]);

      try {
        const response = await fetchFn(`${baseUrl}/chat-messages`, {
          method: "POST",
          headers: {
            ...getHeaders(),
            Accept: "text/event-stream",
          },
          body: JSON.stringify(payload),
          signal: combinedSignal,
        });

        if (!response.ok) {
          let errDetail = "Gagal memproses pesan ke layanan Dify.";
          try {
            const errJson = (await response.json()) as { message?: string; code?: string };
            if (errJson.message) errDetail = errJson.message;
          } catch {
            // Keep generic detail
          }
          throw new DifyGatewayError("DIFY_UPSTREAM_ERROR", errDetail, response.status);
        }

        if (!response.body) {
          throw new DifyGatewayError("NO_BODY", "Respons stream Dify kosong.", 502);
        }

        return new Response(response.body, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
      } catch (err: unknown) {
        if (err instanceof DifyGatewayError) throw err;
        if (err instanceof Error && err.name === "TimeoutError") {
          throw new DifyGatewayError("TIMEOUT", "Waktu permintaan ke Dify habis.", 504);
        }
        if (err instanceof Error && err.name === "AbortError") {
          throw new DifyGatewayError("ABORTED", "Permintaan dibatalkan.", 499);
        }
        throw new DifyGatewayError(
          "SERVICE_UNAVAILABLE",
          `Koneksi ke Dify gagal: ${err instanceof Error ? err.message : String(err)}`,
          502
        );
      }
    },

    /**
     * Blocking chat completion (non-streaming).
     */
    async chatBlocking(
      reqBody: DifyChatRequestBody,
      signal?: AbortSignal
    ): Promise<DifyChatBlockingResponse> {
      ensureConfigured();

      const rawQuery = reqBody.query.trim();
      const enrichedQuery = rawQuery.includes("[Konteks Sistem]")
        ? rawQuery
        : `[Konteks Sistem:\n${SENTRAPEDIA_README_GROUNDING}]\n\n${rawQuery}`;

      const payload: DifyChatRequestBody = {
        ...reqBody,
        inputs: reqBody.inputs ?? {},
        query: enrichedQuery,
        response_mode: "blocking",
      };

      const controller = new AbortController();
      const combinedSignal = signal
        ? AbortSignal.any([signal, controller.signal, AbortSignal.timeout(timeoutMs)])
        : AbortSignal.any([controller.signal, AbortSignal.timeout(timeoutMs)]);

      const response = await fetchFn(`${baseUrl}/chat-messages`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
        signal: combinedSignal,
      });

      if (!response.ok) {
        let errDetail = "Permintaan Dify gagal.";
        try {
          const errJson = (await response.json()) as { message?: string };
          if (errJson.message) errDetail = errJson.message;
        } catch {
          // ignore
        }
        throw new DifyGatewayError("DIFY_UPSTREAM_ERROR", errDetail, response.status);
      }

      return (await response.json()) as DifyChatBlockingResponse;
    },

    /**
     * Submit user feedback for a message (like / dislike).
     */
    async sendFeedback(
      messageId: string,
      feedback: DifyFeedbackRequest,
      signal?: AbortSignal
    ): Promise<{ result: "success" }> {
      ensureConfigured();

      const response = await fetchFn(`${baseUrl}/messages/${messageId}/feedbacks`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(feedback),
        signal,
      });

      if (!response.ok) {
        throw new DifyGatewayError("FEEDBACK_ERROR", "Gagal mengirim feedback.", response.status);
      }

      return (await response.json()) as { result: "success" };
    },

    /**
     * Stop ongoing generation task.
     */
    async stopTask(
      taskId: string,
      user: string,
      signal?: AbortSignal
    ): Promise<{ result: "success" }> {
      ensureConfigured();

      const response = await fetchFn(`${baseUrl}/chat-messages/${taskId}/stop`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ user }),
        signal,
      });

      if (!response.ok) {
        throw new DifyGatewayError("STOP_TASK_ERROR", "Gagal menghentikan task Dify.", response.status);
      }

      return (await response.json()) as { result: "success" };
    },

    /**
     * Retrieve suggested follow-up questions for a message.
     */
    async getSuggestedQuestions(
      messageId: string,
      user: string,
      signal?: AbortSignal
    ): Promise<string[]> {
      ensureConfigured();

      const response = await fetchFn(
        `${baseUrl}/messages/${messageId}/suggested?user=${encodeURIComponent(user)}`,
        {
          method: "GET",
          headers: getHeaders(),
          signal,
        }
      );

      if (!response.ok) {
        return [];
      }

      const data = (await response.json()) as { data?: string[] };
      return data.data ?? [];
    },

    /**
     * Retrieve conversation messages history.
     */
    async getMessages(
      conversationId: string,
      user: string,
      limit = 20,
      signal?: AbortSignal
    ): Promise<DifyChatMessageHistory[]> {
      ensureConfigured();

      const url = `${baseUrl}/messages?conversation_id=${encodeURIComponent(conversationId)}&user=${encodeURIComponent(user)}&limit=${limit}`;
      const response = await fetchFn(url, {
        method: "GET",
        headers: getHeaders(),
        signal,
      });

      if (!response.ok) {
        throw new DifyGatewayError("HISTORY_ERROR", "Gagal mengambil riwayat pesan.", response.status);
      }

      const data = (await response.json()) as { data?: DifyChatMessageHistory[] };
      return data.data ?? [];
    },

    /**
     * Retrieve conversations list.
     */
    async getConversations(
      user: string,
      limit = 20,
      signal?: AbortSignal
    ): Promise<DifyConversation[]> {
      ensureConfigured();

      const url = `${baseUrl}/conversations?user=${encodeURIComponent(user)}&limit=${limit}`;
      const response = await fetchFn(url, {
        method: "GET",
        headers: getHeaders(),
        signal,
      });

      if (!response.ok) {
        throw new DifyGatewayError("CONVERSATIONS_ERROR", "Gagal mengambil daftar percakapan.", response.status);
      }

      const data = (await response.json()) as { data?: DifyConversation[] };
      return data.data ?? [];
    },
  };
}
