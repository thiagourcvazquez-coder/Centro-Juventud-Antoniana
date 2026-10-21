'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Producto } from '@/lib/types'
import type { Talle } from '@/lib/constants'
import {
  TALLES,
  TALLES_CON_DESCUENTO,
  DESCUENTO_TALLE,
  STOCK_COL,
  fmtPrecio,
} from '@/lib/constants'
import { datosProducto } from '@/lib/catalogo'
import { useCart } from '@/context/CartContext'
import { useToast } from '@/context/ToastContext'

export default function ProductCard({ producto }: { producto: Producto }) {
  const [talleSel, setTalleSel] = useState<Talle | null>(null)
  const { agregar } = useCart()
  const { mostrarToast } = useToast()

  const stockTalle = (t: Talle) =>
    Number(producto[STOCK_COL[t] as keyof Producto] ?? 0)

  const { imagen, modelo } = datosProducto(producto)
  const tallesDisponibles = TALLES.filter(t => stockTalle(t) > 0)
  const sinStock = producto.tiene_talle
    ? tallesDisponibles.length === 0
    : Number(producto.stock_sin_talle ?? 0) <= 0

  const conDescuento =
    talleSel !== null && TALLES_CON_DESCUENTO.includes(talleSel)
  const precioFinal = conDescuento
    ? Math.max(0, producto.precio_base - DESCUENTO_TALLE)
    : producto.precio_base

  function agregarAlCarrito() {
    if (producto.tiene_talle && !talleSel) {
      mostrarToast('Seleccioná un talle antes de agregar')
      return
    }
    agregar({
      productoId: producto.id,
      nombreBase: producto.nombre,
      nombre: talleSel ? `${producto.nombre} — ${talleSel}` : producto.nombre,
      talle: talleSel,
      precioBase: producto.precio_base,
      imagen,
    })
    mostrarToast(`"${producto.nombre}" agregado al carrito`)
  }

  return (
    <div className="card">
      <Link href={`/tienda/${producto.id}`} className="card-link">
        <div className="card-media">
          <img src={imagen} alt={producto.nombre} />
          {modelo && <span className="card-badge3d">3D</span>}
        </div>
        <h3>{producto.nombre}</h3>
        <p className="precio-base" data-precio={producto.precio_base}>
          ${fmtPrecio(producto.precio_base)}
        </p>
      </Link>

      {producto.tiene_talle && (
        <div className="talles-selector" data-tiene-talle="true">
          {TALLES.map(t => (
            <button
              key={t}
              className={`talle${talleSel === t ? ' seleccionado' : ''}`}
              disabled={stockTalle(t) <= 0}
              style={
                stockTalle(t) <= 0
                  ? { opacity: 0.3, cursor: 'not-allowed', textDecoration: 'line-through' }
                  : undefined
              }
              onClick={() => setTalleSel(t)}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <p
        className="precio-descuento-talle"
        style={{ display: conDescuento ? 'block' : 'none' }}
      >
        🏷️ Con descuento: $
        <span className="precio-final-talle">{fmtPrecio(precioFinal)}</span>
      </p>

      {sinStock ? (
        <button className="btn-agregar" disabled style={{ opacity: 0.5 }}>
          Sin stock
        </button>
      ) : (
        <button className="btn-agregar" onClick={agregarAlCarrito}>
          Agregar al carrito
        </button>
      )}
    </div>
  )
}
