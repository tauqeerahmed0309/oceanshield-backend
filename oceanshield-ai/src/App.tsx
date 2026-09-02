import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LandingPage } from './pages/Landing/LandingPage'
import { DashboardPage } from './pages/Dashboard/DashboardPage'
import { useThemeStore } from './store/themeStore'

export const App: React.FC = () => {
  const { theme } = useThemeStore()

  useEffect(() => {
    // Sync root html class on initial mount
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
