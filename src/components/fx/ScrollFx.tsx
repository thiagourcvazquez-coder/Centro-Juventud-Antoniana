'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

// Efectos globales: reveal al scrollear ([data-rv]) y barra de progreso.
export default function ScrollFx() {
  const pathname = usePathname()
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('rv-in')
          io.unobserve(e.target)
        }
      }),
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    )
    document.querySelectorAll('[data-rv]:not(.rv-in)').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [pathname])

  useEffect(() => {
    const bar = barRef.current
    let raf = 0
    const draw = () => {
      raf = 0
      const max = document.documentElement.scrollHeight - innerHeight
      if (bar) bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(draw) }
    draw()
    addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('scroll', onScroll)
    }
  }, [])

  return <div className="fx-progress" ref={barRef} aria-hidden />
}
