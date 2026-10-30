import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { configured, supabase } from './lib/supabase'
import type { Payslip, PayslipInput } from './lib/types'
import { sortPayslips } from './lib/kpis'
import { periodLabel } from './lib/format'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import PayslipsTable from './components/PayslipsTable'
import PayslipForm from './components/PayslipForm'

type Tab = 'resumen' | 'recibos'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('resumen')
  const [form, setForm] = useState<{ open: boolean; editing: Payslip | null }>({ open: false, editing: null })
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!configured) return setReady(true)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const { data, error } = await supabase.from('payslips').select('*').order('year').order('month')
    if (error) setLoadError(`No pude traer los recibos: ${error.message}`)
    else setPayslips(data as Payslip[])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (session) load()
    else setPayslips([])
  }, [session, load])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])

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

  if (!configured) {
    return (
      <main className="login">
        <div className="login-form">
          <h1>Falta configurar Supabase</h1>
          <p>Creá un archivo <code>.env</code> con <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> (hay un modelo en <code>.env.example</code>) y reiniciá el servidor.</p>
        </div>
      </main>
    )
  }
  if (!ready) return null
  if (!session) return <Login />

  return (
    <>
      <nav className="topbar">
        <strong className="brand">Mis recibos</strong>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'resumen'} className={tab === 'resumen' ? 'on' : ''} onClick={() => setTab('resumen')}>Resumen</button>
          <button role="tab" aria-selected={tab === 'recibos'} className={tab === 'recibos' ? 'on' : ''} onClick={() => setTab('recibos')}>Recibos</button>
        </div>
        <div className="topbar-actions">
          <button className="btn primary" onClick={() => setForm({ open: true, editing: null })}>Cargar recibo</button>
          <button className="btn ghost" onClick={() => supabase.auth.signOut()}>Salir</button>
        </div>
      </nav>

      <main className="page">
        {loadError && <p className="error" role="alert">{loadError}</p>}
        {loading && !payslips.length ? (
          <p className="muted">Cargando recibos…</p>
        ) : tab === 'resumen' ? (
          <Dashboard payslips={payslips} />
        ) : (
          <PayslipsTable payslips={payslips} onEdit={(p) => setForm({ open: true, editing: p })} onDelete={remove} />
        )}
      </main>

      {form.open && (
        <PayslipForm
          initial={form.editing}
          suggestion={suggestion}
          onSave={save}
          onClose={() => setForm({ open: false, editing: null })}
        />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  )
}
