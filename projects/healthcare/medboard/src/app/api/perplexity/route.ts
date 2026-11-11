import { NextResponse } from 'next/server'
import { getAssistantKnowledgeContext } from '@/lib/assistant-knowledge'
import { buildAudreyCoreSystemPrompt, buildAudreyGreetingReply } from '@/lib/audrey-persona'
import { getCrewSessionFromRequest } from '@/lib/server/crew-access-auth'

export const runtime = 'nodejs'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface PerplexityResponse {
  choices?: { message?: { content?: string } }[]
}

const GREETING_PATTERN =
  /^(halo|hallo|hai|hi|hello|selamat pagi|pagi|selamat siang|siang|selamat sore|sore|selamat malam|malam|assalamualaikum|assalamu'alaikum|assalamu alaikum)\b[\s!.?]*$/i

export async function POST(request: Request) {
  const session = getCrewSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.PERPLEXITY_API_KEY?.trim()
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: 'PERPLEXITY_API_KEY belum dikonfigurasi.' },
      { status: 503 }
    )
  }

  const body = (await request.json()) as { messages?: ChatMessage[] }
  const messages: ChatMessage[] = body.messages ?? []
  if (messages.length === 0) {
    return NextResponse.json({ ok: false, error: 'Pesan kosong.' }, { status: 400 })
  }

  const latestUserMessage =
    [...messages]
      .reverse()
      .find(message => message.role === 'user')
      ?.content?.trim() ?? ''
  if (latestUserMessage && GREETING_PATTERN.test(latestUserMessage)) {
    return NextResponse.json({
      ok: true,
      reply: buildAudreyGreetingReply({
        username: session.username,
        displayName: session.displayName,
        profession: session.profession,
      }),
    })
  }

  const knowledgeContext = await getAssistantKnowledgeContext({
    assistantName: 'AUDREY',
    scope: 'CLINICAL_CONSULTATION',
    query: messages
      .filter(message => message.role === 'user')
      .map(message => message.content)
      .join('\n'),
    limit: 8,
  })

  const systemMessage: ChatMessage = {
    role: 'system',
    content: buildAudreyCoreSystemPrompt({
      user: {
        username: session.username,
        displayName: session.displayName,
        profession: session.profession,
      },
      knowledgeContext,
    }),
  }

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [systemMessage, ...messages],
      max_tokens: 1024,
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    return NextResponse.json(
      { ok: false, error: `Perplexity error ${res.status}: ${errText}` },
      { status: res.status }
    )
  }

  const data = (await res.json()) as PerplexityResponse
  const reply = data.choices?.[0]?.message?.content ?? ''

  return NextResponse.json({ ok: true, reply })
}
