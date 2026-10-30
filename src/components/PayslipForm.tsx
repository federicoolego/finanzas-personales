import { useEffect, useMemo, useRef, useState } from 'react'
import type { Payslip, PayslipInput } from '../lib/types'
import { MONTHS, fmtPct, fmtUSDDec, parseNum } from '../lib/format'

interface Props {
  initial: Payslip | null
  suggestion: { year: number; month: number; gross?: number; fx_rate?: number }
  onSave: (values: PayslipInput, id?: string) => Promise<string | null>
  onClose: () => void
}

const toStr = (n: number | undefined) => (n == null ? '' : String(n).replace('.', ','))

export default function PayslipForm({ initial, suggestion, onSave, onClose }: Props) {
  const base = initial ?? suggestion
  const [year, setYear] = useState(String(base.year))
  const [month, setMonth] = useState(base.month)
  const [gross, setGross] = useState(toStr(base.gross))
  const [net, setNet] = useState(toStr(initial?.net))
  const [ganancias, setGanancias] = useState(toStr(initial?.ganancias ?? 0))
  const [fx, setFx] = useState(toStr(base.fx_rate))
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

  const g = parseNum(gross), n = parseNum(net), ga = ganancias.trim() === '' ? 0 : parseNum(ganancias), f = parseNum(fx)

  const preview = useMemo(() => {
    if (!(g > 0) || !(n >= 0) || !(f > 0)) return null
    return { ratio: (n / g) * 100, gaPct: isNaN(ga) ? null : (ga / g) * 100, usd: n / f }
  }, [g, n, ga, f])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const y = Number(year)
    if (!Number.isInteger(y) || y < 2000 || y > 2100) return setError('Revisá el año.')
    if (!(g > 0)) return setError('El bruto tiene que ser mayor a 0.')
    if (!(n >= 0)) return setError('Revisá el neto.')
    if (isNaN(ga)) return setError('Revisá el monto de Ganancias (usá negativo si te retuvieron).')
    if (!(f > 0)) return setError('El tipo de cambio tiene que ser mayor a 0.')
    setBusy(true)
    setError(null)
    const err = await onSave({ year: y, month, gross: g, net: n, ganancias: ga, fx_rate: f, notes: notes.trim() || null }, initial?.id)
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="form-title">
        <h2 id="form-title">{initial ? 'Editar recibo' : 'Cargar recibo'}</h2>

        <div className="row2">
          <label>
            Mes
            <select ref={first} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </label>
          <label>
            Año
            <input inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} />
          </label>
        </div>

        <div className="row2">
          <label>
            Bruto (ARS)
            <input inputMode="decimal" value={gross} onChange={(e) => setGross(e.target.value)} placeholder="6.067.435,72" />
          </label>
          <label>
            Neto (ARS)
            <input inputMode="decimal" value={net} onChange={(e) => setNet(e.target.value)} placeholder="4.943.145" />
          </label>
        </div>

        <div className="row2">
          <label>
            Ganancias (ARS)
            <input inputMode="decimal" value={ganancias} onChange={(e) => setGanancias(e.target.value)} placeholder="-326.693,35" />
            <small>Negativo si te retuvieron, positivo si te devolvieron.</small>
          </label>
          <label>
            Tipo de cambio (ARS por USD)
            <input inputMode="decimal" value={fx} onChange={(e) => setFx(e.target.value)} placeholder="1.540" />
          </label>
        </div>

        <label>
          Notas (opcional)
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Aguinaldo, bono, ajuste…" />
        </label>

        <p className="preview" aria-live="polite">
          {preview
            ? `Neto/bruto ${fmtPct(preview.ratio, 2)}, Ganancias ${fmtPct(preview.gaPct, 2)} del bruto, sueldo ${fmtUSDDec(preview.usd)}.`
            : 'Completá bruto, neto y tipo de cambio para ver los cálculos.'}
        </p>

        {error && <p className="error" role="alert">{error}</p>}

        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={busy}>{busy ? 'Guardando…' : initial ? 'Guardar cambios' : 'Guardar recibo'}</button>
        </div>
      </form>
    </div>
  )
}
