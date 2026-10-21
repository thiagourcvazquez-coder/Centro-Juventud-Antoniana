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
  IMAGEN_POR_NOMBRE,
  fmtPrecio,
} from '@/lib/constants'
import { useCart } from '@/context/CartContext'
import { useToast } from '@/context/ToastContext'
import Modelo3D from './Modelo3D'

function urlImagen(producto: Producto) {
  const imagenUrl = producto.imagen_url
  if (imagenUrl) {
    if (imagenUrl.startsWith('http') || imagenUrl.startsWith('/')) return imagenUrl
    return `/${imagenUrl}`
  }
  return IMAGEN_POR_NOMBRE[producto.nombre.toLowerCase()] ?? '/images/escudo.png'
}

export default function ProductoDetalle({ producto }: { producto: Producto }) {
  const tiene3d = Boolean(producto.modelo_3d)
  const tieneFoto = Boolean(producto.imagen_url)
  const [vista, setVista] = useState<'3d' | 'foto'>(tiene3d ? '3d' : 'foto')
  const [talleSel, setTalleSel] = useState<Talle | null>(null)
  const { agregar } = useCart()
  const { mostrarToast } = useToast()

  const stockTalle = (t: Talle) =>
    Number(producto[STOCK_COL[t] as keyof Producto] ?? 0)

  const imagen = urlImagen(producto)
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
    <section className="pd">
      <nav className="pd-miga">
        <Link href="/tienda">Tienda</Link>
        <span>/</span>
        <span>{producto.nombre}</span>
      </nav>

      <div className="pd-grid">
        <div className="pd-media">
          {vista === '3d' && tiene3d ? (
            <Modelo3D src={producto.modelo_3d!} zoom />
          ) : (
            <img className="pd-foto" src={imagen} alt={producto.nombre} />
          )}
          {tiene3d && tieneFoto && (
            <div className="pd-tabs">
              <button
                className={vista === '3d' ? 'activo' : ''}
                onClick={() => setVista('3d')}
              >
                Vista 3D
              </button>
              <button
                className={vista === 'foto' ? 'activo' : ''}
                onClick={() => setVista('foto')}
              >
                Foto
              </button>
            </div>
          )}
        </div>

        <div className="pd-info">
          <p className="ed-eyebrow">Tienda oficial</p>
          <h1 className="pd-nombre">{producto.nombre}</h1>
          <p className="pd-precio">${fmtPrecio(producto.precio_base)}</p>

          {conDescuento && (
            <p className="pd-descuento">
              🏷️ Con descuento: ${fmtPrecio(precioFinal)}
            </p>
          )}

          {producto.tiene_talle && (
            <div className="pd-talles">
              <span className="pd-label">Talle</span>
              <div className="talles-selector">
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
            </div>
          )}

          {sinStock ? (
            <button className="btn-agregar" disabled style={{ opacity: 0.5 }}>
              Sin stock
            </button>
          ) : (
            <button className="btn-agregar" onClick={agregarAlCarrito}>
              Agregar al carrito
            </button>
          )}

          <p className="pd-nota">
            Socios: ingresá tu código en el carrito para el descuento.
          </p>
        </div>
      </div>
    </section>
  )
}
