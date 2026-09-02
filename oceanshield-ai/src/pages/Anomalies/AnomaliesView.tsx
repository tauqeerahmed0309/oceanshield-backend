import React, { useEffect, useState, useCallback } from 'react'
import { Activity, MapPin, Clock, AlertTriangle, WifiOff, RefreshCw, Radio } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { getAnomalies, AISAnomaly } from '../../api/anomalies'
import { getVessels } from '../../api/vessels'
import { Vessel } from '../../types/vessel'
import { Incident } from '../../types/incident'
import LiveTrackingMap from '../../components/LiveTrackingMap'

const ANOMALY_TYPE_LABELS: Record<string, string> = {
  speed_deviation: 'Speed Deviation',
  course_deviation: 'Course Deviation',
  dark_gap: 'AIS Dark Gap',
  loitering: 'Loitering',
  route_deviation: 'Route Deviation',
}

const ANOMALY_TYPE_COLORS: Record<string, string> = {
  speed_deviation: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  course_deviation: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  dark_gap: 'bg-red-500/10 text-red-600 border-red-500/30',
  loitering: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  route_deviation: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30',
}

export const AnomaliesView: React.FC = () => {
  const { backendStatus } = useAppStore()
  const [anomalies, setAnomalies] = useState<AISAnomaly[]>([])
  const [vessels,   setVessels]   = useState<Vessel[]>([])
  const [loading,   setLoading]   = useState(true)
  const [lastRefresh, setLastRefresh] = useState('')

  const fetchData = useCallback(async () => {
    if (backendStatus !== 'ONLINE') return
    setLoading(true)
    const [aRes, vRes] = await Promise.all([getAnomalies(), getVessels()])
    if (aRes.data) setAnomalies(aRes.data)
    if (vRes.data) setVessels(vRes.data)
    setLastRefresh(new Date().toLocaleTimeString())
    setLoading(false)
  }, [backendStatus])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Find vessel name by MMSI
  const vesselName = (mmsi: string) => {
    const v = vessels.find(v => v.mmsi === mmsi)
    return v?.name || `Vessel ${mmsi}`
  }

  // Convert anomalies to pseudo-incidents for map
  const anomalyIncidents: Incident[] = anomalies.map(a => ({
    id: `ANOM-${a.id}`,
    title: `${ANOMALY_TYPE_LABELS[a.anomaly_type] || a.anomaly_type} — ${vesselName(a.mmsi)}`,
    latitude: a.latitude,
    longitude: a.longitude,
    timestamp: a.detected_at,
    severity: a.anomaly_score >= 0.85 ? 'CRITICAL' : a.anomaly_score >= 0.7 ? 'HIGH' : 'MEDIUM',
    status: 'DETECTED',
    spillConfidence: Math.round(a.anomaly_score * 100),
    sensorSource: 'AIS Stream',
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-amber-500" />
            AIS Anomaly Detection Engine
          </h1>
          <p className="text-xs font-mono text-slate-500 mt-1">
            Isolation Forest anomaly scoring over rolling AIS position windows
            {lastRefresh && <span className="ml-2 text-cyan-500">· Updated {lastRefresh}</span>}
          </p>
        </div>
        <button onClick={fetchData}
          className="px-3 py-2 rounded-xl bg-amber-500/10 text-amber-600 font-mono text-xs font-semibold flex items-center gap-2 hover:bg-amber-500/20 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />REFRESH
        </button>
      </div>

      {backendStatus === 'OFFLINE' && (
        <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-3 bg-slate-50/50">
          <WifiOff className="w-10 h-10 text-amber-500 mx-auto" />
          <div className="font-bold text-base text-slate-800">No anomaly data available</div>
          <p className="text-xs font-mono text-slate-500">Backend API unreachable at http://localhost:8000/api/v1/anomalies</p>
        </div>
      )}

      {backendStatus === 'ONLINE' && (
        <>
          {/* Map with anomaly markers */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-slate-900 border-b border-slate-700 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase flex items-center gap-2">
                <Radio className="w-4 h-4" />Anomaly Geolocation Overlay
              </span>
              <span className="text-xs font-mono text-slate-400">{anomalies.length} anomal{anomalies.length !== 1 ? 'ies' : 'y'} detected</span>
            </div>
            <LiveTrackingMap vessels={vessels} incidents={anomalyIncidents} height="380px" />
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.entries(ANOMALY_TYPE_LABELS).map(([key, label]) => {
              const count = anomalies.filter(a => a.anomaly_type === key).length
              return (
                <div key={key} className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm text-center">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">{label}</div>
                  <div className="text-xl font-extrabold font-mono text-slate-900 mt-1">{count}</div>
                </div>
              )
            })}
          </div>

          {/* Anomaly cards */}
          {loading ? (
            <div className="text-center text-xs font-mono text-slate-400 py-8">Loading anomalies…</div>
          ) : anomalies.length === 0 ? (
            <div className="text-center text-xs font-mono text-slate-400 py-8 border-2 border-dashed border-slate-200 rounded-2xl">
              No anomalies detected yet. The Isolation Forest model needs ≥10 vessel feature rows before it can start scoring.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {anomalies.map(anom => (
                <div key={anom.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between gap-3 hover:border-amber-500/50 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold text-amber-600">ANOM-{String(anom.id).padStart(4, '0')}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border uppercase ${ANOMALY_TYPE_COLORS[anom.anomaly_type] || 'bg-slate-100 text-slate-600'}`}>
                        {ANOMALY_TYPE_LABELS[anom.anomaly_type] || anom.anomaly_type}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 mb-1">{vesselName(anom.mmsi)}</h3>
                    <div className="text-[11px] font-mono text-slate-400 mb-2">MMSI: {anom.mmsi}</div>
                    <div className="space-y-1 text-xs font-mono text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-cyan-500" />
                        {anom.latitude.toFixed(4)}°N, {anom.longitude.toFixed(4)}°E
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-cyan-500" />
                        {new Date(anom.detected_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Anomaly Score</div>
                      <div className={`text-lg font-extrabold font-mono ${anom.anomaly_score >= 0.85 ? 'text-red-600' : anom.anomaly_score >= 0.7 ? 'text-amber-600' : 'text-slate-700'}`}>
                        {Math.round(anom.anomaly_score * 100)}%
                      </div>
                    </div>
                    <AlertTriangle className={`w-5 h-5 ${anom.anomaly_score >= 0.85 ? 'text-red-500' : 'text-amber-500'}`} />
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
