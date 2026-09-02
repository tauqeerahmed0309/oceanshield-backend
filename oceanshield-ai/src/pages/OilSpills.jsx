import React, { useState } from 'react';
import { Droplet, AlertTriangle, Compass, Clipboard } from 'lucide-react';
import SatelliteViewer from '../components/SatelliteViewer';
import RiskGauge from '../components/RiskGauge';
import IncidentReportModal from '../components/IncidentReportModal';

export default function OilSpills({
  incidents,
  candidates,
  vessels,
  simulationStep,
  selectedVessel,
  onSelectVessel
}) {
  const [selectedIncidentId, setSelectedIncidentId] = useState('OS-2026-0104');
  const [selectedCandidateId, setSelectedCandidateId] = useState('vessel-1');
  const [isReportOpen, setIsReportOpen] = useState(false);

  const activeIncident = incidents.find(i => i.id === selectedIncidentId) || incidents[0];

  let displayIncident = { ...activeIncident };
  if (displayIncident.id === 'OS-2026-0104') {
    if (simulationStep === 4) {
      displayIncident.status = "ACQUIRING";
      displayIncident.oilProbability = 0;
      displayIncident.area = 0;
    } else if (simulationStep === 5) {
      displayIncident.status = "ANALYZING";
      displayIncident.oilProbability = 35;
      displayIncident.area = 1.2;
    } else if (simulationStep < 4) {
      displayIncident.status = "ACQUIRING";
      displayIncident.oilProbability = 0;
      displayIncident.area = 0;
    }
  }

  const activeCandidates = candidates
    .filter(c => c.incidentId === displayIncident.id)
    .sort((a, b) => b.associationProbability - a.associationProbability);

  const activeCandidate = activeCandidates.find(c => c.vesselId === selectedCandidateId) || activeCandidates[0];
  const associatedVessel = vessels.find(v => v.id === (activeCandidate?.vesselId || 'vessel-1'));

  let displayRiskScore = displayIncident.environmentalRisk?.score || 91;
  if (displayIncident.id === 'OS-2026-0104') {
    if (simulationStep < 6) displayRiskScore = 15;
    else if (simulationStep === 6) displayRiskScore = 42;
    else if (simulationStep === 9) displayRiskScore = 91;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full min-h-0">
      
      {/* Column 1: Satellite SAR Viewer & FP Analysis */}
      <div className="xl:col-span-2 flex flex-col gap-4 min-h-[500px]">
        {/* Incident Select Tab */}
        <div className="bg-white border border-sky-200 rounded-lg p-3 flex items-center justify-between font-mono text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <Droplet className="w-4 h-4 text-sky-500" />
            <span className="font-bold uppercase tracking-wider text-slate-800">Satellite Incident Feeds</span>
          </div>

          <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
            {incidents.map((inc) => (
              <button
                key={inc.id}
                onClick={() => setSelectedIncidentId(inc.id)}
                className={`px-3 py-1.5 hover:bg-sky-50 transition-colors font-bold ${
                  selectedIncidentId === inc.id ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                {inc.id}
              </button>
            ))}
          </div>
        </div>

        {/* Satellite SAR Canvas Component */}
        <div className="flex-1 min-h-0">
          <SatelliteViewer 
            incident={displayIncident} 
            simulationStep={simulationStep} 
          />
        </div>
      </div>

      {/* Column 2: Threat Gauges & Vessel Association Matrix */}
      <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1">
        
        {/* Environmental Threat Circular Gauge */}
        <div className="h-[300px]">
          <RiskGauge
            score={displayRiskScore}
            breakdown={displayIncident.environmentalRisk?.breakdown || {
              spillSize: displayIncident.environmentalRisk?.spillSize || 82,
              coastalProximity: displayIncident.environmentalRisk?.coastalProximity || 94,
              marineSensitivity: displayIncident.environmentalRisk?.marineSensitivity || 88,
              oilProbability: displayIncident.oilProbability,
              vesselAnomaly: associatedVessel?.anomalyScore || 87
            }}
          />
        </div>

        {/* Vessel Association workspace */}
        <div className="bg-white border border-sky-200 rounded-lg p-4 flex flex-col justify-between font-mono text-xs shadow-sm">
          <div>
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 pb-2 mb-3 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-amber-500" />
              Vessel Association Candidates
            </div>

            {/* Candidate List */}
            <div className="space-y-2 mb-4">
              {simulationStep < 6 && displayIncident.id === 'OS-2026-0104' ? (
                <div className="text-center py-6 text-slate-400 text-[10px]">
                  WAITING FOR SAR OIL VERIFICATION...
                </div>
              ) : (
                activeCandidates.map((cand) => {
                  let probability = cand.associationProbability;
                  if (displayIncident.id === 'OS-2026-0104') {
                    if (simulationStep === 6) probability = 45;
                    else if (simulationStep === 7) probability = 68;
                  }

                  return (
                    <div
                      key={cand.vesselId}
                      onClick={() => setSelectedCandidateId(cand.vesselId)}
                      className={`p-2.5 rounded-lg border cursor-pointer hover:bg-sky-50 transition-colors ${
                        selectedCandidateId === cand.vesselId
                          ? 'bg-sky-50 border-sky-300 text-slate-800'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      <div className="flex justify-between font-bold mb-1">
                        <span>{cand.vesselName}</span>
                        <span className={selectedCandidateId === cand.vesselId ? 'text-amber-600' : 'text-slate-500'}>
                          {probability}% Match
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all duration-700"
                          style={{ width: `${probability}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Correlation factor breakdown */}
            {activeCandidate && (simulationStep >= 7 || displayIncident.id !== 'OS-2026-0104') && (
              <div className="border-t border-slate-200 pt-3 space-y-3">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Correlation Analysis Vectors
                </div>

                <div className="space-y-2">
                  {Object.entries(activeCandidate.analysis || {}).map(([key, val]) => {
                    const label = key.replace(/([A-Z])/g, ' $1');
                    return (
                      <div key={key} className="space-y-0.5">
                        <div className="flex justify-between text-[9px] text-slate-400 uppercase">
                          <span>{label}</span>
                          <span className="font-bold text-slate-600">{val}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                          <div
                            className="bg-sky-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${val}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-[10px] text-amber-700 leading-normal">
                  <strong>DISCLAIMER:</strong> "Association probability supports further investigation and does not establish legal responsibility."
                </div>
              </div>
            )}
          </div>

          {/* Action Trigger - Generate report */}
          <div className="mt-4 border-t border-slate-200 pt-3">
            <button
              onClick={() => {
                if (simulationStep >= 10 || displayIncident.id !== 'OS-2026-0104') {
                  setIsReportOpen(true);
                }
              }}
              disabled={simulationStep < 10 && displayIncident.id === 'OS-2026-0104'}
              className={`w-full py-2.5 font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors text-xs ${
                simulationStep >= 10 || displayIncident.id !== 'OS-2026-0104'
                  ? 'bg-red-500 hover:bg-red-600 text-white cursor-pointer'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              <Clipboard className="w-4 h-4" />
              GENERATE INCIDENT REPORT
            </button>
          </div>
        </div>

      </div>

      {/* Incident Report Modal overlay */}
      <IncidentReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        incident={displayIncident}
        vessel={associatedVessel}
        association={activeCandidate}
      />
    </div>
  );
}
