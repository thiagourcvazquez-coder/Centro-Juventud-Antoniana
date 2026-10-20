'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Center, Environment, OrbitControls, useGLTF } from '@react-three/drei'

function Modelo({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene} />
}

// Visor 3D de producto: arrastrar para girar, auto-rotación lenta
// que se reactiva a los segundos de soltar.
export default function Modelo3D({ src }: { src: string }) {
  return (
    <div className="card-canvas3d" data-cursor="Girar">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 3.2], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 4, 5]} intensity={1.2} />
        <Suspense fallback={null}>
          <Center>
            <Modelo url={src} />
          </Center>
          <Environment preset="city" />
        </Suspense>
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={2}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.6}
        />
      </Canvas>
      <span className="card-canvas3d-tag">360° · arrastrá</span>
    </div>
  )
}
