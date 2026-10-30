import { useMemo } from 'react'
import type { SalaryRaise } from '../lib/types'
import { computeRaises } from '../lib/raises'
import { fmtARSDec, fmtPct, fmtPP, periodLabel } from '../lib/format'

interface Props {
  raises: SalaryRaise[]
  onEdit: (r: SalaryRaise) => void
  onDelete: (r: SalaryRaise) => void
}

const cls = (v: number | null) => (v == null ? '' : v > 0 ? 'pos' : v < 0 ? 'neg' : '')

export default function RaisesTable({ raises, onEdit, onDelete }: Props) {
  const rows = useMemo(() => computeRaises(raises).reverse(), [raises])

  function exportCsv() {
    const num = (v: number | null) => (v == null ? '' : String(Math.round(v * 100) / 100).replace('.', ','))
    const head = ['Período', 'Sueldo bruto', 'Aumento $', '% Aumento', '% A. interanual', 'IPC interanual', 'DIF (pp)', 'Aumento real %', 'Notas']
    const lines = [...rows]
      .reverse()
      .map((r) => [periodLabel(r), num(r.salary), num(r.amount), num(r.pct), num(r.yoy), num(r.ipc_yoy), num(r.diff), num(r.real), `"${(r.notes ?? '').replace(/"/g, '""')}"`].join(';'))
    const blob = new Blob(['\ufeff' + [head.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'aumentos.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (!rows.length) {
    return (
      <section className="empty">
        <h2>Todavía no cargaste aumentos</h2>
        <p className="muted">Usá “Cargar aumento” o corré seed_aumentos.sql para importar tu historial.</p>
      </section>
    )
  }

  return (
    <section>
      <div className="table-tools">
        <span className="muted">{rows.length} ajustes. El interanual compara contra el sueldo vigente 12 meses antes.</span>
        <button className="btn" onClick={exportCsv}>Exportar CSV</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Período</th>
              <th className="r">Sueldo bruto</th>
              <th className="r">Aumento</th>
              <th className="r">% Aumento</th>
              <th className="r">% A. interanual</th>
              <th className="r">IPC interanual</th>
              <th className="r">DIF</th>
              <th className="r">Aumento real</th>
              <th>Notas</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{periodLabel(r)}</td>
                <td className="r strong">{fmtARSDec(r.salary)}</td>
                <td className="r">{r.amount == null ? '—' : fmtARSDec(r.amount)}</td>
                <td className="r">{fmtPct(r.pct, 2)}</td>
                <td className="r">{fmtPct(r.yoy, 2)}</td>
                <td className="r">{fmtPct(r.ipc_yoy, 2)}</td>
                <td className={`r strong ${cls(r.diff)}`}>{fmtPP(r.diff)}</td>
                <td className={`r ${cls(r.real)}`}>{fmtPct(r.real, 2)}</td>
                <td className="notes">{r.notes}</td>
                <td className="row-actions">
                  <button className="link" onClick={() => onEdit(r)}>Editar</button>
                  <button className="link danger" onClick={() => onDelete(r)}>Borrar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
