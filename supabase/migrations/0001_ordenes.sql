-- Órdenes pendientes de pago (Mercado Pago Checkout Pro).
-- El flujo: POST /api/checkout crea la orden con status='pendiente' y la
-- preferencia de MP; el webhook /api/mp/webhook la marca 'aprobada' y llama al
-- RPC registrar_venta (que crea la venta e impacta el stock).
--
-- EJECUTAR EN: Supabase → SQL Editor

create table if not exists public.ordenes (
  id               uuid primary key default gen_random_uuid(),
  external_ref     text not null unique,
  status           text not null default 'pendiente',  -- pendiente | aprobada | rechazada | cancelada
  nombre_cliente   text not null,
  email_cliente    text,
  tel_cliente      text,
  dni_cliente      text,
  items            jsonb not null,                     -- [{producto_id, talle, cantidad, precio_base, descuento_talle}]
  descuento_socio  boolean not null default false,
  codigo_socio     text,
  total            numeric not null,
  mp_preference_id text,
  mp_payment_id    text,
  mp_status        text,
  venta_registrada boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists ordenes_external_ref_idx on public.ordenes (external_ref);

-- Nadie accede desde el cliente: solo el servidor (service role) la toca.
alter table public.ordenes enable row level security;

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists ordenes_updated_at on public.ordenes;
create trigger ordenes_updated_at
  before update on public.ordenes
  for each row execute function public.set_updated_at();
