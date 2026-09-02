import React from 'react';
import { BarChart3 } from 'lucide-react';
import AnalyticsCharts from '../components/AnalyticsCharts';

export default function Analytics() {
  return (
    <div className="flex flex-col gap-4 h-full min-h-0 overflow-y-auto custom-scrollbar pr-1">
      {/* Title */}
      <div className="bg-white border border-sky-200 rounded-lg p-3 flex items-center justify-between font-mono text-xs shadow-sm">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-sky-500" />
          <span className="font-bold uppercase tracking-wider text-slate-800">
            System Analytics & Performance Dash
          </span>
        </div>
        <span className="text-[10px] text-slate-400">
          Last updated: Just now
        </span>
      </div>

      {/* Grid wrapper */}
      <div className="flex-1">
        <AnalyticsCharts />
      </div>
    </div>
  );
}
