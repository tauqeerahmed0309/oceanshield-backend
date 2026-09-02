import React from 'react'
import { Sun, Moon, ArrowRight, Anchor } from 'lucide-react'
import { useThemeStore } from '../../store/themeStore'

interface HeroHeaderProps {
  onStartClick: () => void
}

export const HeroHeader: React.FC<HeroHeaderProps> = ({ onStartClick }) => {
  const { theme, toggleTheme } = useThemeStore()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md border-b border-sky-300/30 bg-[#0284c7]/85 text-white transition-colors duration-300 shadow-md">
      {/* Top Left: Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-lg text-white">
          <Anchor className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <span className="font-bold text-lg tracking-wider text-white uppercase">
            Marine Sentinel
          </span>
          <div className="text-[10px] tracking-widest text-sky-100 font-mono">
            MARITIME INTELLIGENCE
          </div>
        </div>
      </div>

      {/* Top Right Controls & CTA */}
      <div className="flex items-center gap-4">
        {/* SIH 2026 Badge */}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
        >
          {theme === 'light' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-sky-200" />}
        </button>

        {/* Main CTA */}
        <button
          onClick={onStartClick}
          className="group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-sky-900 font-black text-sm tracking-wide transition-all shadow-lg hover:bg-sky-50 hover:shadow-sky-900/20 active:scale-95 cursor-pointer"
        >
          <span>LET'S START</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </header>
  )
}
