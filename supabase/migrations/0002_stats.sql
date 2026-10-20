-- ============================================================
-- Stats del ascenso — schema + vistas + policies + seed
-- Adaptado del proyecto "federa a stats" para correr sobre la
-- MISMA base de Supabase de cja-web (no hay colisiones de nombres).
-- Ejecutar UNA SOLA VEZ en el SQL Editor de Supabase.
-- ============================================================

create table if not exists tournaments (
  id bigint generated always as identity primary key,
  name text not null,
  slug text not null unique,
  api_league_id int,
  api_season int,
  is_active boolean not null default true,
  promedio_seasons int not null default 1,
  descenso_spots int not null default 1,
  reducido_positions jsonb not null default '[]',
  reducido_format text not null default 'top_vs_bottom',
  created_at timestamptz not null default now()
);

create table if not exists seasons (
  id bigint generated always as identity primary key,
  tournament_id bigint not null references tournaments(id) on delete cascade,
  year int not null,
  is_current boolean not null default false,
  unique (tournament_id, year)
);

create table if not exists zones (
  id bigint generated always as identity primary key,
  tournament_id bigint not null references tournaments(id) on delete cascade,
  name text not null,
  sort_order int not null default 0
);

create table if not exists teams (
  id bigint generated always as identity primary key,
  tournament_id bigint not null references tournaments(id) on delete cascade,
  zone_id bigint references zones(id) on delete set null,
  name text not null,
  short_name text,
  slug text not null unique,
  logo_url text,
  api_team_id int,
  city text,
  stadium text,
  unique (tournament_id, api_team_id)
);

create index if not exists teams_tournament_idx on teams(tournament_id);
create index if not exists teams_zone_idx on teams(zone_id);

create table if not exists team_season_stats (
  team_id bigint not null references teams(id) on delete cascade,
  season_id bigint not null references seasons(id) on delete cascade,
  points int not null default 0,
  played int not null default 0,
  primary key (team_id, season_id)
);

create table if not exists matches (
  id bigint generated always as identity primary key,
  tournament_id bigint not null references tournaments(id) on delete cascade,
  zone_id bigint references zones(id) on delete set null,
  season_id bigint references seasons(id) on delete set null,
  fecha_num int,
  stage text not null default 'regular',
  leg int not null default 1,
  kickoff_at timestamptz,
  status text not null default 'SCHEDULED'
    check (status in ('SCHEDULED','LIVE','HT','FINISHED','POSTPONED','CANCELLED')),
  minute int,
  home_team_id bigint not null references teams(id),
  away_team_id bigint not null references teams(id),
  home_score int,
  away_score int,
  venue text,
  api_fixture_id int unique,
  source text not null default 'manual' check (source in ('api','manual')),
  updated_at timestamptz not null default now()
);

create index if not exists matches_tournament_idx on matches(tournament_id);
create index if not exists matches_kickoff_idx on matches(kickoff_at);
create index if not exists matches_status_idx on matches(status);
create index if not exists matches_teams_idx on matches(home_team_id, away_team_id);

create table if not exists match_events (
  id bigint generated always as identity primary key,
  match_id bigint not null references matches(id) on delete cascade,
  team_id bigint references teams(id) on delete set null,
  player_name text not null,
  type text not null check (type in ('GOAL','YELLOW','RED')),
  minute int,
  detail text not null default 'NORMAL'
    check (detail in ('NORMAL','PENALTY','OWN_GOAL','MISSED_PENALTY'))
);

create index if not exists match_events_match_idx on match_events(match_id);
create index if not exists match_events_team_idx on match_events(team_id);

create table if not exists sync_log (
  id bigint generated always as identity primary key,
  ran_at timestamptz not null default now(),
  kind text not null,
  requests_used int not null default 0,
  requests_remaining int,
  status text not null default 'ok',
  note text
);

create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists matches_touch on matches;
create trigger matches_touch before update on matches
  for each row execute function public.touch_updated_at();

-- ============================================================
-- Vistas
-- ============================================================

create or replace view v_standings as
with team_matches as (
  select
    t.id as team_id,
    m.home_team_id = t.id as is_home,
    m.home_score,
    m.away_score
  from teams t
  join matches m on (m.home_team_id = t.id or m.away_team_id = t.id)
  where m.status = 'FINISHED' and m.stage = 'regular'
    and m.home_score is not null and m.away_score is not null
),
agg as (
  select
    team_id,
    count(*) as played,
    count(*) filter (
      where (is_home and home_score > away_score)
         or (not is_home and away_score > home_score)
    ) as won,
    count(*) filter (where home_score = away_score) as drawn,
    count(*) filter (
      where (is_home and home_score < away_score)
         or (not is_home and away_score < home_score)
    ) as lost,
    coalesce(sum(case when is_home then home_score else away_score end), 0) as gf,
    coalesce(sum(case when is_home then away_score else home_score end), 0) as ga
  from team_matches
  group by team_id
)
select
  t.id as team_id,
  t.name as team_name,
  coalesce(t.short_name, t.name) as short_name,
  t.slug as team_slug,
  t.logo_url,
  t.zone_id,
  z.name as zone_name,
  z.sort_order as zone_order,
  t.tournament_id,
  coalesce(a.played, 0) as played,
  coalesce(a.won, 0) as won,
  coalesce(a.drawn, 0) as drawn,
  coalesce(a.lost, 0) as lost,
  coalesce(a.gf, 0) as gf,
  coalesce(a.ga, 0) as ga,
  coalesce(a.gf, 0) - coalesce(a.ga, 0) as gd,
  coalesce(a.won, 0) * 3 + coalesce(a.drawn, 0) as pts
from teams t
join zones z on z.id = t.zone_id
left join agg a on a.team_id = t.id;

create or replace view v_promedios as
with cur as (
  select team_id, played, won * 3 + drawn as points
  from v_standings
),
hist as (
  select
    ranked.team_id,
    coalesce(sum(ranked.points), 0) as points,
    coalesce(sum(ranked.played), 0) as played
  from (
    select
      tss.team_id, tss.points, tss.played,
      row_number() over (
        partition by tss.team_id
        order by s.year desc
      ) as rn,
      tor.promedio_seasons
    from team_season_stats tss
    join seasons s on s.id = tss.season_id and not s.is_current
    join teams t on t.id = tss.team_id
    join tournaments tor on tor.id = t.tournament_id
  ) ranked
  where ranked.rn <= greatest(ranked.promedio_seasons - 1, 0)
  group by ranked.team_id
)
select
  t.id as team_id,
  t.name as team_name,
  coalesce(t.short_name, t.name) as short_name,
  t.slug as team_slug,
  t.logo_url,
  t.zone_id,
  z.name as zone_name,
  z.sort_order as zone_order,
  t.tournament_id,
  coalesce(c.played, 0) + coalesce(h.played, 0) as played,
  coalesce(c.points, 0) + coalesce(h.points, 0) as points,
  round(
    (coalesce(c.points, 0) + coalesce(h.points, 0))::numeric
    / nullif(coalesce(c.played, 0) + coalesce(h.played, 0), 0),
    3
  ) as promedio
from teams t
join zones z on z.id = t.zone_id
left join cur c on c.team_id = t.id
left join hist h on h.team_id = t.id;

create or replace view v_team_form as
select team_id, match_id, result, kickoff_at, rn as pos
from (
  select
    t.id as team_id,
    m.id as match_id,
    case
      when (m.home_team_id = t.id and m.home_score > m.away_score)
        or (m.away_team_id = t.id and m.away_score > m.home_score) then 'W'
      when m.home_score = m.away_score then 'D'
      else 'L'
    end as result,
    m.kickoff_at,
    row_number() over (partition by t.id order by m.kickoff_at desc nulls last) as rn
  from teams t
  join matches m on (m.home_team_id = t.id or m.away_team_id = t.id)
  where m.status = 'FINISHED'
) x
where rn <= 5;

-- ============================================================
-- RLS: lectura publica, escritura solo admins
-- ============================================================

alter table tournaments       enable row level security;
alter table seasons           enable row level security;
alter table zones             enable row level security;
alter table teams             enable row level security;
alter table team_season_stats enable row level security;
alter table matches           enable row level security;
alter table match_events      enable row level security;
alter table sync_log          enable row level security;
alter table admins            enable row level security;

create policy "read public" on tournaments       for select using (true);
create policy "read public" on seasons           for select using (true);
create policy "read public" on zones             for select using (true);
create policy "read public" on teams             for select using (true);
create policy "read public" on team_season_stats for select using (true);
create policy "read public" on matches           for select using (true);
create policy "read public" on match_events      for select using (true);
create policy "read public" on sync_log          for select using (true);

create policy "read own admin row" on admins for select
  using (auth.uid() = user_id);

create policy "admin write" on tournaments       for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on seasons           for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on zones             for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on teams             for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on team_season_stats for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on matches           for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on match_events      for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on sync_log          for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on admins            for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Realtime (si la publicacion ya tiene las tablas, ignorar error)
do $$
begin
  alter publication supabase_realtime add table matches;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table match_events;
exception when duplicate_object then null;
end $$;

-- ============================================================
-- Seed: Torneo Federal A con Juventud en Zona A
-- (equipos y zonas editables; los datos reales llegan por sync
--  o carga manual)
-- ============================================================

insert into tournaments (name, slug, promedio_seasons, descenso_spots, reducido_positions)
values ('Torneo Federal A', 'federal-a', 1, 2, '[2,3,4,5]')
on conflict (slug) do nothing;

insert into seasons (tournament_id, year, is_current)
select id, extract(year from now())::int, true
from tournaments where slug = 'federal-a'
on conflict (tournament_id, year) do nothing;

insert into zones (tournament_id, name, sort_order)
select t.id, z.name, z.sort_order
from tournaments t
cross join (values ('Zona A', 1), ('Zona B', 2), ('Zona C', 3), ('Zona D', 4)) as z(name, sort_order)
where t.slug = 'federal-a'
on conflict do nothing;

-- Equipos 2026 con los slugs (url_name) exactos de Promiedos,
-- asi el sync los linkea sin duplicar. Zonas = Grupo A-D de la
-- temporada regular.
insert into teams (tournament_id, zone_id, name, short_name, slug)
select t.id, z.id, e.name, e.short_name, e.slug
from tournaments t
join zones z on z.tournament_id = t.id and z.name = 'Zona A'
cross join (values
  ('Douglas Haig', 'Douglas Haig', 'douglas-haig'),
  ('Sportivo Belgrano', 'Sp. Belgrano', 'sportivo-belgrano'),
  ('Gimnasia y Esgrima (Chivilcoy)', 'Gimnasia (Chi)', 'cscyd-gimnasia-y-esgrima-(chivilcoy)'),
  ('Defensores Belgrano (VR)', 'Defensores (VR)', 'defensores-belgrano-(vr)'),
  ('9 De Julio Rafaela', '9 de Julio (R)', '9-de-julio-rafaela'),
  ('Sportivo Las Parejas', 'Sportivo LP', 'sportivo-las-parejas'),
  ('Atletico Escobar', 'Atl. Escobar', 'escobar-fc-(ing.-maschwitz)'),
  ('Independiente Chivilcoy', 'Independiente (Chi)', 'independiente-chivilcoy'),
  ('El Linqueno', 'El Linqueno', 'el-linqueno'),
  ('Gimnasia de Concepcion', 'Gimnasia (CdU)', 'gimnasia-de-concepcion-del-uruguay')
) as e(name, short_name, slug)
where t.slug = 'federal-a'
on conflict (slug) do nothing;

insert into teams (tournament_id, zone_id, name, short_name, slug)
select t.id, z.id, e.name, e.short_name, e.slug
from tournaments t
join zones z on z.tournament_id = t.id and z.name = 'Zona B'
cross join (values
  ('San Martin de Formosa', 'San Martin (For)', 'san-martin-de-formosa'),
  ('Bartolome Mitre (Posadas)', 'Bartolome Mitre', 'ca-bartolome-mitre-(posadas)'),
  ('Sol De America', 'Sol De America', 'sol-de-america'),
  ('Sarmiento De La Banda', 'Sarmiento (LB)', 'sarmiento-de-la-banda'),
  ('Juventud Antoniana', 'Juv. Antoniana', 'juventud-antoniana'),
  ('Defensores Pto. Vilelas', 'Defensores (Vil)', 'defensores-de-vilelas-(puerto-vilelas)'),
  ('Boca Unidos de Corrientes', 'Boca Unidos', 'boca-unidos'),
  ('Tucuman Central', 'Tucuman Central', 'club-tucuman-central-deportes'),
  ('Sarmiento de Resistencia', 'Sarmiento (R)', 'sarmiento-de-resistencia')
) as e(name, short_name, slug)
where t.slug = 'federal-a'
on conflict (slug) do nothing;

insert into teams (tournament_id, zone_id, name, short_name, slug)
select t.id, z.id, e.name, e.short_name, e.slug
from tournaments t
join zones z on z.tournament_id = t.id and z.name = 'Zona C'
cross join (values
  ('Cipolletti', 'Cipolletti', 'cipolletti'),
  ('Argentino Monte Maiz', 'Argentino MM', 'argentino-mm'),
  ('Atenas Rio Cuarto', 'Atenas (RC)', 'scyb-atenas'),
  ('Huracan Las Heras', 'Huracan (LH)', 'huracan-las-heras'),
  ('Fundacion Amigos por el Deporte', 'FADEP', 'fundacion-amigos-por-el-deporte'),
  ('Deportivo Rincon', 'Dvo. Rincon', 'deportivo-rincon'),
  ('San Martin de Mendoza', 'San Martin (Mdza)', 'san-martin-mendoza'),
  ('Costa Brava (Gral Pico)', 'Costa Brava', 'costa-brava-(gral-pico)'),
  ('Juventud Unida San Luis', 'Juventud Unida (SL)', 'juventud-unida-san-luis')
) as e(name, short_name, slug)
where t.slug = 'federal-a'
on conflict (slug) do nothing;

insert into teams (tournament_id, zone_id, name, short_name, slug)
select t.id, z.id, e.name, e.short_name, e.slug
from tournaments t
join zones z on z.tournament_id = t.id and z.name = 'Zona D'
cross join (values
  ('Olimpo', 'Olimpo', 'olimpo-de-bahia-blanca'),
  ('Alvarado', 'Alvarado', 'alvarado'),
  ('Kimberley Mar Del Plata', 'Kimberley', 'kimberley-mar-del-plata'),
  ('Villa Mitre', 'Villa Mitre', 'villa-mitre'),
  ('Germinal', 'Germinal', 'germinal'),
  ('Sol de Mayo', 'Sol de Mayo', 'sol-de-mayo'),
  ('Guillermo Brown', 'Gmo. Brown', 'guillermo-brown'),
  ('Santamarina Tandil', 'Santamarina', 'santamarina-tandil'),
  ('Circulo Deportivo', 'Circulo Deportivo', 'circulo-deportivo')
) as e(name, short_name, slug)
where t.slug = 'federal-a'
on conflict (slug) do nothing;
