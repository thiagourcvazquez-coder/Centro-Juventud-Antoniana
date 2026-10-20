'use client'

import { useState } from 'react'

const FOTOS = [
  { src: '/images/nacional.jpg', alt: 'El Bautismo Santo en el Nacional' },
  { src: '/images/ascenso.jpg', alt: 'Ascenso' },
  { src: '/images/ascenso2.jpg', alt: 'Ascenso 2' },
  { src: '/images/hinchada-lerma.jpg', alt: 'Hinchada La Lerma' },
  { src: '/images/44-partidos-invictos.jpg', alt: '44 Partidos Invictos' },
  { src: '/images/plantel99.png', alt: 'Plantel 99' },
  { src: '/images/plantel71.jpg', alt: 'Plantel 71' },
  { src: '/images/lalerma.jpg', alt: 'La Lerma' },
  { src: '/images/plantel98.jpg', alt: 'Plantel 98' },
  { src: '/images/final.jpg', alt: 'La Final' },
]

// Tira de fotos con scroll infinito (duplicadas para el loop) + lightbox.
export default function GaleriaHistoria() {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  return (
    <>
      <div className="fotos-outer">
        <div className="fotos-track">
          {[...FOTOS, ...FOTOS].map((foto, i) => (
            <div className="foto-slide" key={`${foto.src}-${i}`}>
              <img
                src={foto.src}
                alt={foto.alt}
                onClick={() => setLightboxSrc(foto.src)}
              />
            </div>
          ))}
        </div>
      </div>

      {lightboxSrc && (
        <div
          id="lightbox"
          className="lightbox-overlay abierto"
          onClick={() => setLightboxSrc(null)}
        >
          <img id="lightbox-img" src={lightboxSrc} alt="Foto histórica" />
        </div>
      )}
    </>
  )
}
