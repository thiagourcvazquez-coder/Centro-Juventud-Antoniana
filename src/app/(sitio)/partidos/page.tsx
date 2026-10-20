import { getStatsData } from '@/lib/stats'
import PartidosView from '@/components/partidos/PartidosView'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Partidos | Centro Juventud Antoniana',
  description: 'Fixture, resultados, tabla de posiciones y reducido del Torneo Federal A.',
}

export default async function PartidosPage() {
  const data = await getStatsData()
  return <PartidosView data={data} />
}
