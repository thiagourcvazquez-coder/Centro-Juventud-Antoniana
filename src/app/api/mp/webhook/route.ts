import { NextResponse } from 'next/server'
import { WebhookSignatureValidator } from 'mercadopago'
import { createAdminClient } from '@/lib/supabase/admin'
import { mpPayment } from '@/lib/mercadopago'
import { env } from '@/lib/env'
import type { Orden } from '@/lib/types'

// MP envía el aviso como ?type=payment&data.id=123 o en el body JSON.
// También existe el formato viejo: ?topic=payment&id=123
async function extractPaymentId(request: Request): Promise<string | null> {
  const url = new URL(request.url)
  const q = url.searchParams
  const isPayment = q.get('type') === 'payment' || q.get('topic') === 'payment'
  const fromQuery = q.get('data.id') ?? q.get('id')
  if (isPayment && fromQuery) return fromQuery

  try {
    const body = await request.json()
    if (body?.type === 'payment' && body?.data?.id) return String(body.data.id)
  } catch {
    // body vacío o no-JSON: ya tenemos lo de la query
  }
  return null
}

export async function POST(request: Request) {
  const url = new URL(request.url)
  const dataId = url.searchParams.get('data.id')

  // Validación de firma (si está configurado el secreto en MP)
  const secret = env.mpWebhookSecret()
  if (secret) {
    try {
      WebhookSignatureValidator.validate({
        xSignature: request.headers.get('x-signature'),
        xRequestId: request.headers.get('x-request-id'),
        dataId,
        secret,
      })
    } catch {
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
    }
  } else {
    console.warn('[mp/webhook] MP_WEBHOOK_SECRET no configurado — sin validación de firma')
  }

  const paymentId = await extractPaymentId(request)
  if (!paymentId) {
    // Otros topics (merchant_order, etc.) no nos interesan: 200 para no reintentar
    return NextResponse.json({ ok: true })
  }

  const supabase = createAdminClient()

  let payment
  try {
    payment = await mpPayment().get({ id: Number(paymentId) })
  } catch (err) {
    console.error('[mp/webhook] no se pudo obtener el pago', paymentId, err)
    return NextResponse.json({ error: 'payment fetch failed' }, { status: 502 })
  }

  const externalRef = payment.external_reference
  if (!externalRef) return NextResponse.json({ ok: true })

  const { data: orden } = await supabase
    .from('ordenes')
    .select('*')
    .eq('external_ref', externalRef)
    .maybeSingle()

  if (!orden) return NextResponse.json({ ok: true })

  const o = orden as Orden

  // Idempotente: si la venta ya se registró, no hacer nada
  if (o.venta_registrada && payment.status === 'approved') {
    return NextResponse.json({ ok: true })
  }

  const mpFields = {
    mp_payment_id: String(payment.id),
    mp_status: payment.status ?? null,
  }

  if (payment.status === 'approved') {
    // Registrar la venta con el RPC existente (crea la venta, sus items
    // y descuenta el stock — la misma lógica que usaba el sitio estático).
    const { error } = await supabase.rpc('registrar_venta', {
      p_cliente_id: null,
      p_nombre_cliente: o.nombre_cliente,
      p_email_cliente: o.email_cliente,
      p_tel_cliente: o.tel_cliente,
      p_dni_cliente: o.dni_cliente,
      p_metodo_pago: 'mercadopago',
      p_desc_socio: o.descuento_socio,
      p_codigo_socio: o.codigo_socio,
      p_items: o.items,
      p_mp_payment_id: String(payment.id),
      p_mp_status: payment.status ?? null,
      p_external_ref: externalRef,
    })

    if (error) {
      console.error('[mp/webhook] registrar_venta falló:', error)
      // 500 para que MP reintente el webhook
      return NextResponse.json({ error: 'registrar_venta failed' }, { status: 500 })
    }

    await supabase
      .from('ordenes')
      .update({ ...mpFields, status: 'aprobada', venta_registrada: true })
      .eq('id', o.id)
  } else if (
    payment.status === 'rejected' ||
    payment.status === 'cancelled' ||
    payment.status === 'refunded' ||
    payment.status === 'charged_back'
  ) {
    await supabase
      .from('ordenes')
      .update({
        ...mpFields,
        status: payment.status === 'rejected' ? 'rechazada' : 'cancelada',
      })
      .eq('id', o.id)
  } else {
    // pending / in_process: medios de pago diferidos (efectivo, etc.)
    await supabase
      .from('ordenes')
      .update({ ...mpFields, status: 'pendiente' })
      .eq('id', o.id)
  }

  return NextResponse.json({ ok: true })
}
