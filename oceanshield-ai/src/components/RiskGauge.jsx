import React from 'react';
import { AlertOctagon } from 'lucide-react';

export default function RiskGauge({ score, breakdown, title = "Environmental Threat Index" }) {
  const radius = 45;
  const strokeWidth = 8;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getRiskColor = (s) => {
    if (s >= 80) return 'text-red-500';
    if (s >= 50) return 'text-amber-500';
    return 'text-sky-600';
  };

  const getRiskBg = (s) => {
    if (s >= 80) return 'stroke-red-500';
    if (s >= 50) return 'stroke-amber-500';
    return 'stroke-sky-500';
  };

  const getRiskText = (s) => {
    if (s >= 80) return 'CRITICAL';
    if (s >= 50) return 'MEDIUM';
    return 'LOW';
  };

  return (
    <div className="bg-white border border-sky-200 rounded-lg p-4 h-full flex flex-col justify-between font-mono shadow-sm">
      <div>
        <div className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1.5">
          <AlertOctagon className="w-3.5 h-3.5 text-red-500 animate-pulse" />
          {title}
        </div>

        <div className="flex items-center justify-around py-3">
          {/* Radial Circular Gauge */}
          <div className="relative flex items-center justify-center">
            <svg height="110" width="110" className="transform -rotate-90">
              <circle
                stroke="#e2e8f0"
                fill="transparent"
                strokeWidth={strokeWidth}
                r={normalizedRadius}
                cx="55"
                cy="55"
              />
              <circle
                className={`transition-all duration-1000 ease-out ${getRiskBg(score)}`}
                fill="transparent"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference + ' ' + circumference}
                style={{ strokeDashoffset }}
                strokeLinecap="round"
                r={normalizedRadius}
                cx="55"
                cy="55"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-slate-800">{score}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">/ 100</span>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <span className="text-xs text-slate-500">Risk Assessment:</span>
            <span className={`text-lg font-bold ${getRiskColor(score)} tracking-widest`}>
              {getRiskText(score)}
            </span>
            <span className="text-[9px] text-slate-400 leading-normal max-w-[140px] mt-1">
              Calculated based on spill parameters and local environmental sensitivity.
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2 border-t border-slate-200 pt-3">
        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">Threat Vectors</div>
        
        {/* Breakdown Items */}
        <div className="space-y-2">
          {Object.entries(breakdown || {}).map(([key, val]) => {
            const formattedLabel = key.replace(/([A-Z])/g, ' $1');
            return (
              <div key={key} className="space-y-0.5">
                <div className="flex justify-between text-[10px] text-slate-500 uppercase">
                  <span>{formattedLabel}</span>
                  <span className="font-bold text-slate-600">{val}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${val}%`,
                      backgroundColor: val >= 80 ? '#ef4444' : val >= 50 ? '#f97316' : '#0ea5e9'
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
