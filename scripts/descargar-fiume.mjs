// Descarga las fotos oficiales de la coleccion Juventud Antoniana de Fiume
// y las deja optimizadas en public/images/tienda/<handle>/<n>.webp
//   node scripts/descargar-fiume.mjs
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const OUT = 'public/images/tienda'
const res = await fetch('https://fiume.com.ar/collections/juventud-antoniana/products.json?limit=250')
const { products } = await res.json()
const catalogo = []
for (const p of products) {
  const dir = path.join(OUT, p.handle)
  fs.mkdirSync(dir, { recursive: true })
  const fotos = []
  let k = 0
  for (const im of p.images) {
    const file = `${k}.webp`
    const r = await fetch(`${im.src.split('?')[0]}?width=1000`)
    const buf = Buffer.from(await r.arrayBuffer())
    await sharp(buf).resize({ width: 1000, withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(dir, file))
    fotos.push(`/images/tienda/${p.handle}/${file}`)
    k++
  }
  catalogo.push({
    handle: p.handle,
    titulo: p.title,
    precio: Number(p.variants[0].price),
    disponible: p.variants.some(v => v.available),
    fotos,
  })
  console.log(p.handle, fotos.length)
}
fs.writeFileSync('src/lib/catalogo-fiume.json', JSON.stringify(catalogo, null, 2))
console.log('productos:', catalogo.length)
