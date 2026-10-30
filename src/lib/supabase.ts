import { createClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

export const configured = Boolean(url && key)

// Usamos || (no ??) porque en un build sin variables Vite las inyecta como string vacío,
// y createClient('') tira "supabaseUrl is required". Así la app muestra el aviso de configuración.
export const supabase = createClient(url || 'http://localhost', key || 'missing-key')
