'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ItemCarrito } from '@/lib/types'
import { DESCUENTO_SOCIO, TALLES_CON_DESCUENTO, DESCUENTO_TALLE } from '@/lib/constants'

type DescuentoSocio = { aplicado: boolean; codigo: string }

type CartCtx = {
  items: ItemCarrito[]
  agregar: (item: Omit<ItemCarrito, 'cantidad'>) => void
  cambiarCantidad: (index: number, delta: number) => void
  eliminar: (index: number) => void
  vaciar: () => void
  cantidadTotal: number
  subtotal: number
  descuentoSocio: DescuentoSocio
  aplicarDescuentoSocio: (codigo: string) => void
  quitarDescuentoSocio: () => void
  total: number
  abierto: boolean
  abrirCarrito: () => void
  cerrarCarrito: () => void
  bump: boolean
}

const Ctx = createContext<CartCtx | null>(null)

export function useCart() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider')
  return ctx
}

export function precioItem(item: Pick<ItemCarrito, 'talle' | 'precioBase'>) {
  const desc =
    item.talle && TALLES_CON_DESCUENTO.includes(item.talle) ? DESCUENTO_TALLE : 0
  return Math.max(0, item.precioBase - desc)
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([])
  const [descuentoSocio, setDescuentoSocio] = useState<DescuentoSocio>({
    aplicado: false,
    codigo: '',
  })
  const [abierto, setAbierto] = useState(false)
  const [bump, setBump] = useState(false)
  const [hidratado, setHidratado] = useState(false)

  // Cargar de localStorage al montar
  useEffect(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem('carrito') ?? 'null')
      if (Array.isArray(guardado)) setItems(guardado)
      const desc = JSON.parse(localStorage.getItem('descuentoSocio') ?? 'null')
      if (desc) {
        setDescuentoSocio({
          aplicado: desc.aplicado || false,
          codigo: desc.codigo || '',
        })
      }
    } catch {
      // localStorage corrupto: arrancamos vacío
    }
    setHidratado(true)
  }, [])

  useEffect(() => {
    if (hidratado) localStorage.setItem('carrito', JSON.stringify(items))
  }, [items, hidratado])

  useEffect(() => {
    if (hidratado)
      localStorage.setItem('descuentoSocio', JSON.stringify(descuentoSocio))
  }, [descuentoSocio, hidratado])

  const agregar = useCallback((item: Omit<ItemCarrito, 'cantidad'>) => {
    setItems(prev => {
      const i = prev.findIndex(
        p => p.productoId === item.productoId && p.talle === item.talle,
      )
      if (i >= 0) {
        const copia = [...prev]
        copia[i] = { ...copia[i], cantidad: copia[i].cantidad + 1 }
        return copia
      }
      return [...prev, { ...item, cantidad: 1 }]
    })
    setBump(false)
    requestAnimationFrame(() => setBump(true))
    setTimeout(() => setBump(false), 350)
  }, [])

  const cambiarCantidad = useCallback((index: number, delta: number) => {
    setItems(prev => {
      const copia = [...prev]
      copia[index] = { ...copia[index], cantidad: copia[index].cantidad + delta }
      if (copia[index].cantidad <= 0) copia.splice(index, 1)
      return copia
    })
  }, [])

  const eliminar = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }, [])

  const vaciar = useCallback(() => {
    setItems([])
    setDescuentoSocio({ aplicado: false, codigo: '' })
  }, [])

  const aplicarDescuentoSocio = useCallback((codigo: string) => {
    setDescuentoSocio({ aplicado: true, codigo })
  }, [])

  const quitarDescuentoSocio = useCallback(() => {
    setDescuentoSocio({ aplicado: false, codigo: '' })
  }, [])

  const { cantidadTotal, subtotal, total } = useMemo(() => {
    const cantidadTotal = items.reduce((s, p) => s + p.cantidad, 0)
    const subtotal = items.reduce((s, p) => s + precioItem(p) * p.cantidad, 0)
    const total = descuentoSocio.aplicado
      ? subtotal * (1 - DESCUENTO_SOCIO)
      : subtotal
    return { cantidadTotal, subtotal, total }
  }, [items, descuentoSocio.aplicado])

  // Si el carrito queda vacío se pierde el descuento (como en el sitio original)
  useEffect(() => {
    if (items.length === 0 && descuentoSocio.aplicado) {
      setDescuentoSocio({ aplicado: false, codigo: '' })
    }
  }, [items.length, descuentoSocio.aplicado])

  const value: CartCtx = {
    items,
    agregar,
    cambiarCantidad,
    eliminar,
    vaciar,
    cantidadTotal,
    subtotal,
    descuentoSocio,
    aplicarDescuentoSocio,
    quitarDescuentoSocio,
    total,
    abierto,
    abrirCarrito: () => setAbierto(true),
    cerrarCarrito: () => setAbierto(false),
    bump,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
