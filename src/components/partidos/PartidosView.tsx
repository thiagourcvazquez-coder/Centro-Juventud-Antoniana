'use client'

import { useMemo, useState } from 'react'
import type { Match, StatsData } from '@/lib/stats'
import { goleadores } from '@/lib/stats'

const JUVENTUD_SLUG = 'juventud-antoniana'

const STAGE_LABELS: Record<string, string> = {
  tercera_fase: 'Tercera fase',
  cuarta_fase: 'Cuarta fase',
  quinta_fase: 'Quinta fase (final)',
  reducido_16avos: 'Dieciseisavos de final',
  reducido_8vos: 'Octavos de final',
  reducido_4tos: 'Cuartos de final',
  reducido_semis: 'Semifinales',
  reducido_final: 'Final',
  revalida: 'Revalida',
}

function fmtFecha(iso: string | null): string {
  if (!iso) return 'A confirmar'
  return new Date(iso).toLocaleDateString('es-AR', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function fmtHora(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function TeamName({ name, short, logo }: { name: string; short: string | null; logo: string | null }) {
  return (
    <span className="p-team">
      {logo
        ? <img src={logo} alt="" className="p-team-logo" />
        : <span className="p-team-logo p-team-logo-fallback">{(short ?? name).slice(0, 3)}</span>}
      <span className="p-team-name">{short ?? name}</span>
    </span>
  )
}

function Goles({ m, side }: { m: Match; side: 'home' | 'away' }) {
  const lista = goleadores(m, side)
  if (!lista.length) return null
  return (
    <div className="p-goles">
      {lista.map((g, i) => <span key={i}>{g}</span>)}
    </div>
  )
}

function MatchRow({ m, highlight }: { m: Match; highlight?: boolean }) {
  const terminado = m.status === 'FINISHED'
  const enVivo = m.status === 'LIVE' || m.status === 'HT'
  const conGoles = terminado || enVivo
  return (
    <div className={`p-match${highlight ? ' p-match-juv' : ''}`}>
      <span className="p-match-fecha">
        {m.fecha_num != null ? `F${m.fecha_num}` : STAGE_LABELS[m.stage] ?? m.stage}
      </span>
      <div className="p-match-local">
        <TeamName name={m.home_team?.name ?? '?'} short={m.home_team?.short_name ?? null} logo={m.home_team?.logo_url ?? null} />
        {conGoles && <Goles m={m} side="home" />}
      </div>
      <div className="p-match-score">
        {enVivo ? (
          <span className="p-live">{m.status === 'HT' ? 'ET' : `${m.minute ?? 0}'`} {m.home_score ?? 0}–{m.away_score ?? 0}</span>
        ) : terminado ? (
          <span>{m.home_score} – {m.away_score}</span>
        ) : (
          <span className="p-match-hora">{fmtFecha(m.kickoff_at)} {fmtHora(m.kickoff_at)}</span>
        )}
      </div>
      <div className="p-match-visita">
        <TeamName name={m.away_team?.name ?? '?'} short={m.away_team?.short_name ?? null} logo={m.away_team?.logo_url ?? null} />
        {conGoles && <Goles m={m} side="away" />}
      </div>
    </div>
  )
}

export default function PartidosView({ data }: { data: StatsData }) {
  const { tournament, standings, matches, teams } = data
  const [tab, setTab] = useState<'posiciones' | 'fixture' | 'fases'>('posiciones')

  const logoPorSlug = useMemo(() => {
    const m = new Map<string, string | null>()
    for (const t of teams) m.set(t.slug, t.logo_url)
    return m
  }, [teams])

  // Agrupar standings por group_name -> table_name
  const tablas = useMemo(() => {
    const grupos = new Map<string, Map<string, typeof standings>>()
    for (const r of standings) {
      if (!grupos.has(r.group_name)) grupos.set(r.group_name, new Map())
      const g = grupos.get(r.group_name)!
      if (!g.has(r.table_name)) g.set(r.table_name, [])
      g.get(r.table_name)!.push(r)
    }
    return [...grupos.entries()].map(([group, tabs]) => ({
      group,
      tablas: [...tabs.entries()].map(([name, rows]) => ({ name, rows })),
    }))
  }, [standings])

  // Tabla activa: la que contiene a Juventud por defecto
  const todasLasTablas = useMemo(() => tablas.flatMap(g => g.tablas), [tablas])
  const tablaJuv = todasLasTablas.find(t => t.rows.some(r => r.team_slug === JUVENTUD_SLUG))
  const [tablaActiva, setTablaActiva] = useState<string | null>(null)
  const tablaSel = todasLasTablas.find(t => t.name === tablaActiva) ?? tablaJuv ?? todasLasTablas[0]

  const proximo = useMemo(() =>
    matches.find(m =>
      (m.status === 'SCHEDULED' || m.status === 'LIVE' || m.status === 'HT') &&
      (m.home_team?.slug === JUVENTUD_SLUG || m.away_team?.slug === JUVENTUD_SLUG)
    ), [matches])

  const ultimosJuv = useMemo(() =>
    matches.filter(m =>
      m.status === 'FINISHED' &&
      (m.home_team?.slug === JUVENTUD_SLUG || m.away_team?.slug === JUVENTUD_SLUG)
    ).slice(-3).reverse(), [matches])

  const fixture = useMemo(() => {
    const regulares = matches.filter(m => m.stage === 'regular')
    const porFecha = new Map<number, Match[]>()
    for (const m of regulares) {
      const f = m.fecha_num ?? 0
      if (!porFecha.has(f)) porFecha.set(f, [])
      porFecha.get(f)!.push(m)
    }
    return [...porFecha.entries()].sort((a, b) => a[0] - b[0])
  }, [matches])

  const fases = useMemo(() => {
    const grupos = new Map<string, Match[]>()
    for (const m of matches.filter(m => m.stage !== 'regular')) {
      if (!grupos.has(m.stage)) grupos.set(m.stage, [])
      grupos.get(m.stage)!.push(m)
    }
    return [...grupos.entries()]
  }, [matches])

  if (!tournament) {
    return (
      <section className="section partidos-page">
        <p className="overline">El Santo en la cancha</p>
        <h2>Partidos</h2>
        <div className="p-vacio">
          <p>Todavía no hay datos del torneo cargados.</p>
          <p className="p-vacio-sub">Las posiciones y el fixture aparecen acá cuando se cargue la información en la base.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="section partidos-page">
      <p className="overline">{tournament.name}</p>
      <h2>Partidos</h2>

      {proximo && (
        <div className="p-proximo">
          <span className="p-proximo-tag">{(proximo.status === 'LIVE' || proximo.status === 'HT') ? 'EN JUEGO' : 'PRÓXIMO PARTIDO'}</span>
          <MatchRow m={proximo} highlight />
        </div>
      )}

      {ultimosJuv.length > 0 && (
        <div className="p-ultimos">
          <h3>Últimos resultados del Santo</h3>
          {ultimosJuv.map(m => <MatchRow key={m.id} m={m} highlight />)}
        </div>
      )}

      <div className="p-tabs">
        {(['posiciones', 'fixture', 'fases'] as const).map(t => (
          <button
            key={t}
            className={`p-tab${tab === t ? ' activo' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'posiciones' ? 'Posiciones' : t === 'fixture' ? 'Fixture' : 'Fases finales'}
          </button>
        ))}
      </div>

      {tab === 'posiciones' && (
        <div>
          {todasLasTablas.length === 0 && (
            <p className="p-vacio-sub">Todavía no hay tabla de posiciones cargada.</p>
          )}
          {todasLasTablas.length > 1 && (
            <div className="p-zonas">
              {todasLasTablas.map(t => (
                <button
                  key={t.name}
                  className={`p-zona-tab${tablaSel?.name === t.name ? ' activo' : ''}`}
                  onClick={() => setTablaActiva(t.name)}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
          {tablaSel && (
            <div className="p-tabla-wrap">
              <table className="p-tabla">
                <thead>
                  <tr>
                    <th>#</th><th>Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th>
                    <th>GF</th><th>GC</th><th>DG</th><th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {tablaSel.rows.map(r => (
                    <tr
                      key={r.id}
                      className={r.team_slug === JUVENTUD_SLUG ? 'p-fila-juv' : ''}
                    >
                      <td>
                        <span className="p-pos">
                          {r.destination_color && <i className="p-dot" style={{ background: r.destination_color }} />}
                          {r.num}
                        </span>
                      </td>
                      <td><TeamName name={r.team_name} short={r.short_name} logo={logoPorSlug.get(r.team_slug) ?? null} /></td>
                      <td>{r.played}</td><td>{r.won}</td><td>{r.drawn}</td><td>{r.lost}</td>
                      <td>{r.gf}</td><td>{r.ga}</td>
                      <td>{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                      <td className="p-pts">{r.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'fixture' && (
        <div className="p-fixture">
          {fixture.length === 0 && <p className="p-vacio-sub">Todavía no hay partidos cargados.</p>}
          {fixture.map(([fecha, partidos]) => (
            <div key={fecha} className="p-fecha-grupo">
              <h3>Fecha {fecha}</h3>
              {partidos.map(m => (
                <MatchRow
                  key={m.id} m={m}
                  highlight={m.home_team?.slug === JUVENTUD_SLUG || m.away_team?.slug === JUVENTUD_SLUG}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === 'fases' && (
        <div className="p-fixture">
          {fases.length === 0 && (
            <p className="p-vacio-sub">Las fases finales (reducido / revalida) se cargan cuando terminan las posiciones regulares.</p>
          )}
          {fases.map(([stage, partidos]) => (
            <div key={stage} className="p-fecha-grupo">
              <h3>{STAGE_LABELS[stage] ?? stage}</h3>
              {partidos.map(m => (
                <MatchRow
                  key={m.id} m={m}
                  highlight={m.home_team?.slug === JUVENTUD_SLUG || m.away_team?.slug === JUVENTUD_SLUG}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
