import React from 'react'
import {
  LayoutDashboard,
  Ship,
  ShieldAlert,
  Satellite,
  Compass,
  BarChart3,
  FileText,
  Settings,
  Anchor,
  ArrowLeft,
  AlertTriangle,
  Activity,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface SidebarProps {
  activeTab: string
  onSelectTab: (tab: string) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const navigate = useNavigate()

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'vessels', label: 'Live Vessel Tracking', icon: Ship },
    { id: 'spills', label: 'Oil Spill Tracker', icon: AlertTriangle },
    { id: 'anomalies', label: 'AIS Anomalies', icon: Activity },
    { id: 'incidents', label: 'Incidents Center', icon: ShieldAlert },
    { id: 'satellite', label: 'Satellite & Upload', icon: Satellite },
    { id: 'drift', label: 'Drift Prediction', icon: Compass },
    { id: 'attribution', label: 'Vessel Attribution', icon: Compass },
    { id: 'analytics', label: 'Historical Analytics', icon: BarChart3 },
    { id: 'reports', label: 'Reports Generator', icon: FileText },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ]

  return (
    <aside className="w-64 bg-[linear-gradient(180deg,_rgba(224,242,254,0.96)_0%,_rgba(191,219,254,0.95)_28%,_rgba(239,246,255,0.9)_100%)] border-r border-sky-200 text-sky-950 flex flex-col h-screen sticky top-0 z-40 select-none shadow-[12px_0_30px_rgba(14,116,144,0.08)]">
      {/* Sidebar Header Logo */}
      <div className="p-5 border-b border-sky-200/80 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
          <Anchor className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-base tracking-wider text-sky-950 uppercase">
            Marine Sentinel
          </span>
          <div className="text-[10px] tracking-widest text-cyan-700 font-mono">
            COMMAND CENTER
          </div>
        </div>
      </div>

      {/* Navigation Items List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                isActive
                  ? 'bg-sky-500 text-white font-semibold shadow-lg shadow-sky-500/20'
                  : 'text-sky-800 hover:text-sky-950 hover:bg-sky-100/80'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-sky-700'}`} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Bottom Footer Action */}
      <div className="p-4 border-t border-sky-200/80 space-y-2">
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-mono font-medium text-sky-700 hover:text-cyan-700 hover:bg-sky-100/80 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>RETURN TO INTRO</span>
        </button>
      </div>
    </aside>
  )
}
