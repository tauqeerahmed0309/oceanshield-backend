import React from 'react';
import { Eye, ShieldAlert, Cpu, Radio } from 'lucide-react';

export default function SatelliteViewer({ incident, simulationStep }) {
  if (!incident) {
    return (
      <div className="bg-white border border-sky-200 rounded-lg p-6 h-full flex flex-col items-center justify-center text-center text-slate-400 font-mono shadow-sm">
        <Eye className="w-12 h-12 mb-3 text-slate-300" />
        <p>No active satellite target selected.</p>
        <p className="text-xs text-slate-400 mt-1">Select an incident area or click investigate to begin SAR radar acquisition.</p>
      </div>
    );
  }

  let stage = 'IDLE';
  if (simulationStep >= 4) {
    if (simulationStep === 4) stage = 'ACQUIRING';
    else if (simulationStep === 5) stage = 'ANALYZING';
    else stage = 'READY';
  } else {
    if (incident.status === 'ACQUIRING') stage = 'ACQUIRING';
    else if (incident.status === 'ANALYZING') stage = 'ANALYZING';
    else stage = 'READY';
  }

  return (
    <div className="bg-white border border-sky-200 rounded-lg p-4 h-full flex flex-col shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-sky-500" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 font-mono">
            Sentinel-1 SAR Radar Analysis
          </h3>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-lg font-mono font-bold ${
          stage === 'ACQUIRING' ? 'bg-sky-100 text-sky-700 animate-pulse border border-sky-200' :
          stage === 'ANALYZING' ? 'bg-amber-100 text-amber-700 animate-pulse border border-amber-200' :
          'bg-red-50 text-red-600 border border-red-200'
        }`}>
          {stage}
        </span>
      </div>

      {/* Synthetic SAR Image panel - kept dark for technical viewing */}
      <div className="relative aspect-video w-full border border-slate-300 bg-[#0c1525] rounded-lg overflow-hidden flex items-center justify-center select-none font-mono">
        
        {/* Acquiring view */}
        {stage === 'ACQUIRING' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/80 text-sky-400">
            <div className="radar-sweep w-40 h-40 border border-sky-700/30 relative flex items-center justify-center">
              <div className="w-2 h-2 bg-sky-400 rounded-full animate-ping" />
            </div>
            <div className="text-xs mt-4 tracking-widest uppercase animate-pulse">
              Acquiring SAR Co-pol Signal...
            </div>
          </div>
        )}

        {/* Analyzing view */}
        {stage === 'ANALYZING' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/80 text-amber-400">
            <Cpu className="w-12 h-12 mb-3 animate-spin text-amber-500" />
            <div className="text-xs tracking-widest uppercase animate-pulse mb-1">
              Extracting backscatter coefficient (Sigma-0)
            </div>
            <div className="w-48 bg-slate-800 h-1 rounded-full overflow-hidden border border-slate-700">
              <div className="bg-amber-500 h-full animate-[pulse_1s_infinite]" style={{ width: '65%' }}></div>
            </div>
          </div>
        )}

        {/* Static SAR Radar Grid Background */}
        <svg className="absolute inset-0 w-full h-full opacity-35" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1f3050" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <circle cx="50%" cy="50%" r="60" stroke="#1a335c" strokeWidth="0.8" strokeDasharray="3,6" />
          <circle cx="50%" cy="50%" r="120" stroke="#1a335c" strokeWidth="0.8" strokeDasharray="3,6" />
        </svg>

        {/* Synthetic Radar Signature elements */}
        {stage === 'READY' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg viewBox="0 0 400 220" className="w-full h-full">
              <defs>
                <filter id="noise">
                  <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="1" result="noise" />
                  <feColorMatrix type="matrix" values="0.1 0 0 0 0  0 0.15 0 0 0  0 0 0.25 0 0  0 0 0 0.3 0" />
                  <feComposite operator="in" in2="SourceGraphic" />
                </filter>
              </defs>
              <rect width="400" height="220" fill="#0c1525" filter="url(#noise)" opacity="0.8" />

              <text x="10" y="18" fill="#7dd3fc" fontSize="8" opacity="0.6">N25°46'51.6" W90°25'15.6"</text>
              <text x="310" y="18" fill="#7dd3fc" fontSize="8" opacity="0.6">Sentinel-1B C-band SAR</text>

              <path 
                d="M 120,95 Q 160,80 180,95 T 220,110 T 260,105 T 220,135 T 160,140 Z" 
                fill="#020407" 
                stroke="#ef4444" 
                strokeWidth="1.5"
                strokeOpacity="0.8"
                fillOpacity="0.85"
                className="animate-pulse"
              />

              <line x1="230" y1="120" x2="280" y2="150" stroke="#ef4444" strokeWidth="1" strokeDasharray="2,2" />
              <text x="285" y="153" fill="#ef4444" fontSize="8" fontWeight="bold">TARGET OIL SLICK (#104)</text>
              <text x="285" y="163" fill="#94a3b8" fontSize="7">Est: 3.8 km²</text>

              <circle cx="115" cy="93" r="3.5" fill="#0ea5e9" />
              <polygon points="115,86 110,93 115,91 120,93" fill="#0ea5e9" opacity="0.5" />
              <line x1="115" y1="93" x2="60" y2="130" stroke="#0ea5e9" strokeWidth="1" strokeDasharray="2,2" />
              <text x="25" y="142" fill="#0ea5e9" fontSize="8" fontWeight="bold">PRIMARY VESSEL SOURCE</text>
              <text x="25" y="152" fill="#94a3b8" fontSize="7">MMSI 367123456</text>
              <text x="25" y="162" fill="#94a3b8" fontSize="7">Dist: 1.2 NM</text>

              <line x1="10" y1="205" x2="60" y2="205" stroke="#e2e8f0" strokeWidth="2" />
              <text x="10" y="200" fill="#e2e8f0" fontSize="7">2.0 NM</text>
            </svg>
          </div>
        )}
      </div>

      {/* Look-alike analysis table */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-slate-600 mb-2 font-mono uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              Look-Alike Radar Analysis
            </div>
            
            <div className="space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Surface Darkness:</span>
                <span className={`font-bold ${stage === 'READY' ? 'text-red-600' : 'text-slate-400'}`}>
                  {stage === 'READY' ? incident.lookalikeAnalysis.surfaceDarkness : 'PENDING'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Slick Shape (Fractal):</span>
                <span className={`font-bold ${stage === 'READY' ? 'text-red-600' : 'text-slate-400'}`}>
                  {stage === 'READY' ? incident.lookalikeAnalysis.slickShape : 'PENDING'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Texture Similarity:</span>
                <span className={`font-bold ${stage === 'READY' ? 'text-red-600' : 'text-slate-400'}`}>
                  {stage === 'READY' ? incident.lookalikeAnalysis.textureSimilarity : 'PENDING'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Wind Compatibility:</span>
                <span className={`font-bold ${stage === 'READY' ? (incident.lookalikeAnalysis.windCompatibility === 'LOW' ? 'text-amber-600' : 'text-red-600') : 'text-slate-400'}`}>
                  {stage === 'READY' ? incident.lookalikeAnalysis.windCompatibility : 'PENDING'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Distance from Vessel:</span>
                <span className={`font-bold ${stage === 'READY' ? 'text-red-600' : 'text-slate-400'}`}>
                  {stage === 'READY' ? incident.lookalikeAnalysis.distanceFromVessel : 'PENDING'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 border-t border-slate-200 pt-2 flex justify-between items-center text-xs font-mono">
            <span className="text-slate-500">Estimated Area:</span>
            <span className="text-slate-700 font-bold">{stage === 'READY' ? `${incident.area} km²` : '---'}</span>
          </div>
        </div>

        {/* Classification Results */}
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-slate-600 mb-2 font-mono uppercase tracking-wider border-b border-slate-200 pb-1">
              Detection Classification
            </div>
            
            <div className="text-center py-2">
              <div className="text-xs text-slate-400 font-mono">CLASSIFICATION</div>
              <div className={`text-sm font-bold font-mono tracking-widest ${stage === 'READY' ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                {stage === 'READY' ? 'PROBABLE OIL SPILL' : 'ACQUIRING FIELD...'}
              </div>
              <div className="text-2xl font-bold text-slate-800 mt-1">
                {stage === 'READY' ? `${incident.oilProbability}%` : '0%'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">CONFIDENCE PROBABILITY</div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg text-[10px] text-amber-700 leading-normal font-mono">
            <strong>TECHNICAL NOTICE:</strong> SAR dark spots may have non-oil causes (wind calm, algal bloom, grease ice). Detection requires contextual validation against AIS traces.
          </div>
        </div>
      </div>
    </div>
  );
}
