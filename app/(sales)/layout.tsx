export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase
        .from('usuarios')
        .select('telefone, nivel_acesso, conta_bloqueada')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null }

  if (profile?.conta_bloqueada) {
    redirect('/conta-bloqueada')
  }

  if (!user || (!isSuperAdmin({ email: user.email, phone: profile?.telefone }) && profile?.nivel_acesso !== 'administrador')) {
    redirect('/')
  }

  return <>{children}</>
}
