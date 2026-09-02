import React from 'react';
import { Download, X, Clipboard, CheckCircle2 } from 'lucide-react';

export default function IncidentReportModal({ isOpen, onClose, incident, vessel, association }) {
  if (!isOpen || !incident) return null;

  const handleDownload = () => {
    const reportText = `OCEANSHIELD AI - MARITIME INCIDENT REPORT
==================================================
Incident ID: ${incident.id}
Status: ACTIVE INVESTIGATION
Generated At: ${new Date().toUTCString()}

1. DETECTION DETAILS
--------------------
Satellite Sensor: ${incident.satellite}
Acquisition Time: ${incident.detectedAt}
Coordinates: ${incident.lat.toFixed(3)}° N, ${incident.lng.toFixed(3)}° E (Indian Waters)
Oil Spill Probability: ${incident.oilProbability}%
Sensor Confidence: ${incident.confidence}%
Estimated Spill Area: ${incident.area} km²

2. THREAT ASSESSMENT
--------------------
Environmental Risk Score: ${incident.environmentalRisk?.score || 91}/100 (HIGH)
Spill Size Factor: ${incident.environmentalRisk?.spillSize || 82}/100
Coastal Proximity: ${incident.environmentalRisk?.coastalProximity || 94}/100
Marine Habitat Sensitivity: ${incident.environmentalRisk?.marineSensitivity || 88}/100

3. VESSEL ASSOCIATION
---------------------
Primary Candidate Vessel: ${vessel?.name || 'MV Desh Rakshak'}
IMO: ${vessel?.imo || 'IMO-9876543'}
MMSI: ${vessel?.mmsi || '419001234'}
Type: ${vessel?.type || 'Crude Oil Tanker'}
Association Probability: ${association?.associationProbability || 91}%
AIS Anomaly Score: ${vessel?.anomalyScore || 87}%

4. ACTION RECOMMENDATION
------------------------
Threat Assessment recommends immediate regional environmental/coast guard deployment.
Request Sentinel-1 sub-hourly radar targeting schedule.
Initiate formal maritime investigation of primary candidate vessel.
`;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `OCEANSHIELD_REPORT_${incident.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-sky-200 rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <Clipboard className="w-5 h-5 text-sky-500" />
            <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-800">
              Maritime Incident Intelligence Report
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar font-mono text-xs text-slate-600 space-y-4">
          <div className="border border-slate-200 p-4 bg-slate-50 rounded-xl">
            <div className="flex justify-between border-b border-slate-200 pb-2 mb-3">
              <span className="text-slate-400">INCIDENT ID:</span>
              <span className="font-bold text-red-500">{incident.id}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <span className="text-slate-400 block text-[10px]">DETECTION TIME:</span>
                <span className="text-slate-700">{incident.detectedAt}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">LOCATION:</span>
                <span className="text-slate-700">{incident.lat.toFixed(4)}° N, {Math.abs(incident.lng).toFixed(4)}° W</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">SATELLITE SENSOR:</span>
                <span className="text-slate-700">{incident.satellite}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">OIL PROBABILITY:</span>
                <span className="text-red-500 font-bold">{incident.oilProbability}%</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">SPILL AREA EST.:</span>
                <span className="text-slate-700">{incident.area} km²</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">RISK SCORE:</span>
                <span className="text-red-500 font-bold">{incident.environmentalRisk?.score || 91}/100</span>
              </div>
            </div>
          </div>

          <div className="border border-sky-200 p-4 bg-sky-50 rounded-xl space-y-2">
            <div className="text-sky-600 font-bold border-b border-sky-200 pb-1 mb-2 uppercase tracking-wide">
              Primary Associated Vessel
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <span className="text-slate-400 block text-[10px]">VESSEL NAME:</span>
                <span className="text-slate-700">{vessel?.name || 'MV Desh Rakshak'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">IMO / MMSI:</span>
                <span className="text-slate-700">{vessel?.imo || 'IMO-9876543'} / {vessel?.mmsi || '419001234'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">VESSEL TYPE:</span>
                <span className="text-slate-700">{vessel?.type || 'Crude Oil Tanker'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">ASSOCIATION CONFIDENCE:</span>
                <span className="text-amber-600 font-bold">{association?.associationProbability || 91}%</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">AIS ANOMALY SCORE:</span>
                <span className="text-red-500 font-bold">{vessel?.anomalyScore || 87}%</span>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 p-4 bg-slate-50 rounded-xl">
            <div className="text-sky-600 font-bold border-b border-slate-200 pb-1 mb-2 uppercase tracking-wide">
              Action Recommendation
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Vessel exhibits anomalous AIS patterns including sudden slowdowns and trajectory offsets preceding satellite detection. Recommended protocol: Trigger alert code <strong className="text-red-500">RED-4</strong>. Forward data payload to regional Command-and-Control coast guard centers. Maintain close radar tracking.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-500 hover:text-slate-700 transition-colors font-mono text-xs"
          >
            CLOSE
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors font-mono text-xs"
          >
            <Download className="w-4 h-4" />
            DOWNLOAD REPORT
          </button>
        </div>
      </div>
    </div>
  );
}
