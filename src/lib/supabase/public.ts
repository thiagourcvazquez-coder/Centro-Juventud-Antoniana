import { createClient } from '@supabase/supabase-js'
import { env } from '../env'

// Cliente anónimo para lecturas públicas del lado del servidor
// (catálogo de productos). Respeta RLS.
export function createPublicClient() {
  return createClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
