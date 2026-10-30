export const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
export const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const ars = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
const arsDec = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const num0 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })
const num2 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const compact = new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 })

export const fmtARS = (v: number) => ars.format(v)
export const fmtARSDec = (v: number) => arsDec.format(v)
export const fmtUSD = (v: number) => `USD ${num0.format(v)}`
export const fmtUSDDec = (v: number) => `USD ${num2.format(v)}`
export const fmtNum = (v: number) => num0.format(v)
export const fmtCompact = (v: number) => compact.format(v)
export const fmtPct = (v: number | null | undefined, digits = 1) =>
  v == null || !isFinite(v) ? '—' : `${v.toLocaleString('es-AR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`
export const fmtDelta = (v: number | null | undefined) =>
  v == null || !isFinite(v) ? '—' : `${v > 0 ? '+' : ''}${v.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`

export const periodLabel = (p: { year: number; month: number }) => `${MONTHS[p.month - 1]} ${p.year}`
export const shortLabel = (p: { year: number; month: number }) => `${MONTHS_SHORT[p.month - 1]} ${String(p.year).slice(2)}`

/** Acepta "1.234.567,89", "1234567.89", "$ 1.234,5", "-17.045" */
export function parseNum(input: string): number {
  let s = input.replace(/[$\s]|USD/gi, '')
  if (s === '' || s === '-') return NaN
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
  return Number(s)
}

/** Diferencia en puntos porcentuales, ej: "+31,9 pp" */
export const fmtPP = (v: number | null | undefined) =>
  v == null || !isFinite(v) ? '—' : `${v > 0 ? '+' : ''}${v.toLocaleString('es-AR', { maximumFractionDigits: 1 })} pp`
