import { createClient } from '@supabase/supabase-js'
import { env } from '../env'

// Service role: bypassea RLS. SOLO en rutas de API del servidor.
export function createAdminClient() {
  return createClient(env.supabaseUrl(), env.supabaseServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
