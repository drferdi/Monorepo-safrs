'use client'

import { maplibreGL } from '@maplibre/maplibre-gl-leaflet'
import L from 'leaflet'
import React, { useEffect, useState } from 'react'
import { MapContainer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import 'maplibre-gl/dist/maplibre-gl.css'

// Chief 2026-10-07: the open source grey basemap. OpenFreeMap needs no key and allows commercial
// use; the layer passes the style's OpenFreeMap, OpenMapTiles and OpenStreetMap credits to Leaflet.
const GREY_BASEMAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'

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
        <div style="
          width: ${size}px;
          height: ${size}px;
          position: relative;
          border-radius: 50%;
          overflow: hidden;
          padding: 3px;
          background: var(--surface);
          box-shadow: var(--shadow-card);
          border: 2px solid ${isOnline ? 'var(--primary)' : 'var(--border)'};
        ">
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
          ${
            isOnline
              ? `
            <div style="
              position: absolute;
              bottom: 2px;
              right: 2px;
              width: 14px;
              height: 14px;
              background: var(--success);
              border-radius: 50%;
              border: 2px solid var(--surface);
              z-index: 10;
            "></div>
          `
              : ''
          }
        </div>
        <div style="
          background: var(--surface);
          padding: 4px 10px;
          border-radius: 12px;
          border: 1px solid var(--border);
          box-shadow: var(--shadow-card);
          white-space: nowrap;
        ">
          <span style="
            font-variant-numeric: tabular-nums;
            font-size: 12px;
            font-weight: 600;
            color: ${isOnline ? 'var(--success)' : 'var(--text-secondary)'};
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

// ─── Grey Basemap (OpenFreeMap Positron vector tiles) ─────────────────────────
function GreyBasemap() {
  const map = useMap()
  useEffect(() => {
    const layer = maplibreGL({ style: GREY_BASEMAP_STYLE }).addTo(map)
    return () => {
      layer.remove()
    }
  }, [map])
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
          background: 'var(--surface-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          fontSize: 14,
        }}
      >
        Loading MAP...
      </div>
    )
  }

  const onlineCount = staff.filter(s => s.isOnline).length

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <style>{`
        .leaflet-popup-content-wrapper {
          background: var(--surface) !important;
          border: 1px solid var(--border) !important;
          border-radius: 12px !important;
          box-shadow: var(--shadow-dialog) !important;
          padding: 0 !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
          width: auto !important;
        }
        .leaflet-popup-tip {
          background: var(--surface) !important;
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
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--success)',
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text)',
            }}
          >
            {onlineCount} Online
          </span>
        </div>
      </div>

      {/* Map Container */}
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: '100%', height: '100%', background: 'var(--surface-subtle)' }}
        zoomControl={false}
      >
        <GreyBasemap />

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
                  width: 240,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  background: 'var(--surface)',
                  borderRadius: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      flexShrink: 0,
                      border: `2px solid ${person.color}`,
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
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--text)',
                        lineHeight: 1.3,
                      }}
                    >
                      {person.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {person.role}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {person.institution || 'Puskesmas Balowerti'}
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: 10,
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {person.location.label}
                  </span>
                  {person.isOnline && (
                    <span className="ui-badge ui-badge--success">Live</span>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
