import React, { useEffect, useState, useCallback } from 'react'
import { ShieldAlert, AlertTriangle, Clock, MapPin, Eye, WifiOff, FileCheck, RefreshCw } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { getIncidents } from '../../api/incidents'
import { getVessels } from '../../api/vessels'
import { Incident } from '../../types/incident'
import { Vessel } from '../../types/vessel'
import LiveTrackingMap from '../../components/LiveTrackingMap'

interface IncidentsViewProps {
  onNavigateTab: (tab: string) => void
}

export const IncidentsView: React.FC<IncidentsViewProps> = ({ onNavigateTab }) => {
  const { backendStatus } = useAppStore()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [vessels,   setVessels]   = useState<Vessel[]>([])
  const [loading,   setLoading]   = useState(true)

  const fetchData = useCallback(async () => {
    if (backendStatus !== 'ONLINE') return
    setLoading(true)
    const [iRes, vRes] = await Promise.all([getIncidents(), getVessels()])
    if (iRes.data) setIncidents(iRes.data)
    if (vRes.data) setVessels(vRes.data)
    setLoading(false)
  }, [backendStatus])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const statusColor = (s: string) => {
    if (s === 'ATTRIBUTED')              return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
    if (s === 'ATTRIBUTION' || s === 'VERIFIED') return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30'
    if (s === 'VERIFYING')               return 'bg-amber-500/10 text-amber-500 border-amber-500/30'
    return 'bg-red-500/10 text-red-500 border-red-500/30'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-red-500" />
            Oil Spill Incident Center
          </h1>
          <p className="text-xs font-mono text-slate-500 mt-1">Verification pipeline & SAR backscatter evidence verification</p>
        </div>
        <button onClick={fetchData}
          className="px-3 py-2 rounded-xl bg-red-500/10 text-red-600 font-mono text-xs font-semibold flex items-center gap-2 hover:bg-red-500/20 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />REFRESH
        </button>
      </div>

      {backendStatus === 'OFFLINE' && (
        <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-3 bg-slate-50/50">
          <WifiOff className="w-10 h-10 text-red-500 mx-auto" />
          <div className="font-bold text-base text-slate-800">No incident data available</div>
          <p className="text-xs font-mono text-slate-500">Backend API unreachable at http://localhost:8000/api/v1/incidents</p>
        </div>
      )}

      {backendStatus === 'ONLINE' && (
        <>
          {/* Spill map */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-slate-900 border-b border-slate-700 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-red-400 uppercase flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />Incident Geolocation — Confirmed Spill Zones
              </span>
              <span className="text-xs font-mono text-slate-400">{incidents.length} incident{incidents.length !== 1 ? 's' : ''} plotted</span>
            </div>
            <LiveTrackingMap vessels={vessels} incidents={incidents} height="380px" />
          </div>

          {/* Cards */}
          {loading ? (
            <div className="text-center text-xs font-mono text-slate-400 py-8">Loading incidents…</div>
          ) : incidents.length === 0 ? (
            <div className="text-center text-xs font-mono text-slate-400 py-8 border-2 border-dashed border-slate-200 rounded-2xl">
              No incidents recorded yet. Incidents are created when SAR detects a confirmed spill.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {incidents.map(inc => (
                <div key={inc.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between gap-4 hover:border-cyan-500/50 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-xs font-bold text-cyan-600">{inc.id}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border uppercase ${statusColor(inc.status)}`}>{inc.status}</span>
                    </div>
                    <h3 className="font-bold text-base text-slate-900 mb-2">{inc.title}</h3>
                    <div className="space-y-1.5 text-xs font-mono text-slate-500">
                      <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-cyan-500" />{inc.latitude}°N, {inc.longitude}°E</div>
                      <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-cyan-500" />{new Date(inc.timestamp).toLocaleString()}</div>
                      <div className="flex items-center gap-1.5"><FileCheck className="w-3.5 h-3.5 text-cyan-500" />{inc.sensorSource}</div>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Confidence</div>
                      <div className="text-sm font-extrabold font-mono text-slate-900">{inc.spillConfidence}%</div>
                    </div>
                    <button onClick={() => onNavigateTab('attribution')}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 font-mono text-xs font-semibold inline-flex items-center gap-1 transition-colors">
                      <Eye className="w-3.5 h-3.5" />DRIFT & ATTRIBUTE
                    </button>
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
