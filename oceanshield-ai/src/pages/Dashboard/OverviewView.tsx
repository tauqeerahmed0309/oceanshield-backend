import React, { useEffect, useState, useCallback } from 'react'
import {
  Ship, ShieldAlert, Satellite, Compass, WifiOff,
  AlertTriangle, ArrowRight, Activity, Radio,
} from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { getVessels } from '../../api/vessels'
import { getIncidents } from '../../api/incidents'
import { getSpillCandidates, SpillCandidate } from '../../api/spills'
import { getAnomalies, AISAnomaly } from '../../api/anomalies'
import { Vessel } from '../../types/vessel'
import { Incident } from '../../types/incident'
import LiveTrackingMap from '../../components/LiveTrackingMap'

interface OverviewViewProps {
  onNavigateTab: (tab: string) => void
}

export const OverviewView: React.FC<OverviewViewProps> = ({ onNavigateTab }) => {
  const { backendStatus } = useAppStore()
  const [vessels,   setVessels]   = useState<Vessel[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [spills,    setSpills]    = useState<SpillCandidate[]>([])
  const [anomalies, setAnomalies] = useState<AISAnomaly[]>([])
  const [loading,   setLoading]   = useState(true)

  const fetchData = useCallback(async () => {
    if (backendStatus !== 'ONLINE') return
    setLoading(true)
    const [vRes, iRes, sRes, aRes] = await Promise.all([
      getVessels(), getIncidents(), getSpillCandidates(), getAnomalies(),
    ])
    if (vRes.data)  setVessels(vRes.data)
    if (iRes.data)  setIncidents(iRes.data)
    if (sRes.data)  setSpills(sRes.data)
    if (aRes.data)  setAnomalies(aRes.data)
    setLoading(false)
  }, [backendStatus])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [fetchData])

  const suspiciousCount   = vessels.filter(v => v.suspicious).length
  const criticalIncidents = incidents.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH').length

  return (
    <div className="space-y-6">

      {/* Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-sky-600 via-cyan-600 to-blue-600 text-white shadow-xl border border-sky-400/40">
        <div>
          <span className="text-xs font-mono text-sky-100 font-semibold tracking-wider uppercase">SYSTEM STATUS SUMMARY</span>
          <h1 className="text-2xl font-bold tracking-tight uppercase">AI-Powered Maritime Intelligence Overview</h1>
          <p className="text-sm text-sky-100 font-mono mt-1">Live AIS tracking — Indian Ocean, Arabian Sea, Bay of Bengal</p>
        </div>
        {backendStatus === 'OFFLINE' && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-3 text-xs font-mono">
            <WifiOff className="w-5 h-5 shrink-0" />
            <div>
              <div className="font-bold">BACKEND UNAVAILABLE</div>
              <div>Start backend at http://localhost:8000</div>
            </div>
          </div>
        )}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div onClick={() => onNavigateTab('vessels')}
          className="p-5 rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 shadow-md hover:shadow-lg transition-all cursor-pointer group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-semibold text-sky-800 uppercase tracking-[0.12em]">Monitored Vessels</span>
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-600 group-hover:scale-110 transition-transform"><Ship className="w-5 h-5" /></div>
          </div>
          <div className="text-3xl font-extrabold text-sky-900 font-mono">
            {loading ? '…' : vessels.length}
          </div>
          <div className="text-xs text-sky-700 mt-2 flex items-center justify-between">
            <span>{backendStatus === 'ONLINE' ? 'Live AIS feed' : 'Waiting for backend'}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-cyan-300" />
          </div>
        </div>

        <div onClick={() => onNavigateTab('anomalies')}
          className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 shadow-md hover:shadow-lg transition-all cursor-pointer group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-semibold text-amber-800 uppercase tracking-[0.12em]">Suspicious Vessels</span>
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 group-hover:scale-110 transition-transform"><AlertTriangle className="w-5 h-5" /></div>
          </div>
          <div className="text-3xl font-extrabold text-amber-700 font-mono">
            {loading ? '…' : anomalies.length}
          </div>
          <div className="text-xs text-amber-700 mt-2 flex items-center justify-between">
            <span>{suspiciousCount} vessels flagged</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-amber-600" />
          </div>
        </div>

        <div onClick={() => onNavigateTab('incidents')}
          className="p-5 rounded-2xl bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 shadow-md hover:shadow-lg transition-all cursor-pointer group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-semibold text-red-800 uppercase tracking-[0.12em]">Oil Spill Incidents</span>
            <div className="p-2 rounded-xl bg-red-500/20 text-red-600 group-hover:scale-110 transition-transform"><ShieldAlert className="w-5 h-5" /></div>
          </div>
          <div className="text-3xl font-extrabold text-red-700 font-mono">
            {loading ? '…' : incidents.length}
          </div>
          <div className="text-xs text-red-700 mt-2 flex items-center justify-between">
            <span>{criticalIncidents} High Severity</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-red-600" />
          </div>
        </div>

        <div onClick={() => onNavigateTab('satellite')}
          className="p-5 rounded-2xl bg-gradient-to-br from-cyan-50 to-sky-50 border border-cyan-200 shadow-md hover:shadow-lg transition-all cursor-pointer group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-semibold text-cyan-800 uppercase tracking-[0.12em]">SAR Passes Verified</span>
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-600 group-hover:scale-110 transition-transform"><Satellite className="w-5 h-5" /></div>
          </div>
          <div className="text-3xl font-extrabold text-cyan-900 font-mono">
            {loading ? '…' : spills.length}
          </div>
          <div className="text-xs text-cyan-700 mt-2 flex items-center justify-between">
            <span>{spills.filter(s => s.verdict === 'confirmed').length} confirmed</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-cyan-600" />
          </div>
        </div>
      </div>

      {/* Live map */}
      {backendStatus === 'ONLINE' && !loading && (
        <div className="rounded-2xl border border-sky-200 overflow-hidden shadow-md">
          <div className="px-4 py-3 bg-white border-b border-sky-200 flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-cyan-700 uppercase flex items-center gap-2">
              <Ship className="w-4 h-4" />
              Live Maritime Situational Awareness
            </span>
            <span className="text-xs font-mono text-slate-500">
              {vessels.length} vessels · {incidents.length} spill zone{incidents.length !== 1 ? 's' : ''}
            </span>
          </div>
          <LiveTrackingMap vessels={vessels} incidents={incidents} height="400px" />
        </div>
      )}

      {/* Incidents feed + module shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-sky-900 uppercase flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-600" />
              Recent Oil Spill Detections
            </h3>
            <button onClick={() => onNavigateTab('incidents')}
              className="text-xs font-mono text-cyan-700 hover:underline font-semibold">
              VIEW ALL INCIDENTS →
            </button>
          </div>

          {backendStatus === 'OFFLINE' ? (
            <div className="p-8 text-center border-2 border-dashed border-sky-300 rounded-xl space-y-3">
              <WifiOff className="w-8 h-8 text-sky-600 mx-auto" />
              <div className="font-bold text-sm text-sky-900">Waiting for backend data</div>
              <p className="text-xs font-mono text-sky-700">Start the backend at http://localhost:8000</p>
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.slice(0, 3).map(inc => (
                <div key={inc.id} onClick={() => onNavigateTab('incidents')}
                  className="p-4 rounded-xl border border-sky-300 hover:border-cyan-500 bg-white transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-cyan-700">{inc.id}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-100 text-red-800 uppercase">{inc.severity}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-100 text-cyan-800 uppercase">{inc.status}</span>
                    </div>
                    <div className="font-semibold text-sm text-slate-900">{inc.title}</div>
                    <div className="text-xs font-mono text-slate-700 mt-1">
                      {inc.latitude}°N | {inc.longitude}°E | {inc.sensorSource}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold font-mono text-slate-900">{inc.spillConfidence}% Confidence</div>
                    <div className="text-xs font-mono text-slate-700">{inc.probableSourceVesselName || 'Under Investigation'}</div>
                  </div>
                </div>
              ))}
              {incidents.length === 0 && backendStatus === 'ONLINE' && (
                <p className="text-xs font-mono text-sky-700 text-center py-4">No incidents recorded yet — monitoring active.</p>
              )}
            </div>
          )}
        </div>

        {/* Module shortcuts */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 shadow-md space-y-4">
          <h3 className="font-bold text-base text-blue-900 uppercase">Platform Modules</h3>
          {[
            { tab: 'vessels',     icon: <Ship className="w-4 h-4" />,    bg: 'bg-cyan-100 text-cyan-700',    border: 'border-cyan-200 hover:border-cyan-400 hover:bg-cyan-50',    title: 'Vessel Intelligence',     sub: 'AIS gaps & behavior profiling' },
            { tab: 'spills',     icon: <AlertTriangle className="w-4 h-4" />, bg: 'bg-red-100 text-red-700', border: 'border-red-200 hover:border-red-400 hover:bg-red-50',    title: 'Oil Spill Tracker',        sub: 'SAR spill candidates & analysis' },
            { tab: 'anomalies',  icon: <Radio className="w-4 h-4" />, bg: 'bg-amber-100 text-amber-700', border: 'border-amber-200 hover:border-amber-400 hover:bg-amber-50', title: 'AIS Anomaly Engine',    sub: 'Isolation Forest behavior scoring' },
            { tab: 'satellite',   icon: <Satellite className="w-4 h-4" />, bg: 'bg-blue-100 text-blue-700',  border: 'border-blue-200 hover:border-blue-400 hover:bg-blue-50',    title: 'SAR Satellite Analysis',   sub: 'Upload imagery & slick detection' },
            { tab: 'attribution', icon: <Compass className="w-4 h-4" />, bg: 'bg-purple-100 text-purple-700', border: 'border-purple-200 hover:border-purple-400 hover:bg-purple-50', title: 'Drift & Vessel Attribution', sub: 'Lagrangian ocean current backtrack' },
          ].map(({ tab, icon, bg, border, title, sub }) => (
            <button key={tab} onClick={() => onNavigateTab(tab)}
              className={`w-full p-3.5 rounded-xl border ${border} flex items-center justify-between text-left transition-all group bg-white`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${bg}`}>{icon}</div>
                <div>
                  <div className="font-bold text-sm text-slate-900">{title}</div>
                  <div className="text-xs text-slate-600">{sub}</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:translate-x-1 transition-transform" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
