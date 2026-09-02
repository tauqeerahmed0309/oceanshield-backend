import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ParticlesProps {
  count?: number
  visible?: boolean
  color?: string
}

export const Particles: React.FC<ParticlesProps> = ({
  count = 120,
  visible = true,
  color = '#39C6E8',
}) => {
  const pointsRef = useRef<THREE.Points>(null)

  const [positions, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const spd = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20
      pos[i * 3 + 1] = -1.8 + Math.random() * 0.4
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20
      spd[i] = 0.5 + Math.random() * 1.5
    }
    return [pos, spd]
  }, [count])

  useFrame((_, delta) => {
    if (pointsRef.current) {
      const geo = pointsRef.current.geometry
      const posAttr = geo.attributes.position
      for (let i = 0; i < count; i++) {
        let z = posAttr.getZ(i)
        z += delta * speeds[i]
        if (z > 10) z = -10
        posAttr.setZ(i, z)
      }
      posAttr.needsUpdate = true
    }
  })

  if (!visible) return null

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial size={0.12} color={color} transparent opacity={0.6} blending={THREE.AdditiveBlending} />
    </points>
  )
}
