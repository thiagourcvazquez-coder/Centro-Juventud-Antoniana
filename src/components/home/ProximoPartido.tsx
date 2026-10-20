import Link from 'next/link'
import type { Match, Team } from '@/lib/stats'

const fecha = (iso: string | null) => {
  if (!iso) return { dia: 'A confirmar', hora: '' }
  const d = new Date(iso)
  const dia = d.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Argentina/Salta',
  })
  const hora = d.toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Argentina/Salta',
  })
  return { dia, hora: `${hora} hs` }
}

function Escudo({ team }: { team?: Team }) {
  const ini = (team?.short_name ?? team?.name ?? '?').slice(0, 3).toUpperCase()
  return team?.logo_url
    ? <img src={team.logo_url} alt={team.name} className="ed-pp-escudo" />
    : <span className="ed-pp-escudo ed-pp-ini">{ini}</span>
}

function Lado({ team, score, mostrar }: { team?: Team; score: number | null; mostrar: boolean }) {
  return (
    <div className="ed-pp-lado">
      <Escudo team={team} />
      <span className="ed-pp-nombre">{team?.name ?? 'A definir'}</span>
      {mostrar && <span className="ed-pp-score">{score ?? 0}</span>}
    </div>
  )
}

export default function ProximoPartido({ next, last }: { next: Match | null; last: Match | null }) {
  const m = next ?? last
  if (!m) return null
  const vivo = m.status === 'LIVE' || m.status === 'HT'
  const jugado = m.status === 'FINISHED'
  const f = fecha(m.kickoff_at)
  const etiqueta = vivo ? 'En juego' : jugado ? 'Último resultado' : 'Próximo partido'

  return (
    <section className="ed-pp" data-rv>
      <div className="ed-pp-top">
        <p className="ed-eyebrow">
          {vivo && <i className="ed-live" />}
          {etiqueta}
          {vivo && m.minute ? ` · ${m.minute}'` : ''}
        </p>
        <Link href="/partidos" className="ed-link">
          Fixture y posiciones <span aria-hidden>→</span>
        </Link>
      </div>

      <div className="ed-pp-card">
        <Lado team={m.home_team} score={m.home_score} mostrar={vivo || jugado} />
        <div className="ed-pp-medio">
          {vivo || jugado ? <span className="ed-pp-vs">—</span> : <span className="ed-pp-vs ed-serif">vs</span>}
          <span className="ed-pp-dia">{f.dia}</span>
          {f.hora && !jugado && <span className="ed-pp-hora">{f.hora}</span>}
        </div>
        <Lado team={m.away_team} score={m.away_score} mostrar={vivo || jugado} />
      </div>
    </section>
  )
}
