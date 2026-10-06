'use client'

import { useTracks } from '@livekit/components-react'
import { Track } from 'livekit-client'
import { useEffect, useRef } from 'react'

import type { TranscriptLine } from '@/lib/telemedicine/epuskesmas-summary'
import { bytesToBase64, createSpeechChunker, downsample, encodeWav } from '@/lib/telemedicine/transcript-audio'

const RATE = 16000

interface Source {
  key: string
  track: MediaStreamTrack
  speaker: TranscriptLine['speaker']
}

/**
 * Inside the LiveKit room on the doctor's screen: the local microphone is the doctor, a remote
 * microphone is the patient. Each utterance is cut at its pause and sent for transcription.
 */
export function ConsultCapture({
  capturing,
  onUtterance,
  onError,
}: {
  capturing: boolean
  onUtterance: (line: TranscriptLine) => void
  onError: (message: string) => void
}) {
  const tracks = useTracks([Track.Source.Microphone], { onlySubscribed: true })
  const sources = tracks.flatMap((ref): Source[] => {
    const track = ref.publication?.track?.mediaStreamTrack
    return track ? [{ key: track.id, track, speaker: ref.participant.isLocal ? 'dokter' : 'pasien' }] : []
  })

  if (!capturing) return null
  return (
    <>
      {sources.map(source => (
        <SpeakerCapture
          key={source.key}
          track={source.track}
          speaker={source.speaker}
          onUtterance={onUtterance}
          onError={onError}
        />
      ))}
    </>
  )
}

function SpeakerCapture({
  track,
  speaker,
  onUtterance,
  onError,
}: Source & Pick<Parameters<typeof ConsultCapture>[0], 'onUtterance' | 'onError'>) {
  const onUtteranceRef = useRef(onUtterance)
  const onErrorRef = useRef(onError)
  onUtteranceRef.current = onUtterance
  onErrorRef.current = onError

  useEffect(() => {
    const audio = new AudioContext()
    const source = audio.createMediaStreamSource(new MediaStream([track]))
    const processor = audio.createScriptProcessor(4096, 1, 1)
    const chunker = createSpeechChunker({ rate: RATE })
    // One request at a time per speaker, so a burst never runs into the per-minute limit.
    let queue = Promise.resolve()

    const send = (samples: Float32Array) => {
      const at = new Date(Date.now() - (samples.length / RATE) * 1000).toISOString()
      const wav = bytesToBase64(encodeWav(samples, RATE))
      queue = queue.then(async () => {
        try {
          const res = await fetch('/api/telemedicine/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio: wav }),
          })
          const data = (await res.json()) as { ok?: boolean; text?: string; error?: string }
          if (data.ok && data.text) onUtteranceRef.current({ speaker, text: data.text, at })
          else if (!data.ok) onErrorRef.current(data.error ?? 'Transkrip gagal.')
        } catch {
          onErrorRef.current('Transkrip gagal terkirim.')
        }
      })
    }

    processor.onaudioprocess = event => {
      const chunk = chunker.push(downsample(event.inputBuffer.getChannelData(0), audio.sampleRate, RATE))
      if (chunk) send(chunk)
    }
    source.connect(processor)
    processor.connect(audio.destination)

    return () => {
      processor.disconnect()
      source.disconnect()
      const rest = chunker.flush()
      if (rest) send(rest)
      void audio.close()
    }
  }, [track, speaker])

  return null
}
