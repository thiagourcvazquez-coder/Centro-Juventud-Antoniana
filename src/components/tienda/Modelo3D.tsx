'use client'

import { Component, Suspense, useMemo, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { Html, OrbitControls, useGLTF } from '@react-three/drei'
import { Box3, Vector3 } from 'three'

function Modelo({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  const obj = useMemo(() => {
    const o = scene.clone(true)
    const box = new Box3().setFromObject(o)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    const k = 1.9 / Math.max(size.x, size.y, size.z)
    o.position.sub(center)
    const g = { scale: k }
    return { o, g }
  }, [scene])
  return (
    <group scale={obj.g.scale}>
      <primitive object={obj.o} />
    </group>
  )
}

class Falla extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false }
  static getDerivedStateFromError() {
    return { error: true }
  }
  render() {
    return this.state.error ? (
      <p className="card-canvas3d-error">No se pudo cargar el modelo 3D</p>
    ) : (
      this.props.children
    )
  }
}

export default function Modelo3D({ src, zoom = false }: { src: string; zoom?: boolean }) {
  return (
    <div className="card-canvas3d">
      <Falla>
        <Canvas dpr={[1, 2]} camera={{ position: [0, 0.1, 3.4], fov: 40 }} gl={{ antialias: true }}>
          <hemisphereLight args={['#dbeafe', '#1e293b', 1.1]} />
          <directionalLight position={[3, 4, 5]} intensity={1.8} />
          <directionalLight position={[-4, 2, -3]} intensity={0.9} color="#93c5fd" />
          <directionalLight position={[0, -3, 3]} intensity={0.35} />
          <Suspense
            fallback={
              <Html center>
                <span className="card-canvas3d-loading">Cargando 3D…</span>
              </Html>
            }
          >
            <Modelo url={src} />
          </Suspense>
          <OrbitControls
            enableZoom={zoom}
            enablePan={false}
            autoRotate
            autoRotateSpeed={1.6}
            minDistance={2}
            maxDistance={6}
            minPolarAngle={Math.PI / 3.2}
            maxPolarAngle={Math.PI / 1.8}
          />
        </Canvas>
      </Falla>
      <span className="card-canvas3d-tag">360° · arrastrá para girar</span>
    </div>
  )
}
