import { describe, expect, it, vi } from "vitest";
import { sendDifyChatMessage, sendDifyMessageFeedback } from "../src/lib/dify/client";
import type { DifyAgentThought, DifyRetrieverResource } from "../src/lib/dify/types";

describe("Dify Client", () => {
  it("consumes stream and invokes callbacks onChunk, onThought, onResource, onEnd", async () => {
    const ssePayload = [
      `data: {"event":"agent_thought","id":"th-1","task_id":"t1","message_id":"msg-1","position":1,"thought":"Menganalisis pedoman","tool":"theoracle_search","tool_input":"diabetes","observation":"Pedoman PERKENI ditemukan","created_at":100}\n\n`,
      `data: {"event":"message","task_id":"t1","id":"m1","message_id":"msg-1","conversation_id":"conv-abc","answer":"Target HbA1c ","created_at":101}\n\n`,
      `data: {"event":"message","task_id":"t1","id":"m2","message_id":"msg-1","conversation_id":"conv-abc","answer":"adalah < 7.0%","created_at":102}\n\n`,
      `data: {"event":"message_end","task_id":"t1","id":"m3","message_id":"msg-1","conversation_id":"conv-abc","metadata":{"usage":{"total_tokens":55},"retriever_resources":[{"position":1,"dataset_id":"ds-1","dataset_name":"Perkeni","document_id":"doc-1","document_name":"DM.md","segment_id":"seg-1","score":0.95,"content":"Target HbA1c"}]}}\n\n`,
    ].join("");

    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(ssePayload));
        controller.close();
      },
    });

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(mockStream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    );

    const chunks: string[] = [];
    const thoughts: DifyAgentThought[] = [];
    let receivedResources: DifyRetrieverResource[] = [];

    const result = await sendDifyChatMessage(
      {
        query: "Berapa target HbA1c?",
        user: "doctor-1",
      },
      {
        onChunk: (chunk) => chunks.push(chunk),
        onThought: (thought) => thoughts.push(thought),
        onResource: (res) => {
          receivedResources = res;
        },
      },
      {
        apiEndpoint: "/api/dify/chat",
        fetchFn: mockFetch as unknown as typeof fetch,
      }
    );

    expect(chunks).toEqual(["Target HbA1c ", "adalah < 7.0%"]);
    expect(result.answer).toBe("Target HbA1c adalah < 7.0%");
    expect(result.conversationId).toBe("conv-abc");
    expect(result.messageId).toBe("msg-1");
    expect(thoughts).toHaveLength(1);
    expect(thoughts[0].thought).toBe("Menganalisis pedoman");
    expect(receivedResources).toHaveLength(1);
    expect(receivedResources[0].document_name).toBe("DM.md");
  });

  it("handles HTTP error from gateway gracefully", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Quota reached" } }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      })
    );

    let errorCaught = false;
    await expect(
      sendDifyChatMessage(
        { query: "Test", user: "u1" },
        {
          onError: () => {
            errorCaught = true;
          },
        },
        { fetchFn: mockFetch as unknown as typeof fetch }
      )
    ).rejects.toThrowError("Quota reached");

    expect(errorCaught).toBe(true);
  });

  it("sends message feedback via client helper", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ result: "success" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const res = await sendDifyMessageFeedback(
      {
        messageId: "msg-123",
        rating: "like",
        user: "doc-1",
        content: "Sangat akurat",
      },
      { fetchFn: mockFetch as unknown as typeof fetch }
    );

    expect(res).toEqual({ result: "success" });
  });
});
