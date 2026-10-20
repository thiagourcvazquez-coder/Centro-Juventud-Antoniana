# Centro Juventud Antoniana — Web

Migración del sitio estático (`Desktop/Juventud antoniana`) a **Next.js + Supabase + Mercado Pago**.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Supabase (mismo proyecto que el sitio anterior: `rcusuuyakezwrwlpqiby`)
- Mercado Pago Checkout Pro (SDK `mercadopago` v3) — reemplaza la Edge Function `crear-preferencia`

## Arrancar

```bash
npm install
cp env.example .env.local   # completar SUPABASE_SERVICE_ROLE_KEY y MP_ACCESS_TOKEN
npm run dev
```

## Setup Supabase

1. Ejecutar `supabase/migrations/0001_ordenes.sql` en el SQL Editor de Supabase (crea la tabla `ordenes`).
2. Ejecutar `supabase/migrations/0002_stats.sql` (tablas del torneo: `tournaments`, `teams`, `matches`, vistas `v_standings`/`v_promedios`, seed del Federal A).
3. El RPC `registrar_venta` y las tablas `productos`, `codigos_socio`, `clientes`, `ventas` ya existen — se reutilizan tal cual.

## Partidos (Federal A)

`/partidos` muestra próximo partido del Santo, últimos resultados, tabla de posiciones por zona, promedios, fixture y fases finales. Los datos salen de las mismas tablas que el proyecto "federa a stats" (misma Supabase).

### Sync automático (Promiedos — sin API key)

Los datos salen de `promiedos.com.ar` (API pública, gratis, sin key — cubre el Federal A 2026 actual: fixtures, posiciones por fase, revalida y fases finales).

1. Ejecutar `supabase/migrations/0003_promiedos.sql` (convierte ids a texto + crea `standings_rows`).
2. Desplegar la Edge Function en este mismo proyecto Supabase:
   ```bash
   supabase link --project-ref rcusuuyakezwrwlpqiby
   supabase secrets set SYNC_KEY=$(openssl rand -hex 24)
   supabase functions deploy sync-fixtures
   ```
3. Cron gratis: [cron-job.org](https://cron-job.org) → POST a
   `https://rcusuuyakezwrwlpqiby.supabase.co/functions/v1/sync-fixtures`
   con header `x-sync-key: <SYNC_KEY>` cada 15-30 min.

El sync trae escudos de equipo, marcadores, minuto a minuto y goleadores. Las posiciones se muestran tal cual las publica Promiedos (`standings_rows`), y **nunca pisa** partidos cargados a mano (`source='manual'`).

## Flujo de compra

1. El carrito vive en `localStorage` (React context). Productos, precios, talles y stock salen de la tabla `productos`.
2. `POST /api/checkout` valida items y **recalcula precios del lado del servidor** (descuento por talle XS/S/M −$20.000, código de socio −10%), crea la `ordenes` pendiente y la preferencia de MP.
3. MP redirige a `/pago/resultado` y notifica a `POST /api/mp/webhook`, que llama `registrar_venta` (idempotente por `venta_registrada`).
4. En el dashboard de MP configurar el webhook: `https://<dominio>/api/mp/webhook` (evento `payment`).

## Admin

- `/admin` protegido por `src/proxy.ts` (sesión Supabase Auth en cookies).
- Pestañas: Ventas, Clientes, Stock, Códigos — mismas funciones que el `admin.html` original.
- El usuario admin es el mismo de Supabase Auth que ya existía.

## Diferencias con el sitio estático

- Los productos de la tienda ya no están hardcodeados: salen de `productos` (precio, talles con stock, imagen).
- La venta se registra por webhook (antes dependía de que el cliente vuelva a `success.html`).
- Los precios se validan en el servidor (antes el cliente mandaba el `unit_price`).
- El contacto sigue usando FormSubmit igual que antes.
