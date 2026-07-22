import { NextResponse } from 'next/server'
import { isSuperAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const next = url.searchParams.get('next')
  const safeNext = next?.startsWith('/') ? next : '/buscar'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ target: '/login' })
  }

  const { data: profile } = await supabase
    .from('usuarios')
    .select('telefone, nivel_acesso, tipo_cadastro, comerciante_status, comerciante_ativo, conta_bloqueada')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.conta_bloqueada) {
    return NextResponse.json({ target: '/conta-bloqueada' })
  }

  if (isSuperAdmin({ email: user.email, phone: profile?.telefone }) || profile?.nivel_acesso === 'administrador') {
    return NextResponse.json({ target: '/sales/dashboard' })
  }

  if (
    profile?.tipo_cadastro === 'comerciante' &&
    profile?.comerciante_status !== 'aprovado'
  ) {
    return NextResponse.json({ target: '/aguardando-aprovacao' })
  }

  const db = createAdminClient()
  const { data: establishment } = await db
    .from('estabelecimentos')
    .select('id, status_aprovacao')
    .eq('usuario_admin_id', user.id)
    .order('criado_em', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (profile?.comerciante_ativo && profile?.nivel_acesso === 'profissional') {
    if (establishment?.status_aprovacao === 'aprovado') {
      return NextResponse.json({ target: '/admin/dashboard' })
    }

    if (establishment?.status_aprovacao === 'pendente') {
      return NextResponse.json({ target: '/aguardando-aprovacao?tipo=estabelecimento' })
    }

    return NextResponse.json({ target: '/dono' })
  }

  return NextResponse.json({ target: safeNext })
}
