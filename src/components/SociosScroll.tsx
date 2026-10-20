'use client'

import { useEffect, useRef } from 'react'

// Comercios adheridos que orbitan el título
const ITEMS = [
  { clase: 'si-1',  src: '/images/emprendimiento1.webp',  alt: 'Puna Rentals',           rot: -3,   start: 0.06, end: 0.16 },
  { clase: 'si-2',  src: '/images/emprendimiento4.webp',  alt: 'Del Vino Hotel',          rot: 2.5,  start: 0.13, end: 0.23 },
  { clase: 'si-3',  src: '/images/emprendimiento7.webp',  alt: 'Emele Sublimación',       rot: -2,   start: 0.20, end: 0.30 },
  { clase: 'si-4',  src: '/images/emprendimiento10.webp', alt: 'Barbería Castillo',       rot: 3,    start: 0.27, end: 0.37 },
  { clase: 'si-5',  src: '/images/emprendimiento13.webp', alt: 'Taller Automotores',      rot: -2.5, start: 0.34, end: 0.44 },
  { clase: 'si-6',  src: '/images/emprendimiento16.webp', alt: 'SE Beautique',            rot: 2,    start: 0.41, end: 0.51 },
  { clase: 'si-7',  src: '/images/emprendimiento19.webp', alt: 'SNS Suplementos',         rot: -3,   start: 0.48, end: 0.58 },
  { clase: 'si-8',  src: '/images/emprendimiento22.webp', alt: 'Mapache Bar',             rot: 2.5,  start: 0.55, end: 0.65 },
  { clase: 'si-9',  src: '/images/emprendimiento3.webp',  alt: 'Abril Frutos Secos',      rot: -2,   start: 0.62, end: 0.72 },
  { clase: 'si-10', src: '/images/emprendimiento24.webp', alt: 'Ricardo Martin Mecánica', rot: 3,    start: 0.69, end: 0.79 },
]

const clamp = (v: number) => Math.min(1, Math.max(0, v))

// Sección Socios: el título queda centrado y los logos de los
// comercios adheridos aparecen dispersos alrededor al scrollear.
export default function SociosScroll() {
  const sectionRef = useRef<HTMLElement>(null)
  const centroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const centro = centroRef.current
    if (!section || !centro) return

    const items = Array.from(
      section.querySelectorAll<HTMLElement>('.socios-item')
    )
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const totalScroll = section.offsetHeight - window.innerHeight
        const p = clamp(-section.getBoundingClientRect().top / totalScroll)

        // Título: entra suave al inicio y queda fijo
        const tp = reduced ? (p > 0.02 ? 1 : 0) : clamp(p / 0.08)
        centro.style.opacity = String(tp)
        centro.style.transform = `translateY(${30 * (1 - tp)}px) scale(${0.94 + 0.06 * tp})`

        // Logos: aparecen escalonados y quedan rodeando el título
        for (const el of items) {
          const s = Number(el.dataset.start)
          const e = Number(el.dataset.end)
          const l = reduced ? (p >= s ? 1 : 0) : clamp((p - s) / (e - s))
          const rot = Number(el.dataset.rot)
          el.style.opacity = String(l)
          el.style.transform = `translateY(${(1 - l) * 60}px) scale(${0.7 + 0.3 * l}) rotate(${rot * l}deg)`
        }
      })
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <section className="socios-scroll" ref={sectionRef}>
      <div className="socios-pin">
        <div className="socios-centro" ref={centroRef}>
          <p className="overline">Comunidad</p>
          <h2>Socios</h2>
          <p className="socios-centro-sub">
            Siendo socio tenés beneficios en más de 25 comercios de la ciudad
          </p>
          <a
            href="https://juventudantoniana.accessfan.ar/account"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-hero"
          >
            Quiero ser socio
          </a>
        </div>

        {ITEMS.map(item => (
          <figure
            key={item.src}
            className={`socios-item ${item.clase}`}
            data-start={item.start}
            data-end={item.end}
            data-rot={item.rot}
          >
            <img src={item.src} alt={item.alt} />
          </figure>
        ))}
      </div>
    </section>
  )
}
