import React, { useMemo } from 'react'
import * as THREE from 'three'

interface AISRouteProps {
  points: [number, number, number][]
  color?: string
  dashed?: boolean
  opacity?: number
}

export const AISRoute: React.FC<AISRouteProps> = ({
  points,
  color = '#00E0C6',
  opacity = 0.8,
}) => {
  const lineGeometry = useMemo(() => {
    const curvePoints = points.map((p) => new THREE.Vector3(...p))
    const curve = new THREE.CatmullRomCurve3(curvePoints)
    const pts = curve.getPoints(50)
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [points])

  return (
    <line geometry={lineGeometry}>
      <lineBasicMaterial color={color} transparent opacity={opacity} linewidth={2} />
    </line>
  )
}
