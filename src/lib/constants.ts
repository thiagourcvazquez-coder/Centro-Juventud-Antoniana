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

// Imagen local por defecto según el nombre del producto
// (la columna imagen_url de `productos` está vacía hoy).
export const IMAGEN_POR_NOMBRE: Record<string, string> = {
  'camiseta oficial 2025': '/images/camiseta-titular.jpg',
  'camiseta oficial': '/images/camiseta-titular.jpg',
  'camiseta 110 años': '/images/camiseta-blanca.jpg',
  'musculosa azul': '/images/musculosa_azul.jpg',
  'campera de abrigo': '/images/campera.jpg',
  'bermuda cja': '/images/bermuda.png',
  'chomba cja': '/images/chombacja.webp',
  'rompevientos cja': '/images/rompevientoscja.webp',
  'pantalon largo cja': '/images/pantalon_largo.png',
  'gorra cja': '/images/gorra_cja.jpg',
  'bolso cja': '/images/bolso.jpg',
}
