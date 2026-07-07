import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/database.types'

const missingSupabaseMessage =
  'Supabase não está configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.'

function createMissingClient(): any {
  const missingProxy = new Proxy(
    () => Promise.resolve({ error: new Error(missingSupabaseMessage), data: null }),
    {
      get() {
        return missingProxy
      },
      apply() {
        return Promise.resolve({ error: new Error(missingSupabaseMessage), data: null })
      },
    },
  )

  return missingProxy
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return createMissingClient()
  }

  return createBrowserClient<Database>(url, key)
}
