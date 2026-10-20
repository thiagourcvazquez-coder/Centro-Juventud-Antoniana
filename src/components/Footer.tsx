import Link from 'next/link'

const REDES = [
  { n: 'Instagram', h: 'https://www.instagram.com/cjaoficial/?hl=es' },
  { n: 'Facebook', h: 'https://www.facebook.com/CJAOficial?locale=es_LA' },
  { n: 'X', h: 'https://x.com/CJAOficial' },
  { n: 'TikTok', h: 'https://www.tiktok.com/@cja.oficial' },
]

export default function Footer() {
  return (
    <footer className="footer ed-footer">
      <div className="ed-footer-top">
        <div>
          <p className="ed-eyebrow">Seguinos</p>
          <ul className="ed-footer-lista">
            {REDES.map(r => (
              <li key={r.n}>
                <a href={r.h} target="_blank" rel="noreferrer">{r.n} <span aria-hidden>↗</span></a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="ed-eyebrow">Navegá</p>
          <ul className="ed-footer-lista">
            <li><Link href="/historia">Historia</Link></li>
            <li><Link href="/partidos">Partidos</Link></li>
            <li><Link href="/tienda">Tienda</Link></li>
            <li><Link href="/polideportivo">Polideportivo</Link></li>
          </ul>
        </div>
        <div>
          <p className="ed-eyebrow">Secretaría</p>
          <ul className="ed-footer-lista ed-footer-chica">
            <li>Lun a Vie · 9 a 18 hs</li>
            <li>Sábados · 9 a 13 hs</li>
          </ul>
        </div>
      </div>

      <div className="ed-wordmark" aria-hidden>
        <span>Juventud</span>
        <span className="ed-serif">Antoniana</span>
      </div>

      <div className="ed-footer-bottom">
        <span>© 2026 Centro Juventud Antoniana</span>
        <span>Desde 1916 representando a estos colores</span>
      </div>
    </footer>
  )
}
