'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'

type Estado = 'aprobado' | 'pendiente' | 'rechazado'

const UI: Record<
  Estado,
  { clase: string; icono: string; titulo: string; lineas: string[] }
> = {
  aprobado: {
    clase: 'estado-aprobado',
    icono: '✅',
    titulo: '¡Pago aprobado!',
    lineas: [
      'Tu compra fue procesada correctamente. Nos pondremos en contacto para coordinar la entrega.',
    ],
  },
  pendiente: {
    clase: 'estado-pendiente',
    icono: '⏳',
    titulo: 'Pago pendiente',
    lineas: [
      'Tu pago está siendo procesado. Puede demorar hasta 2 días hábiles en acreditarse.',
      'Te avisaremos por email cuando se confirme. Guardá tu número de pago por si lo necesitás.',
    ],
  },
  rechazado: {
    clase: 'estado-rechazado',
    icono: '❌',
    titulo: 'Pago rechazado',
    lineas: [
      'Tu pago no pudo procesarse. Podés intentarlo de nuevo o usar otro método de pago.',
      'Tu carrito sigue guardado, no perdiste nada.',
    ],
  },
}

export default function ResultadoPago({
  estado,
  paymentId,
  externalRef,
}: {
  estado: Estado
  paymentId: string | null
  externalRef: string | null
}) {
  const { vaciar } = useCart()
  const [estadoRegistro, setEstadoRegistro] = useState('')
  const ui = UI[estado]

  // Si el pago se aprobó, limpiamos el carrito y verificamos que el
  // webhook ya haya registrado la venta en la base de datos.
  useEffect(() => {
    if (estado !== 'aprobado') return

    vaciar()

    if (!externalRef) return
    let intentos = 0
    let cancelado = false

    const consultar = async () => {
      try {
        const res = await fetch(
          `/api/ordenes?ref=${encodeURIComponent(externalRef)}`,
        )
        const data = await res.json()
        if (cancelado) return
        if (data.venta_registrada) {
          setEstadoRegistro('✅ Compra registrada correctamente')
          return
        }
      } catch {
        // seguimos reintentando
      }
      if (!cancelado && ++intentos < 6) {
        setEstadoRegistro('Registrando tu compra...')
        setTimeout(consultar, 3000)
      } else if (!cancelado) {
        setEstadoRegistro(
          'Tu pago está confirmado. La compra se registra automáticamente.',
        )
      }
    }

    setEstadoRegistro('Registrando tu compra...')
    consultar()
    return () => {
      cancelado = true
    }
  }, [estado, externalRef, vaciar])

  const colorEstado =
    estado === 'aprobado' ? '#28a745' : estado === 'pendiente' ? '#f59e0b' : '#e53935'

  return (
    <div className="resultado-pago">
      <div className={`resultado-box ${ui.clase}`}>
        <div className="resultado-icono">{ui.icono}</div>
        <h1>{ui.titulo}</h1>
        {ui.lineas.map((l, i) => (
          <p key={i}>{l}</p>
        ))}

        <div className="resultado-detalle" id="detalle-pago">
          <p>
            Estado:{' '}
            <strong style={{ color: colorEstado }}>
              {estado === 'aprobado'
                ? 'Aprobado ✓'
                : estado === 'pendiente'
                  ? 'Pendiente ⏳'
                  : 'Rechazado'}
            </strong>
          </p>
          {paymentId && (
            <p>
              N° de pago: <strong>{paymentId}</strong>
            </p>
          )}
          {externalRef && (
            <p>
              Referencia: <strong>{externalRef}</strong>
            </p>
          )}
        </div>

        <p className="estado-registro">{estadoRegistro}</p>

        <Link href="/tienda" className="btn-volver">
          ← Volver a la tienda
        </Link>
      </div>
    </div>
  )
}
