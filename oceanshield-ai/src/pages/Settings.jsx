import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Terminal, Sliders, Radio } from 'lucide-react';

export default function Settings() {
  const [logs, setLogs] = useState([
    "System init... OK",
    "Loaded mock datasets: 15 vessels, 3 oil spill incidents, 7 association metrics.",
    "Connected to local mock AIS telemetry stream.",
    "Active targeting module: Sentinel-1 SAR C-band receiver ready.",
    "Listening on port :5173..."
  ]);

  const [toggles, setToggles] = useState({
    autoAlerts: true,
    sarVerify: true,
    driftModel: true,
    mockAPIs: true
  });

  const [thresholds, setThresholds] = useState({
    speedDev: 70,
    courseDev: 60,
    aisGap: 30
  });

  useEffect(() => {
    const logInterval = setInterval(() => {
      const messages = [
        "Pinging global AIS stream node at Gulf-Node-04...",
        "Telemetry payload received (128 bytes): checksum verified.",
        "Scanned Sentinel-1 orbital path segment... no corrections needed.",
        "Re-calculating drift vectors for active vessels (dt = 3.0s)...",
        "No packet loss detected in maritime channel.",
        "Look-alike analysis thresholds updated successfully.",
        "System diagnostic check completed: CPU load 12%, Memory 450MB."
      ];
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      setLogs(prev => [...prev.slice(-14), `[${new Date().toLocaleTimeString()}] ${randomMsg}`]);
    }, 4000);

    return () => clearInterval(logInterval);
  }, []);

  const handleToggle = (key) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleThresholdChange = (key, val) => {
    setThresholds(prev => ({ ...prev, [key]: parseInt(val) }));
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full min-h-0">
      
      {/* Column 1: Config sliders & Toggles */}
      <div className="xl:col-span-2 bg-white border border-sky-200 rounded-lg p-4 flex flex-col justify-between font-mono text-xs gap-4 shadow-sm">
        <div>
          <div className="text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 pb-2 mb-3 flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-sky-500" />
            Surveillance Model Tuner
          </div>

          {/* Configuration Options */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Toggles */}
              <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <h4 className="font-bold text-sky-600 uppercase tracking-wide text-[10px] mb-2">Automated Rules</h4>
                
                {[
                  { label: "Automatic AIS Alerts", desc: "Flag deviation triggers immediately", key: "autoAlerts" },
                  { label: "SAR Look-alike Verification", desc: "Auto-trigger false positive check", key: "sarVerify" },
                  { label: "Dynamic Drift Modeling", desc: "Calculate drift vectors by tidal feeds", key: "driftModel" },
                  { label: "Direct Mock Webhook Stream", desc: "Use local simulation streams", key: "mockAPIs" }
                ].map((item) => (
                  <div key={item.key} className="flex justify-between items-center gap-2">
                    <div>
                      <span className="font-bold text-slate-700 block">{item.label}</span>
                      <span className="text-[10px] text-slate-400 leading-normal">{item.desc}</span>
                    </div>
                    <button
                      onClick={() => handleToggle(item.key)}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors focus:outline-none ${
                        toggles[item.key] ? 'bg-sky-500' : 'bg-slate-300'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                        toggles[item.key] ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Threshold Sliders */}
              <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <h4 className="font-bold text-sky-600 uppercase tracking-wide text-[10px] mb-2">Sensitivity Thresholds</h4>
                
                {[
                  { label: "Speed Deviation Trigger", val: thresholds.speedDev, key: "speedDev", unit: "%" },
                  { label: "Course Offset Trigger", val: thresholds.courseDev, key: "courseDev", unit: "°" },
                  { label: "AIS Transmission Gap Limit", val: thresholds.aisGap, key: "aisGap", unit: "min" }
                ].map((slider) => (
                  <div key={slider.key} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-600 font-semibold">
                      <span>{slider.label}</span>
                      <span className="text-sky-600 font-bold">{slider.val}{slider.unit}</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={slider.val}
                      onChange={(e) => handleThresholdChange(slider.key, e.target.value)}
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="text-[9px] text-slate-400 border-t border-slate-200 pt-2 flex items-center gap-1">
          <SettingsIcon className="w-3.5 h-3.5 text-slate-300 animate-spin" />
          Settings are saved automatically to mock local storage cache parameters.
        </div>
      </div>

      {/* Column 2: Live Diagnostic Logs (Col span 1) */}
      <div className="bg-white border border-sky-200 rounded-lg p-4 flex flex-col justify-between font-mono text-xs h-full shadow-sm">
        <div>
          <div className="text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 pb-2 mb-3 flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-sky-500" />
            Live System Telemetry Logs
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg font-mono text-[10px] text-sky-700 h-[380px] overflow-y-auto space-y-1.5 custom-scrollbar leading-relaxed">
            {logs.map((log, index) => (
              <div key={index} className="flex gap-1.5 items-start">
                <span className="text-slate-300 select-none">&gt;&gt;</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-slate-200 pt-3">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
          </span>
          <span className="text-[10px] text-slate-400 font-bold uppercase">Diagnostics: OK (0.01s latency)</span>
        </div>
      </div>

    </div>
  );
}
