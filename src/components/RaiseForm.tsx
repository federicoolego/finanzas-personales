import { useEffect, useMemo, useRef, useState } from 'react'
import type { SalaryRaise, SalaryRaiseInput } from '../lib/types'
import { MONTHS, fmtARS, fmtPP, fmtPct, parseNum } from '../lib/format'
import { computeRaises } from '../lib/raises'

interface Props {
  initial: SalaryRaise | null
  suggestion: { year: number; month: number }
  all: SalaryRaise[]
  onSave: (values: SalaryRaiseInput, id?: string) => Promise<string | null>
  onClose: () => void
}

const toStr = (n: number | null | undefined) => (n == null ? '' : String(n).replace('.', ','))

export default function RaiseForm({ initial, suggestion, all, onSave, onClose }: Props) {
  const base = initial ?? suggestion
  const [year, setYear] = useState(String(base.year))
  const [month, setMonth] = useState(base.month)
  const [salary, setSalary] = useState(toStr(initial?.salary))
  const [ipc, setIpc] = useState(toStr(initial?.ipc_yoy))
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const first = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    first.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const y = Number(year)
  const sal = parseNum(salary)
  const ipcVal = ipc.trim() === '' ? null : parseNum(ipc)

  const preview = useMemo(() => {
    if (!(sal > 0) || !Number.isInteger(y) || y < 2000 || (ipcVal != null && isNaN(ipcVal))) return null
    const others = all.filter((r) => r.id !== initial?.id)
    const cand: SalaryRaise = { id: '__new', year: y, month, salary: sal, ipc_yoy: ipcVal, notes: null }
    return computeRaises([...others, cand]).find((r) => r.id === '__new') ?? null
  }, [all, initial, y, month, sal, ipcVal])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!Number.isInteger(y) || y < 2000 || y > 2100) return setError('Revisá el año.')
    if (!(sal > 0)) return setError('El sueldo bruto tiene que ser mayor a 0.')
    if (ipcVal != null && isNaN(ipcVal)) return setError('Revisá el IPC interanual (dejalo vacío si todavía no lo tenés).')
    setBusy(true)
    setError(null)
    const err = await onSave({ year: y, month, salary: sal, ipc_yoy: ipcVal, notes: notes.trim() || null }, initial?.id)
    setBusy(false)
    if (err) setError(err)
  }

  const parts: string[] = []
  if (preview) {
    if (preview.pct != null) parts.push(`Aumento ${fmtPct(preview.pct, 2)} (${fmtARS(preview.amount!)})`)
    if (preview.yoy != null) parts.push(`interanual ${fmtPct(preview.yoy, 2)}`)
    if (preview.diff != null) parts.push(`diferencia contra el IPC ${fmtPP(preview.diff)}`)
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="raise-title">
        <h2 id="raise-title">{initial ? 'Editar aumento' : 'Cargar aumento'}</h2>

        <div className="row2">
          <label>
            Mes desde el que rige
            <select ref={first} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </label>
          <label>
            Año
            <input inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} />
          </label>
        </div>

        <label>
          Sueldo bruto base nuevo (ARS)
          <input inputMode="decimal" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="6.885.526" />
        </label>

        <label>
          IPC interanual de ese mes (%)
          <input inputMode="decimal" value={ipc} onChange={(e) => setIpc(e.target.value)} placeholder="32,6" />
          <small>Opcional. Si todavía no se publicó, dejalo vacío y editalo después.</small>
        </label>

        <label>
          Notas (opcional)
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Paritaria, cambio de categoría…" />
        </label>

        <p className="preview" aria-live="polite">
          {parts.length ? `${parts.join(', ')}.` : 'Completá el sueldo para ver los cálculos contra el ajuste anterior.'}
        </p>

        {error && <p className="error" role="alert">{error}</p>}

        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={busy}>{busy ? 'Guardando…' : initial ? 'Guardar cambios' : 'Guardar aumento'}</button>
        </div>
      </form>
    </div>
  )
}
