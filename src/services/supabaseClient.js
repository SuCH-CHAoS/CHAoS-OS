import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  })
  : null

export const supabaseConfig = {
  adminUserId: import.meta.env.VITE_SUPABASE_ADMIN_USER_ID ?? '',
  assetBucket: import.meta.env.VITE_SUPABASE_ASSET_BUCKET ?? 'website-assets',
  contentId: import.meta.env.VITE_SUPABASE_CONTENT_ID ?? 'main',
  contentTable: import.meta.env.VITE_SUPABASE_CONTENT_TABLE ?? 'website_content'
}
