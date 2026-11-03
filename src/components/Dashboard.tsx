import { useMemo, useState } from 'react'
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart,
  LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { Payslip } from '../lib/types'
import { computeKpis, headline, sortPayslips, variation } from '../lib/kpis'
import {
  MONTHS_SHORT, fmtARS, fmtCompact, fmtDelta, fmtMoney, fmtNum, fmtPct, periodLabel, shortLabel,
} from '../lib/format'
import { amount, currencyName, otherCurrency, type Currency } from '../lib/currency'

const C = { net: '#0E7C66', gross: '#3B4CCA', fx: '#B7791F', neg: '#C2412D', pos: '#0E7C66', ink: '#14202B', grid: '#DDE3E9', ma: '#14202B' }
const YEAR_COLORS = ['#9AA7B4', '#6E8CB5', '#3B4CCA', '#0E7C66', '#B7791F', '#C2412D', '#14202B']

type Range = 12 | 24 | 36 | 0

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lbl = (_: any, p: any): string => (p?.[0]?.payload?.full as string) ?? ''

const axis = { stroke: '#5B6B7A', fontSize: 12, tickLine: false, axisLine: false } as const

export default function Dashboard({ payslips, cur }: { payslips: Payslip[]; cur: Currency }) {
  const [range, setRange] = useState<Range>(36)

  const sorted = useMemo(() => sortPayslips(payslips), [payslips])
  const k = useMemo(() => computeKpis(sorted, cur), [sorted, cur])

  const series = useMemo(
    () =>
      sorted.map((p, i) => {
        const win = sorted.slice(Math.max(0, i - 5), i + 1)
        return {
          ...p,
          label: shortLabel(p),
          full: periodLabel(p),
          netC: amount(p, 'net', cur),
          grossC: amount(p, 'gross', cur),
          ganC: amount(p, 'ganancias', cur),
          ma6: win.length === 6 ? win.reduce((a, x) => a + amount(x, 'net', cur), 0) / 6 : null,
        }
      }),
    [sorted, cur],
  )
  const visible = range ? series.slice(-range) : series

  const years = useMemo(() => [...new Set(sorted.map((p) => p.year))], [sorted])
  const byMonth = useMemo(
    () =>
      MONTHS_SHORT.map((m, i) => {
        const row: Record<string, number | string | null> = { month: m }
        years.forEach((y) => {
          const p = sorted.find((x) => x.year === y && x.month === i + 1)
          row[`y${y}`] = p ? amount(p, 'net', cur) : null
        })
        return row
      }),
    [sorted, years, cur],
  )
  const yearly = useMemo(
    () =>
      years.map((y) => {
        const ps = sorted.filter((p) => p.year === y)
        return { year: String(y), avg: ps.reduce((a, p) => a + amount(p, 'net', cur), 0) / ps.length, months: ps.length }
      }),
    [sorted, years, cur],
  )

  if (!k) {
    return (
      <section className="empty">
        <h2>Sin datos para graficar</h2>
        <p className="muted">Cargá tu primer recibo o corré el seed.sql para importar el historial.</p>
      </section>
    )
  }

  const money = (v: unknown, dec = true) => fmtMoney(Number(v), cur, dec)
  const moneyTick = (v: number) => (cur === 'USD' ? fmtNum(v) : fmtCompact(v))
  const avgRatio = visible.reduce((a, p) => a + (p.net_gross_pct ?? 0), 0) / visible.length
  const cn = currencyName(cur)
  const an = currencyName(otherCurrency(cur))
  const { m, alt } = k

  const kpiItems = [
    { label: 'Neto del último mes', value: money(m.lastNet), sub: `${fmtDelta(m.vsPrev)} vs mes anterior, TC ${fmtARS(k.last.fx_rate)}` },
    { label: 'Mediana últimos 12 meses', value: money(m.median12, false), sub: `Promedio ${money(m.avg12, false)}; la mediana filtra aguinaldos y bonos` },
    { label: `Interanual en ${cn}`, value: fmtDelta(m.yoy), sub: k.lastYearSame ? `En ${an} ${fmtDelta(alt.yoy)} contra ${periodLabel(k.lastYearSame)}` : 'Sin el mismo mes del año anterior' },
    { label: 'Neto sobre bruto, 12 meses', value: fmtPct(k.ratio12), sub: 'Promedio de lo que llega a tu bolsillo' },
    { label: 'Ganancias, saldo 12 meses', value: money(m.ganancias12, false), sub: `${k.refunds12} ${k.refunds12 === 1 ? 'mes' : 'meses'} con devolución` },
    { label: `Acumulado ${k.last.year}`, value: money(m.ytdNet, false), sub: `${fmtMoney(alt.ytdNet, otherCurrency(cur))} en ${k.ytdMonths} ${k.ytdMonths === 1 ? 'recibo' : 'recibos'}` },
    { label: `Mejor mes en ${cn}`, value: money(m.bestNet, false), sub: periodLabel(m.best) },
    { label: `Mes más bajo en ${cn}`, value: money(m.worstNet, false), sub: periodLabel(m.worst) },
    { label: 'Total cobrado desde el inicio', value: money(m.total, false), sub: `${k.count} recibos, desde ${periodLabel(sorted[0])}` },
  ]

  return (
    <div className="dash">
      <header className="hero">
        <h1>{headline(k, cur)}</h1>
        <div className="controls" role="group" aria-label="Período del gráfico">
          {([12, 24, 36, 0] as Range[]).map((r) => (
            <button key={r} className={`chip ${range === r ? 'on' : ''}`} onClick={() => setRange(r)}>
              {r ? `${r} meses` : 'Todo'}
            </button>
          ))}
        </div>
      </header>

      <section className="chart hero-chart" aria-label={`Neto mensual en ${cn}`}>
        <h2>Neto mensual</h2>
        <p className="muted small">Cada barra es un recibo, con el % que representa el neto sobre el bruto. La línea es el promedio de los últimos 6 meses.</p>
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart data={visible} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="label" {...axis} minTickGap={18} />
            <YAxis {...axis} tickFormatter={moneyTick} width={52} domain={[0, (max: number) => Math.ceil(max * 1.2)]} />
            <Tooltip
              formatter={(v: unknown, n: unknown, item: { payload?: { net_gross_pct?: number | null } }) =>
                String(n) === `Neto ${cur}` ? [`${money(v)} (${fmtPct(item?.payload?.net_gross_pct, 2)} del bruto)`, String(n)] : [money(v), String(n)]}
              labelFormatter={lbl}
            />
            <Bar dataKey="netC" name={`Neto ${cur}`} fill={C.net} radius={[2, 2, 0, 0]} maxBarSize={22}>
              <LabelList dataKey="net_gross_pct" content={(props) => <RatioLabel {...props} compact={visible.length > 14} />} />
            </Bar>
            <Line dataKey="ma6" name="Promedio 6 meses" stroke={C.ma} strokeWidth={2.2} dot={false} connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </section>

      <dl className="kpis">
        {kpiItems.map((i) => (
          <div key={i.label} className="kpi">
            <dt>{i.label}</dt>
            <dd>{i.value}</dd>
            <p>{i.sub}</p>
          </div>
        ))}
      </dl>

      <div className="grid2">
        <section className="chart">
          <h2>Bruto y neto</h2>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={visible} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="label" {...axis} minTickGap={18} />
              <YAxis {...axis} tickFormatter={moneyTick} width={52} />
              <Tooltip formatter={(v: unknown, n: unknown) => [money(v), String(n)]} labelFormatter={lbl} />
              <Legend iconType="plainline" />
              <Area dataKey="grossC" name="Bruto" stroke={C.gross} fill={C.gross} fillOpacity={0.12} strokeWidth={2} />
              <Line dataKey="netC" name="Neto" stroke={C.net} strokeWidth={2.2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </section>

        <section className="chart">
          <h2>Cuánto llega de cada peso bruto</h2>
          <p className="muted small">Neto sobre bruto. Promedio del período: {fmtPct(avgRatio)}.</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={visible} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="label" {...axis} minTickGap={18} />
              <YAxis {...axis} domain={['auto', 'auto']} tickFormatter={(v) => `${Math.round(v)}%`} width={44} />
              <Tooltip formatter={(v: unknown) => [fmtPct(Number(v), 2), 'Neto/Bruto']} labelFormatter={lbl} />
              <ReferenceLine y={avgRatio} stroke={C.ink} strokeDasharray="4 4" />
              <Line dataKey="net_gross_pct" stroke={C.net} strokeWidth={2.2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </section>

        <section className="chart">
          <h2>Ganancias mes a mes</h2>
          <p className="muted small">Hacia abajo es lo que te retuvieron, hacia arriba lo que te devolvieron.</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={visible} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="label" {...axis} minTickGap={18} />
              <YAxis {...axis} tickFormatter={moneyTick} width={52} />
              <Tooltip formatter={(v: unknown) => [money(v), 'Ganancias']} labelFormatter={lbl} />
              <ReferenceLine y={0} stroke={C.ink} />
              <Bar dataKey="ganC" maxBarSize={22}>
                {visible.map((p) => <Cell key={p.id} fill={p.ganC >= 0 ? C.pos : C.neg} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="chart">
          <h2>Tipo de cambio usado</h2>
          <p className="muted small">Pesos por dólar en cada recibo.</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={visible} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="label" {...axis} minTickGap={18} />
              <YAxis {...axis} tickFormatter={fmtNum} width={52} />
              <Tooltip formatter={(v: unknown) => [fmtARS(Number(v)), 'TC']} labelFormatter={lbl} />
              <Line dataKey="fx_rate" stroke={C.fx} strokeWidth={2.2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </section>

        <section className="chart">
          <h2>Promedio anual en {cn}</h2>
          <p className="muted small">Neto promedio por recibo de cada año (incluye aguinaldos y bonos).</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={yearly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="year" {...axis} />
              <YAxis {...axis} tickFormatter={moneyTick} width={52} />
              <Tooltip formatter={(v: unknown) => [money(v, false), 'Promedio']} />
              <Bar dataKey="avg" fill={C.gross} radius={[2, 2, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="chart">
          <h2>Un año contra otro</h2>
          <p className="muted small">Neto en {cn} por mes, una línea por año.</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={byMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="month" {...axis} />
              <YAxis {...axis} tickFormatter={moneyTick} width={52} />
              <Tooltip formatter={(v: unknown, n: unknown) => [money(v, false), String(n).replace('y', '')]} />
              <Legend formatter={(v) => String(v).replace('y', '')} iconType="plainline" />
              {years.map((y, i) => (
                <Line key={y} dataKey={`y${y}`} stroke={YEAR_COLORS[Math.max(0, YEAR_COLORS.length - years.length + i)]} strokeWidth={y === years[years.length - 1] ? 2.8 : 1.6} dot={false} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </section>
      </div>

      <Heatmap sorted={sorted} years={years} cur={cur} />
    </div>
  )
}

function Heatmap({ sorted, years, cur }: { sorted: Payslip[]; years: number[]; cur: Currency }) {
  const val = (p: Payslip) => amount(p, 'net', cur)
  const cell = (v: number) => (cur === 'USD' ? fmtNum(v) : fmtCompact(v))
  const vals = sorted.map(val)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const shade = (v: number) => {
    const t = max === min ? 0 : (v - min) / (max - min)
    return `rgba(14,124,102,${0.08 + t * 0.75})`
  }
  return (
    <section className="chart">
      <h2>Mapa de sueldos en {currencyName(cur)}</h2>
      <p className="muted small">Cuanto más oscuro el verde, mayor el neto en {cur === 'USD' ? 'dólares' : 'pesos'}. Los picos de junio, octubre y diciembre se ven enseguida.</p>
      <div className="table-wrap">
        <table className="heat">
          <thead>
            <tr>
              <th />
              {MONTHS_SHORT.map((m) => <th key={m} className="r">{m}</th>)}
              <th className="r">Promedio</th>
              <th className="r">Δ año ant.</th>
            </tr>
          </thead>
          <tbody>
            {years.map((y, idx) => {
              const ps = sorted.filter((p) => p.year === y)
              const avg = ps.reduce((a, p) => a + val(p), 0) / ps.length
              const prevPs = idx > 0 ? sorted.filter((p) => p.year === years[idx - 1]) : []
              const prevAvg = prevPs.length ? prevPs.reduce((a, p) => a + val(p), 0) / prevPs.length : 0
              return (
                <tr key={y}>
                  <th scope="row">{y}</th>
                  {MONTHS_SHORT.map((_, mi) => {
                    const p = ps.find((x) => x.month === mi + 1)
                    return p ? (
                      <td key={mi} className="r" style={{ background: shade(val(p)) }} title={`${periodLabel(p)}: ${fmtMoney(val(p), cur, true)}`}>
                        {cell(val(p))}
                      </td>
                    ) : (
                      <td key={mi} className="r empty-cell">·</td>
                    )
                  })}
                  <td className="r strong">{cell(avg)}</td>
                  <td className="r">{prevAvg ? fmtDelta(variation(avg, prevAvg)) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/** Etiqueta con el % neto/bruto arriba de cada barra */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RatioLabel(props: any) {
  const { x, y, width, value, compact } = props
  if (value == null || x == null || y == null) return null
  const cx = Number(x) + Number(width) / 2
  const text = fmtPct(Number(value), 2)
  return compact ? (
    <text x={cx} y={Number(y) - 6} transform={`rotate(-90 ${cx} ${Number(y) - 6})`} textAnchor="start" dominantBaseline="central" fontSize={10} fill="#5B6B7A">{text}</text>
  ) : (
    <text x={cx} y={Number(y) - 6} textAnchor="middle" fontSize={11} fill="#5B6B7A">{text}</text>
  )
}
