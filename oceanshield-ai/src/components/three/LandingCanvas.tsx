import React from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { Earth } from './Earth'
import { Ocean } from './Ocean'
import { ConceptualVessel } from './ConceptualVessel'
import { AISRoute } from './AISRoute'
import { OilSlick } from './OilSlick'
import { Particles } from './Particles'

interface LandingCanvasProps {
  scrollProgress: number // 0 to 1
}

const CameraController: React.FC<{ progress: number }> = ({ progress }) => {
  useFrame(({ camera }) => {
    // Smooth camera motion curve
    if (progress < 0.2) {
      const targetPos = new THREE.Vector3(0, 0.2, 6.5)
      camera.position.lerp(targetPos, 0.08)
      camera.lookAt(0, 0, 0)
    } else if (progress < 0.5) {
      const t = (progress - 0.2) / 0.3
      const targetPos = new THREE.Vector3(Math.sin(t * 1.2) * 2, 2 - t * 0.6, 5.5 - t * 2)
      camera.position.lerp(targetPos, 0.08)
      camera.lookAt(0, -1, 0)
    } else if (progress < 0.8) {
      const t = (progress - 0.5) / 0.3
      const targetPos = new THREE.Vector3(0, 3.8 - t * 1.2, 3.2 - t * 0.8)
      camera.position.lerp(targetPos, 0.08)
      camera.lookAt(0, -1.8, 0)
    } else {
      const t = (progress - 0.8) / 0.2
      const targetPos = new THREE.Vector3(Math.sin(t * Math.PI) * 1.5, 2.5, 3.5 - t * 1.2)
      camera.position.lerp(targetPos, 0.08)
      camera.lookAt(0, -1.8, 0)
    }
  })

  return null
}

export const LandingCanvas: React.FC<LandingCanvasProps> = ({ scrollProgress }) => {
  const isEarthVisible = scrollProgress < 0.25
  const isOceanVisible = scrollProgress >= 0.15
  const isSlickVisible = scrollProgress >= 0.52
  const isAnomalyActive = scrollProgress >= 0.32
  const isCandidatesVisible = scrollProgress >= 0.78

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-auto z-0">
      <Canvas
        camera={{ position: [0, 0, 6.5], fov: 48 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        {/* Uniform Sky-Blue Environment Background */}
        <color attach="background" args={['#0284c7']} />

        {/* Studio Lighting */}
        <ambientLight intensity={1.4} />
        <directionalLight position={[12, 15, 8]} intensity={1.8} />
        <directionalLight position={[-10, -5, -5]} intensity={0.6} color="#38bdf8" />
        <pointLight position={[5, 5, 5]} intensity={1.2} color="#7dd3fc" />

        <CameraController progress={scrollProgress} />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          enableDamping
          dampingFactor={0.08}
          minPolarAngle={Math.PI / 2.8}
          maxPolarAngle={Math.PI / 1.8}
          autoRotate
          autoRotateSpeed={0.9}
        />

        {/* 3D Earth Globe (Right Side in Hero View) */}
        {isEarthVisible && (
          <Earth
            position={[2.0, 0.2, 0]}
            opacity={Math.max(0, 1 - (scrollProgress - 0.15) * 10)}
            scale={1.1}
          />
        )}

        {/* Smooth Ocean Surface Plane */}
        {isOceanVisible && (
          <Ocean opacity={Math.min(1, (scrollProgress - 0.12) * 8)} />
        )}

        {/* Cargo & Tanker Ships */}
        {isOceanVisible && (
          <>
            <ConceptualVessel
              position={[-1.2, -1.8, -0.2]}
              rotationY={Math.PI / 4}
              isAnomaly={isAnomalyActive}
              color="#0284c7"
            />

            {isCandidatesVisible && (
              <ConceptualVessel
                position={[-2.4, -1.8, -1.8]}
                rotationY={Math.PI / 6}
                isAnomaly
                color="#dc2626"
              />
            )}

            {isCandidatesVisible && (
              <ConceptualVessel
                position={[2.2, -1.8, -1.4]}
                rotationY={-Math.PI / 3}
                color="#d97706"
              />
            )}

            {/* Clean Curved Route Lines */}
            <AISRoute
              points={[
                [-5, -1.8, 3],
                [-3, -1.8, 1],
                [-1.2, -1.8, -0.2],
                [0, -1.8, -1.8],
                [2.5, -1.8, -3],
              ]}
              color={isAnomalyActive ? '#ef4444' : '#38bdf8'}
              opacity={0.9}
            />

            {isCandidatesVisible && (
              <>
                <AISRoute
                  points={[
                    [-4, -1.8, -3],
                    [-3, -1.8, -2.2],
                    [-2.4, -1.8, -1.8],
                    [0, -1.8, -1.95],
                  ]}
                  color="#ef4444"
                />
                <AISRoute
                  points={[
                    [4, -1.8, 0],
                    [3, -1.8, -0.6],
                    [2.2, -1.8, -1.4],
                    [0, -1.8, -1.95],
                  ]}
                  color="#f59e0b"
                />
              </>
            )}
          </>
        )}

        {/* Conceptual Oil Slick */}
        <OilSlick visible={isSlickVisible} scale={scrollProgress >= 0.75 ? 1.4 : 1.0} />

        {/* Particles */}
        <Particles visible={scrollProgress >= 0.6} color="#7dd3fc" />
      </Canvas>
    </div>
  )
}
