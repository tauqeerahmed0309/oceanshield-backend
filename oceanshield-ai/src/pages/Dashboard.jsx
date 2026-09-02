import React from 'react';
import { Ship, ShieldAlert, Droplet, AlertTriangle, Globe, Compass, RefreshCw, Play, SkipForward } from 'lucide-react';
import VesselMap from '../components/VesselMap';

export default function Dashboard({
  vessels,
  incidents,
  alerts,
  selectedVessel,
  onSelectVessel,
  simulationStep,
  simulationMessage,
  isSimulating,
  isLiveMonitoring,
  onStartLiveMonitoring,
  onStartSimulation,
  onStepSimulation,
  onResetSimulation
}) {
  
  // Calculate dynamic counts based on state
  const normalVesselsCount = vessels.filter(v => v.status === 'NORMAL').length;
  const warningsCount = vessels.filter(v => v.status === 'WARNING').length;
  const anomaliesCount = vessels.filter(v => v.status === 'ANOMALOUS' || v.status === 'CRITICAL').length;
  const oilSpillCount = incidents.filter(i => i.oilProbability >= 90).length;
  const totalVesselsMonitored = 230 + normalVesselsCount + warningsCount + anomaliesCount;

  // Checklist labels for simulation
  const checkSteps = [
    { label: "AIS Detection", key: "ais" },
    { label: "Anomaly Identification", key: "anomaly" },
    { label: "Satellite Investigation", key: "satellite" },
    { label: "Oil Slick Validation", key: "oil" },
    { label: "Vessel Correlation", key: "correlation" },
    { label: "Risk Matrix", key: "risk" },
    { label: "Incident Alert", key: "alert" }
  ];

  // Helper to render checklist status circle
  const getCheckIcon = (stateKey) => {
    let state = "pending";
    if (simulationStep > 0) {
      const currentChecklist = {
        1: { ais: "current", anomaly: "pending", satellite: "pending", oil: "pending", correlation: "pending", risk: "pending", alert: "pending" },
        2: { ais: "done", anomaly: "current", satellite: "pending", oil: "pending", correlation: "pending", risk: "pending", alert: "pending" },
        3: { ais: "done", anomaly: "done", satellite: "pending", oil: "pending", correlation: "pending", risk: "pending", alert: "pending" },
        4: { ais: "done", anomaly: "done", satellite: "current", oil: "pending", correlation: "pending", risk: "pending", alert: "pending" },
        5: { ais: "done", anomaly: "done", satellite: "done", oil: "pending", correlation: "pending", risk: "pending", alert: "pending" },
        6: { ais: "done", anomaly: "done", satellite: "done", oil: "current", correlation: "pending", risk: "pending", alert: "pending" },
        7: { ais: "done", anomaly: "done", satellite: "done", oil: "done", correlation: "current", risk: "pending", alert: "pending" },
        8: { ais: "done", anomaly: "done", satellite: "done", oil: "done", correlation: "done", risk: "pending", alert: "pending" },
        9: { ais: "done", anomaly: "done", satellite: "done", oil: "done", correlation: "done", risk: "current", alert: "pending" },
        10: { ais: "done", anomaly: "done", satellite: "done", oil: "done", correlation: "done", risk: "done", alert: "current" },
        11: { ais: "done", anomaly: "done", satellite: "done", oil: "done", correlation: "done", risk: "done", alert: "done" }
      }[simulationStep];
      state = currentChecklist?.[stateKey] || "pending";
    }

    if (state === "done") {
      return (
        <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-emerald-400 flex items-center justify-center text-[8px] text-white font-extrabold">
          ✓
        </span>
      );
    }
    if (state === "current") {
      return (
        <span className="w-3.5 h-3.5 rounded-full border border-amber-500 bg-amber-100 flex items-center justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
        </span>
      );
    }
    return (
      <span className="w-3.5 h-3.5 rounded-full border border-slate-300 bg-white flex items-center justify-center">
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        
        {/* Vessels Monitored */}
        <div className="relative overflow-hidden bg-gradient-to-b from-sky-50 to-white border border-sky-200 border-t-2 border-t-sky-500 p-3.5 rounded-lg shadow-sm font-mono">
          <div className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full bg-sky-400 animate-pulse"></div>
          <span className="text-sky-600 text-[9px] uppercase font-bold tracking-widest flex items-center gap-1.5">
            <Ship className="w-3.5 h-3.5 text-sky-500" />
            Vessels Monitored
          </span>
          <div className="flex justify-between items-baseline mt-2">
            <span className="text-2xl font-bold text-slate-800 tracking-tight">{totalVesselsMonitored}</span>
            <span className="text-[8px] text-slate-400">SYS: ACT</span>
          </div>
        </div>

        {/* AIS Anomalies */}
        <div className="relative overflow-hidden bg-gradient-to-b from-amber-50 to-white border border-amber-200 border-t-2 border-t-amber-500 p-3.5 rounded-lg shadow-sm font-mono">
          <div className={`absolute top-1.5 right-1.5 w-1 h-1 rounded-full ${anomaliesCount > 0 ? 'bg-amber-500 animate-ping' : 'bg-amber-400'}`}></div>
          <span className="text-amber-600 text-[9px] uppercase font-bold tracking-widest flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            AIS Anomalies
          </span>
          <div className="flex justify-between items-baseline mt-2">
            <span className={`text-2xl font-bold tracking-tight ${anomaliesCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
              {String(anomaliesCount + warningsCount).padStart(2, '0')}
            </span>
            <span className="text-[8px] text-slate-400">CORR: 98%</span>
          </div>
        </div>

        {/* Oil Spill Candidates */}
        <div className="relative overflow-hidden bg-gradient-to-b from-red-50 to-white border border-red-200 border-t-2 border-t-red-500 p-3.5 rounded-lg shadow-sm font-mono">
          <div className={`absolute top-1.5 right-1.5 w-1 h-1 rounded-full ${oilSpillCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-red-400'}`}></div>
          <span className="text-red-500 text-[9px] uppercase font-bold tracking-widest flex items-center gap-1.5">
            <Droplet className="w-3.5 h-3.5 text-red-500" />
            Spill Candidates
          </span>
          <div className="flex justify-between items-baseline mt-2">
            <span className={`text-2xl font-bold tracking-tight ${oilSpillCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>
              {String(oilSpillCount).padStart(2, '0')}
            </span>
            <span className="text-[8px] text-slate-400">SAR RADAR</span>
          </div>
        </div>

        {/* High-Risk Incidents */}
        <div className="relative overflow-hidden bg-gradient-to-b from-rose-50 to-white border border-rose-200 border-t-2 border-t-rose-500 p-3.5 rounded-lg shadow-sm font-mono">
          <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></div>
          <span className="text-rose-500 text-[9px] uppercase font-bold tracking-widest flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            High-Risk Incidents
          </span>
          <div className="flex justify-between items-baseline mt-2">
            <span className={`text-2xl font-bold tracking-tight ${oilSpillCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              {String(oilSpillCount > 0 ? 2 : 1).padStart(2, '0')}
            </span>
            <span className="text-[8px] text-slate-400">RISK INDEX</span>
          </div>
        </div>

        {/* Areas Monitored */}
        <div className="relative overflow-hidden bg-gradient-to-b from-cyan-50 to-white border border-cyan-200 border-t-2 border-t-cyan-500 p-3.5 rounded-lg shadow-sm font-mono col-span-2 md:col-span-1">
          <div className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full bg-cyan-400"></div>
          <span className="text-cyan-600 text-[9px] uppercase font-bold tracking-widest flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-cyan-500" />
            Areas Monitored
          </span>
          <div className="flex justify-between items-baseline mt-2">
            <span className="text-2xl font-bold text-slate-800 tracking-tight">14</span>
            <span className="text-[8px] text-slate-400">GULF_MEX</span>
          </div>
        </div>

      </div>

      {/* Main Monitoring Board */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 flex-1 min-h-0">
        
        {/* Left 3 columns: Map & Control Deck */}
        <div className="xl:col-span-3 flex flex-col gap-4 min-h-[400px]">
          {/* Simulation Command Bar */}
          <div className="bg-white border border-sky-200 rounded-lg p-3 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 font-mono text-xs shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onStartLiveMonitoring}
                className={`px-3 py-2 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 cursor-pointer transition-all duration-300 ${
                  isLiveMonitoring
                    ? 'bg-sky-100 text-sky-700 border-sky-400 shadow-sm animate-pulse'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLiveMonitoring ? 'animate-spin' : ''}`} />
                {isLiveMonitoring ? 'LIVE MONITORING ACTIVE' : 'RUN LIVE MONITORING'}
              </button>

              <button
                onClick={onStartSimulation}
                className={`px-3.5 py-2 rounded-lg text-[11px] font-bold border cursor-pointer transition-all duration-350 ${
                  isSimulating
                    ? 'bg-red-50 text-red-600 border-red-300 animate-pulse'
                    : 'bg-gradient-to-r from-cyan-500 to-sky-500 text-white border-cyan-400 hover:shadow-md font-extrabold'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {isSimulating ? 'SIMULATION RUNNING' : 'RUN INCIDENT SIMULATION'}
              </button>

              {isSimulating && (
                <button
                  onClick={onStepSimulation}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-1"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  STEP ({simulationStep}/11)
                </button>
              )}

              {(isSimulating || isLiveMonitoring || simulationStep > 0) && (
                <button
                  onClick={onResetSimulation}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-red-500 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                >
                  RESET
                </button>
              )}
            </div>

            {/* Current status display */}
            <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200 text-[11px] text-sky-600 max-w-full overflow-hidden text-ellipsis whitespace-nowrap tracking-wider">
              <Compass className={`w-4 h-4 text-sky-500 ${isLiveMonitoring || isSimulating ? 'animate-spin' : ''}`} />
              <span className="font-bold uppercase">
                {isSimulating ? `STEP ${simulationStep}: ${simulationMessage}` : isLiveMonitoring ? "Live GIS coordinate feed active..." : "System Operational - Standby"}
              </span>
            </div>
          </div>

          {/* Leaflet map */}
          <div className="flex-1 min-h-0 relative rounded-lg overflow-hidden border border-sky-200 shadow-sm">
            <VesselMap
              vessels={vessels}
              incidents={incidents}
              selectedVessel={selectedVessel}
              onSelectVessel={onSelectVessel}
              simulationStep={simulationStep}
            />
          </div>
        </div>

        {/* Right column: Action Board & Alerts */}
        <div className="flex flex-col gap-4">
          
          {/* Incident Simulation Progress Checklist */}
          {simulationStep > 0 && (
            <div className="bg-gradient-to-b from-sky-50 to-white border border-sky-200 rounded-lg p-4 font-mono text-xs flex flex-col gap-2.5 shadow-sm">
              <div className="font-bold text-slate-700 border-b border-sky-200 pb-1.5 uppercase tracking-wider flex items-center justify-between">
                <span>Simulation Checklist</span>
                <span className="text-sky-600 text-[10px] bg-sky-100 px-1.5 py-0.5 rounded border border-sky-200">{Math.round((simulationStep / 11) * 100)}%</span>
              </div>
              <div className="space-y-2 pt-1">
                {checkSteps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    {getCheckIcon(step.key)}
                    <span className={`text-[11px] tracking-wide ${
                      simulationStep > idx + 1 ? 'text-slate-400 line-through' :
                      simulationStep === idx + 1 ? 'text-amber-600 font-bold' : 'text-slate-400'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alert Feed Panel */}
          <div className="bg-white border border-sky-200 rounded-lg p-4 flex flex-col flex-1 min-h-[220px] shadow-sm">
            <div className="text-xs font-bold text-slate-700 font-mono uppercase tracking-wider border-b border-slate-200 pb-2.5 mb-3 flex justify-between items-center">
              <span>Surveillance Alerts Feed</span>
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
              {alerts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 font-mono text-[10px] py-12">
                  <span>NO ACTIVE SYSTEM ALERTS</span>
                  <span className="text-slate-300 mt-0.5">STANDBY MODE</span>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`p-3.5 rounded-lg border text-xs font-mono transition-all duration-300 ${
                      alert.type === 'CRITICAL'
                        ? 'bg-red-50 border-red-200 border-l-4 border-l-red-500 text-red-800'
                        : alert.type === 'HIGH'
                          ? 'bg-orange-50 border-orange-200 border-l-4 border-l-orange-500 text-orange-800'
                          : 'bg-amber-50 border-amber-200 border-l-4 border-l-amber-500 text-amber-800'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1.5 font-bold">
                      <span className={`uppercase tracking-widest text-[9px] px-1.5 py-0.5 rounded ${
                        alert.type === 'CRITICAL' ? 'bg-red-100 text-red-700 border border-red-200' :
                        alert.type === 'HIGH' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                        'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}>
                        {alert.type}
                      </span>
                      <span className="text-[9px] text-slate-400">{alert.time}</span>
                    </div>
                    <div className="font-bold text-slate-800 mb-0.5 text-[11px]">{alert.title}</div>
                    <div className="text-[10px] text-slate-500 leading-relaxed">{alert.message}</div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
