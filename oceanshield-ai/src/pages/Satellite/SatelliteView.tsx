import React, { useEffect, useState, useCallback } from 'react'
import { Satellite, WifiOff, Layers, Upload, MapPin, AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { getSatelliteAcquisitions, getSatelliteAnalysis } from '../../api/satellite'
import { analyzeSatelliteImage, ImageAnalysisResult } from '../../api/spills'
import { SatelliteAcquisition, SpillDetection } from '../../types/satellite'

// Predefined monitoring areas for the user to choose from
const MONITORING_AREAS = [
  { label: 'Mumbai Harbor Approach', lat: 18.9, lon: 72.8 },
  { label: 'Gulf of Khambhat - Alang', lat: 21.0, lon: 72.0 },
  { label: 'Kutch - Gujarat Coast', lat: 22.8, lon: 69.5 },
  { label: 'Goa Coast - Mormugao', lat: 15.4, lon: 73.8 },
  { label: 'Malabar Coast - Kerala', lat: 10.5, lon: 73.5 },
  { label: 'Lakshadweep Sea', lat: 10.0, lon: 73.0 },
  { label: 'Chennai - Coromandel Coast', lat: 13.1, lon: 80.3 },
  { label: 'Visakhapatnam - AP Coast', lat: 17.7, lon: 83.2 },
  { label: 'Paradip - Odisha Coast', lat: 20.3, lon: 86.6 },
  { label: 'Palk Bay - Rameswaram', lat: 9.3, lon: 79.3 },
  { label: 'Gulf of Mannar', lat: 9.0, lon: 78.5 },
  { label: 'Andaman & Nicobar Islands', lat: 11.7, lon: 92.7 },
  { label: 'Custom Coordinates', lat: 0, lon: 0 },
]

export const SatelliteView: React.FC = () => {
  const { backendStatus } = useAppStore()
  const [acquisitions, setAcquisitions] = useState<SatelliteAcquisition[]>([])
  const [detection, setDetection] = useState<SpillDetection | null>(null)

  // Image upload state
  const [selectedArea, setSelectedArea] = useState(0)
  const [customLat, setCustomLat] = useState('')
  const [customLon, setCustomLon] = useState('')
  const [captureDate, setCaptureDate] = useState(new Date().toISOString().slice(0, 10))
  const [captureTime, setCaptureTime] = useState(new Date().toISOString().slice(11, 16))
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResult | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  useEffect(() => {
    async function loadSat() {
      if (backendStatus !== 'ONLINE') {
        setAcquisitions([])
        setDetection(null)
        return
      }
      const res = await getSatelliteAcquisitions()
      if (res.data && res.data.length > 0) {
        setAcquisitions(res.data)
        const detRes = await getSatelliteAnalysis(res.data[0].id)
        if (detRes.data) setDetection(detRes.data)
      }
    }
    loadSat()
  }, [backendStatus])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadFile(file)
      setAnalysisResult(null)
      setAnalysisError(null)
      const url = URL.createObjectURL(file)
      setUploadPreview(url)
    }
  }

  const handleAnalyze = async () => {
    if (!uploadFile) return

    const area = MONITORING_AREAS[selectedArea]
    const lat = selectedArea === MONITORING_AREAS.length - 1 ? parseFloat(customLat) || 18.9 : area.lat
    const lon = selectedArea === MONITORING_AREAS.length - 1 ? parseFloat(customLon) || 72.8 : area.lon

    if (isNaN(lat) || isNaN(lon)) {
      setAnalysisError('Please enter valid coordinates.')
      return
    }

    setAnalyzing(true)
    setAnalysisError(null)
    setAnalysisResult(null)

    const timestamp = `${captureDate}T${captureTime}:00Z`
    const res = await analyzeSatelliteImage(uploadFile, lat, lon, timestamp)

    setAnalyzing(false)
    if (res.data) {
      setAnalysisResult(res.data)
    } else {
      setAnalysisError(res.error || 'Analysis failed. Ensure the backend is running.')
    }
  }

  const clearUpload = () => {
    setUploadFile(null)
    setUploadPreview(null)
    setAnalysisResult(null)
    setAnalysisError(null)
  }

  const verdictColor = (verdict?: string) => {
    if (verdict === 'confirmed') return 'text-red-600 bg-red-500/10 border-red-500/30'
    return 'text-amber-600 bg-amber-500/10 border-amber-500/30'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
          <Satellite className="w-6 h-6 text-cyan-500" />
          SAR Satellite Imagery Analysis
        </h1>
        <p className="text-xs font-mono text-slate-500 mt-1">
          Synthetic Aperture Radar (C-band / L-band) surface backscatter & slick segmentation
        </p>
      </div>

      {backendStatus === 'OFFLINE' ? (
        <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-3 bg-slate-50/50">
          <WifiOff className="w-10 h-10 text-cyan-500 mx-auto" />
          <div className="font-bold text-base text-slate-800">
            No satellite analysis available
          </div>
          <p className="text-xs font-mono text-slate-500 max-w-md mx-auto">
            Backend endpoint GET /api/v1/satellite/acquisitions is offline. Enable the backend to inspect Sentinel-1 SAR acquisition passes.
          </p>
        </div>
      ) : (
        <>
          {/* ─── Existing SAR Imagery Section ────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main SAR Image Viewer */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-cyan-500 uppercase flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  SAR BACKSCATTER OVERLAY (VV POLARIZATION)
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Resolution: 10m / pixel
                </span>
              </div>

              <div className="relative rounded-xl overflow-hidden aspect-video bg-slate-950 border border-slate-800 flex items-center justify-center">
                {acquisitions[0]?.imageUrl ? (
                  <img
                    src={acquisitions[0].imageUrl}
                    alt="SAR Satellite Acquisition"
                    className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="text-center p-8">
                    <Satellite className="w-16 h-16 text-cyan-400/40 mx-auto mb-4" />
                    <p className="text-cyan-400/60 font-mono text-sm font-bold">NO SAR ACQUISITION DATA</p>
                    <p className="text-cyan-400/40 font-mono text-xs mt-2 max-w-sm">
                      Upload a satellite image below to analyze for oil spills.
                      Real SAR passes will appear here when Sentinel-1 data is available.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Validation Metrics */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-base text-slate-900 uppercase">
                Extraction Metrics
              </h3>
              {detection && (
                <div className="space-y-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block">DARKNESS ATTENUATION INDEX</span>
                    <span className="text-lg font-bold text-cyan-500">{detection.maxDarknessIndex}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block">WIND SPEED THRESHOLD SCORE</span>
                    <span className="text-lg font-bold text-emerald-500">
                      {detection.windValidationScore}% Match
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Wind: {detection.windSpeedKtsAtScan} kts (Optimal: 3-12 kts)
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block">SLICK ASPECT RATIO</span>
                    <span className="text-lg font-bold text-slate-800">
                      {detection.shapeRatio} (Elongated Linear)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ─── USER SATELLITE IMAGE UPLOAD SECTION ──────────────────────── */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 shadow-sm space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/20">
                <Upload className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-slate-900 uppercase tracking-tight">
                  Upload Satellite Image for Spill Analysis
                </h2>
                <p className="text-xs font-mono text-slate-500">
                  Provide a SAR/optical satellite image and specify the monitoring area — our AI pipeline will compare against current data and detect potential spills
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Upload & Area Selection */}
              <div className="space-y-4">
                {/* Area selection */}
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-600 uppercase mb-2">
                    <MapPin className="w-3.5 h-3.5 inline mr-1" />
                    Monitoring Area — Which region does this satellite image cover?
                  </label>
                  <select
                    value={selectedArea}
                    onChange={(e) => setSelectedArea(Number(e.target.value))}
                    className="w-full p-3 rounded-xl border border-cyan-200 bg-white text-sm font-mono text-slate-800 outline-none focus:border-cyan-500 transition-colors"
                  >
                    {MONITORING_AREAS.map((area, idx) => (
                      <option key={idx} value={idx}>
                        {area.label}{area.lat !== 0 ? ` (${area.lat}°N, ${area.lon}°E)` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom coordinates (only show if Custom selected) */}
                {selectedArea === MONITORING_AREAS.length - 1 && (
                  <div className="grid grid-cols-2 gap-3">
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
                  </div>
                )}

                {/* Date & Time when SAR image was captured */}
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-600 uppercase mb-2">
                    When was this satellite image captured?
                  </label>
                  <p className="text-[10px] font-mono text-slate-400 mb-2">
                    Wind speed, ocean currents, and monsoon conditions will be loaded for this date/time
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-slate-500 uppercase mb-1">Capture Date</label>
                      <input type="date" value={captureDate}
                        onChange={(e) => setCaptureDate(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-cyan-200 bg-white text-sm font-mono" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-slate-500 uppercase mb-1">Capture Time (UTC)</label>
                      <input type="time" value={captureTime}
                        onChange={(e) => setCaptureTime(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-cyan-200 bg-white text-sm font-mono" />
                    </div>
                  </div>
                </div>

                {/* File upload */}
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-600 uppercase mb-2">
                    Satellite Image File
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*,.tiff,.tif,.jp2,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="hidden"
                      id="satellite-upload"
                    />
                    <label
                      htmlFor="satellite-upload"
                      className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-cyan-300 rounded-xl bg-white cursor-pointer hover:bg-cyan-50/50 transition-colors"
                    >
                      {uploadPreview ? (
                        <div className="relative w-full h-full">
                          <img src={uploadPreview} alt="Upload preview" className="w-full h-full object-contain rounded-xl" />
                          <button
                            onClick={(e) => { e.preventDefault(); clearUpload() }}
                            className="absolute top-2 right-2 p-1 rounded-full bg-slate-900/70 text-white hover:bg-red-500 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-cyan-400 mb-2" />
                          <span className="text-sm font-mono text-slate-500">Drop SAR image or click to browse</span>
                          <span className="text-[11px] font-mono text-slate-400 mt-1">Supports: TIFF, JP2, PNG, JPEG</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Analyze button */}
                <button
                  onClick={handleAnalyze}
                  disabled={!uploadFile || analyzing}
                  className="w-full py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Running AI Pipeline…
                    </>
                  ) : (
                    <>
                      <Satellite className="w-4 h-4" />
                      ANALYZE FOR OIL SPILL
                    </>
                  )}
                </button>
              </div>

              {/* Right: Results */}
              <div className="space-y-4">
                {analysisError && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-mono flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold mb-1">Analysis Error</div>
                      {analysisError}
                    </div>
                  </div>
                )}

                {analysisResult && (
                  <div className="space-y-4 animate-fade-in">
                    {/* Verdict */}
                    <div className={`p-4 rounded-xl border text-center ${verdictColor(analysisResult.verdict)}`}>
                      <div className="text-[10px] font-mono uppercase tracking-wider opacity-70">AI VERDICT</div>
                      <div className="text-2xl font-extrabold font-mono mt-1 uppercase tracking-widest">
                        {analysisResult.verdict === 'confirmed' ? '⚠ PROBABLE OIL SPILL' : 'UNCERTAIN — Needs Review'}
                      </div>
                      <div className="text-xs font-mono mt-2 opacity-80">
                        Final Score: {Math.round(analysisResult.final_score * 100)}%
                        &nbsp;|&nbsp;U-Net Confidence: {Math.round(analysisResult.unet_confidence * 100)}%
                      </div>
                    </div>

                    {/* Metrics grid */}
                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-3 rounded-xl bg-white border border-slate-100">
                        <span className="text-slate-400 block">LOCATION</span>
                        <span className="font-bold text-slate-800">
                          {analysisResult.centroid_lat.toFixed(4)}°N, {analysisResult.centroid_lon.toFixed(4)}°E
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-slate-100">
                        <span className="text-slate-400 block">DETECTED AT</span>
                        <span className="font-bold text-slate-800">
                          {new Date(analysisResult.detected_at).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Filter breakdown */}
                    {analysisResult.filter_breakdown && (
                      <div className="p-4 rounded-xl bg-white border border-slate-100 space-y-2">
                        <div className="text-xs font-mono font-bold text-slate-600 uppercase border-b border-slate-100 pb-2">
                          5-Layer Filter Pipeline Breakdown
                        </div>
                        {analysisResult.filter_breakdown.wind && (
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-slate-500">Wind Filter</span>
                            <span className="text-slate-700 font-bold">
                              {Math.round((analysisResult.filter_breakdown.wind as any).weight * 100)}% — {(analysisResult.filter_breakdown.wind as any).wind_speed_ms?.toFixed(1)} m/s
                            </span>
                          </div>
                        )}
                        {analysisResult.filter_breakdown.lookalike_prob !== undefined && (
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-slate-500">Shape/Texture (Lookalike)</span>
                            <span className="text-slate-700 font-bold">{Math.round((analysisResult.filter_breakdown.lookalike_prob as number) * 100)}%</span>
                          </div>
                        )}
                        {analysisResult.filter_breakdown.spatial_context && (
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-slate-500">Spatial Context</span>
                            <span className="text-slate-700 font-bold">
                              {Math.round((analysisResult.filter_breakdown.spatial_context as any).weight * 100)}%
                            </span>
                          </div>
                        )}
                        {analysisResult.filter_breakdown.ais_crosscheck && (
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-slate-500">AIS Correlation</span>
                            <span className="text-slate-700 font-bold">
                              {(analysisResult.filter_breakdown.ais_crosscheck as any).boost?.toFixed(2)}×
                            </span>
                          </div>
                        )}
                        {analysisResult.filter_breakdown.persistence && (
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-slate-500">Persistence Check</span>
                            <span className="text-slate-700 font-bold">
                              {(analysisResult.filter_breakdown.persistence as any).penalty?.toFixed(2)}×
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {!analysisResult && !analysisError && !analyzing && (
                  <div className="flex flex-col items-center justify-center h-full min-h-[300px] border-2 border-dashed border-cyan-200 rounded-xl text-center p-6">
                    <Satellite className="w-12 h-12 text-cyan-300 mb-3" />
                    <div className="font-bold text-sm text-slate-600">Awaiting Image Upload</div>
                    <p className="text-xs font-mono text-slate-400 mt-1 max-w-xs">
                      Select a monitoring area and upload a SAR satellite image to run the full 5-layer spill detection pipeline
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
