import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSuperAdmin } from '@/lib/auth'
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
    .from('usuarios')
    .select('nivel_acesso, telefone, tipo_cadastro, comerciante_status, comerciante_ativo, conta_bloqueada')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.conta_bloqueada) {
    redirect('/conta-bloqueada')
  }

  if (isSuperAdmin({ email: user.email, phone: profile?.telefone }) || profile?.nivel_acesso === 'administrador') {
    redirect('/sales/dashboard')
  }

  if (profile?.tipo_cadastro === 'comerciante' && profile?.comerciante_status !== 'aprovado') {
    redirect('/aguardando-aprovacao')
  }

  if (profile?.nivel_acesso !== 'profissional' || !profile?.comerciante_ativo) {
    redirect('/dono')
  }

  {
    const db = createAdminClient()
    const { data: establishment } = await db
      .from('estabelecimentos')
      .select('id')
      .eq('usuario_admin_id', user.id)
      .eq('status_aprovacao', 'aprovado')
      .order('criado_em', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (establishment?.id) return <>{children}</>

    const { data: pendingEstablishment } = await db
      .from('estabelecimentos')
      .select('id')
      .eq('usuario_admin_id', user.id)
      .eq('status_aprovacao', 'pendente')
      .limit(1)
      .maybeSingle()

    redirect(pendingEstablishment?.id ? '/aguardando-aprovacao?tipo=estabelecimento' : '/dono')
  }

  return <>{children}</>
}
