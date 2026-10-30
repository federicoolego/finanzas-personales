import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { SalaryRaise, SalaryRaiseInput } from '../lib/types'
import { sortRaises } from '../lib/raises'
import { periodLabel } from '../lib/format'
import { useToast } from '../lib/useToast'
import RaisesDashboard from './RaisesDashboard'
import RaisesTable from './RaisesTable'
import RaiseForm from './RaiseForm'

type Tab = 'resumen' | 'aumentos'

export default function AumentosSection() {
  const [raises, setRaises] = useState<SalaryRaise[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('resumen')
  const [form, setForm] = useState<{ open: boolean; editing: SalaryRaise | null }>({ open: false, editing: null })
  const [toast, setToast] = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const { data, error } = await supabase.from('salary_raises').select('*').order('year').order('month')
    if (error) {
      setLoadError(
        error.code === 'PGRST205' || error.code === '42P01'
          ? 'Falta crear la tabla de aumentos. Corré supabase/schema_aumentos.sql en el SQL Editor.'
          : `No pude traer los aumentos: ${error.message}`,
      )
    } else setRaises(data as SalaryRaise[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Sugerimos el próximo ajuste siguiendo tu cadencia habitual (marzo y octubre)
  const suggestion = useMemo(() => {
    const sortedRaises = sortRaises(raises)
    const last = sortedRaises[sortedRaises.length - 1]
    if (!last) {
      const d = new Date()
      return { year: d.getFullYear(), month: d.getMonth() + 1 }
    }
    if (last.month >= 10) return { year: last.year + 1, month: 3 }
    if (last.month >= 3) return { year: last.year, month: 10 }
    return { year: last.year, month: 3 }
  }, [raises])

  async function save(values: SalaryRaiseInput, id?: string): Promise<string | null> {
    const { error } = id
      ? await supabase.from('salary_raises').update(values).eq('id', id)
      : await supabase.from('salary_raises').insert(values)
    if (error) {
      if (error.code === '23505') return 'Ya existe un aumento en ese mes y año. Editalo desde la lista.'
      return `No se pudo guardar: ${error.message}`
    }
    setForm({ open: false, editing: null })
    setToast(id ? 'Cambios guardados' : 'Aumento guardado')
    await load()
    return null
  }

  async function remove(r: SalaryRaise) {
    if (!window.confirm(`¿Borrar el aumento de ${periodLabel(r)}? No se puede deshacer.`)) return
    const { error } = await supabase.from('salary_raises').delete().eq('id', r.id)
    if (error) return setToast(`No se pudo borrar: ${error.message}`)
    setToast('Aumento borrado')
    await load()
  }

  return (
    <main className="page">
      <div className="subbar">
        <div className="subtabs" role="tablist">
          <button role="tab" aria-selected={tab === 'resumen'} className={tab === 'resumen' ? 'on' : ''} onClick={() => setTab('resumen')}>Resumen</button>
          <button role="tab" aria-selected={tab === 'aumentos'} className={tab === 'aumentos' ? 'on' : ''} onClick={() => setTab('aumentos')}>Aumentos</button>
        </div>
        <button className="btn primary" onClick={() => setForm({ open: true, editing: null })}>Cargar aumento</button>
      </div>

      {loadError && <p className="error" role="alert">{loadError}</p>}
      {loading && !raises.length ? (
        <p className="muted">Cargando aumentos…</p>
      ) : tab === 'resumen' ? (
        <RaisesDashboard raises={raises} />
      ) : (
        <RaisesTable raises={raises} onEdit={(r) => setForm({ open: true, editing: r })} onDelete={remove} />
      )}

      {form.open && (
        <RaiseForm initial={form.editing} suggestion={suggestion} all={raises} onSave={save} onClose={() => setForm({ open: false, editing: null })} />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  )
}
