import type { Payslip } from './types'
import { fmtDelta, fmtUSD, periodLabel, MONTHS } from './format'

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

export function computeKpis(sorted: Payslip[]) {
  if (!sorted.length) return null
  const last = sorted[sorted.length - 1]
  const prev = sorted.length > 1 ? sorted[sorted.length - 2] : null
  const lastYearSame = sorted.find((p) => p.year === last.year - 1 && p.month === last.month) ?? null
  const last12 = sorted.slice(-12)
  const ytd = sorted.filter((p) => p.year === last.year)
  const best = sorted.reduce((a, b) => (b.net_usd > a.net_usd ? b : a))
  const worst = sorted.reduce((a, b) => (b.net_usd < a.net_usd ? b : a))

  return {
    last,
    prev,
    lastYearSame,
    nets: { vsPrevArs: prev ? variation(last.net, prev.net) : null, vsPrevUsd: prev ? variation(last.net_usd, prev.net_usd) : null },
    yoyArs: lastYearSame ? variation(last.net, lastYearSame.net) : null,
    yoyUsd: lastYearSame ? variation(last.net_usd, lastYearSame.net_usd) : null,
    avgUsd12: avg(last12.map((p) => p.net_usd)),
    medianUsd12: median(last12.map((p) => p.net_usd)),
    ratio12: avg(last12.map((p) => p.net_gross_pct ?? 0)),
    ganancias12: sum(last12.map((p) => p.ganancias)),
    refunds12: last12.filter((p) => p.ganancias > 0).length,
    ytdNetUsd: sum(ytd.map((p) => p.net_usd)),
    ytdNetArs: sum(ytd.map((p) => p.net)),
    ytdMonths: ytd.length,
    best,
    worst,
    totalUsd: sum(sorted.map((p) => p.net_usd)),
    count: sorted.length,
  }
}

export type Kpis = NonNullable<ReturnType<typeof computeKpis>>

export function headline(k: Kpis): string {
  const month = MONTHS[k.last.month - 1].toLowerCase()
  const base = `En ${month} ${k.last.year} cobraste ${fmtUSD(k.last.net_usd)} netos`
  if (k.nets.vsPrevUsd == null || !k.prev) return `${base}.`
  const d = k.nets.vsPrevUsd
  if (Math.abs(d) < 0.5) return `${base}, lo mismo que en ${MONTHS[k.prev.month - 1].toLowerCase()}.`
  return `${base}, ${Math.abs(d).toLocaleString('es-AR', { maximumFractionDigits: 0 })}% ${d > 0 ? 'más' : 'menos'} que en ${MONTHS[k.prev.month - 1].toLowerCase()}.`
}

export { fmtDelta, periodLabel }
