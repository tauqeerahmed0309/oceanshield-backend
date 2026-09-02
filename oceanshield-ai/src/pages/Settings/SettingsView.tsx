import React, { useState } from 'react'
import { Settings, Server, Database, Sun, Moon, CheckCircle2, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { useThemeStore } from '../../store/themeStore'
import { API_BASE_URL, checkBackendHealth } from '../../api/client'

export const SettingsView: React.FC = () => {
  const { backendStatus, setBackendStatus } = useAppStore()
  const { theme, setTheme } = useThemeStore()
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    const health = await checkBackendHealth()
    setTesting(false)
    if (health.status === 'online') {
      setBackendStatus('ONLINE')
      setTestResult(`Successfully connected to ${API_BASE_URL} (Status 200 OK)`)
    } else {
      setBackendStatus('OFFLINE')
      setTestResult(`Could not connect to ${API_BASE_URL}. Ensure backend is running.`)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-cyan-500" />
          System Settings & Backend Configuration
        </h1>
        <p className="text-xs font-mono text-slate-500 mt-1">
          Manage API endpoint connections, theme tokens, and simulation modes
        </p>
      </div>

      <div className="space-y-4">
        {/* Backend Configuration Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-base text-slate-900 uppercase">
            <Server className="w-5 h-5 text-cyan-500" />
            Backend Connection Config
          </div>

          <div className="space-y-2 text-xs font-mono">
            <label className="block text-slate-500 font-bold uppercase">
              Single Source of Truth Base URL (VITE_API_BASE_URL)
            </label>
            <input
              type="text"
              readOnly
              value={API_BASE_URL}
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-cyan-600 font-bold outline-none"
            />
            <p className="text-slate-400 text-[11px]">
              Configured via environment variable VITE_API_BASE_URL. Default: http://localhost:8000
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200:bg-slate-700 text-slate-800 font-mono text-xs font-bold inline-flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4 text-cyan-500" />}
              <span>TEST BACKEND CONNECTION</span>
            </button>

            <span className="text-xs font-mono">
              Status: {backendStatus === 'ONLINE' ? (
                <span className="text-emerald-500 font-bold">ONLINE</span>
              ) : (
                <span className="text-red-500 font-bold">OFFLINE</span>
              )}
            </span>
          </div>

          {testResult && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700">
              {testResult}
            </div>
          )}
        </div>

        {/* Live Mode Notice */}
        <div className="p-6 rounded-2xl bg-white border border-emerald-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 font-bold text-base text-emerald-700 uppercase">
            <Database className="w-5 h-5 text-emerald-500" />
            Live Data Mode — Always Active
          </div>
          <p className="text-xs text-slate-500 font-mono leading-relaxed">
            Demo mode has been disabled. All data is fetched in real-time from the backend at{' '}
            <code className="text-cyan-500">http://localhost:8000</code>.
            Vessel positions come directly from the live AISStream.io feed.
          </p>
        </div>

        {/* Theme Settings Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="font-bold text-base text-slate-900 uppercase">
            Default Visual Theme
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 p-4 rounded-xl border flex items-center justify-center gap-2 font-mono text-xs font-bold transition-all ${
                theme === 'light'
                  ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-500" />
              <span>LIGHT MODE (DEFAULT)</span>
            </button>

            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 p-4 rounded-xl border flex items-center justify-center gap-2 font-mono text-xs font-bold transition-all ${
                theme === 'dark'
                  ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              <Moon className="w-4 h-4 text-cyan-400" />
              <span>DARK MODE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
