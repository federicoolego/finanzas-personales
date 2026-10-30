import { useMemo, useState } from 'react'
import type { Payslip } from '../lib/types'
import { MONTHS, fmtARSDec, fmtPct, fmtUSDDec } from '../lib/format'

interface Props {
  payslips: Payslip[]
  onEdit: (p: Payslip) => void
  onDelete: (p: Payslip) => void
}

export default function PayslipsTable({ payslips, onEdit, onDelete }: Props) {
  const years = useMemo(() => [...new Set(payslips.map((p) => p.year))].sort((a, b) => b - a), [payslips])
  const [year, setYear] = useState<number | 'all'>('all')

  const rows = useMemo(
    () => payslips.filter((p) => year === 'all' || p.year === year).sort((a, b) => b.year - a.year || b.month - a.month),
    [payslips, year],
  )

  function exportCsv() {
    const num = (v: number) => String(v).replace('.', ',')
    const head = ['Año', 'Mes', 'Bruto', 'Neto', 'Neto/Bruto %', 'Ganancias', 'Ganancias %', 'TC', 'Sueldo USD', 'Notas']
    const lines = rows
      .slice()
      .reverse()
      .map((p) => [p.year, MONTHS[p.month - 1], num(p.gross), num(p.net), num(p.net_gross_pct ?? 0), num(p.ganancias), num(p.ganancias_pct ?? 0), num(p.fx_rate), num(p.net_usd), `"${(p.notes ?? '').replace(/"/g, '""')}"`].join(';'))
    const blob = new Blob(['\ufeff' + [head.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `recibos-${year === 'all' ? 'todos' : year}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (!payslips.length) {
    return (
      <section className="empty">
        <h2>Todavía no cargaste recibos</h2>
        <p className="muted">Usá “Cargar recibo” o corré el seed.sql para importar tu historial.</p>
      </section>
    )
  }

  return (
    <section>
      <div className="table-tools">
        <label className="inline">
          Año
          <select value={year} onChange={(e) => setYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
            <option value="all">Todos</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <span className="muted">{rows.length} recibos</span>
        <button className="btn" onClick={exportCsv}>Exportar CSV</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Período</th>
              <th className="r">Bruto</th>
              <th className="r">Neto</th>
              <th className="r">Neto/Bruto</th>
              <th className="r">Ganancias</th>
              <th className="r">% Gan.</th>
              <th className="r">TC</th>
              <th className="r">Sueldo USD</th>
              <th>Notas</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{MONTHS[p.month - 1]} {p.year}</td>
                <td className="r">{fmtARSDec(p.gross)}</td>
                <td className="r">{fmtARSDec(p.net)}</td>
                <td className="r">{fmtPct(p.net_gross_pct, 2)}</td>
                <td className={`r ${p.ganancias > 0 ? 'pos' : p.ganancias < 0 ? 'neg' : ''}`}>{fmtARSDec(p.ganancias)}</td>
                <td className="r">{fmtPct(p.ganancias_pct, 2)}</td>
                <td className="r">{fmtARSDec(p.fx_rate)}</td>
                <td className="r strong">{fmtUSDDec(p.net_usd)}</td>
                <td className="notes">{p.notes}</td>
                <td className="row-actions">
                  <button className="link" onClick={() => onEdit(p)}>Editar</button>
                  <button className="link danger" onClick={() => onDelete(p)}>Borrar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
