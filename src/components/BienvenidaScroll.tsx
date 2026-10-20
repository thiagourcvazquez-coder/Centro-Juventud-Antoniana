'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'

type Item = {
  clase: string
  src: string
  alt: string
  rot: number
  start: number
  end: number
  bnw?: boolean
}

const ITEMS: Item[] = [
  { clase: 'bi-1', src: '/images/bienvenida/pistoia-1.jpg',              alt: 'El Santuario renovado',        rot: -2.5, start: 0.10, end: 0.19 },
  { clase: 'bi-7', src: '/images/ascenso.jpg',                           alt: 'Festejos del Santo',           rot: 2,    start: 0.16, end: 0.25 },
  { clase: 'bi-2', src: '/images/nacional.jpg',                          alt: 'El Nacional de clubes',        rot: -1,   start: 0.22, end: 0.32 },
  { clase: 'bi-8', src: '/images/final.jpg',                             alt: 'La final del Nacional',        rot: 2.5,  start: 0.54, end: 0.63 },
  { clase: 'bi-9', src: '/images/bienvenida/cancha-cja.jpg',             alt: 'La cancha con las siglas CJA', rot: -1.5, start: 0.58, end: 0.66 },
  { clase: 'bi-3', src: '/images/bienvenida/tribuna-1791654775571.jpg',  alt: 'Las tribunas del Pistoia',     rot: 1.5,  start: 0.64, end: 0.72 },
  { clase: 'bi-4', src: '/images/bienvenida/banderas-pistoia.jpg',       alt: 'Banderas en el Fray Honorato Pistoia', rot: -2.5, start: 0.68, end: 0.75 },
  { clase: 'bi-5', src: '/images/plantel71.jpg',                         alt: 'Plantel histórico de 1971',    rot: 2,    start: 0.72, end: 0.78, bnw: true },
  { clase: 'bi-6', src: '/images/bienvenida/mural-80a9abefeea72f8f.webp', alt: 'Mural de la calle Catamarca',            rot: -1.5, start: 0.75, end: 0.81 },
]

const clamp = (v: number) => Math.min(1, Math.max(0, v))

// Bienvenida con scroll vertical: el título se difumina hacia arriba
// y las fotos aparecen dispersas a medida que se baja.
export default function BienvenidaScroll() {
  const sectionRef = useRef<HTMLElement>(null)
  const textoRef = useRef<HTMLDivElement>(null)
  const outroRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLSpanElement>(null)
  const countRef = useRef<HTMLSpanElement>(null)
  const total = ITEMS.length + 2 // intro + fotos + cierre

  useEffect(() => {
    const section = sectionRef.current
    const texto = textoRef.current
    const outro = outroRef.current
    if (!section || !texto || !outro) return

    const items = Array.from(
      section.querySelectorAll<HTMLElement>('.bienvenida-item')
    )
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const totalScroll = section.offsetHeight - window.innerHeight
        const p = clamp(-section.getBoundingClientRect().top / totalScroll)

        // Título: se difumina, escala y sube (0 → 22%)
        const tp = reduced ? (p > 0.22 ? 1 : 0) : clamp(p / 0.22)
        texto.style.opacity = String(1 - tp)
        texto.style.transform = `translateY(${-140 * tp}px) scale(${1 + 0.4 * tp})`
        texto.style.filter = `blur(${14 * tp}px)`
        texto.style.pointerEvents = tp > 0.5 ? 'none' : 'auto'

        // Fotos: aparecen cada una en su ventana y desaparecen
        // por completo cuando llega el cierre
        const fadeGlobal = clamp((p - 0.84) / 0.14)
        for (const el of items) {
          const s = Number(el.dataset.start)
          const e = Number(el.dataset.end)
          const l = reduced ? (p >= s ? 1 : 0) : clamp((p - s) / (e - s))
          const rot = Number(el.dataset.rot)
          el.style.opacity = String(l * (1 - fadeGlobal))
          el.style.transform = `translateY(${(1 - l) * 80 - 50 * fadeGlobal}px) scale(${0.82 + 0.18 * l}) rotate(${rot}deg)`
        }

        // Cierre: aparece al final
        const op = reduced ? (p > 0.86 ? 1 : 0) : clamp((p - 0.84) / 0.14)
        outro.style.opacity = String(op)
        outro.style.transform = `translateY(${40 * (1 - op)}px)`
        outro.style.pointerEvents = op > 0.5 ? 'auto' : 'none'

        if (barRef.current) barRef.current.style.transform = `scaleX(${p})`
        if (countRef.current) {
          const actual = Math.min(total, Math.round(p * (total - 1)) + 1)
          countRef.current.textContent = String(actual).padStart(2, '0')
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
  }, [total])

  return (
    <section className="bienvenida" ref={sectionRef}>
      <div className="bienvenida-pin">
        {/* Título que se difumina */}
        <div className="bienvenida-texto" ref={textoRef}>
          <img
            src="/images/escudo.png"
            alt="Escudo Centro Juventud Antoniana"
            className="bienvenida-escudo"
          />
          <p className="overline">Bienvenidos al</p>
          <h2>
            Centro
            <br />
            <span className="hero-accent">Juventud Antoniana</span>
          </h2>
          <p className="bienvenida-sub">
            El único santo del país. Un club, un barrio, una familia.
          </p>
          <span className="bienvenida-hint">Deslizá para conocernos ↓</span>
        </div>

        {/* Fotos dispersas */}
        {ITEMS.map(item => (
          <figure
            key={item.src}
            className={`bienvenida-item ${item.clase}${item.bnw ? ' bnw' : ''}`}
            data-start={item.start}
            data-end={item.end}
            data-rot={item.rot}
          >
            <img src={item.src} alt={item.alt} />
          </figure>
        ))}

        {/* Cierre */}
        <div className="bienvenida-outro" ref={outroRef}>
          <video
            className="outro-video"
            src="/videos/video-1.mp4"
            autoPlay
            muted
            loop
            playsInline
          />
          <p className="overline">110 años</p>
          <h2>Y esto recién empieza</h2>
          <Link href="/historia" className="btn-hero">
            Conocé nuestra historia
          </Link>
        </div>

        {/* Progreso */}
        <div className="bienvenida-ui">
          <div className="bienvenida-barra">
            <span ref={barRef} />
          </div>
          <p className="bienvenida-count">
            <span ref={countRef}>01</span> / {String(total).padStart(2, '0')}
          </p>
        </div>
      </div>
    </section>
  )
}
