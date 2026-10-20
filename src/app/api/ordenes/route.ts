import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/ordenes?ref=CJA-... — la página de resultado consulta si el
// webhook ya registró la venta (no expone datos del cliente).
export async function GET(request: Request) {
  const ref = new URL(request.url).searchParams.get('ref')
  if (!ref) {
    return NextResponse.json({ error: 'Falta ref' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('ordenes')
    .select('status, venta_registrada')
    .eq('external_ref', ref)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ status: null, venta_registrada: false })
  }

  return NextResponse.json({
    status: data.status,
    venta_registrada: data.venta_registrada,
  })
}
