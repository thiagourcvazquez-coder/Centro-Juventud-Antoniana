import type { Metadata } from 'next'
import TiendaSection from '@/components/tienda/TiendaSection'
import { getProductos } from '@/lib/productos'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tienda oficial | Centro Juventud Antoniana',
  description: 'Indumentaria oficial del Santo: camisetas, camperas y accesorios.',
}

export default async function Tienda() {
  const productos = await getProductos()

  return (
    <>
      <section className="ed-pagehero">
        <p className="ed-eyebrow">Tienda oficial</p>
        <h1 className="ed-gigante">
          Vestí<br /><span className="ed-serif ed-celeste">el santo</span>
        </h1>
        <p className="ed-pagehero-p">
          Indumentaria oficial de Juventud Antoniana. Socios: ingresá tu código en el carrito y obtené tu descuento.
        </p>
      </section>
      <TiendaSection productos={productos} />
    </>
  )
}
