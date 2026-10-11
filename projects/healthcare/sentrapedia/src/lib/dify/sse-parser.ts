import type { DifyStreamEvent } from "./types";

/**
 * Parses raw Server-Sent Events (SSE) stream from Dify into typed DifyStreamEvent objects.
 */
export async function* parseDifyEventStream(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<DifyStreamEvent, void, unknown> {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      // Keep the last partial line in buffer
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":")) {
          // Empty line or SSE comment (e.g. ping)
          continue;
        }

        if (trimmed.startsWith("data:")) {
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;

          try {
            const eventData = JSON.parse(jsonStr) as DifyStreamEvent;
            yield eventData;
          } catch {
            // Non-JSON or malformed data line, skip or handle safely
            continue;
          }
        }
      }
    }

    // Flush any remaining buffer if it has a complete event
    if (buffer.trim().startsWith("data:")) {
      const jsonStr = buffer.trim().slice(5).trim();
      if (jsonStr) {
        try {
          const eventData = JSON.parse(jsonStr) as DifyStreamEvent;
          yield eventData;
        } catch {
          // Ignore trailing incomplete fragment
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
