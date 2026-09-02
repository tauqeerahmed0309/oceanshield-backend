import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { HeroHeader } from '../../components/landing/HeroHeader'
import { StoryOverlay } from '../../components/landing/StoryOverlay'
import { LandingCanvas } from '../../components/three/LandingCanvas'

gsap.registerPlugin(ScrollTrigger)

export const LandingPage: React.FC = () => {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    // Silky smooth scroll via Lenis
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    const rafId = requestAnimationFrame(raf)

    // Sync scroll progress via GSAP ScrollTrigger
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.8,
        onUpdate: (self) => {
          setScrollProgress(self.progress)
        },
      })
    }, containerRef)

    return () => {
      cancelAnimationFrame(rafId)
      ctx.revert()
      lenis.destroy()
    }
  }, [])

  const handleStart = () => {
    navigate('/dashboard')
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-[#F4F9FC] text-slate-900 transition-colors duration-300 selection:bg-sky-500 selection:text-white"
    >
      {/* Fixed Header Bar */}
      <HeroHeader onStartClick={handleStart} />

      {/* Fixed Pinned 3D Viewport Background */}
      <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
        <LandingCanvas scrollProgress={scrollProgress} />
      </div>

      {/* Modern Day Mode Story Sections */}
      <StoryOverlay scrollProgress={scrollProgress} onStartClick={handleStart} />
    </div>
  )
}
