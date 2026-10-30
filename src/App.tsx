import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { configured, supabase } from './lib/supabase'
import Login from './components/Login'
import RecibosSection from './components/RecibosSection'
import AumentosSection from './components/AumentosSection'

type Section = 'recibos' | 'aumentos'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [section, setSection] = useState<Section>('recibos')

  useEffect(() => {
    if (!configured) return setReady(true)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

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
        <strong className="brand">Finanzas personales</strong>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={section === 'recibos'} className={section === 'recibos' ? 'on' : ''} onClick={() => setSection('recibos')}>Mis Recibos</button>
          <button role="tab" aria-selected={section === 'aumentos'} className={section === 'aumentos' ? 'on' : ''} onClick={() => setSection('aumentos')}>Mis Aumentos</button>
        </div>
        <div className="topbar-actions">
          <button className="btn ghost" onClick={() => supabase.auth.signOut()}>Salir</button>
        </div>
      </nav>
      {section === 'recibos' ? <RecibosSection /> : <AumentosSection />}
    </>
  )
}
