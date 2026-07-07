import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/database.types'

export function createPublicClient() {
  if (typeof window !== 'undefined') {
    throw new Error('createPublicClient() must only be called on the server')
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
