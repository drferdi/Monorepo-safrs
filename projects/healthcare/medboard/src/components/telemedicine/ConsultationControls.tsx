'use client'

import type React from 'react'

// ============================================================
// PKM Dashboard — ConsultationControls Component
// ============================================================

import {
  FileText,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  Pill,
  Video,
  VideoOff,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import type {
  AppointmentWithDetails,
  SessionParticipantRole,
  SessionState,
} from '@/types/telemedicine.types'
import { DiagnosisModal } from './DiagnosisModal'
import { EPrescriptionModal } from './EPrescriptionModal'

interface ConsultationControlsProps {
  sessionState: SessionState
  participantRole: SessionParticipantRole
  appointment: AppointmentWithDetails
  onToggleMic: () => Promise<void>
  onToggleCamera: () => Promise<void>
  onToggleScreenShare: () => Promise<void>
  onEndCall: () => Promise<void>
}

export function ConsultationControls({
  sessionState,
  participantRole,
  appointment,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onEndCall,
}: ConsultationControlsProps): React.JSX.Element {
  const [showDiagnosis, setShowDiagnosis] = useState(false)
  const [showPrescription, setShowPrescription] = useState(false)
  const [isEndingCall, setIsEndingCall] = useState(false)

  const isDoctor = participantRole === 'DOCTOR'
  const isPatient = participantRole === 'PATIENT'

  const handleEndCall = useCallback(async () => {
    if (isEndingCall) return
    setIsEndingCall(true)
    try {
      await onEndCall()
    } finally {
      setIsEndingCall(false)
    }
  }, [onEndCall, isEndingCall])

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          padding: '16px 24px',
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
        }}
      >
        {/* Left: Media controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ControlButton
            onClick={onToggleMic}
            active={sessionState.isMicEnabled}
            activeIcon={<Mic size={18} />}
            inactiveIcon={<MicOff size={18} />}
            activeLabel="Mic On"
            inactiveLabel="Mic Off"
          />
          <ControlButton
            onClick={onToggleCamera}
            active={sessionState.isCameraEnabled}
            activeIcon={<Video size={18} />}
            inactiveIcon={<VideoOff size={18} />}
            activeLabel="Kamera On"
            inactiveLabel="Kamera Off"
          />
          {!isPatient && (
            <ControlButton
              onClick={onToggleScreenShare}
              active={!sessionState.isScreenSharing}
              activeIcon={<Monitor size={18} />}
              inactiveIcon={<MonitorOff size={18} />}
              activeLabel="Bagikan Layar"
              inactiveLabel="Stop Share"
            />
          )}
        </div>

        {/* Center: Clinical actions (dokter only) */}
        {isDoctor && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClinicalButton
              icon={<FileText size={16} />}
              label="Diagnosis"
              onClick={() => setShowDiagnosis(true)}
            />
            <ClinicalButton
              icon={<Pill size={16} />}
              label="Resep"
              onClick={() => setShowPrescription(true)}
            />
          </div>
        )}

        {/* Right: End call */}
        <button
          onClick={() => void handleEndCall()}
          disabled={isEndingCall}
          className="ui-btn ui-btn--secondary"
          style={{ color: 'var(--critical)', borderColor: 'var(--critical)' }}
        >
          <PhoneOff size={16} />
          {isEndingCall ? 'Mengakhiri...' : 'Akhiri Konsultasi'}
        </button>
      </div>

      {/* Modals — hanya untuk dokter */}
      {isDoctor && (
        <>
          <DiagnosisModal
            open={showDiagnosis}
            appointment={appointment}
            onClose={() => setShowDiagnosis(false)}
          />
          <EPrescriptionModal
            open={showPrescription}
            appointment={appointment}
            onClose={() => setShowPrescription(false)}
          />
        </>
      )}
    </>
  )
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────

interface ControlButtonProps {
  onClick: () => Promise<void>
  active: boolean
  activeIcon: React.ReactNode
  inactiveIcon: React.ReactNode
  activeLabel: string
  inactiveLabel: string
}

function ControlButton({
  onClick,
  active,
  activeIcon,
  inactiveIcon,
  activeLabel,
  inactiveLabel,
}: ControlButtonProps): React.JSX.Element {
  return (
    <button
      onClick={() => void onClick()}
      title={active ? activeLabel : inactiveLabel}
      aria-pressed={!active}
      className="ui-btn ui-btn--secondary"
      style={{
        width: 44,
        height: 44,
        padding: 0,
        color: active ? 'var(--text)' : 'var(--text-secondary)',
        background: active ? 'var(--surface)' : 'var(--surface-subtle)',
      }}
    >
      {active ? activeIcon : inactiveIcon}
    </button>
  )
}

interface ClinicalButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
}

function ClinicalButton({ icon, label, onClick }: ClinicalButtonProps): React.JSX.Element {
  return (
    <button onClick={onClick} className="ui-btn ui-btn--secondary">
      {icon}
      {label}
    </button>
  )
}
