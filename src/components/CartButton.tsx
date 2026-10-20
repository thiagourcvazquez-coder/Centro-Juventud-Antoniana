'use client'

import { useCart } from '@/context/CartContext'

export default function CartButton() {
  const { cantidadTotal, abrirCarrito, bump } = useCart()

  return (
    <div className={`carrito${bump ? ' bump' : ''}`} onClick={abrirCarrito}>
      🛒 <span id="contador">{cantidadTotal}</span>
    </div>
  )
}
