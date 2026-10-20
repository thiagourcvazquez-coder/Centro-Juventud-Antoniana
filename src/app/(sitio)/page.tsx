import BienvenidaScroll from '@/components/BienvenidaScroll'
import SociosScroll from '@/components/SociosScroll'
import Manifiesto from '@/components/home/Manifiesto'
import Cifras from '@/components/home/Cifras'
import ProximoPartido from '@/components/home/ProximoPartido'
import Disciplinas from '@/components/home/Disciplinas'
import Explora from '@/components/home/Explora'
import TiendaTeaser from '@/components/home/TiendaTeaser'
import { getProductos } from '@/lib/productos'
import { getJuventudMatches } from '@/lib/stats'

// Partidos y catálogo se leen en cada request (resultados en vivo / stock).
export const dynamic = 'force-dynamic'

const EMPRENDIMIENTOS = [
  'Puna Rentals', 'Nardini SRL', 'Abril Frutos Secos',
  'Del Vino Hotel Boutique', "Las Mascio's Boutique", 'Zeus Peluquería',
  'Emele Sublimación', 'MZ Construcciones', 'El Mister Plays',
  'Barbería Castillo', 'Tienda La Fortuna', 'SIGSAS', 'Taller Automotores',
  'SE Beautique', 'Ferretería Gay', 'Sandwichería Chanchín', 'SALTALAC',
  'M&M Celulares', 'Cristian Celulares', 'SNS Suplementos',
  'Guzmán Repuestos', 'Mapache Bar', 'Barú Tienda Saludable',
  'Súper Casino', 'Ricardo Martin Mecánica',
]

export default async function Home() {
  const [productos, { next, last }] = await Promise.all([
    getProductos(),
    getJuventudMatches(),
  ])

  return (
    <>
      <BienvenidaScroll />

      <div className="ed-marquee" aria-hidden>
        <div className="ed-marquee-track">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i}>Tres colores <em>una pasión</em> <b>✦</b></span>
          ))}
        </div>
      </div>

      <Manifiesto />
      <Cifras />
      <ProximoPartido next={next} last={last} />
      <Disciplinas />
      <TiendaTeaser productos={productos} />
      <Explora />

      <section id="socios">
        <SociosScroll />

        <div className="section">
          <div className="socios-box">
            <h3>Comercios adheridos con beneficios</h3>
            <div className="logos-wrapper">
              <div className="logos-track">
                {[...EMPRENDIMIENTOS, ...EMPRENDIMIENTOS].map((nombre, i) => (
                  <div className="logo-slide" key={`${nombre}-${i}`}>
                    <img
                      src={`/images/emprendimiento${(i % EMPRENDIMIENTOS.length) + 1}.webp`}
                      alt={nombre}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ed-visita">
        <div className="ed-visita-col" data-rv>
          <p className="ed-eyebrow">Visitanos</p>
          <h2 className="ed-titulo">
            Horarios de <span className="ed-serif ed-celeste">secretaría</span>
          </h2>
          <ul className="ed-horarios">
            <li><span>Lunes a viernes</span><b>9:00 — 18:00</b></li>
            <li><span>Sábados</span><b>9:00 — 13:00</b></li>
            <li><span>Domingos</span><b className="ed-muted">Cerrado</b></li>
          </ul>
        </div>
        <div className="ed-visita-videos" data-rv>
          <video src="/videos/video-1.mp4" autoPlay muted loop playsInline />
          <video src="/videos/video-2.mp4" autoPlay muted loop playsInline />
        </div>
      </section>
    </>
  )
}
