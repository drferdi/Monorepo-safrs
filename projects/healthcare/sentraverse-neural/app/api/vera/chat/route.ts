// Architected and built by Drferdi.
// Sentraverse-Neural - Vera Assistant Streaming API Route
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, conversation_id, user } = body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.DIFY_API_KEY;
    const apiUrl = process.env.DIFY_API_URL || 'https://api.dify.ai/v1';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'DIFY_API_KEY is not configured in .env.local' },
        { status: 500 }
      );
    }

    const difyResponse = await fetch(`${apiUrl}/chat-messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {},
        query: query.trim(),
        response_mode: 'streaming',
        conversation_id: conversation_id || '',
        user: user || 'sentraverse-neural-visitor',
      }),
    });

    if (!difyResponse.ok) {
      const errorText = await difyResponse.text();
      return NextResponse.json(
        { error: `Dify API error: ${errorText}` },
        { status: difyResponse.status }
      );
    }

    if (!difyResponse.body) {
      return NextResponse.json(
        { error: 'No stream body returned by Dify' },
        { status: 502 }
      );
    }

    return new Response(difyResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Vera proxy error: ${message}` },
      { status: 500 }
    );
  }
}
