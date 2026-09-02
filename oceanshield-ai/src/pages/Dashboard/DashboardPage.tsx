import React, { useState } from 'react'
import { Sidebar } from '../../components/dashboard/Sidebar'
import { Topbar } from '../../components/dashboard/Topbar'
import { CommandBar } from '../../components/dashboard/CommandBar'
import { ChatBot } from '../../components/ChatBot'
import { useBackendStatus } from '../../hooks/useBackendStatus'

// Views
import { OverviewView } from './OverviewView'
import { VesselsView } from '../Vessels/VesselsView'
import { SpillsView } from '../Spills/SpillsView'
import { AnomaliesView } from '../Anomalies/AnomaliesView'
import { IncidentsView } from '../Incidents/IncidentsView'
import { SatelliteView } from '../Satellite/SatelliteView'
import { AttributionView } from '../Attribution/AttributionView'
import { DriftView } from '../Drift/DriftView'
import { AnalyticsView } from '../Analytics/AnalyticsView'
import { ReportsView } from '../Reports/ReportsView'
import { SettingsView } from '../Settings/SettingsView'

export const DashboardPage: React.FC = () => {
  useBackendStatus()
  const [activeTab, setActiveTab] = useState('overview')

  const renderActiveView = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewView onNavigateTab={setActiveTab} />
      case 'vessels':
        return <VesselsView />
      case 'spills':
        return <SpillsView />
      case 'anomalies':
        return <AnomaliesView />
      case 'incidents':
        return <IncidentsView onNavigateTab={setActiveTab} />
      case 'satellite':
        return <SatelliteView />
      case 'drift':
        return <DriftView />
      case 'attribution':
        return <AttributionView />
      case 'analytics':
        return <AnalyticsView />
      case 'reports':
        return <ReportsView />
      case 'settings':
        return <SettingsView />
      default:
        return <OverviewView onNavigateTab={setActiveTab} />
    }
  }

  return (
    <div className="min-h-screen flex bg-[radial-gradient(circle_at_top,_#e0f2fe_0%,_#dbeafe_28%,_#d8ecff_100%)] text-sky-950 transition-colors duration-300">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-sky-50/80">
        <Topbar />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_rgba(224,242,254,0.18))]">
          {renderActiveView()}
        </main>
      </div>

      {/* CMD+K Command Bar Modal */}
      <CommandBar onSelectTab={setActiveTab} />

      {/* Floating ChatBot Assistant */}
      <ChatBot />
    </div>
  )
}
