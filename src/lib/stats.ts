import { createPublicClient } from './supabase/public'

// Tipos del schema de stats (misma Supabase que la tienda)

export type Tournament = {
  id: number
  name: string
  slug: string
  is_active: boolean
  promedio_seasons: number
  descenso_spots: number
  reducido_positions: number[]
  reducido_format: string
}

export type Zone = {
  id: number
  tournament_id: number
  name: string
  sort_order: number
}

export type Team = {
  id: number
  tournament_id: number
  zone_id: number | null
  name: string
  short_name: string | null
  slug: string
  logo_url: string | null
}

export type MatchStatus =
  | 'SCHEDULED' | 'LIVE' | 'HT' | 'FINISHED' | 'POSTPONED' | 'CANCELLED'

export type Match = {
  id: number
  tournament_id: number
  zone_id: number | null
  fecha_num: number | null
  stage: string
  leg: number
  kickoff_at: string | null
  status: MatchStatus
  minute: number | null
  home_team_id: number
  away_team_id: number
  home_score: number | null
  away_score: number | null
  venue: string | null
  home_team?: Team
  away_team?: Team
  match_events?: MatchEvent[]
}

export type MatchEvent = {
  id: number
  match_id: number
  team_id: number | null
  player_name: string
  type: 'GOAL' | 'YELLOW' | 'RED'
  minute: number | null
  detail: 'NORMAL' | 'PENALTY' | 'OWN_GOAL' | 'MISSED_PENALTY'
}

// Fila de standings_rows — espejo de las tablas de Promiedos
export type StandingRow = {
  id: number
  group_name: string
  table_name: string
  num: number
  team_slug: string
  team_name: string
  short_name: string | null
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  pts: number
  destination_color: string | null
}

export type StatsData = {
  tournament: Tournament | null
  standings: StandingRow[]   // filas ya ordenadas por tabla/posicion
  matches: Match[]
  teams: Team[]              // slug -> logo_url para las tablas
}

// Goleadores de un lado, agrupados por jugador: "Perez 23', 67'".
// El gol en contra figura del lado que se beneficia, marcado "(ec)".
export function goleadores(m: Match, side: 'home' | 'away'): string[] {
  const propio = side === 'home' ? m.home_team_id : m.away_team_id
  const otro = side === 'home' ? m.away_team_id : m.home_team_id
  const evs = (m.match_events ?? []).filter(e =>
    e.type === 'GOAL' &&
    (e.detail === 'OWN_GOAL' ? e.team_id === otro : e.team_id === propio))
  const porJug = new Map<string, MatchEvent[]>()
  for (const e of evs) {
    const arr = porJug.get(e.player_name) ?? []
    arr.push(e)
    porJug.set(e.player_name, arr)
  }
  return [...porJug.entries()]
    .map(([name, gs]) => [name, gs.sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))] as [string, MatchEvent[]])
    .sort((a, b) => (a[1][0].minute ?? 0) - (b[1][0].minute ?? 0))
    .map(([name, gs]) => {
      const mins = gs.map(g =>
        `${g.minute ?? '-'}'${g.detail === 'PENALTY' ? ' (p)' : g.detail === 'OWN_GOAL' ? ' (ec)' : ''}`
      ).join(', ')
      return `${name} ${mins}`
    })
}

const TIMEOUT_MS = 8000

async function withTimeout<T>(query: PromiseLike<T>): Promise<T> {
  return Promise.race([
    query,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout Supabase')), TIMEOUT_MS)
    ),
  ])
}

// Carga todo lo que necesita /partidos en paralelo.
// Si las tablas no existen todavía o Supabase no responde,
// devuelve datos vacíos y la página muestra un placeholder.
export async function getStatsData(): Promise<StatsData> {
  const empty: StatsData = { tournament: null, standings: [], matches: [], teams: [] }
  try {
    const supabase = createPublicClient()

    const { data: torneo } = await withTimeout(
      supabase
        .from('tournaments')
        .select('*')
        .eq('slug', 'federal-a')
        .eq('is_active', true)
        .maybeSingle()
    )
    if (!torneo) return empty

    const [standingsRes, matchesRes, teamsRes] = await withTimeout(
      Promise.all([
        supabase
          .from('standings_rows')
          .select('*')
          .eq('tournament_id', torneo.id)
          .order('table_name')
          .order('num'),
        supabase
          .from('matches')
          .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*), match_events(*)')
          .eq('tournament_id', torneo.id)
          .order('kickoff_at', { ascending: true, nullsFirst: false }),
        supabase.from('teams').select('*').eq('tournament_id', torneo.id),
      ])
    )

    return {
      tournament: torneo as Tournament,
      standings: (standingsRes.data ?? []) as StandingRow[],
      matches: (matchesRes.data ?? []) as Match[],
      teams: (teamsRes.data ?? []) as Team[],
    }
  } catch (err) {
    console.error('[partidos] fetch a Supabase falló:', err)
    return empty
  }
}

// Próximo y último partido de Juventud para la home (consulta liviana)
export async function getJuventudMatches(): Promise<{ next: Match | null; last: Match | null }> {
  const none = { next: null, last: null }
  try {
    const supabase = createPublicClient()
    const { data: team } = await withTimeout(
      supabase.from('teams').select('id').eq('slug', 'juventud-antoniana').maybeSingle()
    )
    if (!team) return none
    const sel = '*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*), match_events(*)'
    const or = `home_team_id.eq.${team.id},away_team_id.eq.${team.id}`
    const desde = new Date(Date.now() - 3 * 3600e3).toISOString()
    const [n, l] = await withTimeout(
      Promise.all([
        supabase.from('matches').select(sel).or(or)
          .in('status', ['SCHEDULED', 'LIVE', 'HT']).gte('kickoff_at', desde)
          .order('kickoff_at', { ascending: true }).limit(1),
        supabase.from('matches').select(sel).or(or).eq('status', 'FINISHED')
          .order('kickoff_at', { ascending: false }).limit(1),
      ])
    )
    return {
      next: ((n.data ?? [])[0] as Match | undefined) ?? null,
      last: ((l.data ?? [])[0] as Match | undefined) ?? null,
    }
  } catch (err) {
    console.error('[home] partidos Juventud falló:', err)
    return none
  }
}
