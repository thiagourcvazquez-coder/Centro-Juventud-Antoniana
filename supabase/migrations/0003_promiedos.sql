-- ============================================================
-- 0003: sync desde Promiedos (sin API key)
-- - IDs externos pasan a texto (Promiedos usa ids tipo "egicddj")
-- - standings_rows: espejo de las tablas de Promiedos por fase/zona
--   (los standings se muestran tal cual los publica Promiedos,
--    no se recalculan — el formato del Federal A cambia por fase)
-- Ejecutar despues de 0002_stats.sql
-- ============================================================

alter table teams   alter column api_team_id    type text using api_team_id::text;
alter table matches alter column api_fixture_id type text using api_fixture_id::text;

create table if not exists standings_rows (
  id bigint generated always as identity primary key,
  tournament_id bigint not null references tournaments(id) on delete cascade,
  group_name text not null,          -- "Fase de grupos", "Temporada Regular"...
  table_name text not null,          -- "Segunda Fase - Zona B", "Grupo A"...
  num int not null,
  team_slug text not null,
  team_name text not null,
  short_name text,
  played int not null default 0,
  won int not null default 0,
  drawn int not null default 0,
  lost int not null default 0,
  gf int not null default 0,
  ga int not null default 0,
  gd int not null default 0,
  pts int not null default 0,
  destination_color text,            -- color de la leyenda de clasificacion
  updated_at timestamptz not null default now(),
  unique (tournament_id, table_name, team_slug)
);

alter table standings_rows enable row level security;
create policy "read public" on standings_rows for select using (true);
create policy "admin write" on standings_rows for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
