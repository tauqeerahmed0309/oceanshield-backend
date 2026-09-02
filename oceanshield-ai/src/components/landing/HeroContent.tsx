import React from 'react'
import { ArrowRight, ChevronDown, ShieldAlert, Satellite, Compass } from 'lucide-react'

interface HeroContentProps {
  onStartClick: () => void
  opacity?: number
}

export const HeroContent: React.FC<HeroContentProps> = ({ onStartClick, opacity = 1 }) => {
  return (
    <div
      className="relative z-10 min-h-screen flex flex-col justify-center px-6 md:px-16 max-w-5xl mx-auto pt-20 transition-opacity duration-300"
      style={{ opacity }}
    >
      {/* Category Tag */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-white font-mono text-xs font-semibold uppercase tracking-widest mb-6 w-max">
        <ShieldAlert className="w-4 h-4 text-cyan-600" />
        SIH 2026 AI-Powered Maritime Platform
      </div>

      {/* Main Title */}
      <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 uppercase leading-none mb-4">
        MARINE SENTINEL
      </h1>

      {/* Subtitle */}
      <h2 className="text-xl md:text-3xl font-semibold tracking-wide text-white uppercase mb-4">
        AI-Powered Oil Spill Intelligence
      </h2>

      {/* Supporting Line */}
      <p className="text-lg md:text-xl font-mono font-medium text-slate-700 mb-6 italic">
        "Detect. Verify. Trace. Attribute."
      </p>

      {/* Description */}
      <p className="text-base md:text-lg text-slate-600 max-w-2xl leading-relaxed mb-8">
        An intelligent maritime monitoring platform combining vessel behaviour, satellite SAR imagery,
        environmental conditions and AI to detect potential oil spills and identify probable source vessels.
      </p>

      {/* Action CTA & Visual Badges */}
      <div className="flex flex-wrap items-center gap-4 mb-16">
        <button
          onClick={onStartClick}
          className="px-8 py-4 rounded-xl bg-[#087EA4] hover:bg-[#00A9D6][#39C6E8]:bg-[#00E0C6] text-white font-bold text-base tracking-wider uppercase flex items-center gap-3 shadow-xl hover:shadow-cyan-500/30 transition-all active:scale-95"
        >
          <span>LET'S START</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-500 px-4 py-3 rounded-xl border border-slate-200 bg-white/50 backdrop-blur-sm">
          <Satellite className="w-4 h-4 text-cyan-500" />
          <span>SAR Satellite Integration</span>
          <span className="text-slate-300">|</span>
          <Compass className="w-4 h-4 text-cyan-500" />
          <span>Drift Analysis</span>
        </div>
      </div>

      {/* Scroll Down Visual Hint */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-500 font-mono text-xs tracking-widest uppercase animate-bounce">
        <span>SCROLL TO EXPLORE</span>
        <ChevronDown className="w-4 h-4" />
      </div>
    </div>
  )
}
