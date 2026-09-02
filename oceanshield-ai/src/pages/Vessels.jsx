import React, { useState } from 'react';
import { Search, Compass, ShieldAlert, CheckCircle, Ship, AlertCircle } from 'lucide-react';

export default function Vessels({ vessels, selectedVessel, onSelectVessel }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredVessels = vessels.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         v.mmsi.includes(searchTerm) ||
                         v.imo.includes(searchTerm);
    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter || (statusFilter === 'ANOMALOUS' && v.status === 'CRITICAL');
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ANOMALOUS':
      case 'CRITICAL':
        return <span className="bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold">CRITICAL</span>;
      case 'WARNING':
        return <span className="bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded text-[10px] font-bold">WARNING</span>;
      default:
        return <span className="bg-sky-100 text-sky-700 border border-sky-200 px-2 py-0.5 rounded text-[10px] font-bold">NORMAL</span>;
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'CRITICAL':
      case 'HIGH':
        return 'text-red-500 font-bold';
      case 'MEDIUM':
        return 'text-amber-500 font-bold';
      default:
        return 'text-sky-600';
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full min-h-0">
      
      {/* Vessels Table & List (Col span 2) */}
      <div className="xl:col-span-2 bg-white border border-sky-200 rounded-lg p-4 flex flex-col min-h-[400px] shadow-sm">
        {/* Filters */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 border-b border-slate-200 pb-4 mb-4 font-mono text-xs">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Ship className="w-4 h-4 text-sky-500" />
            Vessel Tracking Directory
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search by Name/MMSI/IMO..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-400 w-48 transition-all"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            {/* Filter buttons */}
            <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
              {['ALL', 'NORMAL', 'WARNING', 'ANOMALOUS'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 hover:bg-sky-50 transition-colors font-bold ${
                    statusFilter === status ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider bg-slate-50">
                <th className="py-2.5 px-3">Vessel Name</th>
                <th className="py-2.5 px-3">IMO / MMSI</th>
                <th className="py-2.5 px-3">Coordinates</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">AIS Status</th>
                <th className="py-2.5 px-3 text-right">Risk</th>
              </tr>
            </thead>
            <tbody>
              {filteredVessels.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400">
                    No active targets matching criteria.
                  </td>
                </tr>
              ) : (
                filteredVessels.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => onSelectVessel(v)}
                    className={`border-b border-slate-100 hover:bg-sky-50 cursor-pointer transition-colors ${
                      selectedVessel?.id === v.id ? 'bg-sky-50 border-sky-300' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-bold text-slate-800">{v.name}</td>
                    <td className="py-3 px-3 text-slate-500">
                      IMO {v.imo}<br />
                      <span className="text-[10px]">MMSI {v.mmsi}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {v.lat.toFixed(4)}° N<br />
                      <span className="text-[10px]">{Math.abs(v.lng).toFixed(4)}° W</span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{v.type}</td>
                    <td className="py-3 px-3">{getStatusBadge(v.status)}</td>
                    <td className={`py-3 px-3 text-right ${getRiskColor(v.risk)}`}>{v.risk}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vessel Details sliding/static Panel (Col span 1) */}
      <div className="bg-white border border-sky-200 rounded-lg p-4 flex flex-col justify-between font-mono shadow-sm">
        {selectedVessel ? (
          <div className="flex flex-col gap-4 flex-1 justify-between">
            <div>
              <div className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-sky-500" />
                Selected Vessel Details
              </div>

              {/* Vessel Main Info */}
              <div className="bg-slate-50 p-3 border border-slate-200 rounded-lg mb-4">
                <div className="text-sm font-bold text-slate-800 mb-2">{selectedVessel.name}</div>
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">IMO Number:</span>
                    <span className="text-slate-600">{selectedVessel.imo}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">MMSI:</span>
                    <span className="text-slate-600">{selectedVessel.mmsi}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">Vessel Type:</span>
                    <span className="text-slate-600">{selectedVessel.type}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">Speed:</span>
                    <span className="text-slate-600">{selectedVessel.speed} kn</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">Course Angle:</span>
                    <span className="text-slate-600">{selectedVessel.course}°</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">Destination:</span>
                    <span className="text-slate-600">{selectedVessel.destination}</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Status Markers */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-50 p-2 border border-slate-200 rounded-lg">
                  <div className="text-[9px] text-slate-400 uppercase font-bold">AIS Integrity</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    {selectedVessel.status === 'NORMAL' ? (
                      <CheckCircle className="w-3.5 h-3.5 text-sky-500" />
                    ) : (
                      <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                    )}
                    <span className={`text-xs font-bold ${selectedVessel.status === 'NORMAL' ? 'text-sky-600' : 'text-red-500'}`}>
                      {selectedVessel.status}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-2 border border-slate-200 rounded-lg">
                  <div className="text-[9px] text-slate-400 uppercase font-bold">Risk Assessment</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className={`text-xs font-bold ${getRiskColor(selectedVessel.risk)}`}>
                      {selectedVessel.risk} LEVEL
                    </span>
                  </div>
                </div>
              </div>

              {/* Behavior Indicators (Progress bars) */}
              <div className="space-y-3">
                <div className="text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200 pb-1">
                  AIS Anomaly Vector Breakdown ({selectedVessel.anomalyScore}/100)
                </div>

                <div className="space-y-2">
                  {[
                    { label: 'Speed Deviation', val: selectedVessel.indicators.speedDeviation },
                    { label: 'Course Deviation', val: selectedVessel.indicators.courseDeviation },
                    { label: 'Unexpected Stop', val: selectedVessel.indicators.unexpectedStop },
                    { label: 'Route Deviation', val: selectedVessel.indicators.routeDeviation },
                    { label: 'AIS Transmission Gap', val: selectedVessel.indicators.aisGap }
                  ].map((ind, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>{ind.label}</span>
                        <span className="font-bold text-slate-600">{ind.val}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${ind.val}%`,
                            backgroundColor: ind.val >= 80 ? '#ef4444' : ind.val >= 50 ? '#f97316' : '#0ea5e9'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-sky-50 border border-sky-200 p-2.5 rounded-lg text-[10px] text-slate-500 leading-normal mt-4">
              <div className="flex items-center gap-1 text-sky-600 font-bold mb-1 uppercase tracking-wide">
                <AlertCircle className="w-3.5 h-3.5 text-sky-500" />
                Vessel Observation Log
              </div>
              Telemetry coordinates are synced via global AIS networks. Behavior indicators represent mathematical deviations from historical models.
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
            <Ship className="w-12 h-12 mb-3 text-slate-300" />
            <p className="text-xs">No Vessel Selected</p>
            <p className="text-[10px] text-slate-300 mt-1">Select a vessel from the directory to inspect radar tracks, AIS gaps, and behavioral vectors.</p>
          </div>
        )}
      </div>

    </div>
  );
}
