'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'

type ToastCtx = { mostrarToast: (msg: string) => void }

const Ctx = createContext<ToastCtx>({ mostrarToast: () => {} })

export function useToast() {
  return useContext(Ctx)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [mensaje, setMensaje] = useState('')
  const [visible, setVisible] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mostrarToast = useCallback((msg: string) => {
    setMensaje(msg)
    setVisible(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setVisible(false), 2500)
  }, [])

  return (
    <Ctx.Provider value={{ mostrarToast }}>
      {children}
      <div id="toast" className={`toast${visible ? ' visible' : ''}`}>
        {mensaje}
      </div>
    </Ctx.Provider>
  )
}
