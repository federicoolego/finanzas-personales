import type { Payslip } from './types'

export type Currency = 'USD' | 'ARS'

export const CURRENCY_KEY = 'recibos.currency'
export const otherCurrency = (c: Currency): Currency => (c === 'USD' ? 'ARS' : 'USD')
export const currencyName = (c: Currency) => (c === 'USD' ? 'dólares' : 'pesos')

/** Monto de un recibo en la moneda elegida. Ganancias se convierte con el TC del propio recibo. */
export function amount(p: Payslip, field: 'net' | 'gross' | 'ganancias', cur: Currency): number {
  if (cur === 'ARS') return p[field]
  if (field === 'net') return p.net_usd
  if (field === 'gross') return p.gross_usd
  return p.fx_rate ? p.ganancias / p.fx_rate : 0
}
