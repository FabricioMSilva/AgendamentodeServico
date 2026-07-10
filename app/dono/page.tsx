import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function OwnerEntryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const db = createAdminClient()
    const { data: establishment } = await db
      .from('establishments')
      .select('id')
      .eq('admin_id', user.id)
      .maybeSingle()

    if (establishment?.id) {
      redirect('/admin/dashboard')
    }
  }

  return (
    <main className="min-h-screen bg-[#1A2033] px-4 py-8 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl items-center">
        <div className="w-full rounded-[8px] bg-white/6 p-6 ring-1 ring-white/10">
          <img
            src="/imagens/ibeleza.png"
            alt="IBeleza"
            className="h-auto w-[140px] max-w-full object-contain"
          />

          <p className="mt-5 text-[11px] uppercase tracking-[0.24em] text-white/60">
            Acesso do empreendedor
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
            Acesso liberado por convite
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/72">
            Os empreendedores não se cadastram por conta própria. O acesso é criado por você, no painel VIP,
            e depois liberado para entrar e gerenciar agenda, horários, fotos e aprovações.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="/login?mode=login&next=/dono"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] px-5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Entrar com acesso liberado
            </Link>
            <Link
              href="/admin/dashboard"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-white/8 px-5 text-sm font-semibold text-white transition hover:bg-white/12"
            >
              Ir para o painel do comerciante
            </Link>
          </div>

          <div className="mt-6 rounded-[8px] bg-white/8 p-4 ring-1 ring-white/10">
            <p className="text-sm font-semibold text-white">O que muda agora</p>
            <p className="mt-1 text-sm leading-6 text-white/68">
              Cliente faz cadastro e usa o site. Empreendedor entra só quando você liberar. O painel VIP continua
              como centro de controle de clientes, empresas e agenda.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
