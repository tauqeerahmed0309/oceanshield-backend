import React, { useState } from 'react';
import { ShieldAlert, Compass, ChevronRight, AlertCircle } from 'lucide-react';

export default function Anomalies({ vessels, onSelectVessel, onViewVesselPage }) {
  const [selectedAnomalyId, setSelectedAnomalyId] = useState('vessel-1');

  const anomalousVessels = vessels.filter(v => v.anomalyScore >= 50);
  const selectedVessel = vessels.find(v => v.id === selectedAnomalyId) || anomalousVessels[0];

  const getAnomalyType = (v) => {
    if (v.id === 'vessel-1') return 'Sudden stop';
    if (v.id === 'vessel-2') return 'Course deviation';
    if (v.id === 'vessel-3') return 'Route deviation';
    if (v.id === 'vessel-4') return 'AIS gap';
    return 'Trajectory drift';
  };

  const renderASCIIBar = (val) => {
    const filledCount = Math.round(val / 10);
    const emptyCount = 10 - filledCount;
    return '█'.repeat(filledCount) + '░'.repeat(emptyCount);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full min-h-0">
      
      {/* Anomalies Table (Col span 2) */}
      <div className="xl:col-span-2 bg-white border border-sky-200 rounded-lg p-4 flex flex-col min-h-[400px] shadow-sm">
        <div className="border-b border-slate-200 pb-4 mb-4 font-mono text-xs">
          <h3 className="text-sm font-bold uppercase tracking-wider text-red-500 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
            Active AIS Anomalies Registry
          </h3>
          <p className="text-slate-400 text-[10px] mt-1">
            Vessels displaying statistical drift, course offset, or transmission dropouts.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider bg-slate-50">
                <th className="py-2.5 px-3">Vessel</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Anomaly Type</th>
                <th className="py-2.5 px-3 text-center">Score</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {anomalousVessels.map((v) => (
                <tr
                  key={v.id}
                  onClick={() => setSelectedAnomalyId(v.id)}
                  className={`border-b border-slate-100 hover:bg-sky-50 cursor-pointer transition-colors ${
                    selectedVessel?.id === v.id ? 'bg-sky-50 border-sky-300' : ''
                  }`}
                >
                  <td className="py-3 px-3 font-bold text-slate-800">{v.name}</td>
                  <td className="py-3 px-3 text-slate-500">{v.type}</td>
                  <td className="py-3 px-3 text-amber-600">{getAnomalyType(v)}</td>
                  <td className="py-3 px-3 text-center font-bold text-red-500">{v.anomalyScore}</td>
                  <td className="py-3 px-3 text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      v.risk === 'CRITICAL' || v.risk === 'HIGH'
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : 'bg-orange-100 text-orange-700 border border-orange-200'
                    }`}>
                      {v.risk}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analysis Panel (Col span 1) */}
      <div className="bg-white border border-sky-200 rounded-lg p-4 flex flex-col justify-between font-mono shadow-sm">
        {selectedVessel ? (
          <div className="flex flex-col justify-between h-full gap-4">
            <div>
              <div className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-red-500" />
                AIS Anomaly Vector Details
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg mb-4 text-xs">
                <div className="text-sm font-bold text-slate-800 mb-1">{selectedVessel.name}</div>
                <div className="text-slate-500 mb-2">IMO: {selectedVessel.imo} | MMSI: {selectedVessel.mmsi}</div>
                <div className="text-amber-600">Class Deviation: {getAnomalyType(selectedVessel)}</div>
              </div>

              {/* ASCII Progress Bar Display */}
              <div className="space-y-4">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide border-b border-slate-200 pb-1">
                  AI VECTOR BREAKDOWN
                </div>

                <div className="space-y-3 text-xs leading-normal">
                  {[
                    { label: 'Speed deviation', val: selectedVessel.indicators.speedDeviation },
                    { label: 'Course deviation', val: selectedVessel.indicators.courseDeviation },
                    { label: 'Unexpected stop', val: selectedVessel.indicators.unexpectedStop },
                    { label: 'Route deviation', val: selectedVessel.indicators.routeDeviation },
                    { label: 'AIS transmission gap', val: selectedVessel.indicators.aisGap }
                  ].map((ind, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between text-slate-500">
                        <span>{ind.label}</span>
                        <span className="font-bold text-slate-700">{ind.val}%</span>
                      </div>
                      <div className="text-sky-500 text-sm tracking-tighter">
                        {renderASCIIBar(ind.val)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-200 pt-3 mt-2 flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 uppercase font-bold text-xs">Overall Score:</span>
                  <span className="text-xl font-bold text-red-500">{selectedVessel.anomalyScore} / 100</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-[10px] text-slate-500 leading-normal">
                <div className="font-bold text-amber-600 uppercase mb-1">Analytical Context</div>
                "The vessel exhibits statistically unusual behaviour compared with its recent trajectory."
              </div>

              <div className="bg-red-50 border border-red-200 p-2.5 rounded-lg text-[10px] text-red-600 leading-normal">
                <div className="font-bold uppercase mb-0.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                  Operator Directive
                </div>
                The system only identifies anomaly scores requiring human verification. AI alerts indicate behavior variance and do not establish direct emergency status.
              </div>

              <button
                onClick={() => {
                  onSelectVessel(selectedVessel);
                  onViewVesselPage();
                }}
                className="w-full py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold border border-sky-300 hover:border-sky-400 rounded-lg transition-colors text-xs flex items-center justify-center gap-1.5"
              >
                <span>INVESTIGATE TRACK DETAILS</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs">
            No Anomalous Vessel Selected
          </div>
        )}
      </div>

    </div>
  );
}
