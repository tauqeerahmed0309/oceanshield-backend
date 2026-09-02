import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface SatelliteProps {
  visible?: boolean
  isScanning?: boolean
}

export const Satellite: React.FC<SatelliteProps> = ({ visible = true, isScanning = false }) => {
  const groupRef = useRef<THREE.Group>(null)
  const beamRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (groupRef.current) {
      groupRef.current.position.x = Math.sin(t * 0.5) * 4
      groupRef.current.position.z = Math.cos(t * 0.5) * 2
      groupRef.current.rotation.y = t * 0.2
    }
    if (beamRef.current) {
      const mat = beamRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.2 + Math.sin(t * 5) * 0.1
    }
  })

  if (!visible) return null

  return (
    <group ref={groupRef} position={[0, 4, 0]}>
      {/* Satellite Main Body */}
      <mesh>
        <boxGeometry args={[0.8, 0.5, 0.5]} />
        <meshStandardMaterial color="#d1d5db" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Solar Wings (Left) */}
      <mesh position={[-1.2, 0, 0]}>
        <boxGeometry args={[1.5, 0.05, 0.6]} />
        <meshStandardMaterial color="#0284c7" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Solar Wings (Right) */}
      <mesh position={[1.2, 0, 0]}>
        <boxGeometry args={[1.5, 0.05, 0.6]} />
        <meshStandardMaterial color="#0284c7" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* SAR Radar Antenna Dish */}
      <mesh position={[0, -0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.1, 16]} />
        <meshStandardMaterial color="#38bdf8" metalness={0.7} />
      </mesh>

      {/* SAR Radar Scanning Cone */}
      {isScanning && (
        <mesh ref={beamRef} position={[0, -2.5, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[2.5, 5, 32, 1, true]} />
          <meshBasicMaterial
            color="#00E0C6"
            transparent
            opacity={0.25}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  )
}
