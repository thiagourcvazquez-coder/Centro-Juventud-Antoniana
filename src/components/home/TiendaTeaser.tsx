import Link from 'next/link'
import type { Producto } from '@/lib/types'

export default function TiendaTeaser({ productos }: { productos: Producto[] }) {
  const fotos = productos.filter(p => p.imagen_url).slice(0, 4)

  return (
    <section className="ed-teaser">
      <div className="ed-teaser-copy" data-rv>
        <p className="ed-eyebrow">Tienda oficial</p>
        <h2 className="ed-titulo">
          Llevá el <span className="ed-serif ed-celeste">Santo</span> puesto
        </h2>
        <p className="ed-teaser-p">
          Camisetas, camperas y accesorios oficiales. Descuento para socios con tu código.
        </p>
        <Link href="/tienda" className="ed-btn">
          Ir a la tienda <span aria-hidden>→</span>
        </Link>
      </div>
      <div className="ed-teaser-fotos" aria-hidden>
        {fotos.map((p, i) => (
          <img
            key={p.id}
            src={p.imagen_url!}
            alt=""
            data-rv
            style={{ transitionDelay: `${i * 90}ms` }}
            className={`ed-teaser-f f${i + 1}`}
            loading="lazy"
          />
        ))}
      </div>
    </section>
  )
}
