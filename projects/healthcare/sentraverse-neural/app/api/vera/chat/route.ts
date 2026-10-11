// Architected and built by Drferdi.
// Sentraverse-Neural - Vera Assistant Streaming API Route
import { NextRequest, NextResponse } from 'next/server';
import { MESSAGE_LIMIT, takeMessage } from './limit';

export const runtime = 'nodejs';

const MAX_QUERY_CHARS = 1000;

function clientId(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

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

    if (query.length > MAX_QUERY_CHARS) {
      return NextResponse.json(
        { error: `Please keep your question under ${MAX_QUERY_CHARS} characters.` },
        { status: 413 }
      );
    }

    const retryAfterS = await takeMessage(clientId(req));
    if (retryAfterS !== null) {
      return NextResponse.json(
        { error: `You have reached the limit of ${MESSAGE_LIMIT} messages per day. Please try again later.` },
        { status: 429, headers: { 'Retry-After': String(retryAfterS) } }
      );
    }

    const apiKey = process.env.DIFY_API_KEY;
    const apiUrl = process.env.DIFY_API_URL || 'https://api.dify.ai/v1';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Vera is not available right now.' },
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
      console.error(`Vera upstream error: ${difyResponse.status}`);
      return NextResponse.json(
        { error: 'Vera is not available right now.' },
        { status: 502 }
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
    console.error('Vera proxy error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Vera is not available right now.' },
      { status: 500 }
    );
  }
}
