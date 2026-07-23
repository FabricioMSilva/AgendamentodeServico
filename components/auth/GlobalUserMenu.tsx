import { createAdminClient } from '@/lib/supabase/admin'
import { isSuperAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import UserMenu from '@/components/auth/UserMenu'

export default async function GlobalUserMenu() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('usuarios')
    .select('nome, telefone, nivel_acesso, tipo_cadastro, comerciante_status, comerciante_ativo, conta_bloqueada')
    .eq('id', user.id)
    .maybeSingle()

  const superAdmin = isSuperAdmin({ email: user.email, phone: profile?.telefone }) || profile?.nivel_acesso === 'administrador'
  let panelHref = superAdmin ? '/sales/dashboard' : '/buscar'
  let userLabel = superAdmin ? 'Admin VIP' : 'Cliente'

  if (profile?.conta_bloqueada) {
    panelHref = '/conta-bloqueada'
    userLabel = 'Bloqueado'
  }

  if (!superAdmin) {
    const db = createAdminClient()
    const { data: establishment } = await db
      .from('estabelecimentos')
      .select('id, status_aprovacao')
      .eq('usuario_admin_id', user.id)
      .order('criado_em', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (profile?.tipo_cadastro === 'comerciante' && profile.comerciante_status !== 'aprovado') {
      panelHref = '/aguardando-aprovacao'
      userLabel = 'Aguardando'
    } else if (
      profile?.comerciante_ativo ||
      profile?.nivel_acesso === 'profissional' ||
      establishment?.id
    ) {
      panelHref = establishment?.status_aprovacao === 'pendente'
        ? '/aguardando-aprovacao?tipo=estabelecimento'
        : establishment?.status_aprovacao === 'aprovado'
          ? '/comerciante/agendamentos'
          : '/dono'
      userLabel = 'Comerciante'
    }
  }

  return (
    <UserMenu
      userName={profile?.nome || user.email || 'Minha conta'}
      userLabel={userLabel}
      panelHref={panelHref}
    />
  )
}
