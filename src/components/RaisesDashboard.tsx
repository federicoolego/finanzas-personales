import { useMemo, useState } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { SalaryRaise } from '../lib/types'
import { computeRaises, monthlySeries, raiseHeadline, raiseKpis, raiseSubline } from '../lib/raises'
import { fmtARS, fmtCompact, fmtDelta, fmtPP, fmtPct, periodLabel, shortLabel } from '../lib/format'

const C = { net: '#0E7C66', gross: '#3B4CCA', fx: '#B7791F', neg: '#C2412D', ink: '#14202B', grid: '#DDE3E9' }
const axis = { stroke: '#5B6B7A', fontSize: 12, tickLine: false, axisLine: false } as const
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lbl = (_: any, p: any): string => (p?.[0]?.payload?.full as string) ?? ''

export default function RaisesDashboard({ raises }: { raises: SalaryRaise[] }) {
  const [log, setLog] = useState(false)
  const [metric, setMetric] = useState<'diff' | 'real'>('diff')

  const rows = useMemo(() => computeRaises(raises), [raises])
  const k = useMemo(() => raiseKpis(rows), [rows])
  const monthly = useMemo(() => monthlySeries(rows), [rows])

  const events = useMemo(() => rows.map((r) => ({ ...r, label: shortLabel(r), full: periodLabel(r) })), [rows])
  const compare = events.filter((r) => r.yoy != null)
  const withDiff = events.filter((r) => r.diff != null)
  const withPct = events.filter((r) => r.pct != null)

  if (!k) {
    return (
      <section className="empty">
        <h2>Sin aumentos para graficar</h2>
        <p className="muted">Cargá tu primer aumento o corré seed_aumentos.sql para importar el historial.</p>
      </section>
    )
  }

  const sub = raiseSubline(k)
  const c = k.latestComplete

  const items = [
    { label: 'Sueldo bruto base', value: fmtARS(k.last.salary), sub: `Rige desde ${periodLabel(k.last)}` },
    { label: 'Último aumento', value: fmtPct(k.last.pct), sub: k.last.amount != null ? `${fmtARS(k.last.amount)} sobre ${periodLabel(k.last.prev!)}` : 'Es el primer ajuste cargado' },
    { label: 'Desde el primer ajuste', value: `×${k.ratio.toLocaleString('es-AR', { maximumFractionDigits: 1 })}`, sub: `De ${fmtARS(k.first.salary)} en ${periodLabel(k.first)}` },
    { label: 'Aumento interanual vigente', value: fmtPct(k.last.yoy), sub: k.last.ipc_yoy == null ? 'Falta cargar el IPC de ese mes' : `IPC ${fmtPct(k.last.ipc_yoy)}, diferencia ${fmtPP(k.last.diff)}` },
    { label: 'Diferencia contra la inflación', value: c ? fmtPP(c.diff) : '—', sub: c ? `Último dato completo, ${periodLabel(c)}` : 'Sin datos de IPC' },
    { label: 'Aumento real interanual', value: c ? fmtDelta(c.real) : '—', sub: 'Descontada la inflación, en el último dato completo' },
    { label: 'Ajustes por encima del IPC', value: k.totalCompared ? `${k.wins} de ${k.totalCompared}` : '—', sub: 'Ajustes con aumento interanual e IPC cargados' },
    { label: 'Aumento promedio por ajuste', value: fmtPct(k.avgPct), sub: `Mediana ${fmtPct(k.medianPct)}` },
    { label: 'Cada cuánto te ajustan', value: k.monthsBetween == null ? '—' : `${k.monthsBetween.toLocaleString('es-AR', { maximumFractionDigits: 1 })} meses`, sub: `${rows.length} ajustes desde ${periodLabel(k.first)}` },
    { label: 'Mejor ajuste contra el IPC', value: k.best ? fmtPP(k.best.diff) : '—', sub: k.best ? periodLabel(k.best) : '' },
    { label: 'Peor ajuste contra el IPC', value: k.worst ? fmtPP(k.worst.diff) : '—', sub: k.worst ? periodLabel(k.worst) : '' },
  ]

  return (
    <div className="dash">
      <header className="hero hero-col">
        <h1>{raiseHeadline(k)}</h1>
        {sub && <p className="muted lead">{sub}</p>}
      </header>

      <section className="chart hero-chart" aria-label="Sueldo bruto base en el tiempo">
        <div className="chart-head">
          <div>
            <h2>Sueldo bruto base mes a mes</h2>
            <p className="muted small">Cada escalón es un ajuste. {log ? 'Escala logarítmica: una misma pendiente es un mismo % de aumento.' : 'Escala lineal.'}</p>
          </div>
          <div className="controls">
            <button className={`chip ${!log ? 'on' : ''}`} onClick={() => setLog(false)}>Lineal</button>
            <button className={`chip ${log ? 'on' : ''}`} onClick={() => setLog(true)}>Logarítmica</button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <AreaChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="label" {...axis} minTickGap={24} />
            <YAxis {...axis} scale={log ? 'log' : 'linear'} domain={log ? ['dataMin', 'dataMax'] : [0, 'auto']} tickFormatter={fmtCompact} width={52} />
            <Tooltip formatter={(v: unknown) => [fmtARS(Number(v)), 'Sueldo bruto']} labelFormatter={lbl} />
            <Area type="stepAfter" dataKey="salary" stroke={C.gross} strokeWidth={2.2} fill={C.gross} fillOpacity={0.12} />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      <dl className="kpis">
        {items.map((i) => (
          <div key={i.label} className="kpi">
            <dt>{i.label}</dt>
            <dd>{i.value}</dd>
            <p>{i.sub}</p>
          </div>
        ))}
      </dl>

      <div className="grid2">
        <section className="chart">
          <h2>Tu aumento contra la inflación</h2>
          <p className="muted small">Variación interanual en cada ajuste: lo que subió tu sueldo y lo que subieron los precios.</p>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={compare} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="label" {...axis} minTickGap={14} />
              <YAxis {...axis} tickFormatter={(v) => `${Math.round(v)}%`} width={48} />
              <Tooltip formatter={(v: unknown, n: unknown) => [fmtPct(Number(v), 1), String(n)]} labelFormatter={lbl} />
              <Legend iconType="square" />
              <Bar dataKey="yoy" name="Tu aumento interanual" fill={C.net} maxBarSize={16} radius={[2, 2, 0, 0]} />
              <Bar dataKey="ipc_yoy" name="IPC interanual" fill={C.fx} maxBarSize={16} radius={[2, 2, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </section>

        <section className="chart">
          <div className="chart-head">
            <div>
              <h2>{metric === 'diff' ? 'Diferencia contra el IPC' : 'Aumento real'}</h2>
              <p className="muted small">
                {metric === 'diff' ? 'Tu % interanual menos el IPC interanual, en puntos porcentuales.' : 'Cuánto cambió tu poder de compra respecto de un año antes.'} Verde es ganarle a la inflación.
              </p>
            </div>
            <div className="controls">
              <button className={`chip ${metric === 'diff' ? 'on' : ''}`} onClick={() => setMetric('diff')}>Puntos</button>
              <button className={`chip ${metric === 'real' ? 'on' : ''}`} onClick={() => setMetric('real')}>Real %</button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={withDiff} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="label" {...axis} minTickGap={14} />
              <YAxis {...axis} tickFormatter={(v) => `${Math.round(v)}`} width={44} />
              <Tooltip formatter={(v: unknown) => [metric === 'diff' ? fmtPP(Number(v)) : fmtDelta(Number(v)), metric === 'diff' ? 'Diferencia' : 'Aumento real']} labelFormatter={lbl} />
              <ReferenceLine y={0} stroke={C.ink} />
              <Bar dataKey={metric} maxBarSize={22}>
                {withDiff.map((r) => <Cell key={r.id} fill={(r[metric] ?? 0) >= 0 ? C.net : C.neg} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="chart">
          <h2>Cuánto subió en cada ajuste</h2>
          <p className="muted small">Porcentaje contra el ajuste anterior. La línea marca el promedio ({fmtPct(k.avgPct)}).</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={withPct} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="label" {...axis} minTickGap={14} />
              <YAxis {...axis} tickFormatter={(v) => `${Math.round(v)}%`} width={44} />
              <Tooltip formatter={(v: unknown) => [fmtPct(Number(v), 2), 'Aumento']} labelFormatter={lbl} />
              <ReferenceLine y={k.avgPct} stroke={C.ink} strokeDasharray="4 4" />
              <Bar dataKey="pct" fill={C.gross} maxBarSize={22} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="chart">
          <h2>Pesos que sumó cada ajuste</h2>
          <p className="muted small">Aumento en pesos contra el ajuste anterior.</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={withPct} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="label" {...axis} minTickGap={14} />
              <YAxis {...axis} tickFormatter={fmtCompact} width={52} />
              <Tooltip formatter={(v: unknown) => [fmtARS(Number(v)), 'Aumento']} labelFormatter={lbl} />
              <Bar dataKey="amount" fill={C.net} maxBarSize={22} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>
    </div>
  )
}
