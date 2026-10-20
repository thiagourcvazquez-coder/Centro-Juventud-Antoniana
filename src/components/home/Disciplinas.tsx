'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'

const DISCIPLINAS = [
  { nombre: 'Fútbol', tag: 'Federal A', img: '/images/futbol.jpg' },
  { nombre: 'Futsal', tag: 'Salón', img: '/images/futsal.jpg' },
  { nombre: 'Handball', tag: 'Cancha techada', img: '/images/handball.jpg' },
  { nombre: 'Hockey', tag: 'Sobre césped', img: '/images/hockey1.jpg' },
  { nombre: 'Vóley', tag: 'Formativo', img: '/images/voley1.jpg' },
  { nombre: 'Femenino', tag: 'Tres colores', img: '/images/femenino.webp' },
  { nombre: 'Inferiores', tag: 'El futuro', img: '/images/inferiores.jpg' },
]

// Scroll vertical convertido en desplazamiento horizontal (sticky).
// En mobile queda como carrusel nativo con scroll-snap.
export default function Disciplinas() {
  const sectionRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const mq = matchMedia('(min-width: 861px)')
    const section = sectionRef.current
    const track = trackRef.current
    if (!section || !track) return

    let raf = 0
    const draw = () => {
      raf = 0
      if (!mq.matches) {
        track.style.transform = ''
        return
      }
      const r = section.getBoundingClientRect()
      const recorrido = track.scrollWidth - innerWidth + innerWidth * 0.1
      const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)))
      track.style.transform = `translate3d(${-p * recorrido}px, 0, 0)`
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(draw) }
    const onResize = () => {
      if (mq.matches) section.style.height = `${track.scrollWidth * 0.9}px`
      else section.style.height = ''
      draw()
    }
    onResize()
    addEventListener('scroll', onScroll, { passive: true })
    addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('scroll', onScroll)
      removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <section className="ed-disc" ref={sectionRef} id="disciplinas">
      <div className="ed-disc-pin">
        <div className="ed-disc-head">
          <p className="ed-eyebrow">Polideportivo</p>
          <h2 className="ed-titulo">
            Siete formas de <span className="ed-serif ed-celeste">vestir</span> los colores
          </h2>
        </div>
        <div className="ed-disc-track" ref={trackRef}>
          {DISCIPLINAS.map((d, i) => (
            <Link
              href="/polideportivo"
              className="ed-disc-card"
              key={d.nombre}
             
            >
              <span className="ed-disc-num">{String(i + 1).padStart(2, '0')}</span>
              <img src={d.img} alt={d.nombre} loading="lazy" />
              <div className="ed-disc-info">
                <span className="ed-disc-tag">{d.tag}</span>
                <strong>{d.nombre}</strong>
              </div>
            </Link>
          ))}
          <Link href="/polideportivo" className="ed-disc-fin">
            <span className="ed-serif">Conocé el</span>
            <strong>polideportivo</strong>
            <span aria-hidden>→</span>
          </Link>
        </div>
        <div className="ed-disc-bar" aria-hidden><span ref={barRef} /></div>
      </div>
    </section>
  )
}
