/**
 * LiveTrackingMap — interactive MapLibre GL map showing:
 *   • All AIS vessels as coloured directional ship markers
 *   • Suspicious / anomalous vessels highlighted in red/orange/amber
 *   • Oil spill incident zones as pulsing red circles
 *   • Click any marker for a detail popup
 *
 * Uses free CartoDB dark tiles — no API key required.
 */

import React, { useEffect, useRef, useCallback } from 'react'
import {
  Map as MapGL,
  Marker,
  Popup,
  NavigationControl,
  AttributionControl,
  LngLatBounds,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Vessel } from '../types/vessel'
import { Incident } from '../types/incident'

interface LiveTrackingMapProps {
  vessels: Vessel[]
  incidents: Incident[]
  height?: string
}

// ── Colour helpers ─────────────────────────────────────────────────────────────
function vesselColor(v: Vessel): string {
  if (!v.suspicious) return '#22d3ee'
  const s = v.anomalySeverity
  if (s === 'CRITICAL') return '#ef4444'
  if (s === 'HIGH')     return '#f97316'
  return '#f59e0b'
}

function vesselEmoji(v: Vessel): string {
  if (v.type === 'Tanker')                         return '🛢'
  if (v.type === 'Container')                      return '📦'
  if (v.type === 'Cargo' || v.type === 'Bulk Carrier') return '⚓'
  if (v.type === 'Fishing')                        return '🎣'
  return '🚢'
}

// ── SVG factories ──────────────────────────────────────────────────────────────
function shipSVG(color: string, heading: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <g transform="rotate(${heading || 0},14,14)">
      <polygon points="14,2 20,24 14,20 8,24"
        fill="${color}" stroke="white" stroke-width="1.5"
        filter="drop-shadow(0 1px 3px rgba(0,0,0,.6))"/>
    </g>
  </svg>`
}

function spillSVG(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <circle cx="18" cy="18" r="14" fill="rgba(239,68,68,.2)" stroke="#ef4444" stroke-width="2"/>
    <circle cx="18" cy="18" r="7"  fill="rgba(239,68,68,.65)"/>
    <text x="18" y="22" text-anchor="middle" font-size="9" fill="white" font-weight="bold">OIL</text>
  </svg>`
}

// ── Map component ──────────────────────────────────────────────────────────────
const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({
  vessels,
  incidents,
  height = '500px',
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<MapGL | null>(null)
  const markersRef   = useRef<Marker[]>([])

  // Clear all markers from the map
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []
  }, [])

  // Add vessel markers
  const addVesselMarkers = useCallback(
    (map: MapGL) => {
      vessels.forEach((v) => {
        const color   = vesselColor(v)
        const heading = v.heading ?? v.course ?? 0

        const el = document.createElement('div')
        el.innerHTML = shipSVG(color, heading)
        el.style.cssText = 'cursor:pointer;width:28px;height:28px;'
        if (v.suspicious) {
          el.animate(
            [{ filter: `drop-shadow(0 0 3px ${color})` },
             { filter: `drop-shadow(0 0 10px ${color})` }],
            { duration: 1200, iterations: Infinity, direction: 'alternate' }
          )
        }

        const popup = new Popup({ offset: 22, maxWidth: '280px', closeButton: false })
          .setHTML(`
            <div style="font-family:monospace;font-size:12px;padding:4px 2px;min-width:200px">
              <div style="font-weight:700;font-size:13px;margin-bottom:5px;color:#0f172a">
                ${vesselEmoji(v)} ${v.name}
              </div>
              <div style="color:#475569">MMSI: ${v.mmsi}</div>
              <div style="color:#475569">IMO: ${v.imo || 'N/A'} &nbsp;|&nbsp; Flag: ${v.flag || 'Unknown'}</div>
              <div style="color:#475569">Type: ${v.type}</div>
              <div style="color:#475569">Speed: <b>${v.speed ?? v.sog ?? 0} kts</b> &nbsp;|&nbsp; Course: <b>${v.course ?? 0}°</b></div>
              <div style="color:#475569;font-size:11px;margin-top:3px">
                ${v.latitude.toFixed(5)}°N &nbsp; ${v.longitude.toFixed(5)}°E
              </div>
              ${v.suspicious ? `
                <div style="margin-top:7px;padding:6px 8px;background:#fef2f2;border:1px solid #fca5a5;
                  border-radius:6px;color:#dc2626;font-weight:700;font-size:11px">
                  ⚠ ${v.anomalyReason || v.anomalySeverity || 'Anomalous behaviour'}
                </div>` : ''}
            </div>`)

        markersRef.current.push(
          new Marker({ element: el, anchor: 'center' })
            .setLngLat([v.longitude, v.latitude])
            .setPopup(popup)
            .addTo(map)
        )
      })
    },
    [vessels]
  )

  // Add oil spill incident markers
  const addSpillMarkers = useCallback(
    (map: MapGL) => {
      incidents.forEach((inc) => {
        const el = document.createElement('div')
        el.innerHTML = spillSVG()
        el.style.cssText = 'cursor:pointer;width:36px;height:36px;'
        el.animate(
          [{ opacity: '.7', transform: 'scale(1)' },
           { opacity: '1',  transform: 'scale(1.25)' }],
          { duration: 1400, iterations: Infinity, direction: 'alternate' }
        )

        const sevColor = inc.severity === 'CRITICAL' ? '#dc2626'
                       : inc.severity === 'HIGH'     ? '#ea580c'
                       : '#ca8a04'

        const popup = new Popup({ offset: 24, maxWidth: '300px', closeButton: false })
          .setHTML(`
            <div style="font-family:monospace;font-size:12px;padding:4px 2px;min-width:230px">
              <div style="font-weight:700;color:#dc2626;font-size:13px;margin-bottom:5px">
                🛢 OIL SPILL INCIDENT
              </div>
              <div style="font-weight:700;color:#0f172a;margin-bottom:4px">${inc.title}</div>
              <div style="color:#475569">ID: ${inc.id}</div>
              <div style="color:#475569">Status: <b>${inc.status}</b></div>
              <div style="color:#475569">
                Severity: <b style="color:${sevColor}">${inc.severity}</b>
              </div>
              <div style="color:#475569">Confidence: <b>${inc.spillConfidence}%</b></div>
              ${inc.affectedAreaSqKm
                ? `<div style="color:#475569">Area: ${inc.affectedAreaSqKm} km²</div>`
                : ''}
              ${inc.probableSourceVesselName
                ? `<div style="color:#475569">Probable source: <b>${inc.probableSourceVesselName}</b></div>`
                : ''}
              <div style="color:#94a3b8;font-size:10px;margin-top:5px">${inc.sensorSource || ''}</div>
            </div>`)

        markersRef.current.push(
          new Marker({ element: el, anchor: 'center' })
            .setLngLat([inc.longitude, inc.latitude])
            .setPopup(popup)
            .addTo(map)
        )
      })
    },
    [incidents]
  )

  // Initialise map once on mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new MapGL({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          carto: {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors © CARTO',
          },
        },
        layers: [{ id: 'carto', type: 'raster', source: 'carto' }],
      },
      center: [72.8, 18.9],
      zoom: 5,
      attributionControl: false,
    })

    map.addControl(new NavigationControl(), 'top-right')
    map.addControl(new AttributionControl({ compact: true }), 'bottom-right')

    mapRef.current = map

    return () => {
      clearMarkers()
      map.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-draw markers whenever vessels or incidents change
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const draw = () => {
      clearMarkers()
      addVesselMarkers(map)
      addSpillMarkers(map)

      // Auto-fit to show all markers
      const pts: [number, number][] = [
        ...vessels.map((v) => [v.longitude, v.latitude] as [number, number]),
        ...incidents.map((i) => [i.longitude, i.latitude] as [number, number]),
      ]
      if (pts.length > 0) {
        const bounds = pts.reduce(
          (b, p) => b.extend(p),
          new LngLatBounds(pts[0], pts[0])
        )
        map.fitBounds(bounds, { padding: 90, maxZoom: 9, duration: 800 })
      }
    }

    if (map.loaded()) draw()
    else map.once('load', draw)
  }, [vessels, incidents, clearMarkers, addVesselMarkers, addSpillMarkers])

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', borderRadius: '0 0 16px 16px', overflow: 'hidden' }}
      />

      {/* Top-left live badge */}
      <div style={{
        position: 'absolute', top: 10, left: 10,
        background: 'rgba(255,255,255,.92)', borderRadius: 8,
        padding: '5px 10px', color: '#0e7490', fontSize: 11,
        fontFamily: 'monospace', fontWeight: 700,
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(14,116,144,.25)',
        boxShadow: '0 2px 8px rgba(0,0,0,.08)',
        pointerEvents: 'none',
      }}>
        🚢 {vessels.length} vessels &nbsp;|&nbsp; 🛢 {incidents.length} spill zone{incidents.length !== 1 ? 's' : ''}
      </div>

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 40, left: 10,
        background: 'rgba(255,255,255,.92)', borderRadius: 10,
        padding: '8px 12px', color: '#334155', fontSize: 11,
        fontFamily: 'monospace', backdropFilter: 'blur(6px)',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,.06)',
        pointerEvents: 'none',
      }}>
        {[
          ['#22d3ee', 'Normal vessel'],
          ['#f59e0b', 'Suspicious vessel'],
          ['#ef4444', 'Critical anomaly'],
        ].map(([c, label]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: c }} />
            <span>{label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
            background: 'rgba(239,68,68,.5)', border: '2px solid #ef4444' }} />
          <span>Oil spill zone</span>
        </div>
      </div>
    </div>
  )
}

export default LiveTrackingMap
