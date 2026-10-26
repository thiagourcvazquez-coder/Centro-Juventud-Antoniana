import catalogo from './catalogo-fiume.json'

// Asocia cada producto de la tienda (por nombre) con las fotos oficiales de
// Fiume (public/images/tienda/<handle>/<n>.webp) y su modelo 3D (public/modelos).
// Si ningun patron coincide, se usa imagen_url / modelo_3d cargados en el admin.

type Ficha = { handle?: string; foto?: number; modelo?: string; fotosLocales?: string[] }

const FICHAS: [RegExp, Ficha][] = [
  [/kids/, { handle: 'camiseta-oficial-kids-juventud-antoniana-t-2026', modelo: '/modelos/camiseta-oficial.glb' }],
  [/alternativa/, { handle: 'camiseta-alternativa-juventud-antoniana-t-2026', modelo: '/modelos/camiseta-alternativa.glb' }],
  [/tercera/, { handle: 'camiseta-tercera-juventud-antoniana-t-2025', modelo: '/modelos/camiseta-tercera.glb' }],
  [/110|retro/, { handle: 'camiseta-titular-juventud-antoniana-t-2024', modelo: '/modelos/camiseta-110.glb' }],
  [/el santo|prematch.*2027/, { handle: 'remera-prematch-importada-juventud-antoniana-2027', modelo: '/modelos/remera-el-santo.glb' }],
  [/polo|chomba/, { handle: 'polo-concentracion-importada-juventud-antoniana-2026', modelo: '/modelos/chomba.glb' }],
  [/prematch|concentracion/, { handle: 'remera-prematch-importada-juventud-antoniana-2026', modelo: '/modelos/remera-prematch.glb' }],
  [/musculosa.*premium|premium.*musculosa/, { handle: 'musculosa-premium-salida-juventud-antoniana-2026', modelo: '/modelos/musculosa-premium.glb' }],
  [/premium|salida/, { handle: 'remera-premium-salida-juventud-antoniana-2026', modelo: '/modelos/remera-premium-salida.glb' }],
  [/entreno.*2027|entrenamiento.*2027/, { handle: 'remera-entreno-importada-juventud-antoniana-2027', modelo: '/modelos/remera-entreno-crema.glb' }],
  [/entren/, { handle: 'remera-entreno-importada-juventud-antoniana-2026', modelo: '/modelos/remera-entreno.glb' }],
  [/musculosa/, { handle: 'remera-entrenamiento-m-c-juventud-antoniana-2024', modelo: '/modelos/musculosa-azul.glb' }],
  [/oficial|titular/, { handle: 'camiseta-oficial-juventud-antoniana-t-2026', foto: 4, modelo: '/modelos/camiseta-oficial.glb' }],
  [/campera|camperon|parka/, { handle: 'camperon-corto-importado-juventud-antoniana-2026', modelo: '/modelos/camperon-corto.glb' }],
  [/rompevientos|anorak/, { handle: 'anorak-importado-juventud-antoniana-2026', modelo: '/modelos/rompevientos.glb' }],
  [/buzo/, { handle: 'buzo-deportivo-importado-juventud-antoniana-2026', modelo: '/modelos/buzo-deportivo.glb' }],
  [/gorra/, { handle: 'gorra-cja-importada-2025', modelo: '/modelos/gorra.glb' }],
  [/bolso|travel/, { handle: 'travel-bag-cja-importada-2025', modelo: '/modelos/bolso.glb' }],
  [/pantalon/, { handle: 'pantalon-cargo-importado-juventud-antoniana-2026', modelo: '/modelos/pantalon-largo.glb' }],
  [/bermuda/, { fotosLocales: ['/images/bermuda.png'], modelo: '/modelos/bermuda.glb' }],
]

const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

const porHandle = new Map(catalogo.map(c => [c.handle, c]))

export type DatosProducto = {
  imagen: string
  fotos: string[]
  modelo: string | null
}

export function datosProducto(p: {
  nombre: string
  imagen_url?: string | null
  modelo_3d?: string | null
}): DatosProducto {
  const nombre = norm(p.nombre)
  const ficha = FICHAS.find(([re]) => re.test(nombre))?.[1]
  const oficiales = ficha?.handle ? porHandle.get(ficha.handle)?.fotos ?? [] : []
  const fotos = oficiales.length ? oficiales : ficha?.fotosLocales ?? []

  const propia = p.imagen_url
    ? p.imagen_url.startsWith('http') || p.imagen_url.startsWith('/')
      ? p.imagen_url
      : `/${p.imagen_url}`
    : null
  const imagen = fotos[Math.min(ficha?.foto ?? 0, Math.max(0, fotos.length - 1))] ?? propia ?? '/images/escudo.png'

  return {
    imagen,
    fotos: fotos.length ? fotos : propia ? [propia] : [],
    modelo: ficha?.modelo ?? (p.modelo_3d?.trim() || null),
  }
}
