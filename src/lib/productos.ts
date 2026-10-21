import { createPublicClient } from '@/lib/supabase/public'
import type { Producto } from '@/lib/types'

export async function getProductos(): Promise<Producto[]> {
  try {
    const supabase = createPublicClient()
    const query = supabase.from('productos').select('*').eq('activo', true)
    const { data, error } = await Promise.race([
      query,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout Supabase')), 8000)
      ),
    ])
    if (error) {
      console.error('[productos] error cargando productos:', error)
      return []
    }
    return (data ?? []) as Producto[]
  } catch (err) {
    console.error('[productos] fetch a Supabase falló:', err)
    return []
  }
}

export async function getProducto(id: string): Promise<Producto | null> {
  try {
    const supabase = createPublicClient()
    const query = supabase
      .from('productos')
      .select('*')
      .eq('id', id)
      .eq('activo', true)
      .maybeSingle()
    const { data, error } = await Promise.race([
      query,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout Supabase')), 8000)
      ),
    ])
    if (error) {
      console.error('[productos] error cargando producto:', error)
      return null
    }
    return data as Producto | null
  } catch (err) {
    console.error('[productos] fetch a Supabase falló:', err)
    return null
  }
}
