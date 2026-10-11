import { describe, expect, it } from "vitest";
import { parseDifyEventStream } from "../src/lib/dify/sse-parser";
import type { DifyStreamEvent } from "../src/lib/dify/types";

function createMockStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

describe("Dify SSE Parser", () => {
  it("parses single complete SSE message", async () => {
    const raw = `data: {"event":"message","task_id":"t1","id":"m1","message_id":"msg-1","conversation_id":"c1","answer":"Halo","created_at":1000}\n\n`;
    const stream = createMockStream([raw]);

    const events: DifyStreamEvent[] = [];
    for await (const ev of parseDifyEventStream(stream)) {
      events.push(ev);
    }

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      event: "message",
      task_id: "t1",
      answer: "Halo",
    });
  });

  it("handles fragmented stream chunks across buffer boundaries", async () => {
    const part1 = `data: {"event":"message","task_id":"t1","id":"m1","message_`;
    const part2 = `id":"msg-1","conversation_id":"c1","answer":"Dokumen ditemukan","created_at":1000}\n\n`;
    const stream = createMockStream([part1, part2]);

    const events: DifyStreamEvent[] = [];
    for await (const ev of parseDifyEventStream(stream)) {
      events.push(ev);
    }

    expect(events).toHaveLength(1);
    if (events[0].event === "message") {
      expect(events[0].answer).toBe("Dokumen ditemukan");
    }
  });

  it("parses multiple events in sequence including agent_thought and message_end", async () => {
    const raw = [
      `data: {"event":"agent_thought","id":"th-1","task_id":"t1","message_id":"msg-1","position":1,"thought":"Mencari literatur klinis","tool":"knowledge_search","tool_input":"stroke","observation":"Ditemukan 3 segmen","created_at":1000}\n\n`,
      `: ping\n\n`,
      `data: {"event":"message","task_id":"t1","id":"m1","message_id":"msg-1","conversation_id":"c1","answer":"Berdasarkan pedoman AHA/ASA...","created_at":1001}\n\n`,
      `data: {"event":"message_end","task_id":"t1","id":"m1","message_id":"msg-1","conversation_id":"c1","metadata":{"usage":{"total_tokens":120},"retriever_resources":[{"position":1,"dataset_id":"ds-1","dataset_name":"Sentralibrary","document_id":"doc-1","document_name":"stroke.md","segment_id":"seg-1","score":0.92,"content":"Kutipan stroke"}]}}\n\n`,
    ];
    const stream = createMockStream(raw);

    const events: DifyStreamEvent[] = [];
    for await (const ev of parseDifyEventStream(stream)) {
      events.push(ev);
    }

    expect(events).toHaveLength(3);
    expect(events[0].event).toBe("agent_thought");
    expect(events[1].event).toBe("message");
    expect(events[2].event).toBe("message_end");

    if (events[2].event === "message_end") {
      expect(events[2].metadata.retriever_resources).toHaveLength(1);
      expect(events[2].metadata.retriever_resources?.[0].document_name).toBe("stroke.md");
    }
  });

  it("ignores invalid non-JSON data safely", async () => {
    const raw = `data: not-a-json-string\n\ndata: {"event":"ping"}\n\n`;
    const stream = createMockStream([raw]);

    const events: DifyStreamEvent[] = [];
    for await (const ev of parseDifyEventStream(stream)) {
      events.push(ev);
    }

    expect(events).toHaveLength(1);
    expect(events[0].event).toBe("ping");
  });
});
