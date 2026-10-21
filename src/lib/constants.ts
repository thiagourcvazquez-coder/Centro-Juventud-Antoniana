// Reglas de negocio de la tienda (mismas que el sitio estático).
// IMPORTANTE: estos valores también se aplican del lado del servidor en
// /api/checkout — los precios nunca se confían al cliente.
export const TALLES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const
export type Talle = (typeof TALLES)[number]

export const TALLES_CON_DESCUENTO: readonly Talle[] = ['XS', 'S', 'M']
export const DESCUENTO_TALLE = 20000
export const DESCUENTO_SOCIO = 0.10

export const fmtPrecio = (n: number) => n.toLocaleString('es-AR')

// Columna de stock que corresponde a cada talle en la tabla `productos`
export const STOCK_COL: Record<Talle, string> = {
  XS: 'stock_xs',
  S: 'stock_s',
  M: 'stock_m',
  L: 'stock_l',
  XL: 'stock_xl',
  XXL: 'stock_xxl',
}
