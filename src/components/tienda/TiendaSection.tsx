'use client'

import { useRef } from 'react'
import type { Producto } from '@/lib/types'
import ProductCard from './ProductCard'

export default function TiendaSection({ productos }: { productos: Producto[] }) {
  const containerRef = useRef<HTMLDivElement>(null)

  function moverSlider(direccion: number) {
    const contenedor = containerRef.current
    if (!contenedor) return
    const primeraCard = contenedor.querySelector('.card') as HTMLElement | null
    const paso = primeraCard
      ? primeraCard.offsetWidth + 20
      : contenedor.clientWidth
    contenedor.scrollBy({ left: direccion * paso, behavior: 'smooth' })
  }

  return (
    <section id="indumentaria" className="section">
      <p className="overline">Tienda oficial</p>
      <h2>Indumentaria</h2>

      {productos.length === 0 ? (
        <p style={{ textAlign: 'center', opacity: 0.7 }}>
          No hay productos cargados todavía.
        </p>
      ) : (
        <div className="botones">
          <button className="flecha izquierda" onClick={() => moverSlider(-1)}>
            ❮
          </button>
          <div className="slider-wrapper">
            <div className="slider-container" ref={containerRef}>
              <div className="grid-productos" id="slider">
                {productos.map(p => (
                  <ProductCard key={p.id} producto={p} />
                ))}
              </div>
            </div>
          </div>
          <button className="flecha derecha" onClick={() => moverSlider(1)}>
            ❯
          </button>
        </div>
      )}
    </section>
  )
}
