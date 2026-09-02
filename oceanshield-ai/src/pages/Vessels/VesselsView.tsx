import React, { useEffect, useState, useCallback } from 'react'
import { Ship, Search, AlertTriangle, Eye, WifiOff, X, RefreshCw } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { getVessels } from '../../api/vessels'
import { getIncidents } from '../../api/incidents'
import { Vessel } from '../../types/vessel'
import { Incident } from '../../types/incident'
import LiveTrackingMap from '../../components/LiveTrackingMap'

export const VesselsView: React.FC = () => {
  const { backendStatus } = useAppStore()
  const [vessels,         setVessels]         = useState<Vessel[]>([])
  const [incidents,       setIncidents]       = useState<Incident[]>([])
  const [query,           setQuery]           = useState('')
  const [onlySuspicious,  setOnlySuspicious]  = useState(false)
  const [selectedVessel,  setSelectedVessel]  = useState<Vessel | null>(null)
  const [loading,         setLoading]         = useState(true)
  const [lastRefresh,     setLastRefresh]     = useState<string>('')

  const fetchData = useCallback(async () => {
    if (backendStatus !== 'ONLINE') return
    setLoading(true)
    const [vRes, iRes] = await Promise.all([getVessels(), getIncidents()])
    if (vRes.data)  setVessels(vRes.data)
    if (iRes.data)  setIncidents(iRes.data)
    setLastRefresh(new Date().toLocaleTimeString())
    setLoading(false)
  }, [backendStatus])

  // Initial load + auto-refresh every 15s
  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [fetchData])

  const filtered = vessels.filter(v => {
    const q = query.toLowerCase()
    const matchSearch = v.name.toLowerCase().includes(q) || v.mmsi.includes(q) || (v.imo?.includes(q) ?? false)
    return matchSearch && (onlySuspicious ? v.suspicious : true)
  })

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Ship className="w-6 h-6 text-cyan-500" />
            Live Vessel Tracking & Intelligence
          </h1>
          <p className="text-xs font-mono text-slate-500 mt-1">
            Real-time AIS position monitoring &amp; anomaly behavior analytics
            {lastRefresh && <span className="ml-2 text-cyan-500">· Updated {lastRefresh}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search MMSI, Name, IMO…"
              className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono outline-none focus:border-cyan-500 transition-colors" />
          </div>
          <button onClick={() => setOnlySuspicious(!onlySuspicious)}
            className={`px-3 py-2 rounded-xl font-mono text-xs font-semibold flex items-center gap-2 transition-colors ${
              onlySuspicious ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-slate-100 text-slate-600'}`}>
            <AlertTriangle className="w-3.5 h-3.5" />SUSPICIOUS ONLY
          </button>
          <button onClick={fetchData}
            className="px-3 py-2 rounded-xl bg-cyan-500/10 text-cyan-600 font-mono text-xs font-semibold flex items-center gap-2 hover:bg-cyan-500/20 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />REFRESH
          </button>
        </div>
      </div>

      {backendStatus === 'OFFLINE' && (
        <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-3 bg-slate-50/50">
          <WifiOff className="w-10 h-10 text-amber-500 mx-auto" />
          <div className="font-bold text-base text-slate-800">Live vessel data unavailable</div>
          <p className="text-xs font-mono text-slate-500">Start the backend at http://localhost:8000</p>
        </div>
      )}

      {/* Map */}
      {backendStatus === 'ONLINE' && !loading && (
        <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-700 flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase flex items-center gap-2">
              <Ship className="w-4 h-4" />
              Live Maritime Tracking — Global AIS Feed
            </span>
            <span className="text-xs font-mono text-slate-400">
              {vessels.filter(v => v.suspicious).length} suspicious · {incidents.length} spill zone{incidents.length !== 1 ? 's' : ''}
            </span>
          </div>
          <LiveTrackingMap vessels={vessels} incidents={incidents} height="480px" />
        </div>
      )}

      {/* Table */}
      {backendStatus === 'ONLINE' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-xs font-mono text-slate-400">Loading vessels from AIS feed…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-slate-400">
              {vessels.length === 0
                ? 'No vessels received yet — AIS feed is active, waiting for messages…'
                : 'No vessels match your filter.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 font-mono text-[11px] text-slate-500 uppercase tracking-wider">
                    <th className="p-4">Vessel Name</th>
                    <th className="p-4">MMSI / IMO</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Flag</th>
                    <th className="p-4">Speed / Course</th>
                    <th className="p-4">Coordinates</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filtered.map(vessel => (
                    <tr key={vessel.mmsi} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-800 flex items-center gap-2">
                          {vessel.name}
                          {vessel.suspicious && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/10 text-red-500 border border-red-500/30 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />ANOMALY
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">Callsign: {vessel.callsign || 'N/A'}</div>
                      </td>
                      <td className="p-4 font-mono"><div>{vessel.mmsi}</div><div className="text-slate-400 text-[11px]">{vessel.imo || 'N/A'}</div></td>
                      <td className="p-4 font-semibold">{vessel.type}</td>
                      <td className="p-4">{vessel.flag || 'Unknown'}</td>
                      <td className="p-4 font-mono"><div>{vessel.speed ?? 0} kts</div><div className="text-slate-400 text-[11px]">{vessel.course ?? 0}°</div></td>
                      <td className="p-4 font-mono text-[11px] text-slate-600">{vessel.latitude.toFixed(3)}°N, {vessel.longitude.toFixed(3)}°E</td>
                      <td className="p-4"><span className="px-2 py-1 rounded-full text-[10px] font-mono font-medium bg-slate-100 text-slate-700">{vessel.status || 'Underway'}</span></td>
                      <td className="p-4 text-right">
                        <button onClick={() => setSelectedVessel(vessel)}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 font-mono text-xs font-semibold inline-flex items-center gap-1.5 transition-colors">
                          <Eye className="w-3.5 h-3.5" />INSPECT
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Detail modal */}
      {selectedVessel && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-mono text-cyan-500 font-bold uppercase">VESSEL INTELLIGENCE FILE</span>
                <h3 className="text-xl font-bold text-slate-900">{selectedVessel.name}</h3>
              </div>
              <button onClick={() => setSelectedVessel(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              {[
                ['MMSI', selectedVessel.mmsi],
                ['VESSEL TYPE', selectedVessel.type],
                ['FLAG', selectedVessel.flag || 'Unknown'],
                ['SPEED', `${selectedVessel.speed ?? 0} kts`],
                ['COURSE', `${selectedVessel.course ?? 0}°`],
                ['COORDINATES', `${selectedVessel.latitude.toFixed(4)}°N ${selectedVessel.longitude.toFixed(4)}°E`],
              ].map(([label, val]) => (
                <div key={label} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block">{label}</span>
                  <span className="font-bold text-slate-800">{val}</span>
                </div>
              ))}
            </div>
            {selectedVessel.suspicious && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-mono space-y-1">
                <div className="font-bold uppercase flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" />ANOMALY BEHAVIOR DETECTED</div>
                <p>{selectedVessel.anomalyReason || selectedVessel.anomalySeverity}</p>
              </div>
            )}
            {selectedVessel.aisGaps && selectedVessel.aisGaps.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 text-xs font-mono">
                <div className="font-bold mb-1">UNANNOUNCED AIS GAP LOGGED</div>
                {selectedVessel.aisGaps.map((gap, i) => (
                  <div key={i}>Blackout: {gap.durationMinutes} min ({gap.startTime} → {gap.endTime})</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
