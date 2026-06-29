import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import OwnerSetupForm from '@/components/owner/OwnerSetupForm'

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
      .select('id, name, slug')
      .eq('admin_id', user.id)
      .maybeSingle()

    if (establishment?.id) {
      redirect('/admin/dashboard')
    }
  }

  const isAuthenticated = Boolean(user)

  return (
    <main className="min-h-screen bg-[#1A2033] px-4 py-8 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl items-center">
        <div className="grid w-full gap-5 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[8px] bg-white/6 p-6 ring-1 ring-white/10">
            <img
              src="/imagens/ibeleza.png"
              alt="IBeleza"
              className="h-auto w-[140px] max-w-full object-contain"
            />
            <p className="mt-5 text-[11px] uppercase tracking-[0.24em] text-white/60">
              Área do dono
            </p>
            <h1 className="mt-3 font-brand text-3xl leading-tight sm:text-4xl">
              {isAuthenticated ? 'Vamos verificar seu negócio' : 'Entre como dono do negócio'}
            </h1>
            <p className="mt-4 text-sm leading-6 text-white/72">
              Se já existir um estabelecimento vinculado à sua conta, eu entro no painel agora.
              Se ainda não existir, você cria o primeiro cadastro por aqui.
            </p>

            <div className="mt-6 space-y-3">
              <div className="rounded-[8px] bg-white/8 p-4 ring-1 ring-white/10">
                <p className="text-sm font-semibold text-white">Verificação automática</p>
                <p className="mt-1 text-sm leading-6 text-white/68">
                  Assim que você entra, o sistema procura o estabelecimento já vinculado ao seu acesso.
                </p>
              </div>
              <div className="rounded-[8px] bg-white/8 p-4 ring-1 ring-white/10">
                <p className="text-sm font-semibold text-white">Painel do dono</p>
                <p className="mt-1 text-sm leading-6 text-white/68">
                  Serviços, agenda, horários, fotos, valores e confirmação por WhatsApp.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-white/8 px-5 text-sm font-semibold text-white transition hover:bg-white/12"
              >
                Voltar
              </Link>
              <Link
                href="/login?mode=login&next=/dono"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] px-5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Entrar na conta
              </Link>
            </div>
          </div>

          <div>
            {isAuthenticated ? (
              <OwnerSetupForm />
            ) : (
              <div className="rounded-[8px] bg-white p-6 text-[#22201d] shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b5f49]">
                  Comece por aqui
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  Entre ou crie sua conta para verificar seu negócio
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#6d625b]">
                  Depois do login, o sistema procura automaticamente seu estabelecimento. Se houver cadastro,
                  você já cai no painel do dono.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Link
                    href="/login?mode=login&next=/dono"
                    className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#22201d] px-5 text-sm font-semibold text-white transition hover:bg-[#3a332e]"
                  >
                    Entrar
                  </Link>
                  <Link
                    href="/login?mode=signup&next=/dono"
                    className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] px-5 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    Criar conta
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
