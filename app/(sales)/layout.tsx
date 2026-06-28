import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isSuperAdmin(user.email)) {
    redirect('/')
  }

  return <>{children}</>
}
