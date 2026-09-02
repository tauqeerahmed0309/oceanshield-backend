import React, { useEffect, useState } from 'react'
import { Compass, Target, WifiOff, CheckCircle2 } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { getDriftAndAttribution } from '../../api/attribution'
import { getIncidents } from '../../api/incidents'
import { DriftAnalysis } from '../../types/attribution'

export const AttributionView: React.FC = () => {
  const { backendStatus } = useAppStore()
  const [driftData, setDriftData] = useState<DriftAnalysis | null>(null)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      if (backendStatus !== 'ONLINE') { setLoading(false); return }
      setLoading(true)

      // Get the most recent real incident ID, fall back to 'LIVE' (backend synthetic)
      let incidentId = 'LIVE'
      const iRes = await getIncidents()
      if (iRes.data && iRes.data.length > 0) {
        incidentId = iRes.data[0].id
      }

      const res = await getDriftAndAttribution(incidentId)
      if (res.data) setDriftData(res.data)
      setLoading(false)
    }
    load()
  }, [backendStatus])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
          <Compass className="w-6 h-6 text-cyan-500" />
          Drift Analysis & Source Vessel Attribution
        </h1>
        <p className="text-xs font-mono text-slate-500 mt-1">
          Hydrodynamic Lagrangian backward particle tracking & vessel candidate scoring
        </p>
      </div>

      {backendStatus === 'OFFLINE' ? (
        <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-3 bg-slate-50/50">
          <WifiOff className="w-10 h-10 text-purple-500 mx-auto" />
          <div className="font-bold text-base text-slate-800">Drift analysis unavailable</div>
          <p className="text-xs font-mono text-slate-500">Backend attribution endpoint GET /api/v1/attribution is offline.</p>
        </div>
      ) : loading ? (
        <div className="text-center text-xs font-mono text-slate-400 py-8">Computing drift trajectory…</div>
      ) : driftData ? (
        <div className="space-y-6">
          {/* Header stats */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block">SPILL CENTER POINT</span>
              <span className="font-bold text-slate-800 text-sm">
                {driftData.spillLocation.latitude}°N, {driftData.spillLocation.longitude}°E
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block">SIMULATION TIME WINDOW</span>
              <span className="font-bold text-slate-800 text-sm">{driftData.simulationTimeWindowHours} Hours Backtrack</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block">ORIGIN ENVELOPE RADIUS</span>
              <span className="font-bold text-cyan-500 text-sm">{driftData.probableSourceRegion.radiusKm} km Confidence Circle</span>
            </div>
          </div>

          {/* Candidates */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Target className="w-5 h-5 text-cyan-500" />Vessel Candidate Attribution Ranking
            </h3>

            {driftData.candidates.length === 0 ? (
              <div className="p-6 rounded-2xl border border-slate-200 bg-white text-xs font-mono text-slate-400 text-center">
                No vessel candidates in range yet — candidates appear when vessels are near a spill zone.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {driftData.candidates.map(cand => (
                  <div key={cand.vesselId}
                    className={`p-6 rounded-2xl border bg-white shadow-sm space-y-4 ${
                      cand.confidenceCategory === 'MATCH' ? 'border-red-500/50' :
                      cand.confidenceCategory === 'HIGH'  ? 'border-amber-500/50' : 'border-slate-200'
                    }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className="font-extrabold text-lg text-slate-900">{cand.vesselName}</h4>
                          <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase ${
                            cand.confidenceCategory === 'MATCH' ? 'bg-red-500/10 text-red-500 border border-red-500/30' :
                            cand.confidenceCategory === 'HIGH'  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30' :
                            'bg-slate-100 text-slate-500'
                          }`}>MATCH: {cand.confidenceCategory}</span>
                        </div>
                        <div className="text-xs font-mono text-slate-500 mt-1">
                          MMSI: {cand.mmsi} | Type: {cand.vesselType} | Flag: {cand.flag || 'Unknown'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-extrabold font-mono text-cyan-500">{cand.overallScore}/100</div>
                        <div className="text-[11px] font-mono text-slate-400">Overall Attribution Score</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {cand.evidenceList.map((ev, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5 text-xs">
                          <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${ev.passed ? 'text-emerald-500' : 'text-slate-400'}`} />
                          <div>
                            <div className="font-mono font-bold text-slate-800">{ev.type} Match ({ev.score}%)</div>
                            <div className="text-slate-500 text-[11px] mt-0.5">{ev.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center text-xs font-mono text-slate-400 py-8">No drift data available yet.</div>
      )}
    </div>
  )
}
