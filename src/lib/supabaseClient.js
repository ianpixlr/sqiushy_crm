import { createClient } from '@supabase/supabase-js'
import { isDemoMode, supabaseAnonKey, supabaseUrl } from './mode'

export const supabase = isDemoMode ? null : createClient(supabaseUrl, supabaseAnonKey)
