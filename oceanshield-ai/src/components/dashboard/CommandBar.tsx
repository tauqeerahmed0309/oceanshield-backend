import React, { useEffect, useState } from 'react'
import {
  Search,
  LayoutDashboard,
  Ship,
  ShieldAlert,
  Satellite,
  Compass,
  BarChart3,
  FileText,
  Settings,
  X,
} from 'lucide-react'
import { useAppStore } from '../../store/appStore'

interface CommandBarProps {
  onSelectTab: (tab: string) => void
}

export const CommandBar: React.FC<CommandBarProps> = ({ onSelectTab }) => {
  const { isCommandBarOpen, setCommandBarOpen } = useAppStore()
  const [query, setQuery] = useState('')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandBarOpen(!isCommandBarOpen)
      }
      if (e.key === 'Escape' && isCommandBarOpen) {
        setCommandBarOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isCommandBarOpen, setCommandBarOpen])

  if (!isCommandBarOpen) return null

  const commands = [
    { id: 'overview', label: 'Open Overview Dashboard', icon: LayoutDashboard },
    { id: 'vessels', label: 'Live Vessel Tracking & Intelligence', icon: Ship },
    { id: 'incidents', label: 'Incident Center & Detections', icon: ShieldAlert },
    { id: 'satellite', label: 'Satellite SAR Image Analysis', icon: Satellite },
    { id: 'attribution', label: 'Drift & Source Vessel Attribution', icon: Compass },
    { id: 'analytics', label: 'Historical Analytics & Risk Density', icon: BarChart3 },
    { id: 'reports', label: 'Generate PDF / Incident Report', icon: FileText },
    { id: 'settings', label: 'Configure System Settings & Base URL', icon: Settings },
  ]

  const filtered = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  )

  const handleSelect = (id: string) => {
    onSelectTab(id)
    setCommandBarOpen(false)
    setQuery('')
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-start justify-center pt-24 px-4 animate-fade-in">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
        {/* Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-slate-200">
          <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search feature..."
            autoFocus
            className="w-full bg-transparent text-slate-900 placeholder-slate-400 outline-none text-sm font-medium"
          />
          <button
            onClick={() => setCommandBarOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Command Options List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filtered.length > 0 ? (
            filtered.map((cmd) => {
              const Icon = cmd.icon
              return (
                <button
                  key={cmd.id}
                  onClick={() => handleSelect(cmd.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm text-slate-700 hover:bg-slate-100:bg-slate-800 transition-colors"
                >
                  <Icon className="w-4 h-4 text-cyan-500 shrink-0" />
                  <span>{cmd.label}</span>
                </button>
              )
            })
          ) : (
            <div className="p-4 text-center text-xs font-mono text-slate-400">
              No matching commands found.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
