import { createDifyGateway, DifyGatewayError } from "../../../../lib/dify/gateway";
import type { DifyFeedbackRequest } from "../../../../lib/dify/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const gateway = createDifyGateway();

export async function POST(request: Request) {
  let body: (DifyFeedbackRequest & { messageId?: string }) | null = null;

  try {
    body = (await request.json()) as DifyFeedbackRequest & { messageId?: string };
  } catch {
    return Response.json(
      { error: { code: "INVALID_JSON", message: "Format payload tidak valid." } },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object" || !body.messageId) {
    return Response.json(
      { error: { code: "MISSING_MESSAGE_ID", message: "messageId wajib diisi." } },
      { status: 400 }
    );
  }

  const { messageId, rating, user = "sentrapedia-client", content } = body;

  try {
    const result = await gateway.sendFeedback(
      messageId,
      { rating, user, content },
      request.signal
    );
    return Response.json(result, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof DifyGatewayError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status }
      );
    }
    const message = error instanceof Error ? error.message : "Terjadi kesalahan pada feedback gateway.";
    return Response.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
