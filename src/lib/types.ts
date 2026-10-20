import type { Talle } from './constants'

export type Producto = {
  id: string
  nombre: string
  precio_base: number
  tiene_talle: boolean
  imagen_url: string | null
  modelo_3d: string | null
  stock_xs: number | null
  stock_s: number | null
  stock_m: number | null
  stock_l: number | null
  stock_xl: number | null
  stock_xxl: number | null
  stock_sin_talle: number | null
  activo: boolean
}

export type ItemCarrito = {
  productoId: string
  nombre: string        // "Camiseta Oficial — XL"
  nombreBase: string    // "Camiseta Oficial"
  talle: Talle | null
  precioBase: number    // snapshot para mostrar; el servidor recalcula
  imagen: string
  cantidad: number
}

// Item tal como se guarda en `ordenes.items` y se envía al RPC registrar_venta
export type ItemOrden = {
  producto_id: string | null
  talle: string         // 'sin_talle' si el producto no tiene talles
  cantidad: number
  precio_base: number
  descuento_talle: number
}

export type Orden = {
  id: string
  external_ref: string
  status: string
  nombre_cliente: string
  email_cliente: string | null
  tel_cliente: string | null
  dni_cliente: string | null
  items: ItemOrden[]
  descuento_socio: boolean
  codigo_socio: string | null
  total: number
  mp_preference_id: string | null
  mp_payment_id: string | null
  mp_status: string | null
  venta_registrada: boolean
  created_at: string
}

export type Venta = {
  id: string
  created_at: string
  nombre_cliente: string | null
  email_cliente: string | null
  dni_cliente: string | null
  tel_cliente: string | null
  total: number
  metodo_pago: string
  descuento_socio: boolean
}

export type Cliente = {
  id: string
  nombre: string
  email: string | null
  telefono: string | null
  created_at: string
}

export type CodigoSocio = {
  id: string
  codigo: string
  activo: boolean
  created_at: string
}
