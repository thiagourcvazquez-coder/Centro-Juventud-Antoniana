'use client'

import { useEffect, useRef } from 'react'

// Las palabras marcadas con * salen en serif itálica celeste.
const TEXTO =
  'Desde *1916* el Santo late en *tres colores*. Un club de barrio que llegó al *Nacional*, fue dos veces *campeón del Argentino A* y cada domingo hace temblar el *Fray Honorato Pistoia*.'

const PALABRAS = TEXTO.split(' ').map(p => {
  const marcada = /\*/.test(p)
  return { t: p.replace(/\*/g, ''), marcada }
})

// El texto se "enciende" palabra por palabra mientras se scrollea.
export default function Manifiesto() {
  const sectionRef = useRef<HTMLElement>(null)
  const refs = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(() => {
    let raf = 0
    let last = -1
    const draw = () => {
      raf = 0
      const s = sectionRef.current
      if (!s) return
      const r = s.getBoundingClientRect()
      const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)))
      if (Math.abs(p - last) < 0.002) return
      last = p
      const n = PALABRAS.length
      refs.current.forEach((el, i) => {
        if (!el) return
        const v = Math.min(1, Math.max(0, p * (n + 6) - i))
        el.style.opacity = String(0.14 + v * 0.86)
      })
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(draw) }
    draw()
    addEventListener('scroll', onScroll, { passive: true })
    addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('scroll', onScroll)
      removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <section className="ed-manifiesto" ref={sectionRef}>
      <div className="ed-manifiesto-pin">
        <p className="ed-eyebrow">Manifiesto</p>
        <p className="ed-manifiesto-texto">
          {PALABRAS.map((p, i) => (
            <span
              key={i}
              ref={el => { refs.current[i] = el }}
              className={p.marcada ? 'ed-serif ed-celeste' : undefined}
            >
              {p.t}{' '}
            </span>
          ))}
        </p>
      </div>
    </section>
  )
}
