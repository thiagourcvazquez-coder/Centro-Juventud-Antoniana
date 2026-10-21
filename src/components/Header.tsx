'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ContactModal from './ContactModal'

const LINKS = [
  { href: '/', label: 'Inicio', img: '/images/bienvenida/pistoia-1.jpg' },
  { href: '/historia', label: 'Historia', img: '/images/plantel71.jpg' },
  { href: '/partidos', label: 'Partidos', img: '/images/ascenso.jpg' },
  { href: '/tienda', label: 'Tienda', img: '/images/tienda/camiseta-oficial-juventud-antoniana-t-2026/4.webp' },
  { href: '/polideportivo', label: 'Polideportivo', img: '/images/futsal2.jpg' },
  { href: '/#socios', label: 'Socios', img: '/images/bienvenida/banderas-pistoia.jpg' },
]

export default function Header() {
  const [menu, setMenu] = useState(false)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [activo, setActivo] = useState(0)

  useEffect(() => {
    document.body.style.overflow = menu ? 'hidden' : ''
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    addEventListener('keydown', esc)
    return () => {
      document.body.style.overflow = ''
      removeEventListener('keydown', esc)
    }
  }, [menu])

  const cerrar = () => setMenu(false)

  return (
    <>
      <header className="header">
        <Link href="/" className="logo" onClick={cerrar}>
          <img src="/images/escudo.png" alt="Escudo Juventud Antoniana" />
          <span>Juventud <em className="ed-serif">Antoniana</em></span>
        </Link>

        <nav className="nav-desk" aria-label="Principal">
          {LINKS.slice(1).map(l => (
            <Link key={l.href} href={l.href}>{l.label}</Link>
          ))}
          <button className="ed-btn ed-btn-sm" onClick={() => setModalAbierto(true)}>
            Comunicate
          </button>
        </nav>

        <button
          className={`menu-btn${menu ? ' abierto' : ''}`}
          aria-label={menu ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menu}
          onClick={() => setMenu(v => !v)}
        >
          <span>{menu ? 'Cerrar' : 'Menú'}</span>
          <i /><i />
        </button>
      </header>

      <div className={`menu-full${menu ? ' abierto' : ''}`} aria-hidden={!menu}>
        <ul>
          {LINKS.map((l, i) => (
            <li key={l.href} style={{ transitionDelay: menu ? `${120 + i * 55}ms` : '0ms' }}>
              <Link
                href={l.href}
                onClick={cerrar}
                onMouseEnter={() => setActivo(i)}
                tabIndex={menu ? 0 : -1}
                className={i === activo ? 'on' : ''}
              >
                <small>{String(i + 1).padStart(2, '0')}</small>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="menu-prev" aria-hidden>
          {LINKS.map((l, i) => (
            <img key={l.href} src={l.img} alt="" className={i === activo ? 'on' : ''} />
          ))}
        </div>
        <button
          className="ed-btn menu-cta"
          tabIndex={menu ? 0 : -1}
          onClick={() => { cerrar(); setModalAbierto(true) }}
        >
          Comunicate
        </button>
      </div>

      <ContactModal abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} />
    </>
  )
}
