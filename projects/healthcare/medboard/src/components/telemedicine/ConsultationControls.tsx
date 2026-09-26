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
          padding: '12px 24px',
          background: 'rgba(0,0,0,0.7)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Left: Media controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ControlButton
            onClick={onToggleMic}
            active={sessionState.isMicEnabled}
            activeIcon={<Mic size={18} />}
            inactiveIcon={<MicOff size={18} />}
            activeLabel="Mic On"
            inactiveLabel="Mic Off"
            activeBg="rgba(255,255,255,0.1)"
            inactiveBg="rgba(255,255,255,0.06)"
          />
          <ControlButton
            onClick={onToggleCamera}
            active={sessionState.isCameraEnabled}
            activeIcon={<Video size={18} />}
            inactiveIcon={<VideoOff size={18} />}
            activeLabel="Kamera On"
            inactiveLabel="Kamera Off"
            activeBg="rgba(255,255,255,0.1)"
            inactiveBg="rgba(255,255,255,0.06)"
          />
          {!isPatient && (
            <ControlButton
              onClick={onToggleScreenShare}
              active={!sessionState.isScreenSharing}
              activeIcon={<Monitor size={18} />}
              inactiveIcon={<MonitorOff size={18} />}
              activeLabel="Bagikan Layar"
              inactiveLabel="Stop Share"
              activeBg="rgba(255,255,255,0.1)"
              inactiveBg="rgba(255,255,255,0.06)"
            />
          )}
        </div>

        {/* Center: Clinical actions (dokter only) */}
        {isDoctor && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClinicalButton
              icon={<FileText size={15} />}
              label="Diagnosis"
              onClick={() => setShowDiagnosis(true)}
              bg="rgba(230,126,34,0.15)"
              border="rgba(230,126,34,0.4)"
            />
            <ClinicalButton
              icon={<Pill size={15} />}
              label="Resep"
              onClick={() => setShowPrescription(true)}
              bg="rgba(230,126,34,0.15)"
              border="rgba(230,126,34,0.4)"
            />
          </div>
        )}

        {/* Right: End call */}
        <button
          onClick={() => void handleEndCall()}
          disabled={isEndingCall}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 20px',
            background: 'rgba(239,68,68,0.85)',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            cursor: isEndingCall ? 'not-allowed' : 'pointer',
            opacity: isEndingCall ? 0.6 : 1,
            transition: 'background 0.2s',
          }}
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
  activeBg: string
  inactiveBg: string
}

function ControlButton({
  onClick,
  active,
  activeIcon,
  inactiveIcon,
  activeLabel,
  inactiveLabel,
  activeBg,
  inactiveBg,
}: ControlButtonProps): React.JSX.Element {
  return (
    <button
      onClick={() => void onClick()}
      title={active ? activeLabel : inactiveLabel}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 44,
        borderRadius: 10,
        background: active ? activeBg : inactiveBg,
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.1)',
        cursor: 'pointer',
        transition: 'background 0.2s',
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
  bg: string
  border: string
}

function ClinicalButton({
  icon,
  label,
  onClick,
  bg,
  border,
}: ClinicalButtonProps): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 14px',
        background: bg,
        color: '#E67E22',
        border: `1px solid ${border}`,
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'background 0.2s',
      }}
    >
      {icon}
      {label}
    </button>
  )
}
