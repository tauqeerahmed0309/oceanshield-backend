import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

export default function AnalyticsCharts() {
  // 1. AIS anomalies over time (simulated 7 days)
  const anomaliesOverTime = [
    { day: 'Mon', anomalies: 4 },
    { day: 'Tue', anomalies: 6 },
    { day: 'Wed', anomalies: 8 },
    { day: 'Thu', anomalies: 5 },
    { day: 'Fri', anomalies: 9 },
    { day: 'Sat', anomalies: 12 },
    { day: 'Sun', anomalies: 8 }
  ];

  // 2. Oil spill candidates & probability mapping
  const oilSpillCandidates = [
    { name: 'OS-101', probability: 45, area: 0.8 },
    { name: 'OS-102', probability: 76, area: 1.2 },
    { name: 'OS-103', probability: 98, area: 5.6 },
    { name: 'OS-104', probability: 94, area: 3.8 }
  ];

  // 3. Risk distribution count
  const riskDistribution = [
    { name: 'Critical', value: 1, color: '#ef4444' },
    { name: 'High Risk', value: 2, color: '#f97316' },
    { name: 'Medium Risk', value: 3, color: '#eab308' },
    { name: 'Low Risk', value: 10, color: '#0ea5e9' }
  ];

  // 4. Vessel behavior comparisons (average anomaly scores per vector)
  const behaviorAnomalies = [
    { metric: 'Speed Dev', tankers: 82, cargo: 64, others: 20 },
    { metric: 'Course Dev', tankers: 71, cargo: 78, others: 35 },
    { metric: 'Route Dev', tankers: 68, cargo: 58, others: 12 },
    { metric: 'AIS Gaps', tankers: 45, cargo: 52, others: 8 }
  ];

  const customTooltipStyle = {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    color: '#1e293b',
    fontFamily: 'monospace',
    fontSize: '11px',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-1">
      {/* Chart 1: AIS Anomalies Over Time */}
      <div className="bg-white border border-sky-200 rounded-lg p-4 flex flex-col justify-between font-mono shadow-sm">
        <div className="text-xs font-bold text-slate-600 mb-4 uppercase tracking-wider border-b border-slate-200 pb-1">
          AIS Anomalies Over Time (Past 7 Days)
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={anomaliesOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
              <Tooltip contentStyle={customTooltipStyle} />
              <Line 
                type="monotone" 
                dataKey="anomalies" 
                stroke="#0ea5e9" 
                strokeWidth={2.5}
                activeDot={{ r: 6 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Oil Spill Candidate Probabilities & Sizes */}
      <div className="bg-white border border-sky-200 rounded-lg p-4 flex flex-col justify-between font-mono shadow-sm">
        <div className="text-xs font-bold text-slate-600 mb-4 uppercase tracking-wider border-b border-slate-200 pb-1">
          Oil Spill Candidate Verification
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={oilSpillCandidates}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis yAxisId="left" orientation="left" stroke="#ef4444" fontSize={10} tickLine={false} label={{ value: 'Prob %', angle: -90, position: 'insideLeft', fill: '#ef4444', fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" stroke="#0ea5e9" fontSize={10} tickLine={false} label={{ value: 'Area (km²)', angle: 90, position: 'insideRight', fill: '#0ea5e9', fontSize: 10 }} />
              <Tooltip contentStyle={customTooltipStyle} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 10 }} />
              <Bar yAxisId="left" dataKey="probability" name="Oil Probability %" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="area" name="Estimated Area (km²)" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 3: Environmental Threat Distribution */}
      <div className="bg-white border border-sky-200 rounded-lg p-4 flex flex-col justify-between font-mono shadow-sm">
        <div className="text-xs font-bold text-slate-600 mb-4 uppercase tracking-wider border-b border-slate-200 pb-1">
          Surveillance Risk Profile Distribution
        </div>
        <div className="h-64 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={riskDistribution}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {riskDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={customTooltipStyle} />
              <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 4: Vessel Anomaly Vector Comparison */}
      <div className="bg-white border border-sky-200 rounded-lg p-4 flex flex-col justify-between font-mono shadow-sm">
        <div className="text-xs font-bold text-slate-600 mb-4 uppercase tracking-wider border-b border-slate-200 pb-1">
          Vessel Anomaly Profiles By Class
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={behaviorAnomalies}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="metric" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
              <Tooltip contentStyle={customTooltipStyle} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="tankers" name="Oil Tankers" fill="#ef4444" radius={[2, 2, 0, 0]} />
              <Bar dataKey="cargo" name="Cargo Ships" fill="#f97316" radius={[2, 2, 0, 0]} />
              <Bar dataKey="others" name="Support/Other" fill="#0ea5e9" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
