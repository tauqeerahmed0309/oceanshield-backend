import { AnalyticsData } from '../../api/analytics'

export const DEMO_ANALYTICS: AnalyticsData = {
  totalIncidents: 3,
  activeMonitoredVessels: 1647,
  totalSpillAreaSqKm: 20.1,
  attributionSuccessRate: 85.0,
  monthlyIncidents: [
    { month: 'Mar', incidents: 2, areaSqKm: 8.4 },
    { month: 'Apr', incidents: 4, areaSqKm: 15.1 },
    { month: 'May', incidents: 6, areaSqKm: 22.3 },
    { month: 'Jun', incidents: 5, areaSqKm: 18.0 },
    { month: 'Jul', incidents: 8, areaSqKm: 32.2 },
    { month: 'Aug', incidents: 7, areaSqKm: 28.4 },
  ],
  vesselAnomaliesByType: [
    { category: 'AIS Dark Gap', count: 12 },
    { category: 'Speed/ Course Anomaly', count: 9 },
    { category: 'Unscheduled Loitering', count: 7 },
    { category: 'Route Deviation', count: 4 },
  ],
  riskRegions: [
    { region: 'Mumbai Harbor Approach', riskScore: 92, incidents: 8 },
    { region: 'Gulf of Khambhat - Alang', riskScore: 78, incidents: 6 },
    { region: 'Chennai - Coromandel Coast', riskScore: 65, incidents: 4 },
    { region: 'Paradip - Odisha Coast', riskScore: 52, incidents: 3 },
  ],
}
