'use client'

import L from 'leaflet'
import React, { useEffect, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// ─── Types ────────────────────────────────────────────────────────────────────
export type StaffLocation = {
  id: string
  name: string
  role: string
  institution?: string
  isOnline: boolean
  gender: 'male' | 'female'
  avatarUrl?: string
  location: {
    lat: number
    lng: number
    label: string
  }
  lastSeen?: string
  color: string
}

// ─── Avatar Marker with Name Label ────────────────────────────────────────────
function createAvatarIcon(isOnline: boolean, avatarUrl: string, name: string) {
  const size = 64
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  return L.divIcon({
    className: 'scars-avatar-marker',
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
      ">
        <!-- Avatar Container -->
        <div style="
          width: ${size}px;
          height: ${size}px;
          position: relative;
          border-radius: 50%;
          overflow: hidden;
          padding: 3px;
          background: linear-gradient(145deg, #2a2a2a, #1a1a1a);
          box-shadow:
            4px 4px 10px rgba(0,0,0,0.5),
            -2px -2px 6px rgba(255,255,255,0.08);
          border: 2px solid ${isOnline ? '#3B82F6' : '#555'};
        ">
          <!-- Avatar Image -->
          <img
            src="${avatarUrl}"
            width="${size - 6}"
            height="${size - 6}"
            style="
              border-radius: 50%;
              object-fit: cover;
              display: block;
              width: ${size - 6}px;
              height: ${size - 6}px;
              max-width: none;
              flex-shrink: 0;
            "
            alt="${name}"
          />
          
          <!-- Online indicator dot -->
          ${
            isOnline
              ? `
            <div style="
              position: absolute;
              bottom: 2px;
              right: 2px;
              width: 14px;
              height: 14px;
              background: #3B82F6;
              border-radius: 50%;
              border: 2px solid #1a1a1a;
              box-shadow: 0 0 8px #4ADE80;
              animation: pulse-dot 2s infinite;
              z-index: 10;
            "></div>
          `
              : ''
          }
        </div>
        
        <!-- Name Label -->
        <div style="
          background: rgba(26,26,26,0.95);
          padding: 4px 10px;
          border-radius: 12px;
          border: 1px solid ${isOnline ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.1)'};
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          white-space: nowrap;
        ">
          <span style="
            font-family: var(--font-mono), monospace;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.05em;
            color: ${isOnline ? '#4ADE80' : '#888'};
            text-transform: uppercase;
          ">${initials}</span>
        </div>
      </div>
    `,
    iconSize: [size + 8, size + 40],
    iconAnchor: [(size + 8) / 2, (size + 40) / 2],
    popupAnchor: [0, -(size / 2)],
  })
}

// ─── Map Controller (for centering) ───────────────────────────────────────────
function MapController({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])
  return null
}

// ─── Main Component ───────────────────────────────────────────────────────────
type StaffMapProps = {
  staff: StaffLocation[]
  center?: [number, number]
  zoom?: number
  onStaffClick?: (staff: StaffLocation) => void
  selectedStaffId?: string | null
}

export default function StaffMap({
  staff,
  center = [-7.8166, 112.0116],
  zoom = 19,
  onStaffClick,
}: StaffMapProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#1a1a1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
        }}
      >
        LOADING MAP...
      </div>
    )
  }

  const onlineCount = staff.filter(s => s.isOnline).length

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Custom CSS */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { box-shadow: 0 0 8px #3B82F6; }
          50% { box-shadow: 0 0 12px #3B82F6, 0 0 20px #3B82F6aa; }
        }
        @keyframes orb-drift-1 {
          0%, 100% { transform: scale(1) translate(0, 0); }
          50% { transform: scale(1.4) translate(8px, 6px); }
        }
        @keyframes orb-drift-2 {
          0%, 100% { transform: scale(1) translate(0, 0); }
          50% { transform: scale(1.3) translate(-6px, -8px); }
        }
        @keyframes orb-drift-3 {
          0%, 100% { transform: scale(1) translate(0, 0); }
          50% { transform: scale(1.5) translate(4px, -4px); }
        }
        .leaflet-popup-content-wrapper {
          background: transparent !important;
          border: none !important;
          border-radius: 16px !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
          width: auto !important;
        }
        .leaflet-popup-tip {
          background: #262626 !important;
          border: none !important;
          box-shadow: none !important;
        }
      `}</style>

      {/* Status Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 1000,
          display: 'flex',
          gap: 10,
        }}
      >
        <div
          style={{
            background: 'rgba(26,26,26,0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '4px 4px 12px rgba(0,0,0,0.4)',
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#3B82F6',
              boxShadow: '0 0 8px #3B82F6',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: '#3B82F6',
            }}
          >
            {onlineCount} ONLINE
          </span>
        </div>
      </div>

      {/* Map Container */}
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: '100%', height: '100%', background: '#1a1a1a' }}
        zoomControl={false}
      >
        {/* Dark Theme Tiles - CartoDB Dark Matter */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />

        <MapController center={center} />

        {/* Staff Markers with Avatar + Name */}
        {staff.map(person => (
          <Marker
            key={person.id}
            position={[person.location.lat, person.location.lng]}
            icon={createAvatarIcon(
              person.isOnline,
              person.avatarUrl || '/avatar/doctor-m.png',
              person.name
            )}
            eventHandlers={{
              click: () => onStaffClick?.(person),
            }}
          >
            <Popup closeButton={false}>
              <div
                style={{
                  overflow: 'hidden',
                  padding: 20,
                  position: 'relative',
                  width: 240,
                  background: '#262626',
                  borderRadius: 16,
                }}
              >
                {/* Animated orbs */}
                <div
                  style={{
                    position: 'absolute',
                    top: -12,
                    left: -12,
                    width: 96,
                    height: 96,
                    borderRadius: '50%',
                    background: 'transparent',
                    boxShadow: `inset 0 0 30px ${person.color}60`,
                    animation: 'orb-drift-1 6s ease-in-out infinite',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 140,
                    left: 56,
                    width: 96,
                    height: 96,
                    borderRadius: '50%',
                    background: 'transparent',
                    boxShadow: 'inset 0 0 30px rgba(59,130,246,0.35)',
                    animation: 'orb-drift-2 7s ease-in-out infinite',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 60,
                    left: 180,
                    width: 96,
                    height: 96,
                    borderRadius: '50%',
                    background: 'transparent',
                    boxShadow: `inset 0 0 30px ${person.color}40`,
                    animation: 'orb-drift-3 8s ease-in-out infinite',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 20,
                    left: 20,
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'transparent',
                    boxShadow: 'inset 0 0 20px rgba(74,222,128,0.3)',
                    animation: 'orb-drift-2 5s ease-in-out infinite',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: -24,
                    left: -12,
                    width: 200,
                    height: 200,
                    borderRadius: '50%',
                    background: 'transparent',
                    boxShadow: 'inset 0 0 40px rgba(59,130,246,0.15)',
                    animation: 'orb-drift-3 10s ease-in-out infinite',
                  }}
                />

                {/* Content overlay */}
                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    background: 'rgba(64,64,64,0.45)',
                    borderRadius: 12,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  {/* Avatar + status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        flexShrink: 0,
                        border: `2px solid ${person.color}`,
                        boxShadow: `0 0 10px ${person.color}40`,
                      }}
                    >
                      <img
                        src={person.avatarUrl || '/avatar/doctor-m.png'}
                        width={48}
                        height={48}
                        style={{ objectFit: 'cover', display: 'block' }}
                        alt=""
                      />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: '#fafafa',
                          fontStyle: 'italic',
                          lineHeight: 1.2,
                        }}
                      >
                        {person.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: '#d4d4d4',
                          letterSpacing: '0.08em',
                          marginTop: 2,
                          textTransform: 'uppercase',
                        }}
                      >
                        {person.role}
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ fontSize: 12, color: '#d4d4d4', lineHeight: 1.5 }}>
                    {person.institution || 'Puskesmas Balowerti'}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: 11, color: '#a3a3a3' }}>{person.location.label}</span>
                    {person.isOnline && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: '0.1em',
                          color: '#4ADE80',
                          padding: '2px 8px',
                          borderRadius: 4,
                          border: '1px solid rgba(74,222,128,0.3)',
                        }}
                      >
                        LIVE
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
