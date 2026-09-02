import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface OilSlickProps {
  visible?: boolean
  scale?: number
  position?: [number, number, number]
}

export const OilSlick: React.FC<OilSlickProps> = ({
  visible = true,
  scale = 1,
  position = [0, -1.95, 0],
}) => {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime()
      const mat = meshRef.current.material as THREE.MeshStandardMaterial
      mat.opacity = 0.75 + Math.sin(t * 2) * 0.08
    }
  })

  if (!visible) return null

  return (
    <group position={position} rotation={[-Math.PI / 2, 0, 0]} scale={[scale, scale, scale]}>
      {/* Deep Marine Slick Surface */}
      <mesh ref={meshRef}>
        <ringGeometry args={[0, 2.8, 32]} />
        <meshStandardMaterial
          color="#0369a1"
          roughness={0.1}
          metalness={0.8}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Iridescent Outer Edge Glow Ring */}
      <mesh position={[0, 0, 0.01]}>
        <ringGeometry args={[2.6, 2.9, 32]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
