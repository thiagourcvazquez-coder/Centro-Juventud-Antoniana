'use client'

import { useState } from 'react'
import { useCart, precioItem } from '@/context/CartContext'
import { useToast } from '@/context/ToastContext'
import {
  DESCUENTO_TALLE,
  TALLES_CON_DESCUENTO,
  fmtPrecio,
} from '@/lib/constants'

export default function CartPanel() {
  const {
    items,
    cambiarCantidad,
    eliminar,
    cantidadTotal,
    subtotal,
    total,
    descuentoSocio,
    aplicarDescuentoSocio,
    abierto,
    cerrarCarrito,
  } = useCart()
  const { mostrarToast } = useToast()

  const [cliente, setCliente] = useState({
    nombre: '',
    email: '',
    telefono: '',
    dni: '',
  })
  const [codigoInput, setCodigoInput] = useState('')
  const [verificandoCodigo, setVerificandoCodigo] = useState(false)
  const [pagando, setPagando] = useState(false)

  const ahorroSocio = descuentoSocio.aplicado ? subtotal - total : 0

  async function aplicarCodigo() {
    if (descuentoSocio.aplicado) {
      mostrarToast('Ya tenés el descuento de socio aplicado ✅')
      return
    }
    const codigo = codigoInput.trim()
    if (!codigo) {
      mostrarToast('Ingresá un código de socio')
      return
    }
    setVerificandoCodigo(true)
    const valido = await fetch('/api/codigo-socio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo }),
    })
      .then(r => r.json())
      .then(d => d.valido === true)
      .catch(() => false)
    setVerificandoCodigo(false)

    if (!valido) {
      mostrarToast('❌ Código inválido o no existe')
      return
    }
    aplicarDescuentoSocio(codigo)
    setCodigoInput('')
    mostrarToast('✅ Descuento de socio del 10% aplicado')
  }

  async function pagar() {
    if (items.length === 0) {
      mostrarToast('Tu carrito está vacío')
      return
    }
    if (pagando) return

    if (!cliente.nombre || !cliente.email || !cliente.telefono || !cliente.dni) {
      mostrarToast('⚠️ Completá todos tus datos de contacto')
      return
    }

    setPagando(true)
    mostrarToast('Conectando con Mercado Pago...')

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(p => ({
            producto_id: p.productoId,
            talle: p.talle,
            cantidad: p.cantidad,
          })),
          cliente: {
            nombre: cliente.nombre.trim(),
            email: cliente.email.trim(),
            telefono: cliente.telefono.trim(),
            dni: cliente.dni.trim(),
          },
          codigo_socio: descuentoSocio.aplicado ? descuentoSocio.codigo : null,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.init_point) {
        console.error('Error checkout:', data)
        mostrarToast(`⚠️ ${data.error ?? 'Error al conectar con Mercado Pago'}`)
        return
      }

      window.location.href = data.init_point
    } catch (err) {
      console.error('Error inesperado:', err)
      mostrarToast('⚠️ Error de conexión')
    } finally {
      setPagando(false)
    }
  }

  return (
    <div id="panel-carrito" className={`panel-carrito${abierto ? ' abierto' : ''}`}>
      <div className="carrito-header">
        <h2>TU CARRITO</h2>
        <span id="cantidad-productos" className="carrito-cantidad">
          {cantidadTotal} producto{cantidadTotal !== 1 ? 's' : ''}
        </span>
        <button className="carrito-cerrar-btn" onClick={cerrarCarrito}>
          ✕
        </button>
      </div>

      <p className="carrito-aviso">
        Los artículos en tu carrito no están reservados.
      </p>

      <div id="lista-carrito">
        {items.length === 0 ? (
          <p className="carrito-vacio">Tu carrito está vacío 🛒</p>
        ) : (
          items.map((producto, index) => {
            const precioUnit = precioItem(producto)
            const tuvoDescuento =
              producto.talle && TALLES_CON_DESCUENTO.includes(producto.talle)
            return (
              <div className="item-carrito" key={`${producto.productoId}-${producto.talle}`}>
                <div className="item-imagen">
                  <img
                    src={producto.imagen}
                    alt={producto.nombre}
                    onError={e => {
                      e.currentTarget.src = '/images/escudo.png'
                    }}
                  />
                </div>
                <div className="item-info">
                  <p className="item-nombre">{producto.nombre}</p>
                  <p className="item-precio-unit">
                    ${fmtPrecio(precioUnit)} c/u
                  </p>
                  {tuvoDescuento && (
                    <p className="item-descuento-talle-badge">
                      🏷️ −${fmtPrecio(DESCUENTO_TALLE)} por talle
                    </p>
                  )}
                  <div className="item-cantidad-controls">
                    <button
                      className="btn-cant"
                      onClick={() => cambiarCantidad(index, -1)}
                    >
                      −
                    </button>
                    <span className="item-cantidad">x{producto.cantidad}</span>
                    <button
                      className="btn-cant"
                      onClick={() => cambiarCantidad(index, 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="item-derecha">
                  <button
                    className="btn-eliminar"
                    onClick={() => {
                      eliminar(index)
                      mostrarToast(`"${producto.nombre}" eliminado del carrito`)
                    }}
                  >
                    🗑
                  </button>
                  <p className="item-subtotal">
                    ${fmtPrecio(precioUnit * producto.cantidad)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="carrito-resumen">
        <h3>RESUMEN DEL PEDIDO</h3>
        <div className="resumen-fila">
          <span>Subtotal</span>
          <span>
            $<span id="subtotal">{fmtPrecio(subtotal)}</span>
          </span>
        </div>
        <div className="resumen-fila">
          <span>Entrega</span>
          <span className="gratis">Gratis</span>
        </div>
        <div
          className="resumen-fila"
          id="fila-descuento-socio"
          style={{ display: descuentoSocio.aplicado ? 'flex' : 'none' }}
        >
          <span>Descuento socio (10%)</span>
          <span className="descuento-monto">
            −$<span id="monto-descuento-socio">{fmtPrecio(ahorroSocio)}</span>
          </span>
        </div>
        <div className="resumen-fila total-fila">
          <span>Total</span>
          <span>
            $<span id="total">{fmtPrecio(total)}</span>
          </span>
        </div>
      </div>

      <div className="datos-cliente">
        <h3>Datos de contacto</h3>
        <input
          type="text"
          id="cliente-nombre"
          placeholder="Nombre completo"
          autoComplete="name"
          value={cliente.nombre}
          onChange={e => setCliente({ ...cliente, nombre: e.target.value })}
        />
        <input
          type="email"
          id="cliente-email"
          placeholder="Correo electrónico"
          autoComplete="email"
          value={cliente.email}
          onChange={e => setCliente({ ...cliente, email: e.target.value })}
        />
        <input
          type="tel"
          id="cliente-telefono"
          placeholder="WhatsApp (Ej: 3873...)"
          autoComplete="tel"
          value={cliente.telefono}
          onChange={e => setCliente({ ...cliente, telefono: e.target.value })}
        />
        <input
          type="text"
          id="cliente-dni"
          placeholder="DNI"
          value={cliente.dni}
          onChange={e => setCliente({ ...cliente, dni: e.target.value })}
        />
      </div>

      <div className="pagos">
        <div className="codigo-socio-wrapper">
          <input
            type="text"
            id="input-codigo-socio"
            placeholder="Código de socio"
            autoComplete="off"
            value={codigoInput}
            onChange={e => setCodigoInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') aplicarCodigo()
            }}
          />
          <button onClick={aplicarCodigo} disabled={verificandoCodigo}>
            {verificandoCodigo ? 'Verificando...' : '🎟 Aplicar'}
          </button>
        </div>
        <button onClick={pagar} disabled={pagando}>
          {pagando ? 'Procesando...' : 'Ir a Pagar'}
        </button>
      </div>
    </div>
  )
}
