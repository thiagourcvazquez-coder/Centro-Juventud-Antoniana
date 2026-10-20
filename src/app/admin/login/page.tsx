'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [cargando, setCargando] = useState(false)

  async function login() {
    if (cargando) return
    setCargando(true)
    setError(false)

    const sb = createClient()
    const { error: err } = await sb.auth.signInWithPassword({ email, password })

    setCargando(false)
    if (err) {
      setError(true)
      return
    }
    router.push('/admin')
    router.refresh()
  }

  return (
    <div id="login-screen">
      <div className="login-box">
        <div className="login-logo">
          <img src="/images/escudo.png" alt="CJA" />
          <span>Centro Juventud Antoniana</span>
        </div>
        <h2>Panel de Administración</h2>
        <label>Email</label>
        <input
          type="email"
          placeholder="admin@cja.com"
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
        />
        <label>Contraseña</label>
        <input
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
        />
        <button className="btn-login" onClick={login} disabled={cargando}>
          {cargando ? 'Ingresando...' : 'Iniciar Sesión'}
        </button>
        <p className="login-error" style={{ display: error ? 'block' : 'none' }}>
          Email o contraseña incorrectos
        </p>
      </div>
    </div>
  )
}
