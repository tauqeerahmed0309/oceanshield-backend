import React, { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Anchor, Bot, User } from 'lucide-react'

interface Message {
  id: number
  role: 'user' | 'bot'
  text: string
  timestamp: Date
}

const KNOWLEDGE: Array<{ keywords: string[]; response: string }> = [
  {
    keywords: ['hello', 'hi', 'hey', 'greetings'],
    response: "Hello! I'm MarineBot — the OceanShield AI assistant. I can help you understand the platform, explain features, or guide you through any section. What would you like to know?",
  },
  {
    keywords: ['what is', 'about', 'purpose', 'oceanshield'],
    response: "OceanShield AI is a maritime oil spill detection and vessel attribution platform. It combines satellite SAR imagery, live AIS vessel tracking, Lagrangian drift analysis, and AI-powered anomaly detection to identify polluters and coordinate incident response.",
  },
  {
    keywords: ['vessel', 'ship', 'track', 'ais', 'live'],
    response: "The Live Vessel Tracking module connects to the AISStream API in real-time and displays all monitored vessels worldwide. You can click any ship marker on the map to see its MMSI, name, speed, course, flag, and whether it's flagged as suspicious. Navigate to the Vessels tab for the full list.",
  },
  {
    keywords: ['incident', 'spill', 'oil', 'detection'],
    response: "The Incidents Center shows detected oil spill incidents with severity ratings, confidence scores, and probable source vessel attribution. Each incident includes SAR imagery confirmation, affected area estimates, and ICG notification status.",
  },
  {
    keywords: ['satellite', 'sar', 'imagery', 'radar'],
    response: "The Satellite Analysis module displays Sentinel-1A and RADARSAT SAR imagery used for oil slick detection. It includes SAR scene metadata, oil slick polygon overlays, and confidence maps for automated detection validation.",
  },
  {
    keywords: ['drift', 'attribution', 'source', 'lagrangian'],
    response: "The Drift & Attribution engine uses Lagrangian ocean current backtracking to identify the probable source vessel of an oil spill. It simulates reverse drift trajectories from the spill location over a configurable time window and cross-references with AIS positions.",
  },
  {
    keywords: ['report', 'pdf', 'download', 'export', 'generate'],
    response: "The Report Generator creates incident dossiers in PDF, Markdown, or JSON format. Reports include SAR evidence, drift trajectory maps, vessel candidate rankings, and investigator field notes. Simply fill in the incident ID, select your format, and hit Generate!",
  },
  {
    keywords: ['analytics', 'history', 'density', 'historical'],
    response: "The Historical Analytics module provides time-series charts, risk density heatmaps, and trend analysis of oil spill incidents across the monitored regions.",
  },
  {
    keywords: ['setting', 'config', 'api', 'base url'],
    response: "In System Settings you can configure the backend API base URL (default: http://localhost:8000), update your AISStream API key, and adjust notification thresholds.",
  },
  {
    keywords: ['help', 'how', 'guide', 'navigate'],
    response: "Here's a quick guide:\n• Overview — Dashboard with KPIs and live map\n• Vessels — Real-time AIS ship tracking\n• Incidents — Oil spill detections & severity\n• Satellite — SAR imagery analysis\n• Attribution — Drift-based source vessel ID\n• Analytics — Historical trend data\n• Reports — Generate & download investigation dossiers\n\nTip: Press Ctrl+K to open the Command Bar for quick navigation!",
  },
  {
    keywords: ['suspicious', 'anomaly', 'flag', 'alert'],
    response: "Vessels are flagged as suspicious when they exhibit anomalous behavior such as AIS signal gaps, unusual course deviations near spill zones, slow-speed loitering, or drifting patterns. Severity levels are LOW, MEDIUM, HIGH, and CRITICAL.",
  },
  {
    keywords: ['map', 'black', 'dark', 'theme', 'color'],
    response: "The live vessel map uses light-themed CartoDB tiles for a clean, bright appearance. Ship markers are color-coded: cyan for normal vessels, amber for suspicious, and red for critical anomalies.",
  },
  {
    keywords: ['thanks', 'thank', 'appreciate'],
    response: "You're welcome! Feel free to ask if you need anything else about OceanShield AI.",
  },
]

function getBotResponse(input: string): string {
  const lower = input.toLowerCase()
  for (const entry of KNOWLEDGE) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.response
    }
  }
  return "I'm not sure about that specific question. Try asking about:\n• Vessel tracking\n• Oil spill incidents\n• Satellite SAR imagery\n• Drift attribution\n• Report generation\n• General platform guide\n\nOr type 'help' for a full overview!"
}

export const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'bot',
      text: "Welcome to OceanShield AI! I'm MarineBot, your maritime intelligence assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed) return

    const userMsg: Message = {
      id: Date.now(),
      role: 'user',
      text: trimmed,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    // Simulate typing delay for a more natural feel
    setTimeout(() => {
      const botMsg: Message = {
        id: Date.now() + 1,
        role: 'bot',
        text: getBotResponse(trimmed),
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botMsg])
      setIsTyping(false)
    }, 600 + Math.random() * 400)
  }

  return (
    <>
      {/* Floating trigger button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-xl shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-500/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
          aria-label="Open chatbot"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-3rem)] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in"
          style={{ boxShadow: '0 20px 60px rgba(14,116,144,0.18), 0 4px 20px rgba(0,0,0,0.08)' }}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Anchor className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-sm leading-tight">MarineBot</div>
                <div className="text-[10px] font-mono text-cyan-100 tracking-wider">OCEANSHIELD AI ASSISTANT</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              aria-label="Close chatbot"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 custom-scrollbar bg-slate-50/80">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'bot' && (
                  <div className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-cyan-600 text-white rounded-br-md'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md shadow-sm'
                  }`}
                >
                  {msg.text}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-white border border-slate-200 shadow-sm">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="px-3 py-3 border-t border-slate-200 bg-white shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about OceanShield AI..."
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-all"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="p-2.5 rounded-xl bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="mt-2 flex gap-1.5 flex-wrap">
              {['What is OceanShield?', 'How does vessel tracking work?', 'Help'].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q)
                    setTimeout(() => {
                      setMessages((prev) => [
                        ...prev,
                        { id: Date.now(), role: 'user', text: q, timestamp: new Date() },
                      ])
                      setIsTyping(true)
                      setTimeout(() => {
                        setMessages((prev) => [
                          ...prev,
                          { id: Date.now() + 1, role: 'bot', text: getBotResponse(q), timestamp: new Date() },
                        ])
                        setIsTyping(false)
                      }, 600 + Math.random() * 400)
                    }, 50)
                    setInput('')
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 text-[11px] font-medium text-slate-600 hover:bg-cyan-50 hover:text-cyan-700 transition-colors cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ChatBot
