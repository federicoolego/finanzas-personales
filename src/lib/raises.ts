import type { SalaryRaise } from './types'
import { MONTHS, fmtARS, fmtPP, fmtPct, shortLabel } from './format'

const key = (r: { year: number; month: number }) => r.year * 12 + r.month - 1
export const sortRaises = (s: SalaryRaise[]) => [...s].sort((a, b) => key(a) - key(b))

export interface RaiseRow extends SalaryRaise {
  prev: SalaryRaise | null
  amount: number | null // aumento en $ contra el ajuste anterior
  pct: number | null // % de aumento contra el ajuste anterior
  base12: SalaryRaise | null // sueldo vigente 12 meses antes
  yoy: number | null // % de aumento interanual
  diff: number | null // % interanual - IPC interanual (puntos porcentuales)
  real: number | null // aumento real: (1+yoy)/(1+ipc)-1
}

/**
 * Regla (la misma de tu Excel): el interanual compara contra el sueldo que estaba
 * vigente 12 meses antes, es decir el último ajuste con período <= (período - 12 meses).
 */
export function computeRaises(list: SalaryRaise[]): RaiseRow[] {
  const s = sortRaises(list)
  return s.map((r, i) => {
    const prev = i > 0 ? s[i - 1] : null
    let base12: SalaryRaise | null = null
    for (let j = i - 1; j >= 0; j--) {
      if (key(s[j]) <= key(r) - 12) {
        base12 = s[j]
        break
      }
    }
    const yoy = base12 ? (r.salary / base12.salary - 1) * 100 : null
    const diff = yoy != null && r.ipc_yoy != null ? yoy - r.ipc_yoy : null
    const real = yoy != null && r.ipc_yoy != null ? ((1 + yoy / 100) / (1 + r.ipc_yoy / 100) - 1) * 100 : null
    return {
      ...r,
      prev,
      amount: prev ? r.salary - prev.salary : null,
      pct: prev ? (r.salary / prev.salary - 1) * 100 : null,
      base12,
      yoy,
      diff,
      real,
    }
  })
}

/** Sueldo vigente mes a mes, para el gráfico escalonado. */
export function monthlySeries(rows: RaiseRow[]) {
  if (!rows.length) return []
  const out: { label: string; full: string; salary: number }[] = []
  let idx = 0
  for (let k = key(rows[0]); k <= key(rows[rows.length - 1]); k++) {
    while (idx + 1 < rows.length && key(rows[idx + 1]) <= k) idx++
    const year = Math.floor(k / 12)
    const month = (k % 12) + 1
    out.push({ label: shortLabel({ year, month }), full: `${MONTHS[month - 1]} ${year}`, salary: rows[idx].salary })
  }
  return out
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const median = (xs: number[]) => {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export function raiseKpis(rows: RaiseRow[]) {
  if (!rows.length) return null
  const first = rows[0]
  const last = rows[rows.length - 1]
  const withPct = rows.filter((r) => r.pct != null)
  const withDiff = rows.filter((r) => r.diff != null)
  const latestComplete = withDiff.length ? withDiff[withDiff.length - 1] : null
  const best = withDiff.length ? withDiff.reduce((a, b) => (b.diff! > a.diff! ? b : a)) : null
  const worst = withDiff.length ? withDiff.reduce((a, b) => (b.diff! < a.diff! ? b : a)) : null
  return {
    first,
    last,
    ratio: last.salary / first.salary,
    avgPct: avg(withPct.map((r) => r.pct!)),
    medianPct: median(withPct.map((r) => r.pct!)),
    monthsBetween: rows.length > 1 ? (key(last) - key(first)) / (rows.length - 1) : null,
    latestComplete,
    wins: withDiff.filter((r) => r.diff! > 0).length,
    totalCompared: withDiff.length,
    best,
    worst,
  }
}
export type RaiseKpis = NonNullable<ReturnType<typeof raiseKpis>>

export function raiseHeadline(k: RaiseKpis): string {
  const month = MONTHS[k.last.month - 1].toLowerCase()
  if (k.last.pct == null) return `Tu sueldo bruto base desde ${month} ${k.last.year} es ${fmtARS(k.last.salary)}.`
  return `En ${month} ${k.last.year} tu sueldo base subió ${fmtPct(k.last.pct, 1)} y llegó a ${fmtARS(k.last.salary)}.`
}

export function raiseSubline(k: RaiseKpis): string | null {
  const c = k.latestComplete
  if (!c) return null
  const when = `${MONTHS[c.month - 1].toLowerCase()} ${c.year}`
  const gap = fmtPP(Math.abs(c.diff!)).replace('+', '')
  const verdict = c.diff! >= 0 ? `le ganaste a la inflación por ${gap}` : `quedaste ${gap} por debajo de la inflación`
  return `Con el último dato de IPC (${when}), tu aumento interanual fue ${fmtPct(c.yoy, 1)} contra una inflación de ${fmtPct(c.ipc_yoy, 1)}: ${verdict}.`
}
