import { createDifyGateway, DifyGatewayError } from "../../../../lib/dify/gateway";
import type { DifyChatRequestBody } from "../../../../lib/dify/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const gateway = createDifyGateway();

export async function GET() {
  return Response.json(
    {
      configured: gateway.isConfigured(),
      baseUrl: gateway.getBaseUrl(),
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

export async function POST(request: Request) {
  let body: DifyChatRequestBody;

  try {
    body = (await request.json()) as DifyChatRequestBody;
  } catch {
    return Response.json(
      { error: { code: "INVALID_JSON", message: "Format payload tidak valid." } },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object" || !body.query) {
    return Response.json(
      { error: { code: "MISSING_QUERY", message: "Query pesan wajib diisi." } },
      { status: 400 }
    );
  }

  // Ensure default user if not passed from client
  const chatPayload: DifyChatRequestBody = {
    ...body,
    user: body.user || "sentrapedia-client",
  };

  try {
    return await gateway.chatStream(chatPayload, request.signal);
  } catch (error: unknown) {
    if (error instanceof DifyGatewayError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status }
      );
    }
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal gateway.";
    return Response.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
