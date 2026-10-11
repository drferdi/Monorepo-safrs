import { describe, expect, it, vi } from "vitest";
import { createDifyGateway, DifyGatewayError } from "../src/lib/dify/gateway";

describe("Dify Gateway", () => {
  it("reports configured false when API key is missing", () => {
    const gateway = createDifyGateway({ apiKey: "" });
    expect(gateway.isConfigured()).toBe(false);
  });

  it("throws NOT_CONFIGURED when calling chatStream without API key", async () => {
    const gateway = createDifyGateway({ apiKey: "" });
    await expect(
      gateway.chatStream({ query: "Halo", user: "u-1" })
    ).rejects.toThrowError(DifyGatewayError);
  });

  it("throws INVALID_QUERY when query is empty", async () => {
    const gateway = createDifyGateway({ apiKey: "app-test-key" });
    await expect(
      gateway.chatStream({ query: "   ", user: "u-1" })
    ).rejects.toThrowError("Query tidak boleh kosong.");
  });

  it("successfully passes headers and proxies streaming response", async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(`data: {"event":"message","answer":"Hai"}\n\n`));
        controller.close();
      },
    });

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(mockStream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    );

    const gateway = createDifyGateway({
      apiKey: "test-key-123",
      baseUrl: "https://api.dify.ai/v1",
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const res = await gateway.chatStream({
      query: "Jelaskan tatalaksana stroke",
      user: "doctor-1",
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toBe("https://api.dify.ai/v1/chat-messages");
    expect(callArgs[1].headers.Authorization).toBe("Bearer test-key-123");
    const sentBody = JSON.parse(callArgs[1].body);
    expect(sentBody.response_mode).toBe("streaming");
    expect(sentBody.query).toBe("Jelaskan tatalaksana stroke");
  });

  it("handles upstream error response", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "Knowledge base not found", code: "dataset_not_found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    );

    const gateway = createDifyGateway({
      apiKey: "test-key",
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    await expect(
      gateway.chatStream({ query: "Cek data", user: "u-1" })
    ).rejects.toThrowError("Knowledge base not found");
  });

  it("sends feedback successfully", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ result: "success" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const gateway = createDifyGateway({
      apiKey: "test-key",
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const res = await gateway.sendFeedback("msg-999", {
      rating: "like",
      user: "doc-1",
    });

    expect(res).toEqual({ result: "success" });
    expect(mockFetch.mock.calls[0][0]).toBe("https://api.dify.ai/v1/messages/msg-999/feedbacks");
  });
});
