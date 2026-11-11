'use client'

import { Camera, CameraOff, Mic, MicOff, Volume2, Wifi, WifiOff } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { cx } from '@/components/ui/cx'
import { deviceErrorMessage, latencyLabel, micLevel } from '@/lib/telemedicine/device-check'

import styles from './telemedicine.module.css'

type Phase = 'idle' | 'starting' | 'live' | 'error'
type CheckState = 'ok' | 'idle' | 'bad'

interface Choice {
  id: string
  label: string
}

/**
 * The green room before patients come in (Chief 2026-10-07: "ala Meet", "kaya studio design"):
 * camera preview on the left, device checks joined by a connector on the right, and the online
 * switch under them.
 */
export function MedLinkStudio({
  doctorName,
  isDoctor,
  isOnline,
  toggling,
  onToggleOnline,
}: {
  doctorName: string
  isDoctor: boolean
  isOnline: boolean
  toggling: boolean
  onToggleOnline: () => void
}) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState('')
  const [cameras, setCameras] = useState<Choice[]>([])
  const [mics, setMics] = useState<Choice[]>([])
  const [cameraId, setCameraId] = useState('')
  const [micId, setMicId] = useState('')
  const [cameraOn, setCameraOn] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [level, setLevel] = useState(0)
  const [tonePlayed, setTonePlayed] = useState(false)
  const [latency, setLatency] = useState<number | null | undefined>(undefined)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<AudioContext | null>(null)
  const frameRef = useRef(0)

  // Turns the camera and microphone off; used before switching devices and when the page is left.
  const release = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    void audioRef.current?.close()
    audioRef.current = null
  }, [])

  useEffect(() => release, [release])

  // Round trip to MedBoard now and every 15 s.
  useEffect(() => {
    const measure = async () => {
      const started = performance.now()
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' })
        setLatency(res.ok ? Math.round(performance.now() - started) : null)
      } catch {
        setLatency(null)
      }
    }
    void measure()
    const timer = setInterval(() => void measure(), 15_000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (phase === 'live' && videoRef.current) videoRef.current.srcObject = streamRef.current
  }, [phase])

  const open = async (camera: string, mic: string) => {
    release()
    setPhase('starting')
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: camera ? { deviceId: { exact: camera } } : true,
        audio: mic ? { deviceId: { exact: mic } } : true,
      })
      streamRef.current = stream
      stream.getVideoTracks().forEach(track => {
        track.enabled = cameraOn
      })
      stream.getAudioTracks().forEach(track => {
        track.enabled = micOn
      })

      const devices = await navigator.mediaDevices.enumerateDevices()
      const choices = (kind: MediaDeviceKind, fallback: string) =>
        devices
          .filter(device => device.kind === kind)
          .map((device, i) => ({ id: device.deviceId, label: device.label || `${fallback} ${i + 1}` }))
      setCameras(choices('videoinput', 'Kamera'))
      setMics(choices('audioinput', 'Mikrofon'))
      setCameraId(stream.getVideoTracks()[0]?.getSettings().deviceId ?? camera)
      setMicId(stream.getAudioTracks()[0]?.getSettings().deviceId ?? mic)

      const audio = new AudioContext()
      audioRef.current = audio
      const analyser = audio.createAnalyser()
      analyser.fftSize = 512
      audio.createMediaStreamSource(stream).connect(analyser)
      const frame = new Uint8Array(analyser.fftSize)
      const listen = () => {
        analyser.getByteTimeDomainData(frame)
        setLevel(micLevel(frame))
        frameRef.current = requestAnimationFrame(listen)
      }
      listen()
      setPhase('live')
    } catch (cause) {
      release()
      setError(deviceErrorMessage(cause))
      setPhase('error')
    }
  }

  const toggleCamera = () => {
    const next = !cameraOn
    streamRef.current?.getVideoTracks().forEach(track => {
      track.enabled = next
    })
    setCameraOn(next)
  }

  const toggleMic = () => {
    const next = !micOn
    streamRef.current?.getAudioTracks().forEach(track => {
      track.enabled = next
    })
    setMicOn(next)
  }

  const playTone = () => {
    const audio = new AudioContext()
    const tone = audio.createOscillator()
    const gain = audio.createGain()
    tone.frequency.value = 660
    gain.gain.setValueAtTime(0.2, audio.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.6)
    tone.connect(gain)
    gain.connect(audio.destination)
    tone.start()
    tone.stop(audio.currentTime + 0.6)
    tone.onended = () => void audio.close()
    setTonePlayed(true)
  }

  const live = phase === 'live'
  const deviceState: CheckState = live ? 'ok' : phase === 'error' ? 'bad' : 'idle'
  const connectionState: CheckState = latency === undefined ? 'idle' : latency === null ? 'bad' : 'ok'

  return (
    <section className={styles.studio} aria-label="Studio konsultasi">
      <div className={styles.stage}>
        {live && (
          <video
            ref={videoRef}
            className={cx(styles.video, !cameraOn && styles.videoHidden)}
            autoPlay
            muted
            playsInline
          />
        )}
        {(!live || !cameraOn) && (
          <div className={styles.stageIdle}>
            <CameraOff size={28} aria-hidden="true" />
            {!live && (
              <button
                type="button"
                onClick={() => void open('', '')}
                disabled={phase === 'starting'}
                className="ui-btn ui-btn--primary ui-btn--sm"
              >
                <Camera size={14} aria-hidden="true" />
                {phase === 'starting' ? 'Membuka kamera…' : phase === 'error' ? 'Coba lagi' : 'Nyalakan kamera'}
              </button>
            )}
            {error && (
              <p className={styles.stageError} role="alert">
                {error}
              </p>
            )}
          </div>
        )}
        <span className={styles.nameTag}>{doctorName || 'Dokter'}</span>
        {live && (
          <div className={styles.controls}>
            <button
              type="button"
              onClick={toggleMic}
              aria-pressed={!micOn}
              aria-label={micOn ? 'Matikan mikrofon' : 'Nyalakan mikrofon'}
              className={cx('ui-btn ui-btn--secondary', styles.round)}
            >
              {micOn ? <Mic size={16} aria-hidden="true" /> : <MicOff size={16} aria-hidden="true" />}
            </button>
            <button
              type="button"
              onClick={toggleCamera}
              aria-pressed={!cameraOn}
              aria-label={cameraOn ? 'Matikan kamera' : 'Nyalakan kamera'}
              className={cx('ui-btn ui-btn--secondary', styles.round)}
            >
              {cameraOn ? <Camera size={16} aria-hidden="true" /> : <CameraOff size={16} aria-hidden="true" />}
            </button>
          </div>
        )}
      </div>

      <div className={styles.side}>
        <h2 className={styles.sideTitle}>Cek perangkat</h2>
        <ol className={styles.checks}>
          <li className={styles.check} data-state={deviceState}>
            <span className={styles.checkDot} aria-hidden="true" />
            <div className={styles.checkBody}>
              <span className={styles.rowName}>Kamera</span>
              {live && cameras.length > 0 ? (
                <select
                  className={cx('ui-input', styles.picker)}
                  value={cameraId}
                  onChange={e => void open(e.target.value, micId)}
                  aria-label="Pilih kamera"
                >
                  {cameras.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span className={styles.rowMeta}>{phase === 'error' ? 'Belum siap' : 'Belum dinyalakan'}</span>
              )}
            </div>
          </li>
          <li className={styles.check} data-state={deviceState}>
            <span className={styles.checkDot} aria-hidden="true" />
            <div className={styles.checkBody}>
              <span className={styles.rowName}>Mikrofon</span>
              {live && mics.length > 0 ? (
                <>
                  <select
                    className={cx('ui-input', styles.picker)}
                    value={micId}
                    onChange={e => void open(cameraId, e.target.value)}
                    aria-label="Pilih mikrofon"
                  >
                    {mics.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <span
                    className={styles.meter}
                    role="meter"
                    aria-label="Level mikrofon"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(level * 100)}
                  >
                    <span className={styles.meterFill} style={{ transform: `scaleX(${Math.min(1, level * 3)})` }} />
                  </span>
                </>
              ) : (
                <span className={styles.rowMeta}>{phase === 'error' ? 'Belum siap' : 'Belum dinyalakan'}</span>
              )}
            </div>
          </li>
          <li className={styles.check} data-state={tonePlayed ? 'ok' : 'idle'}>
            <span className={styles.checkDot} aria-hidden="true" />
            <div className={styles.checkBody}>
              <span className={styles.rowName}>Speaker</span>
              <span className={styles.rowMeta}>{tonePlayed ? 'Nada diputar, pastikan terdengar' : 'Putar nada uji'}</span>
            </div>
            <button type="button" onClick={playTone} className="ui-btn ui-btn--secondary ui-btn--sm">
              <Volume2 size={14} aria-hidden="true" />
              Putar
            </button>
          </li>
          <li className={styles.check} data-state={connectionState}>
            <span className={styles.checkDot} aria-hidden="true" />
            <div className={styles.checkBody}>
              <span className={styles.rowName}>Koneksi</span>
              <span className={styles.rowMeta}>{latency === undefined ? 'Mengukur…' : latencyLabel(latency)}</span>
            </div>
          </li>
        </ol>

        {isDoctor ? (
          <button
            type="button"
            onClick={onToggleOnline}
            disabled={toggling}
            aria-pressed={isOnline}
            className={cx('ui-btn ui-btn--primary', styles.goLive)}
          >
            {isOnline ? <Wifi size={14} aria-hidden="true" /> : <WifiOff size={14} aria-hidden="true" />}
            {isOnline ? 'Online, menerima pasien' : 'Mulai online'}
          </button>
        ) : (
          <p className={styles.note}>Masuk sebagai staf. Status online hanya untuk dokter.</p>
        )}
      </div>
    </section>
  )
}
