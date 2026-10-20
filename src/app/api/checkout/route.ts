import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { mpPreference } from '@/lib/mercadopago'
import { env } from '@/lib/env'
import {
  STOCK_COL,
  TALLES,
  TALLES_CON_DESCUENTO,
  DESCUENTO_TALLE,
  DESCUENTO_SOCIO,
} from '@/lib/constants'
import type { ItemOrden, Producto } from '@/lib/types'

const itemSchema = z.object({
  producto_id: z.union([z.string().min(1), z.number()]).transform(String),
  talle: z.enum(TALLES).nullable(),
  cantidad: z.number().int().min(1).max(99),
})

const checkoutSchema = z.object({
  items: z.array(itemSchema).min(1).max(50),
  cliente: z.object({
    nombre: z.string().trim().min(2, 'Ingresá tu nombre').max(80),
    email: z.email('Email inválido').max(120),
    telefono: z
      .string()
      .trim()
      .transform(s => s.replace(/\D/g, ''))
      .pipe(z.string().min(8, 'Ingresá un teléfono válido').max(15)),
    dni: z
      .string()
      .trim()
      .transform(s => s.replace(/\D/g, ''))
      .pipe(z.string().min(6, 'Ingresá un DNI válido').max(12)),
  }),
  codigo_socio: z.string().trim().max(50).nullable().optional(),
})

export async function POST(request: Request) {
  const parsed = checkoutSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
      { status: 400 },
    )
  }
  const { items, cliente, codigo_socio } = parsed.data

  const supabase = createAdminClient()

  // 1. Traer los productos reales de la DB — nunca confiar en precios del cliente
  const ids = [...new Set(items.map(i => i.producto_id))]
  const { data: productos, error: errProd } = await supabase
    .from('productos')
    .select('*')
    .in('id', ids)
    .eq('activo', true)

  if (errProd) {
    console.error('[checkout] error cargando productos:', errProd)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }

  const porId = new Map((productos ?? []).map(p => [String(p.id), p as Producto]))

  // 2. Validar stock y armar los items con precios reales
  const itemsOrden: ItemOrden[] = []
  for (const item of items) {
    const producto = porId.get(item.producto_id)
    if (!producto) {
      return NextResponse.json(
        { error: 'Uno de los productos ya no está disponible.' },
        { status: 409 },
      )
    }

    let descuentoTalle = 0
    if (producto.tiene_talle) {
      if (!item.talle) {
        return NextResponse.json(
          { error: `"${producto.nombre}" requiere elegir un talle.` },
          { status: 400 },
        )
      }
      const stock = Number(producto[STOCK_COL[item.talle] as keyof Producto] ?? 0)
      if (stock < item.cantidad) {
        return NextResponse.json(
          { error: `Sin stock suficiente de "${producto.nombre}" talle ${item.talle}.` },
          { status: 409 },
        )
      }
      if (TALLES_CON_DESCUENTO.includes(item.talle)) {
        descuentoTalle = DESCUENTO_TALLE
      }
    } else {
      if (Number(producto.stock_sin_talle ?? 0) < item.cantidad) {
        return NextResponse.json(
          { error: `Sin stock suficiente de "${producto.nombre}".` },
          { status: 409 },
        )
      }
    }

    itemsOrden.push({
      producto_id: producto.id,
      talle: item.talle ?? 'sin_talle',
      cantidad: item.cantidad,
      precio_base: producto.precio_base,
      descuento_talle: descuentoTalle,
    })
  }

  // 3. Validar código de socio server-side
  let codigoSocio: string | null = null
  if (codigo_socio) {
    const { data: codigo } = await supabase
      .from('codigos_socio')
      .select('codigo')
      .eq('codigo', codigo_socio)
      .eq('activo', true)
      .maybeSingle()
    if (!codigo) {
      return NextResponse.json(
        { error: 'El código de socio es inválido o está inactivo.' },
        { status: 400 },
      )
    }
    codigoSocio = codigo.codigo
  }

  const descuentoSocio = codigoSocio !== null

  // 4. Crear la orden pendiente
  const externalRef = `CJA-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 7)
    .toUpperCase()}`

  const total = itemsOrden.reduce((s, i) => {
    const unit = Math.max(0, i.precio_base - i.descuento_talle)
    const unitFinal = descuentoSocio
      ? Math.round(unit * (1 - DESCUENTO_SOCIO))
      : unit
    return s + unitFinal * i.cantidad
  }, 0)

  const { data: orden, error: errOrden } = await supabase
    .from('ordenes')
    .insert({
      external_ref: externalRef,
      status: 'pendiente',
      nombre_cliente: cliente.nombre,
      email_cliente: cliente.email,
      tel_cliente: cliente.telefono,
      dni_cliente: cliente.dni,
      items: itemsOrden,
      descuento_socio: descuentoSocio,
      codigo_socio: codigoSocio,
      total,
    })
    .select('id')
    .single()

  if (errOrden || !orden) {
    console.error('[checkout] no se pudo crear la orden:', errOrden)
    return NextResponse.json(
      { error: 'No se pudo crear la orden.' },
      { status: 500 },
    )
  }

  // 5. Crear la preferencia de Mercado Pago
  const siteUrl = env.siteUrl()
  const resultUrl = `${siteUrl}/pago/resultado`

  try {
    const pref = await mpPreference().create({
      body: {
        items: itemsOrden.map(i => {
          const producto = porId.get(String(i.producto_id))!
          const unit = Math.max(0, i.precio_base - i.descuento_talle)
          return {
            id: String(i.producto_id),
            title:
              i.talle !== 'sin_talle'
                ? `${producto.nombre} — ${i.talle}`
                : producto.nombre,
            quantity: i.cantidad,
            unit_price: descuentoSocio
              ? Math.round(unit * (1 - DESCUENTO_SOCIO))
              : unit,
            currency_id: 'ARS',
          }
        }),
        payer: {
          name: cliente.nombre,
          email: cliente.email,
          phone: { number: cliente.telefono },
          identification: { type: 'DNI', number: cliente.dni },
        },
        external_reference: externalRef,
        back_urls: {
          success: resultUrl,
          pending: resultUrl,
          failure: resultUrl,
        },
        auto_return: 'approved',
        notification_url: `${siteUrl}/api/mp/webhook`,
        statement_descriptor: 'CJA INDUMENTARIA',
      },
    })

    await supabase
      .from('ordenes')
      .update({ mp_preference_id: pref.id ?? null })
      .eq('id', orden.id)

    const initPoint = pref.init_point ?? pref.sandbox_init_point
    if (!initPoint) {
      return NextResponse.json(
        { error: 'Mercado Pago no devolvió el link de pago.' },
        { status: 502 },
      )
    }

    return NextResponse.json(
      { external_ref: externalRef, init_point: initPoint },
      { status: 201 },
    )
  } catch (err) {
    await supabase.from('ordenes').update({ status: 'cancelada' }).eq('id', orden.id)
    const msg = err instanceof Error ? err.message : 'Error de Mercado Pago'
    console.error('[checkout] error creando preferencia:', err)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
