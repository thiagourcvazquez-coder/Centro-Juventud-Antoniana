import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ProductoDetalle from '@/components/tienda/ProductoDetalle'
import { getProducto } from '@/lib/productos'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const producto = await getProducto(id)
  return {
    title: producto
      ? `${producto.nombre} | Tienda CJA`
      : 'Producto | Tienda CJA',
  }
}

export default async function ProductoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const producto = await getProducto(id)
  if (!producto) notFound()
  return <ProductoDetalle producto={producto} />
}
