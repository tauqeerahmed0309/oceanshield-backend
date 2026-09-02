import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ConceptualVesselProps {
  position: [number, number, number]
  rotationY?: number
  isAnomaly?: boolean
  color?: string
}

export const ConceptualVessel: React.FC<ConceptualVesselProps> = ({
  position,
  rotationY = 0,
  isAnomaly = false,
  color = '#0284c7',
}) => {
  const meshRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (meshRef.current) {
      // Gentle floating Motion
      meshRef.current.position.y = position[1] + Math.sin(t * 1.5 + position[0]) * 0.04
      meshRef.current.rotation.z = Math.sin(t * 1.2) * 0.02
    }
  })

  return (
    <group ref={meshRef} position={position} rotation={[0, rotationY, 0]}>
      {/* Ship Lower Hull (Navy Steel) */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[0.7, 0.3, 2.2]} />
        <meshStandardMaterial color={isAnomaly ? '#991b1b' : '#0f172a'} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Pointed Bow Section */}
      <mesh position={[0, 0.15, 1.25]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[0.5, 0.3, 0.5]} />
        <meshStandardMaterial color={isAnomaly ? '#991b1b' : '#0f172a'} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Main Deck Surface */}
      <mesh position={[0, 0.31, 0]}>
        <boxGeometry args={[0.66, 0.02, 2.1]} />
        <meshStandardMaterial color="#334155" roughness={0.4} />
      </mesh>

      {/* Multi-Level Superstructure Wheelhouse Cabin */}
      <mesh position={[0, 0.55, -0.6]}>
        <boxGeometry args={[0.5, 0.4, 0.5]} />
        <meshStandardMaterial color="#ffffff" roughness={0.2} />
      </mesh>

      {/* Navigation Bridge Windows */}
      <mesh position={[0, 0.68, -0.36]}>
        <boxGeometry args={[0.46, 0.1, 0.04]} />
        <meshStandardMaterial color="#0ea5e9" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Exhaust Funnel Stack */}
      <mesh position={[0, 0.82, -0.75]}>
        <cylinderGeometry args={[0.08, 0.08, 0.25, 12]} />
        <meshStandardMaterial color="#ef4444" metalness={0.5} />
      </mesh>

      {/* Stored Cargo Containers */}
      <mesh position={[0, 0.45, 0.2]}>
        <boxGeometry args={[0.48, 0.24, 1.0]} />
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
      </mesh>

      {/* Realistic Bow & Stern Water Wake Foam */}
      <mesh position={[0, 0.01, 1.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.2, 1.2]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
      </mesh>
    </group>
  )
}
