import MercadoPagoConfig, { Preference, Payment } from 'mercadopago'
import { env } from './env'

let client: MercadoPagoConfig | null = null

function mp(): MercadoPagoConfig {
  if (!client) client = new MercadoPagoConfig({ accessToken: env.mpAccessToken() })
  return client
}

export function mpPreference() {
  return new Preference(mp())
}

export function mpPayment() {
  return new Payment(mp())
}
