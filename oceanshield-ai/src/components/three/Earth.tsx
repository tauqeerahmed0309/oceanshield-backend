import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface EarthProps {
  opacity?: number
  scale?: number
  position?: [number, number, number]
}

// Generate a more realistic Earth texture with layered ocean and terrain tones.
function createDayEarthTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 2048
  canvas.height = 1024
  const ctx = canvas.getContext('2d')!

  const oceanGrad = ctx.createLinearGradient(0, 0, 0, canvas.height)
  oceanGrad.addColorStop(0, '#0a4d7a')
  oceanGrad.addColorStop(0.35, '#0b5f92')
  oceanGrad.addColorStop(0.7, '#0d4f78')
  oceanGrad.addColorStop(1, '#082e42')
  ctx.fillStyle = oceanGrad
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = 'rgba(255,255,255,0.07)'
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    const w = 40 + Math.random() * 200
    const h = 10 + Math.random() * 40
    ctx.fillRect(x, y, w, h)
  }

  const landGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  landGrad.addColorStop(0, '#8bcf6b')
  landGrad.addColorStop(0.35, '#57a85d')
  landGrad.addColorStop(0.7, '#2d7c4e')
  landGrad.addColorStop(1, '#1c5b46')

  ctx.fillStyle = landGrad
  ctx.strokeStyle = 'rgba(220, 252, 231, 0.9)'
  ctx.lineWidth = 1.3

  const continents = [
    [
      [1120, 120], [1360, 70], [1700, 100], [1830, 220], [1750, 360],
      [1510, 420], [1410, 360], [1290, 380], [1190, 350], [1080, 280],
      [980, 180], [1060, 150]
    ],
    [
      [1380, 340], [1450, 360], [1485, 430], [1445, 510], [1385, 470], [1355, 395]
    ],
    [
      [940, 300], [1150, 290], [1225, 420], [1170, 610], [1085, 730],
      [980, 660], [910, 500], [880, 380]
    ],
    [
      [210, 100], [560, 80], [720, 240], [610, 380], [470, 420],
      [380, 470], [290, 340], [190, 260]
    ],
    [
      [500, 470], [650, 510], [700, 650], [600, 850], [505, 930],
      [430, 760], [440, 570]
    ],
    [
      [1540, 610], [1765, 600], [1840, 720], [1730, 820], [1575, 790], [1510, 710]
    ],
  ]

  continents.forEach((poly) => {
    ctx.beginPath()
    ctx.moveTo(poly[0][0], poly[0][1])
    for (let i = 1; i < poly.length; i++) {
      ctx.lineTo(poly[i][0], poly[i][1])
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  })

  for (let i = 0; i < 50; i++) {
    const cx = Math.random() * canvas.width
    const cy = Math.random() * canvas.height
    const rx = 30 + Math.random() * 150
    const ry = 8 + Math.random() * 28
    ctx.fillStyle = 'rgba(255,255,255,0.14)'
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }

  const hubs = [
    [1405, 480],
    [1590, 530],
    [1125, 360],
    [1010, 230],
    [480, 460],
  ]

  hubs.forEach(([hx, hy]) => {
    ctx.fillStyle = '#7dd3fc'
    ctx.beginPath()
    ctx.arc(hx, hy, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#eff6ff'
    ctx.lineWidth = 2
    ctx.stroke()
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.anisotropy = 8
  texture.needsUpdate = true
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export const Earth: React.FC<EarthProps> = ({ opacity = 1, scale = 1, position = [0, 0, 0] }) => {
  const earthGroupRef = useRef<THREE.Group>(null)
  const cloudsRef = useRef<THREE.Mesh>(null)

  const dayTexture = useMemo(() => createDayEarthTexture(), [])

  useFrame((_, delta) => {
    if (earthGroupRef.current) {
      earthGroupRef.current.rotation.y += delta * 0.05
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.07
    }
  })

  return (
    <group position={position} scale={[scale, scale, scale]}>
      <group ref={earthGroupRef}>
        {/* Soft Atmosphere Sky Glow */}
        <mesh scale={[2.2, 2.2, 2.2]}>
          <sphereGeometry args={[1, 96, 96]} />
          <meshBasicMaterial
            color="#7dd3fc"
            transparent
            opacity={0.18 * opacity}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Realistic globe surface */}
        <mesh scale={[2, 2, 2]}>
          <sphereGeometry args={[1, 96, 96]} />
          <meshPhysicalMaterial
            map={dayTexture}
            roughness={0.82}
            metalness={0.12}
            clearcoat={0.25}
            clearcoatRoughness={0.7}
            transparent
            opacity={opacity}
          />
        </mesh>

        {/* Cloud Layer */}
        <mesh ref={cloudsRef} scale={[2.04, 2.04, 2.04]}>
          <sphereGeometry args={[1, 64, 64]} />
          <meshStandardMaterial
            color="#f8fbff"
            transparent
            opacity={0.26 * opacity}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>
    </group>
  )
}
