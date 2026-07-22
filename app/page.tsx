import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSuperAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const hasSupabaseConfig =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  if (!hasSupabaseConfig) {
    return (
      <main className="min-h-screen bg-[#121829] text-white">
        <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
          <div className="rounded-[24px] border border-white/10 bg-[#0f1527]/90 p-10 shadow-[0_30px_120px_rgba(0,0,0,0.4)]">
            <h1 className="text-4xl font-semibold text-white">Aguardando configuração</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-white/70">
              O aplicativo está funcionando, mas não foi possível conectar ao Supabase.
            </p>
          </div>
        </div>
      </main>
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/buscar')
  }

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

  if (profile?.nivel_acesso === 'profissional' && profile?.comerciante_ativo) {
    const db = createAdminClient()
    const { data: establishment } = await db
      .from('estabelecimentos')
      .select('status_aprovacao')
      .eq('usuario_admin_id', user.id)
      .order('criado_em', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (establishment?.status_aprovacao === 'aprovado') {
      redirect('/admin/dashboard')
    }

    if (establishment?.status_aprovacao === 'pendente') {
      redirect('/aguardando-aprovacao?tipo=estabelecimento')
    }

    redirect('/dono')
  }

  redirect('/buscar')
}
