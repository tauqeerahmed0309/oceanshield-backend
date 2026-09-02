import React, { useEffect, useState } from 'react'
import { BarChart3, TrendingUp, ShieldAlert, WifiOff } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { getAnalytics, AnalyticsData } from '../../api/analytics'

export const AnalyticsView: React.FC = () => {
  const { backendStatus } = useAppStore()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)

  useEffect(() => {
    async function load() {
      if (backendStatus !== 'ONLINE') return
      const res = await getAnalytics()
      if (res.data) setAnalytics(res.data)
    }
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [backendStatus])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-cyan-500" />
          Historical Analytics & Risk Density
        </h1>
        <p className="text-xs font-mono text-slate-500 mt-1">
          Incident trends, anomaly frequency, and high-risk corridor stats — live data only
        </p>
      </div>

      {backendStatus === 'OFFLINE' ? (
        <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-3 bg-slate-50/50">
          <WifiOff className="w-10 h-10 text-cyan-500 mx-auto" />
          <div className="font-bold text-base text-slate-800">Analytics data unavailable</div>
          <p className="text-xs font-mono text-slate-500">Backend analytics endpoint GET /api/v1/analytics is unreachable.</p>
        </div>
      ) : analytics ? (
        <div className="space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Detections Logged',  value: analytics.totalIncidents,          color: 'text-slate-900' },
              { label: 'Active Monitored Fleet',   value: analytics.activeMonitoredVessels,  color: 'text-cyan-500' },
              { label: 'Cum. Spill Area (sq km)',  value: `${analytics.totalSpillAreaSqKm}`, color: 'text-red-500' },
              { label: 'Attribution Accuracy',     value: `${analytics.attributionSuccessRate}%`, color: 'text-emerald-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <span className="text-xs font-mono text-slate-400 uppercase">{label}</span>
                <div className={`text-3xl font-extrabold font-mono mt-1 ${color}`}>{value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly trend */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-base text-slate-900 uppercase flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-500" />Monthly Detection Frequency
              </h3>
              {analytics.monthlyIncidents.length === 0 ? (
                <p className="text-xs font-mono text-slate-400">No monthly data yet — accumulates as incidents are detected.</p>
              ) : (
                <div className="space-y-3 pt-2">
                  {analytics.monthlyIncidents.map(m => (
                    <div key={m.month} className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="font-bold text-slate-700">{m.month}</span>
                        <span className="text-slate-400">{m.incidents} incidents ({m.areaSqKm} km²)</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full"
                          style={{ width: `${Math.min(100, (m.incidents / 15) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Risk regions */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-base text-slate-900 uppercase flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />High Risk Marine Regions
              </h3>
              {analytics.riskRegions.length === 0 ? (
                <p className="text-xs font-mono text-slate-400">Risk regions will appear as incidents accumulate.</p>
              ) : (
                <div className="space-y-3">
                  {analytics.riskRegions.map(reg => (
                    <div key={reg.region} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-sm text-slate-800">{reg.region}</div>
                        <div className="text-xs font-mono text-slate-500">{reg.incidents} historical spill detections</div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-amber-500/10 text-amber-500 border border-amber-500/30">
                        Risk: {reg.riskScore}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-xs font-mono text-slate-400 py-8">Loading analytics…</div>
      )}
    </div>
  )
}
