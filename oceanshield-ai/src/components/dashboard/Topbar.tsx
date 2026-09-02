import React, { useState } from 'react'
import {
  Search, Bell, Sun, Moon, Wifi, WifiOff, Clock, CheckCircle2,
} from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { useThemeStore } from '../../store/themeStore'

export const Topbar: React.FC = () => {
  const { backendStatus, lastUpdated, setCommandBarOpen } = useAppStore()
  const { theme, toggleTheme } = useThemeStore()
  const [showNotifications, setShowNotifications] = useState(false)

  return (
    <header className="h-16 border-b border-sky-200 bg-white/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30 transition-colors shadow-[0_8px_30px_rgba(14,116,144,0.06)]">
      {/* Title & Status Badges */}
      <div className="flex items-center gap-4">
        <h2 className="font-bold text-lg text-sky-950 tracking-wide uppercase">
          Command Dashboard
        </h2>

        {/* Backend Status Indicator */}
        {backendStatus === 'ONLINE' ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 font-mono text-xs font-semibold">
            <Wifi className="w-3.5 h-3.5" />
            <span>BACKEND ONLINE</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-600 font-mono text-xs font-semibold">
            <WifiOff className="w-3.5 h-3.5 animate-pulse" />
            <span>BACKEND OFFLINE</span>
          </div>
        )}

        {/* Last Updated Timestamp */}
        {lastUpdated && (
          <div className="hidden md:flex items-center gap-1 text-xs font-mono text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{lastUpdated}</span>
          </div>
        )}
      </div>

      {/* Right Controls: Command Bar, Notifications, Theme */}
      <div className="flex items-center gap-3">
        {/* Command Bar Trigger */}
        <button
          onClick={() => setCommandBarOpen(true)}
          className="flex items-center gap-3 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 text-xs font-mono hover:border-cyan-500/50 transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Search or command...</span>
          <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-slate-200 text-[10px]">
            CTRL + K
          </kbd>
        </button>

        {/* Notifications Button & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 hover:text-cyan-500 transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-500" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white border border-slate-200 shadow-2xl p-4 z-50 animate-fade-in text-xs">
              <div className="flex items-center justify-between font-bold border-b border-slate-100 pb-2 mb-3">
                <span className="text-slate-800">System Notifications</span>
                <span className="text-[10px] text-cyan-500 font-mono">LIVE EVENTS</span>
              </div>
              <div className="space-y-3">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-slate-800">
                      System Initialized
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Marine Sentinel operational dashboard ready.
                    </div>
                  </div>
                </div>
                {backendStatus === 'OFFLINE' && (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 flex gap-2.5">
                    <WifiOff className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">Backend Offline</div>
                      <div className="text-[11px] opacity-80">
                        Connect local server at http://localhost:8000
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 hover:text-amber-500 transition-colors"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>
      </div>
    </header>
  )
}
