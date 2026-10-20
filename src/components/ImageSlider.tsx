'use client'

import { useRef } from 'react'

type Props = {
  imagenes: { src: string; alt: string }[]
  // clase CSS del item (controla alto de imagen en styles.css)
  itemClass: string
  boxClass: string
}

// Slider de imágenes con scroll nativo — las flechas hacen scrollBy
// de un item y el snap mantiene el alineado en mobile y desktop.
export default function ImageSlider({ imagenes, itemClass, boxClass }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  function mover(direccion: number) {
    const contenedor = containerRef.current
    if (!contenedor) return
    const item = contenedor.querySelector(`.${itemClass}`) as HTMLElement | null
    const paso = item ? item.offsetWidth + 20 : contenedor.clientWidth
    contenedor.scrollBy({ left: direccion * paso, behavior: 'smooth' })
  }

  return (
    <div className="botones">
      <button className="flecha izquierda" onClick={() => mover(-1)}>
        ❮
      </button>
      <div className={boxClass}>
        <div className="slider-wrapper">
          <div className="slider-container" ref={containerRef}>
            <div className="grid-futbol">
              {imagenes.map(img => (
                <div className={itemClass} key={img.src}>
                  <img src={img.src} alt={img.alt} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <button className="flecha derecha" onClick={() => mover(1)}>
        ❯
      </button>
    </div>
  )
}
