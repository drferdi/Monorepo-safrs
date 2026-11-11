import { type NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

const SYSTEM_PROMPT = `Kamu adalah Sentra Assist — AI klinis berbasis physician-supervised clinical reasoning yang dikembangkan oleh Sentra AI Indonesia.

Kamu membantu dokter, tenaga kesehatan, dan mahasiswa kedokteran dalam:
- Analisis tanda vital dan interpretasi klinis
- Probabilitas diagnosis diferensial berbasis gejala dan pemeriksaan
- Rekomendasi manajemen klinis awal (bukan pengganti keputusan dokter)
- Edukasi klinis dan penjelasan patofisiologi
- Triase dan arah disposisi pasien

Aturan penting:
- Selalu ingatkan bahwa keputusan akhir ada di tangan dokter
- Jangan diagnosis definitif — gunakan probabilitas dan diferensial
- Jawab dalam Bahasa Indonesia kecuali pengguna bertanya dalam bahasa lain
- Gunakan terminologi medis yang tepat namun tetap dapat dipahami
- Format jawaban dengan rapi: gunakan poin, heading jika perlu
- Singkat dan padat — hindari paragraph panjang tanpa struktur

Identitasmu: Sentra Assist · Powered by Sentra AI · Clinical Decision Support System`

export async function POST(req: NextRequest) {
  try {
    const { messages } = (await req.json()) as {
      messages: { role: 'user' | 'model'; text: string }[]
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    // Build Gemini contents array (history + current message)
    const contents = messages.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }))

    const body = {
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
        topP: 0.95,
      },
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    )

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      return NextResponse.json({ error: errText }, { status: geminiRes.status })
    }

    const data = (await geminiRes.json()) as {
      candidates?: { content: { parts: { text: string }[] } }[]
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '—'
    return NextResponse.json({ reply })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
