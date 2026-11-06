const url = String(import.meta.env.VITE_SUPABASE_URL || '').trim()
const anonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

export const supabaseUrl = url
export const supabaseAnonKey = anonKey
export const isDemoMode = !url || !anonKey
