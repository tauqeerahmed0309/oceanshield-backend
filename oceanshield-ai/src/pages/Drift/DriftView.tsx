import React, { useState } from 'react'
import { Navigation, ArrowRight, MapPin, Clock, Waves, Ship, AlertTriangle, Loader2, Compass } from 'lucide-react'
import { predictDrift, getVesselsNearSpill, DriftResult, VesselNearSpill } from '../../api/drift'
import { useAppStore } from '../../store/appStore'

const INDIAN_AREAS = [
  { label: 'Mumbai Harbor', lat: 18.92, lon: 72.82 },
  { label: 'Gulf of Khambhat', lat: 21.0, lon: 72.0 },
  { label: 'Kutch Coast', lat: 22.8, lon: 69.5 },
  { label: 'Goa Coast', lat: 15.4, lon: 73.8 },
  { label: 'Kerala Coast', lat: 10.5, lon: 73.5 },
  { label: 'Chennai', lat: 13.1, lon: 80.3 },
  { label: 'Visakhapatnam', lat: 17.7, lon: 83.2 },
  { label: 'Paradip', lat: 20.3, lon: 86.6 },
  { label: 'Andaman Islands', lat: 11.7, lon: 92.7 },
  { label: 'Custom', lat: 0, lon: 0 },
]

export const DriftView: React.FC = () => {
  const { backendStatus } = useAppStore()
  const [selectedArea, setSelectedArea] = useState(0)
  const [customLat, setCustomLat] = useState('')
  const [customLon, setCustomLon] = useState('')
  const [hindcastHours, setHindcastHours] = useState(48)
  const [forecastHours, setForecastHours] = useState(24)
  const [spillDate, setSpillDate] = useState(new Date().toISOString().slice(0, 10))
  const [spillTime, setSpillTime] = useState(new Date().toISOString().slice(11, 16))
  
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DriftResult | null>(null)
  const [vessels, setVessels] = useState<VesselNearSpill[]>([])
  const [error, setError] = useState<string | null>(null)

  const handlePredict = async () => {
    const area = INDIAN_AREAS[selectedArea]
    const lat = selectedArea === INDIAN_AREAS.length - 1 ? parseFloat(customLat) || 18.9 : area.lat
    const lon = selectedArea === INDIAN_AREAS.length - 1 ? parseFloat(customLon) || 72.8 : area.lon

    if (isNaN(lat) || isNaN(lon)) {
      setError('Please enter valid coordinates')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setVessels([])

    try {
      const timestamp = `${spillDate}T${spillTime}:00Z`
    const [driftRes, vesselRes] = await Promise.all([
        predictDrift({ latitude: lat, longitude: lon, timestamp, hindcast_hours: hindcastHours, forecast_hours: forecastHours }),
        getVesselsNearSpill(lat, lon, 50, hindcastHours),
      ])

      if (driftRes.data) setResult(driftRes.data)
      if (vesselRes.data) setVessels(vesselRes.data)
    } catch (err) {
      setError('Failed to predict drift. Ensure backend is running.')
    }

    setLoading(false)
  }

  const directionArrow = (deg: number) => {
    return `rotate(${deg}deg)`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
          <Navigation className="w-6 h-6 text-cyan-500" />
          Oil Slick Drift Prediction
        </h1>
        <p className="text-xs font-mono text-slate-500 mt-1">
          Hindcast origin + Forecast path — Ocean current & wind-driven drift modeling
        </p>
      </div>

      {/* Input Section */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/20">
            <MapPin className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-900 uppercase">Spill Location</h2>
            <p className="text-xs font-mono text-slate-500">Select the observed oil spill position to predict drift direction</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-mono font-bold text-slate-600 uppercase mb-2">Area</label>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(Number(e.target.value))}
              className="w-full p-3 rounded-xl border border-cyan-200 bg-white text-sm font-mono text-slate-800 outline-none focus:border-cyan-500"
            >
              {INDIAN_AREAS.map((area, idx) => (
                <option key={idx} value={idx}>
                  {area.label}{area.lat !== 0 ? ` (${area.lat}°N, ${area.lon}°E)` : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedArea === INDIAN_AREAS.length - 1 && (
            <>
              <div>
                <label className="block text-[11px] font-mono text-slate-500 uppercase mb-1">Latitude</label>
                <input type="number" step="0.01" placeholder="18.9" value={customLat}
                  onChange={(e) => setCustomLat(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-cyan-200 bg-white text-sm font-mono" />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-slate-500 uppercase mb-1">Longitude</label>
                <input type="number" step="0.01" placeholder="72.8" value={customLon}
                  onChange={(e) => setCustomLon(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-cyan-200 bg-white text-sm font-mono" />
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-mono font-bold text-slate-600 uppercase mb-2">
              <Clock className="w-3.5 h-3.5 inline mr-1" />
              Spill Date
            </label>
            <input type="date" value={spillDate} onChange={(e) => setSpillDate(e.target.value)}
              className="w-full p-3 rounded-xl border border-cyan-200 bg-white text-sm font-mono" />
          </div>
          <div>
            <label className="block text-xs font-mono font-bold text-slate-600 uppercase mb-2">
              <Clock className="w-3.5 h-3.5 inline mr-1" />
              Spill Time (UTC)
            </label>
            <input type="time" value={spillTime} onChange={(e) => setSpillTime(e.target.value)}
              className="w-full p-3 rounded-xl border border-cyan-200 bg-white text-sm font-mono" />
          </div>
          <div>
            <label className="block text-xs font-mono font-bold text-slate-600 uppercase mb-2">
              <Clock className="w-3.5 h-3.5 inline mr-1" />
              Hindcast (trace back)
            </label>
            <select value={hindcastHours} onChange={(e) => setHindcastHours(Number(e.target.value))}
              className="w-full p-3 rounded-xl border border-cyan-200 bg-white text-sm font-mono">
              <option value={12}>12 hours</option>
              <option value={24}>24 hours</option>
              <option value={48}>48 hours</option>
              <option value={72}>72 hours</option>
              <option value={120}>5 days</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono font-bold text-slate-600 uppercase mb-2">
              <Clock className="w-3.5 h-3.5 inline mr-1" />
              Forecast (predict forward)
            </label>
            <select value={forecastHours} onChange={(e) => setForecastHours(Number(e.target.value))}
              className="w-full p-3 rounded-xl border border-cyan-200 bg-white text-sm font-mono">
              <option value={12}>12 hours</option>
              <option value={24}>24 hours</option>
              <option value={48}>48 hours</option>
              <option value={72}>72 hours</option>
            </select>
          </div>
        </div>

        <button onClick={handlePredict} disabled={loading}
          className="w-full py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Computing Drift Path…</> : <><Navigation className="w-4 h-4" /> PREDICT DRIFT DIRECTION</>}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-mono flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Direction Summary Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-sky-600 via-cyan-600 to-blue-600 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-sky-100 font-semibold tracking-wider uppercase">DRIFT DIRECTION</span>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-extrabold">{result.direction_from}</span>
                    <ArrowRight className="w-8 h-8" />
                    <span className="text-3xl font-extrabold">{result.direction_to}</span>
                  </div>
                </div>
                <p className="text-sm text-sky-100 font-mono mt-2">
                  Oil is flowing from {result.direction_from} toward {result.direction_to}
                </p>
              </div>
              
              <div className="text-right space-y-2">
                <div className="p-3 rounded-xl bg-white/10">
                  <span className="text-[10px] font-mono text-sky-200 block">DRIFT SPEED</span>
                  <span className="text-2xl font-extrabold">{result.drift_speed_knots}</span>
                  <span className="text-sm ml-1">knots</span>
                </div>
                <div className="p-3 rounded-xl bg-white/10">
                  <span className="text-[10px] font-mono text-sky-200 block">SPREAD AREA</span>
                  <span className="text-2xl font-extrabold">{result.spread_area_km2}</span>
                  <span className="text-sm ml-1">km²</span>
                </div>
              </div>
            </div>
          </div>

          {/* Trajectory Visualization */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Origin (Hindcast) */}
            <div className="p-6 rounded-2xl bg-white border border-amber-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100">
                  <Compass className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 uppercase">Origin Point (Hindcast)</h3>
                  <p className="text-[10px] font-mono text-slate-500">Where the oil came from — {hindcastHours}h trace back</p>
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 block">ORIGIN LAT/LON</span>
                    <span className="font-bold text-slate-800">{result.origin_lat}°N, {result.origin_lon}°E</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">ORIGIN TIME</span>
                    <span className="font-bold text-slate-800">{new Date(result.origin_time).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">DRIFT DISTANCE</span>
                    <span className="font-bold text-amber-600">{result.total_drift_km} km</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">CONFIDENCE</span>
                    <span className="font-bold text-amber-600">{Math.round(result.hindcast_confidence * 100)}%</span>
                  </div>
                </div>
              </div>

              {/* Trajectory path visualization */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Hindcast Path</span>
                <div className="flex flex-wrap gap-1">
                  {result.hindcast_trajectory.slice(0, 10).map((point, i) => (
                    <div key={i} className="px-2 py-1 rounded bg-amber-100 text-[10px] font-mono text-amber-800">
                      {point.lat.toFixed(2)}°N {point.lon.toFixed(2)}°E
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Forecast */}
            <div className="p-6 rounded-2xl bg-white border border-blue-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-100">
                  <Waves className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 uppercase">Forecast Path</h3>
                  <p className="text-[10px] font-mono text-slate-500">Where the oil is going — {forecastHours}h prediction</p>
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 block">PREDICTED LAT/LON</span>
                    <span className="font-bold text-slate-800">{result.forecast_lat}°N, {result.forecast_lon}°E</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">PREDICTED TIME</span>
                    <span className="font-bold text-slate-800">{new Date(result.forecast_time).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">DIRECTION</span>
                    <span className="font-bold text-blue-600">{result.direction_from} → {result.direction_to}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">CONFIDENCE</span>
                    <span className="font-bold text-blue-600">{Math.round(result.forecast_confidence * 100)}%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Forecast Path</span>
                <div className="flex flex-wrap gap-1">
                  {result.forecast_trajectory.slice(0, 10).map((point, i) => (
                    <div key={i} className="px-2 py-1 rounded bg-blue-100 text-[10px] font-mono text-blue-800">
                      {point.lat.toFixed(2)}°N {point.lon.toFixed(2)}°E
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Vessels Near Spill */}
          {vessels.length > 0 && (
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Ship className="w-4 h-4 text-slate-600" />
                <h3 className="font-bold text-sm text-slate-900 uppercase">
                  Vessels Near Spill ({vessels.length} found)
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-3 text-slate-400">VESSEL</th>
                      <th className="text-left py-2 px-3 text-slate-400">TYPE</th>
                      <th className="text-right py-2 px-3 text-slate-400">DISTANCE</th>
                      <th className="text-right py-2 px-3 text-slate-400">SPEED</th>
                      <th className="text-center py-2 px-3 text-slate-400">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vessels.slice(0, 10).map((v) => (
                      <tr key={v.mmsi} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-slate-800">{v.ship_name || v.mmsi}</td>
                        <td className="py-2 px-3 text-slate-600">{v.vessel_type}</td>
                        <td className="py-2 px-3 text-right text-slate-700">{v.distance_km} km</td>
                        <td className="py-2 px-3 text-right text-slate-700">{v.speed} kn</td>
                        <td className="py-2 px-3 text-center">
                          {v.suspicious ? (
                            <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold">SUSPICIOUS</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-green-100 text-green-700">Normal</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
