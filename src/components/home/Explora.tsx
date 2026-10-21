'use client'

import { useState } from 'react'
import Link from 'next/link'

const ITEMS = [
  { n: '01', titulo: 'Historia', sub: 'Desde 1916', href: '/historia', img: '/images/plantel71.jpg' },
  { n: '02', titulo: 'Partidos', sub: 'Fixture · tablas · fases', href: '/partidos', img: '/images/ascenso.jpg' },
  { n: '03', titulo: 'Tienda', sub: 'Indumentaria oficial', href: '/tienda', img: '/images/tienda/camiseta-oficial-juventud-antoniana-t-2026/4.webp' },
  { n: '04', titulo: 'Polideportivo', sub: 'Siete disciplinas', href: '/polideportivo', img: '/images/futsal2.jpg' },
]

// Índice grande con preview de imagen que sigue al hover.
export default function Explora() {
  const [activo, setActivo] = useState(0)

  return (
    <section className="ed-explora">
      <p className="ed-eyebrow" data-rv>Explorá el club</p>
      <div className="ed-explora-grid">
        <ul className="ed-explora-lista">
          {ITEMS.map((it, i) => (
            <li key={it.href} data-rv style={{ transitionDelay: `${i * 70}ms` }}>
              <Link
                href={it.href}
                className={i === activo ? 'on' : ''}
                onMouseEnter={() => setActivo(i)}
                onFocus={() => setActivo(i)}
              >
                <span className="ed-explora-n">{it.n}</span>
                <span className="ed-explora-t">{it.titulo}</span>
                <span className="ed-explora-s">{it.sub}</span>
                <span className="ed-explora-flecha" aria-hidden>↗</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="ed-explora-prev" aria-hidden>
          {ITEMS.map((it, i) => (
            <img key={it.img} src={it.img} alt="" className={i === activo ? 'on' : ''} loading="lazy" />
          ))}
        </div>
      </div>
    </section>
  )
}
