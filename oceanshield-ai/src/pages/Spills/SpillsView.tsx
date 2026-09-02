import React, { useEffect, useState, useCallback } from 'react'
import { AlertTriangle, MapPin, Clock, Wind, BarChart3, WifiOff, RefreshCw, Eye } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { getSpillCandidates, SpillCandidate } from '../../api/spills'
import { getVessels } from '../../api/vessels'
import { Vessel } from '../../types/vessel'
import LiveTrackingMap from '../../components/LiveTrackingMap'
import { Incident } from '../../types/incident'

export const SpillsView: React.FC = () => {
  const { backendStatus } = useAppStore()
  const [spills,     setSpills]     = useState<SpillCandidate[]>([])
  const [vessels,    setVessels]    = useState<Vessel[]>([])
  const [loading,    setLoading]    = useState(true)
  const [lastRefresh, setLastRefresh] = useState('')

  const fetchData = useCallback(async () => {
    if (backendStatus !== 'ONLINE') return
    setLoading(true)
    const [sRes, vRes] = await Promise.all([getSpillCandidates(), getVessels()])
    if (sRes.data) setSpills(sRes.data)
    if (vRes.data) setVessels(vRes.data)
    setLastRefresh(new Date().toLocaleTimeString())
    setLoading(false)
  }, [backendStatus])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [fetchData])

  const verdictColor = (v?: string) => {
    if (v === 'confirmed') return 'bg-red-500/10 text-red-600 border-red-500/30'
    return 'bg-amber-500/10 text-amber-600 border-amber-500/30'
  }

  // Convert spills to pseudo-incidents for the map
  const spillIncidents: Incident[] = spills.map(s => ({
    id: `SPILL-${s.id}`,
    title: `Spill Candidate — ${(s as any).regionName || `${s.centroid_lat.toFixed(1)}°N ${s.centroid_lon.toFixed(1)}°E`}`,
    latitude: s.centroid_lat,
    longitude: s.centroid_lon,
    timestamp: s.detected_at,
    severity: (s.final_score || 0) >= 0.85 ? 'CRITICAL' : (s.final_score || 0) >= 0.7 ? 'HIGH' : 'MEDIUM',
    status: s.verdict === 'confirmed' ? 'VERIFIED' : 'DETECTED',
    spillConfidence: Math.round((s.final_score || s.unet_confidence || 0) * 100),
    sensorSource: 'Sentinel-1A SAR',
    affectedAreaSqKm: (s as any).areaSqKm,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            Oil Spill Candidate Tracker
          </h1>
          <p className="text-xs font-mono text-slate-500 mt-1">
            SAR-detected dark patches — U-Net segmentation & 5-layer filter pipeline results
            {lastRefresh && <span className="ml-2 text-cyan-500">· Updated {lastRefresh}</span>}
          </p>
        </div>
        <button onClick={fetchData}
          className="px-3 py-2 rounded-xl bg-red-500/10 text-red-600 font-mono text-xs font-semibold flex items-center gap-2 hover:bg-red-500/20 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />REFRESH
        </button>
      </div>

      {backendStatus === 'OFFLINE' && (
        <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-3 bg-slate-50/50">
          <WifiOff className="w-10 h-10 text-red-500 mx-auto" />
          <div className="font-bold text-base text-slate-800">No spill data available</div>
          <p className="text-xs font-mono text-slate-500">Backend API unreachable at http://localhost:8000/api/v1/spills</p>
        </div>
      )}

      {backendStatus === 'ONLINE' && (
        <>
          {/* Map with spill zones */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-slate-900 border-b border-slate-700 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-red-400 uppercase flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />Spill Candidate Geolocation
              </span>
              <span className="text-xs font-mono text-slate-400">{spills.length} candidate{spills.length !== 1 ? 's' : ''} detected</span>
            </div>
            <LiveTrackingMap vessels={vessels} incidents={spillIncidents} height="380px" />
          </div>

          {/* Spill cards */}
          {loading ? (
            <div className="text-center text-xs font-mono text-slate-400 py-8">Loading spill candidates…</div>
          ) : spills.length === 0 ? (
            <div className="text-center text-xs font-mono text-slate-400 py-8 border-2 border-dashed border-slate-200 rounded-2xl">
              No spill candidates detected yet. SAR imagery analysis requires Sentinel-1 passes over the AOI.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {spills.map(spill => (
                <div key={spill.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between gap-4 hover:border-red-500/50 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-xs font-bold text-red-600">SPILL-{String(spill.id).padStart(4, '0')}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border uppercase ${verdictColor(spill.verdict)}`}>
                        {spill.verdict || 'unverified'}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 mb-2">
                      {(spill as any).regionName || `${spill.centroid_lat.toFixed(2)}°N, ${spill.centroid_lon.toFixed(2)}°E`}
                    </h3>
                    <div className="space-y-1.5 text-xs font-mono text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-cyan-500" />
                        {spill.centroid_lat.toFixed(4)}°N, {spill.centroid_lon.toFixed(4)}°E
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-cyan-500" />
                        {new Date(spill.detected_at).toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Wind className="w-3.5 h-3.5 text-cyan-500" />
                        {(spill as any).windSpeedKts || (spill.wind_speed_ms ? Math.round(spill.wind_speed_ms * 1.94384) : '—')} kts at scan
                      </div>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Confidence</div>
                      <div className="text-sm font-extrabold font-mono text-slate-900">{(spill as any).confidencePct || Math.round((spill.final_score || 0) * 100)}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Area</div>
                      <div className="text-sm font-extrabold font-mono text-slate-900">{(spill as any).areaSqKm || '—'} km²</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-slate-400 uppercase">AIS Boost</div>
                      <div className="text-sm font-extrabold font-mono text-cyan-600">{spill.ais_boost.toFixed(2)}×</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
