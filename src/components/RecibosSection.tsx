import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Payslip, PayslipInput } from '../lib/types'
import { sortPayslips } from '../lib/kpis'
import { periodLabel } from '../lib/format'
import { useToast } from '../lib/useToast'
import Dashboard from './Dashboard'
import PayslipsTable from './PayslipsTable'
import PayslipForm from './PayslipForm'

type Tab = 'resumen' | 'recibos'

export default function RecibosSection() {
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('resumen')
  const [form, setForm] = useState<{ open: boolean; editing: Payslip | null }>({ open: false, editing: null })
  const [toast, setToast] = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const { data, error } = await supabase.from('payslips').select('*').order('year').order('month')
    if (error) setLoadError(`No pude traer los recibos: ${error.message}`)
    else setPayslips(data as Payslip[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const sorted = useMemo(() => sortPayslips(payslips), [payslips])

  // Al cargar uno nuevo, proponemos el mes siguiente con el mismo bruto y TC del último recibo
  const suggestion = useMemo(() => {
    const last = sorted[sorted.length - 1]
    if (!last) {
      const d = new Date()
      return { year: d.getFullYear(), month: d.getMonth() + 1 }
    }
    const next = last.month === 12 ? { year: last.year + 1, month: 1 } : { year: last.year, month: last.month + 1 }
    return { ...next, gross: last.gross, fx_rate: last.fx_rate }
  }, [sorted])

  async function save(values: PayslipInput, id?: string): Promise<string | null> {
    const { error } = id
      ? await supabase.from('payslips').update(values).eq('id', id)
      : await supabase.from('payslips').insert(values)
    if (error) {
      if (error.code === '23505') return 'Ya existe un recibo para ese mes y año. Editalo desde la lista de recibos.'
      return `No se pudo guardar: ${error.message}`
    }
    setForm({ open: false, editing: null })
    setToast(id ? 'Cambios guardados' : 'Recibo guardado')
    await load()
    return null
  }

  async function remove(p: Payslip) {
    if (!window.confirm(`¿Borrar el recibo de ${periodLabel(p)}? No se puede deshacer.`)) return
    const { error } = await supabase.from('payslips').delete().eq('id', p.id)
    if (error) return setToast(`No se pudo borrar: ${error.message}`)
    setToast('Recibo borrado')
    await load()
  }

  return (
    <main className="page">
      <div className="subbar">
        <div className="subtabs" role="tablist">
          <button role="tab" aria-selected={tab === 'resumen'} className={tab === 'resumen' ? 'on' : ''} onClick={() => setTab('resumen')}>Resumen</button>
          <button role="tab" aria-selected={tab === 'recibos'} className={tab === 'recibos' ? 'on' : ''} onClick={() => setTab('recibos')}>Recibos</button>
        </div>
        <button className="btn primary" onClick={() => setForm({ open: true, editing: null })}>Cargar recibo</button>
      </div>

      {loadError && <p className="error" role="alert">{loadError}</p>}
      {loading && !payslips.length ? (
        <p className="muted">Cargando recibos…</p>
      ) : tab === 'resumen' ? (
        <Dashboard payslips={payslips} />
      ) : (
        <PayslipsTable payslips={payslips} onEdit={(p) => setForm({ open: true, editing: p })} onDelete={remove} />
      )}

      {form.open && (
        <PayslipForm initial={form.editing} suggestion={suggestion} onSave={save} onClose={() => setForm({ open: false, editing: null })} />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  )
}
