import React from 'react'
import { ArrowRight, ShieldAlert, Eye, AlertTriangle, Satellite, Wind, Target, Anchor } from 'lucide-react'

interface StoryOverlayProps {
  scrollProgress: number // 0 to 1
  onStartClick: () => void
}

export const StoryOverlay: React.FC<StoryOverlayProps> = ({ scrollProgress, onStartClick }) => {
  return (
    <div className="relative z-10 w-full pointer-events-none">
      {/* SECTION 1: HERO VIEW (0% - 15%) */}
      <section className="min-h-screen flex flex-col justify-center px-6 md:px-16 max-w-6xl mx-auto pt-24 pb-16 pointer-events-auto">
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-sky-500/10 border border-sky-500/20 text-white font-mono text-xs font-bold uppercase tracking-widest mb-6 w-max shadow-sm">
          <ShieldAlert className="w-4 h-4 text-sky-600 animate-pulse" />
          Smart India Hackathon 2026 Innovation
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-slate-900 uppercase leading-none mb-4">
          MARINE SENTINEL
        </h1>

        <h2 className="text-2xl md:text-4xl font-bold tracking-wide text-white uppercase mb-4">
          AI-Powered Oil Spill Intelligence
        </h2>

        <p className="text-lg md:text-2xl font-mono text-slate-700 font-semibold mb-6 italic">
          "Detect. Verify. Trace. Attribute."
        </p>

        <p className="text-base md:text-xl font-bold text-slate-600 max-w-xl leading-relaxed mb-8">
          An intelligent maritime monitoring platform combining vessel behaviour, satellite SAR imagery,
          environmental conditions and AI to detect potential oil spills and identify probable source vessels.
        </p>

        {/* Action Button */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={onStartClick}
            className="px-9 py-4 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white font-black text-lg tracking-wider uppercase flex items-center gap-3 shadow-xl shadow-sky-500/25 transition-all active:scale-95 cursor-pointer"
          >
            <span>LET'S START</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 text-xs font-mono text-slate-600 px-5 py-3.5 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-md shadow-sm">
            <Anchor className="w-4 h-4 text-sky-600" />
            <span>Interactive 3D Maritime Storytelling</span>
          </div>
        </div>
      </section>

      {/* SECTION 2: WATCH THE MOVEMENT (20% - 35%) */}
      <section className="min-h-screen flex items-center px-6 md:px-16 max-w-6xl mx-auto py-16 pointer-events-auto">
        <div className="max-w-xl p-8 md:p-10 rounded-3xl bg-white/90 backdrop-blur-2xl border border-slate-200/80 text-slate-900 shadow-2xl shadow-slate-900/5 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-700 font-mono text-xs font-bold uppercase">
            <Eye className="w-4 h-4" />
            CONCEPTUAL AIS VISUALIZATION
          </div>

          <h3 className="text-3xl md:text-5xl font-extrabold tracking-tight uppercase text-slate-900">
            WE WATCH THE MOVEMENT.
          </h3>

          <p className="text-sm md:text-base font-mono text-slate-600 leading-relaxed">
            Continuous tracking of Automated Identification System (AIS) trajectories across high-risk marine corridors.
          </p>

          <div className="pt-2 text-xs font-mono text-sky-600 flex items-center gap-2 font-bold">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
            <span>Active AIS Stream Monitoring</span>
          </div>
        </div>
      </section>

      {/* SECTION 3: ANOMALY DETECTION (40% - 55%) */}
      <section className="min-h-screen flex items-center justify-end px-6 md:px-16 max-w-6xl mx-auto py-16 pointer-events-auto">
        <div className="max-w-xl p-8 md:p-10 rounded-3xl bg-white/90 backdrop-blur-2xl border border-amber-200 text-slate-900 shadow-2xl shadow-slate-900/5 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 font-mono text-xs font-bold uppercase">
            <AlertTriangle className="w-4 h-4" />
            CONCEPTUAL ANOMALY DETECTION
          </div>

          <h3 className="text-3xl md:text-5xl font-extrabold tracking-tight uppercase text-amber-600">
            AI DETECTS ANOMALIES.
          </h3>

          <p className="text-sm md:text-base font-mono text-slate-600 leading-relaxed">
            Machine learning models flag unannounced AIS transmission blackouts, sharp course alterations, and loitering in protected marine sanctuaries.
          </p>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-mono text-xs font-semibold">
            ALERT: Unannounced AIS Transmission Gap Identified
          </div>
        </div>
      </section>

      {/* SECTION 4: SATELLITE SAR & SPILL VERIFICATION (60% - 75%) */}
      <section className="min-h-screen flex items-center px-6 md:px-16 max-w-6xl mx-auto py-16 pointer-events-auto">
        <div className="max-w-xl p-8 md:p-10 rounded-3xl bg-white/90 backdrop-blur-2xl border border-sky-200 text-slate-900 shadow-2xl shadow-slate-900/5 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-700 font-mono text-xs font-bold uppercase">
            <Satellite className="w-4 h-4 text-sky-600" />
            SAR SATELLITE SCANNING
          </div>

          <h3 className="text-3xl md:text-5xl font-extrabold tracking-tight uppercase text-slate-900">
            SATELLITE PROVIDES THE EVIDENCE.
          </h3>

          <p className="text-sm md:text-base font-mono text-slate-600 leading-relaxed">
            Synthetic Aperture Radar (SAR) imagery penetrates night darkness and thick clouds to extract surface backscatter anomalies.
          </p>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-100">
              <span className="text-slate-500 block">WIND SPEED</span>
              <span className="font-bold text-slate-800">8.5 kts</span>
            </div>
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-100">
              <span className="text-slate-500 block">SLICK AREA</span>
              <span className="font-bold text-slate-800">14.8 sq km</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: HYDRODYNAMIC DRIFT & VESSEL ATTRIBUTION (78% - 90%) */}
      <section className="min-h-screen flex items-center justify-end px-6 md:px-16 max-w-6xl mx-auto py-16 pointer-events-auto">
        <div className="max-w-xl p-8 md:p-10 rounded-3xl bg-white/90 backdrop-blur-2xl border border-slate-200 text-slate-900 shadow-2xl shadow-slate-900/5 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-700 font-mono text-xs font-bold uppercase">
            <Target className="w-4 h-4" />
            SOURCE VESSEL ATTRIBUTION
          </div>

          <h3 className="text-3xl md:text-5xl font-extrabold tracking-tight uppercase text-slate-900">
            WE TRACE BACK TO THE SOURCE.
          </h3>

          <p className="text-sm md:text-base font-mono text-slate-600 leading-relaxed">
            Lagrangian hydrodynamic drift modeling reverses ocean current and wind drag vectors to identify the most probable source vessel.
          </p>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between p-3 rounded-xl bg-red-50 border border-red-200 text-red-900">
              <span>TANKER (MMSI 419001234)</span>
              <span className="font-bold text-red-600">MATCH: HIGH (94%)</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
              <span>BULK CARRIER (MMSI 352990123)</span>
              <span className="font-bold text-amber-600">MATCH: MEDIUM (48%)</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: ENTER APPLICATION CTA (92% - 100%) */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto py-16 pointer-events-auto">
        <div className="p-10 md:p-14 rounded-3xl bg-white/95 backdrop-blur-2xl border-2 border-sky-400 shadow-2xl shadow-sky-950/10 space-y-6 w-full">
          <span className="px-4 py-1.5 rounded-full bg-sky-500/10 border border-sky-400/30 text-sky-700 font-mono text-xs font-bold uppercase">
            OPERATIONAL COMMAND CENTER READY
          </span>

          <h3 className="text-4xl md:text-6xl font-black tracking-tight uppercase text-slate-900 leading-none">
            FROM SUSPICION TO EVIDENCE.
          </h3>

          <p className="text-base md:text-xl font-mono text-slate-600 max-w-xl mx-auto leading-relaxed">
            Ready to explore live vessel analytics, satellite SAR image extraction, and hydrodynamic drift attribution?
          </p>

          <button
            onClick={onStartClick}
            className="px-10 py-5 rounded-2xl bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 hover:scale-105 text-white font-black text-xl tracking-wider uppercase inline-flex items-center gap-4 shadow-2xl shadow-sky-500/30 transition-all active:scale-95 cursor-pointer"
          >
            <span>ENTER MARINE SENTINEL</span>
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </section>
    </div>
  )
}
