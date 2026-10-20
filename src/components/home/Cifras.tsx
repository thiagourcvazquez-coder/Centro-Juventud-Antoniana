'use client'

import { useEffect, useRef, useState } from 'react'

const CIFRAS = [
  { n: 110, suf: '', label: 'años de historia' },
  { n: 44, suf: '', label: 'partidos invicto' },
  { n: 2, suf: '×', label: 'campeón Argentino A' },
  { n: 6, suf: '', label: 'nacionales jugados' },
]

function Numero({ n, suf, activo }: { n: number; suf: string; activo: boolean }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!activo) return
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1600)
      setV(Math.round(n * (1 - Math.pow(1 - p, 4))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [activo, n])
  return <>{v}{suf}</>
}

export default function Cifras() {
  const ref = useRef<HTMLDivElement>(null)
  const [activo, setActivo] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setActivo(true); io.disconnect() }
    }, { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section className="ed-cifras" ref={ref}>
      {CIFRAS.map(c => (
        <div className="ed-cifra" key={c.label}>
          <span className="ed-cifra-num"><Numero n={c.n} suf={c.suf} activo={activo} /></span>
          <span className="ed-cifra-label">{c.label}</span>
        </div>
      ))}
    </section>
  )
}
