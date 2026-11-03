import type { Payslip } from './types'
import { fmtDelta, fmtMoney, periodLabel, MONTHS } from './format'
import { amount, otherCurrency, type Currency } from './currency'

export const sortPayslips = (s: Payslip[]) => [...s].sort((a, b) => a.year - b.year || a.month - b.month)

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const median = (xs: number[]) => {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
export const variation = (a: number, b: number) => (b ? (a / b - 1) * 100 : null)

/** Métricas que dependen de la moneda */
function metrics(sorted: Payslip[], cur: Currency) {
  const net = (p: Payslip) => amount(p, 'net', cur)
  const last = sorted[sorted.length - 1]
  const prev = sorted.length > 1 ? sorted[sorted.length - 2] : null
  const lastYearSame = sorted.find((p) => p.year === last.year - 1 && p.month === last.month) ?? null
  const last12 = sorted.slice(-12)
  const ytd = sorted.filter((p) => p.year === last.year)
  const best = sorted.reduce((a, b) => (net(b) > net(a) ? b : a))
  const worst = sorted.reduce((a, b) => (net(b) < net(a) ? b : a))
  return {
    lastNet: net(last),
    vsPrev: prev ? variation(net(last), net(prev)) : null,
    yoy: lastYearSame ? variation(net(last), net(lastYearSame)) : null,
    avg12: avg(last12.map(net)),
    median12: median(last12.map(net)),
    ganancias12: sum(last12.map((p) => amount(p, 'ganancias', cur))),
    ytdNet: sum(ytd.map(net)),
    best,
    bestNet: net(best),
    worst,
    worstNet: net(worst),
    total: sum(sorted.map(net)),
  }
}

export function computeKpis(sorted: Payslip[], cur: Currency) {
  if (!sorted.length) return null
  const last = sorted[sorted.length - 1]
  const prev = sorted.length > 1 ? sorted[sorted.length - 2] : null
  const lastYearSame = sorted.find((p) => p.year === last.year - 1 && p.month === last.month) ?? null
  const last12 = sorted.slice(-12)
  const ytd = sorted.filter((p) => p.year === last.year)
  return {
    last,
    prev,
    lastYearSame,
    m: metrics(sorted, cur),
    alt: metrics(sorted, otherCurrency(cur)),
    ratio12: avg(last12.map((p) => p.net_gross_pct ?? 0)),
    refunds12: last12.filter((p) => p.ganancias > 0).length,
    ytdMonths: ytd.length,
    count: sorted.length,
  }
}

export type Kpis = NonNullable<ReturnType<typeof computeKpis>>

export function headline(k: Kpis, cur: Currency): string {
  const month = MONTHS[k.last.month - 1].toLowerCase()
  const base = `En ${month} ${k.last.year} cobraste ${fmtMoney(k.m.lastNet, cur)} netos`
  if (k.m.vsPrev == null || !k.prev) return `${base}.`
  const d = k.m.vsPrev
  if (Math.abs(d) < 0.5) return `${base}, lo mismo que en ${MONTHS[k.prev.month - 1].toLowerCase()}.`
  return `${base}, ${Math.abs(d).toLocaleString('es-AR', { maximumFractionDigits: 0 })}% ${d > 0 ? 'más' : 'menos'} que en ${MONTHS[k.prev.month - 1].toLowerCase()}.`
}

export { fmtDelta, periodLabel }
