// ============================================================
// sync-fixtures — sincroniza fixtures/resultados desde Promiedos
// (api.promiedos.com.ar — publica, sin API key).
//
// Invocacion:
//   curl -X POST <url>/sync-fixtures -H "x-sync-key: <SYNC_KEY>"
//   agregar ?full=1 para forzar el barrido completo de fechas.
// Scheduler: cron-job.org -> POST cada 15-30 min.
//
// Reglas de oro:
//   - Nunca pisa partidos con source='manual'.
//   - Linkea equipos por slug (url_name de Promiedos).
//   - Standings: espejo de las tablas de Promiedos en
//     standings_rows (el formato del Federal A cambia por fase).
//   - Full sweep de fechas 1 vez por dia; el resto solo "latest".
//   - Upserts en batch (el worker free tiene recursos limitados).
// ============================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SYNC_KEY = Deno.env.get('SYNC_KEY') ?? ''
const LEAGUE_SLUG = 'federal-a'
const PROM_PAGE = 'https://www.promiedos.com.ar/league/federal-a/fahi'
const PROM_API = 'https://api.promiedos.com.ar'
const PROM_LEAGUE_ID = 'fahi'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
const BATCH = 200

interface PromGoal { player_name?: string; player_sname?: string; time?: number | null }
interface PromTeam {
  name: string
  short_name?: string
  url_name?: string
  id: string
  goals?: PromGoal[]
}
interface PromGame {
  id: string
  stage_round_name?: string
  teams: PromTeam[]
  scores?: (number | null)[]
  status?: { enum: number; name?: string }
  start_time?: string
  game_time_to_display?: string
  game_time_status_to_display?: string
}
interface PromTableRow {
  num: number
  values: Array<{ key: string; value: string }>
  entity?: { object?: { name: string; short_name?: string; url_name?: string; id?: string } }
  destination_color?: string
}

const val = (r: PromTableRow, k: string) => r.values.find(v => v.key === k)?.value ?? '0'

function slugify(s: string): string {
  return s.normalize('NFD')
    // deno-lint-ignore no-control-regex
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

// Nombre normalizado para matchear equipos sin importar acentos ni "de/del"
function nameKey(s: string): string {
  return slugify(s).replace(/-/g, '')
    .replace(/^(de|del|la|el|los|las)/, '')
    .replace(/(de|del|la|el|los|las)/g, '')
}

function parseStartTime(s?: string): string | null {
  const m = s?.match(/(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})/)
  return m ? `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:00-03:00` : null
}

function mapStatus(g: PromGame): string {
  const e = g.status?.enum
  if (e === 3) return 'FINISHED'
  if (e === 2) {
    return (g.game_time_status_to_display ?? '').toLowerCase().includes('entretiempo') ? 'HT' : 'LIVE'
  }
  if (e === 1) return 'SCHEDULED'
  const n = (g.status?.name ?? '').toLowerCase()
  if (n.includes('susp') || n.includes('post') || n.includes('aplaz')) return 'POSTPONED'
  if (n.includes('cancel')) return 'CANCELLED'
  return 'SCHEDULED'
}

function fechaNum(roundName?: string): number | null {
  const m = roundName?.match(/(\d+)\s*$/)
  return m ? parseInt(m[1], 10) : null
}

function stageFromName(name?: string): string {
  const r = (name ?? '').toLowerCase()
  if (/tercera fase/.test(r)) return 'tercera_fase'
  if (/cuarta fase/.test(r)) return 'cuarta_fase'
  if (/quinta fase/.test(r)) return 'quinta_fase'
  if (/reválida|revalida/.test(r)) return 'revalida'
  if (/semifinal/.test(r)) return 'reducido_semis'
  if (/\bfinal\b/.test(r)) return 'reducido_final'
  return 'regular'
}

async function fetchJson(url: string) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`)
  return res.json()
}

async function fetchLeagueData() {
  const res = await fetch(PROM_PAGE, { headers: { 'User-Agent': UA, Accept: 'text/html' } })
  if (!res.ok) throw new Error(`GET ${PROM_PAGE} -> ${res.status}`)
  const html = await res.text()
  const m = html.match(/__NEXT_DATA__"[^>]*>(.*?)<\/script>/s)
  if (!m) throw new Error('no se encontro __NEXT_DATA__')
  return JSON.parse(m[1]).props.pageProps.data
}

async function chunkUpsert(
  supabase: ReturnType<typeof createClient>,
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
) {
  const saved: { id: number }[] = []
  for (let i = 0; i < rows.length; i += BATCH) {
    const { data, error } = await supabase
      .from(table)
      .upsert(rows.slice(i, i + BATCH), { onConflict })
      .select('id')
    if (error) throw new Error(`upsert ${table}: ${error.message}`)
    saved.push(...(data ?? []))
  }
  return saved
}

// Background execution para que el caller (cron-job.org, timeout 30s)
// reciba 200 al instante mientras el sync sigue corriendo.
// deno-lint-ignore no-explicit-any
const EdgeRuntimeRef = (globalThis as any).EdgeRuntime as
  { waitUntil?: (p: Promise<unknown>) => void } | undefined

async function runSync(forceFull: boolean) {
  {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: tor } = await supabase
      .from('tournaments').select('id, slug')
      .eq('slug', LEAGUE_SLUG).maybeSingle()
    if (!tor) return { ok: false, error: `torneo ${LEAGUE_SLUG} no existe` }

    const data = await fetchLeagueData()
    const notes: string[] = []

    // ---------- Equipos + zonas desde las tablas ----------
    const zoneOfTeam = new Map<string, string>() // url_name -> zona
    for (const g of data.tables_groups ?? []) {
      for (const t of g.tables ?? []) {
        const zm = (t.name as string).match(/zona\s+([a-z])/i) ?? (t.name as string).match(/grupo\s+([a-z])/i)
        const zoneName = zm ? `Zona ${zm[1].toUpperCase()}` : t.name
        for (const r of t.table?.rows ?? []) {
          const un = r.entity?.object?.url_name
          if (un) zoneOfTeam.set(un, zoneName)
        }
      }
    }

    const zoneIds = new Map<string, number>()
    for (const zn of new Set(zoneOfTeam.values())) {
      const { data: found } = await supabase
        .from('zones').select('id')
        .eq('tournament_id', tor.id).eq('name', zn).maybeSingle()
      if (found) { zoneIds.set(zn, found.id); continue }
      const { data: created } = await supabase
        .from('zones').insert({ tournament_id: tor.id, name: zn, sort_order: 50 })
        .select('id').single()
      if (created) zoneIds.set(zn, created.id)
    }

    // ---------- Standings (espejo Promiedos) ----------
    const sRows: Record<string, unknown>[] = []
    for (const g of data.tables_groups ?? []) {
      for (const t of g.tables ?? []) {
        for (const r of t.table?.rows ?? []) {
          const obj = r.entity?.object
          if (!obj?.name) continue
          const [gf, ga] = val(r, 'Goals').split(':').map(x => parseInt(x, 10) || 0)
          sRows.push({
            tournament_id: tor.id,
            group_name: g.name,
            table_name: t.name,
            num: r.num,
            team_slug: obj.url_name ?? slugify(obj.name),
            team_name: obj.name,
            short_name: obj.short_name ?? obj.name,
            played: parseInt(val(r, 'GamePlayed'), 10) || 0,
            won: parseInt(val(r, 'GamesWon'), 10) || 0,
            drawn: parseInt(val(r, 'GamesEven'), 10) || 0,
            lost: parseInt(val(r, 'GamesLost'), 10) || 0,
            gf, ga,
            gd: parseInt(val(r, 'Ratio'), 10) || 0,
            pts: parseInt(val(r, 'Points'), 10) || 0,
            destination_color: r.destination_color ?? null,
            updated_at: new Date().toISOString(),
          })
        }
      }
    }
    // Borrar tablas que ya no existen y upsert en batch
    const tableNames = [...new Set(sRows.map(r => r.table_name as string))]
    if (tableNames.length) {
      await supabase.from('standings_rows').delete()
        .eq('tournament_id', tor.id).not('table_name', 'in', `(${tableNames.map(t => `"${t}"`).join(',')})`)
      await chunkUpsert(supabase, 'standings_rows', sRows, 'tournament_id,table_name,team_slug')
    }
    notes.push(`standings: ${sRows.length} filas`)

    // ---------- Partidos ----------
    const allGames: PromGame[] = []
    const seen = new Set<string>()

    // Brackets (fases finales) — ya vienen en la page data
    for (const st of data.brackets?.stages ?? []) {
      for (const grp of st.groups ?? []) {
        for (const g of grp.games ?? []) {
          allGames.push({ ...g, stage_round_name: st.name })
          seen.add(g.id)
        }
      }
    }

    // Siempre los "Partidos actuales"; sweep completo 1 vez/dia o con ?full=1
    const filters: Array<{ name: string; key: string }> = data.games?.filters ?? []
    const today = new Date().toISOString().slice(0, 10)
    const { data: lastFull } = await supabase
      .from('sync_log').select('ran_at').eq('kind', 'full')
      .order('ran_at', { ascending: false }).limit(1)
    const fullDue = forceFull || (lastFull?.[0]?.ran_at ?? '').slice(0, 10) !== today

    const toFetch = fullDue
      ? filters
      : filters.filter(f => f.key === 'latest')

    for (const f of toFetch) {
      try {
        const { games } = await fetchJson(`${PROM_API}/league/games/${PROM_LEAGUE_ID}/${f.key}`)
        for (const g of games ?? []) {
          if (seen.has(g.id)) continue
          seen.add(g.id)
          allGames.push({ ...g, stage_round_name: g.stage_round_name ?? f.name })
        }
      } catch (e) {
        notes.push(`filtro ${f.key}: ${String(e)}`)
      }
    }
    notes.push(`${fullDue ? 'full' : 'latest'}: ${allGames.length} partidos`)

    // ---------- Equipos en batch ----------
    const teamMap = new Map<string, PromTeam>()
    for (const g of allGames) for (const t of g.teams ?? []) {
      if (t?.id && t?.name) teamMap.set(t.id, t)
    }

    const { data: existingTeams } = await supabase
      .from('teams').select('id, slug, name, short_name, api_team_id')
      .eq('tournament_id', tor.id)

    const teamByApiId = new Map<string, number>()
    const teamBySlug = new Map<string, number>()
    const teamByName = new Map<string, number>()
    for (const t of existingTeams ?? []) {
      if (t.api_team_id) teamByApiId.set(t.api_team_id, t.id)
      teamBySlug.set(t.slug, t.id)
      teamByName.set(nameKey(t.name), t.id)
      if (t.short_name) teamByName.set(nameKey(t.short_name), t.id)
    }

    // Linkear teams existentes (por api id, slug, o nombre normalizado)
    const toInsert: Record<string, unknown>[] = []
    for (const t of teamMap.values()) {
      const slug = t.url_name ?? slugify(t.name)
      const match = teamByApiId.get(t.id) ?? teamBySlug.get(slug) ?? teamByName.get(nameKey(t.name))
      if (!match) {
        toInsert.push({
          tournament_id: tor.id,
          zone_id: t.url_name ? zoneIds.get(zoneOfTeam.get(t.url_name) ?? '') ?? null : null,
          api_team_id: t.id,
          name: t.name,
          short_name: t.short_name ?? t.name,
          slug,
          logo_url: `https://api.promiedos.com.ar/images/team/${t.id}/1`,
        })
      }
    }
    if (toInsert.length) await chunkUpsert(supabase, 'teams', toInsert, 'slug')

    // Actualizar zona/logo de los existentes (barato, solo si hay cambios)
    for (const t of teamMap.values()) {
      const slug = t.url_name ?? slugify(t.name)
      const id = teamByApiId.get(t.id) ?? teamBySlug.get(slug) ?? teamByName.get(nameKey(t.name))
      const zn = t.url_name ? zoneOfTeam.get(t.url_name) : undefined
      const zid = zn ? zoneIds.get(zn) : undefined
      if (id && zid) {
        await supabase.from('teams').update({
          api_team_id: t.id,
          zone_id: zid,
          logo_url: `https://api.promiedos.com.ar/images/team/${t.id}/1`,
        }).eq('id', id)
      }
    }

    // id por api_team_id (recargar tras inserts)
    const { data: allTeams } = await supabase
      .from('teams').select('id, api_team_id').eq('tournament_id', tor.id)
    const idByApi = new Map((allTeams ?? []).map(t => [t.api_team_id as string, t.id as number]))

    // ---------- Partidos en batch ----------
    // proteger source='manual'
    const { data: manualIds } = await supabase
      .from('matches').select('api_fixture_id')
      .eq('tournament_id', tor.id).eq('source', 'manual')
    const manual = new Set((manualIds ?? []).map(m => m.api_fixture_id))

    const matchRows = allGames
      .filter(g => !manual.has(g.id))
      .map(g => {
        const home = g.teams?.[0]; const away = g.teams?.[1]
        if (!home || !away) return null
        const status = mapStatus(g)
        return {
          tournament_id: tor.id,
          zone_id: home.url_name ? zoneIds.get(zoneOfTeam.get(home.url_name) ?? '') ?? null : null,
          fecha_num: fechaNum(g.stage_round_name),
          stage: stageFromName(g.stage_round_name),
          kickoff_at: parseStartTime(g.start_time),
          status,
          minute: status === 'LIVE'
            ? parseInt((g.game_time_to_display ?? '').replace(/\D/g, ''), 10) || null
            : null,
          home_team_id: idByApi.get(home.id),
          away_team_id: idByApi.get(away.id),
          home_score: g.scores?.[0] ?? null,
          away_score: g.scores?.[1] ?? null,
          api_fixture_id: g.id,
          source: 'api',
        }
      })
      .filter(r => r && r.home_team_id && r.away_team_id)

    await chunkUpsert(supabase, 'matches', matchRows as Record<string, unknown>[], 'api_fixture_id')
    const matchIdByApi = new Map<string, number>()
    {
      const { data: ms } = await supabase
        .from('matches').select('id, api_fixture_id').eq('tournament_id', tor.id)
      for (const m of ms ?? []) if (m.api_fixture_id) matchIdByApi.set(m.api_fixture_id, m.id)
    }

    // ---------- Goleadores ----------
    const gamesWithGoals = allGames.filter(g =>
      !manual.has(g.id) && matchIdByApi.has(g.id) &&
      (g.teams?.[0]?.goals?.length || g.teams?.[1]?.goals?.length))

    const eventRows: Record<string, unknown>[] = []
    const matchIdsToReset: number[] = []
    for (const g of gamesWithGoals) {
      const mid = matchIdByApi.get(g.id)!
      matchIdsToReset.push(mid)
      for (const tIdx of [0, 1] as const) {
        const t = g.teams[tIdx]
        const teamId = idByApi.get(t.id) ?? null
        for (const ev of t.goals ?? []) {
          eventRows.push({
            match_id: mid, team_id: teamId,
            player_name: ev.player_sname ?? ev.player_name ?? '?',
            type: 'GOAL', detail: 'NORMAL',
            minute: ev.time ?? null,
          })
        }
      }
    }
    if (matchIdsToReset.length) {
      await supabase.from('match_events').delete().in('match_id', matchIdsToReset)
      await chunkUpsert(supabase, 'match_events', eventRows, 'id')
    }

    await supabase.from('sync_log').insert({
      kind: fullDue ? 'full' : 'promiedos',
      requests_used: 1 + toFetch.length,
      requests_remaining: null,
      status: 'ok',
      note: notes.join(' | '),
    })

    return { ok: true, notes, matches: matchRows.length }
  }
}

Deno.serve(async (req) => {
  try {
    if (!SYNC_KEY || req.headers.get('x-sync-key') !== SYNC_KEY) {
      return new Response('unauthorized', { status: 401 })
    }
    const forceFull = new URL(req.url).searchParams.get('full') === '1'

    const waitUntil = EdgeRuntimeRef?.waitUntil?.bind(EdgeRuntimeRef)
    if (waitUntil) {
      waitUntil(
        runSync(forceFull).catch(async (err) => {
          try {
            const sb = createClient(
              Deno.env.get('SUPABASE_URL')!,
              Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
            )
            await sb.from('sync_log').insert({
              kind: 'promiedos', status: 'error', note: String(err).slice(0, 500),
            })
          } catch { /* noop */ }
        }),
      )
      return Response.json({ ok: true, started: true })
    }
    return Response.json(await runSync(forceFull))
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 })
  }
})
