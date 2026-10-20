import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

const Body = z.object({ codigo: z.string().trim().min(1).max(64) })

// Valida un código de socio sin exponer la tabla al navegador.
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ valido: false }, { status: 400 })

  const { data, error } = await createAdminClient()
    .from('codigos_socio')
    .select('codigo')
    .eq('codigo', parsed.data.codigo)
    .eq('activo', true)
    .maybeSingle()

  if (error) return NextResponse.json({ valido: false }, { status: 500 })
  return NextResponse.json({ valido: !!data })
}
