import type { Metadata } from 'next'
import ResultadoPago from './ResultadoPago'

export const metadata: Metadata = {
  title: 'Resultado del pago - CJA',
}

type Params = { [key: string]: string | string[] | undefined }

export default async function ResultadoPage({
  searchParams,
}: {
  searchParams: Promise<Params>
}) {
  const params = await searchParams
  const get = (k: string) => {
    const v = params[k]
    return typeof v === 'string' ? v : null
  }

  // MP devuelve tanto `status` como `collection_status`
  const status = get('status') ?? get('collection_status') ?? ''

  const estado =
    status === 'approved'
      ? 'aprobado'
      : status === 'rejected' || status === 'cancelled' || status === 'failure'
        ? 'rechazado'
        : 'pendiente'

  return (
    <ResultadoPago
      estado={estado as 'aprobado' | 'pendiente' | 'rechazado'}
      paymentId={get('payment_id') ?? get('collection_id')}
      externalRef={get('external_reference')}
    />
  )
}
