import React from 'react'
import * as THREE from 'three'

interface OceanProps {
  opacity?: number
}

export const Ocean: React.FC<OceanProps> = ({ opacity = 1 }) => {
  return (
    <group position={[0, -2, 0]} rotation={[-Math.PI / 2.2, 0, 0]}>
      {/* Pristine Ocean Water Surface (Uniform Beautiful Marine Sky-Blue Always) */}
      <mesh>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial
          color="#0284C7"
          roughness={0.2}
          metalness={0.4}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}
