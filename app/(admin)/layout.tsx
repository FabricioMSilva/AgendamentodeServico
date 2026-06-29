import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    const db = createAdminClient()
    const { data: establishment } = await db
      .from('establishments')
      .select('id')
      .eq('admin_id', user.id)
      .maybeSingle()

    if (!establishment?.id) {
      redirect('/dono')
    }
  }

  return <>{children}</>
}
