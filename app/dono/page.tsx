import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import NewEstablishmentModal from '@/components/owner/NewEstablishmentModal'
import OwnerEstablishmentEditor from '@/components/owner/OwnerEstablishmentEditor'
import { mapEstabelecimento, mapServico } from '@/lib/supabase/portuguese-schema-adapter'
import { getServiceCatalog } from '@/lib/services/catalog-server'

export const dynamic = 'force-dynamic'

const MAX_OWNER_ESTABLISHMENTS = 3

export default async function OwnerEntryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const db = createAdminClient()
    const [{ data: establishments }, { data: profile }, serviceCatalog] = await Promise.all([
      db
        .from('estabelecimentos')
        .select('id, nome, slug, bloqueado, status_aprovacao, criado_em, servicos(*)')
        .eq('usuario_admin_id', user.id)
        .order('criado_em', { ascending: false }),
      db
        .from('usuarios')
        .select('nivel_acesso, comerciante_status, comerciante_ativo, conta_bloqueada')
        .eq('id', user.id)
        .maybeSingle(),
      getServiceCatalog(),
    ])

    if (profile?.conta_bloqueada) {
      redirect('/conta-bloqueada')
    }

    if (profile?.comerciante_status !== 'aprovado' || !profile?.comerciante_ativo) {
      redirect('/aguardando-aprovacao')
    }

    return (
      <main className="min-h-screen bg-[#1A2033] px-4 py-8 text-white sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-3xl space-y-5 py-8">
          <div className="rounded-[8px] bg-white/6 p-5 ring-1 ring-white/10">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
              Meus estabelecimentos
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Gerencie seus negócios</h1>
            <p className="mt-2 text-sm leading-6 text-white/68">
              Cada comerciante pode ter até {MAX_OWNER_ESTABLISHMENTS} estabelecimentos aprovados no IBeleza.
            </p>

            <div className="mt-4 divide-y divide-white/10 rounded-[8px] border border-white/10 bg-[#11172B]/45">
              {(establishments ?? []).map((establishment) => (
                <div key={establishment.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-white">{establishment.nome}</p>
                    <p className="mt-1 text-sm text-white/55">/{establishment.slug}</p>
                  </div>
                  <span
                    className={[
                      'w-fit rounded-full px-3 py-1 text-xs font-semibold',
                      establishment.bloqueado
                        ? 'bg-[#ff8ea8]/12 text-[#ff8ea8]'
                        : establishment.status_aprovacao === 'pendente'
                          ? 'bg-amber-300/10 text-amber-100'
                          : 'bg-emerald-400/10 text-emerald-100',
                    ].join(' ')}
                  >
                    {establishment.status_aprovacao === 'pendente'
                      ? 'Aguardando aprovação'
                      : establishment.bloqueado
                        ? 'Pausado'
                        : 'Ativo'}
                  </span>
                </div>
              ))}
              {(establishments ?? []).length === 0 ? (
                <p className="p-4 text-sm text-white/55">Você ainda não cadastrou nenhum estabelecimento.</p>
              ) : null}
            </div>
          </div>

          {(establishments ?? []).length < MAX_OWNER_ESTABLISHMENTS ? (
            <div className="grid gap-5">
              <NewEstablishmentModal
                currentCount={(establishments ?? []).length}
                maxEstablishments={MAX_OWNER_ESTABLISHMENTS}
                catalog={serviceCatalog}
              />
              <OwnerEstablishmentEditor
                establishments={(establishments ?? []).map((item) => ({
                  id: item.id,
                  name: item.nome,
                  slug: item.slug,
                  is_blocked: item.bloqueado,
                  services: (item.servicos ?? []).map(mapServico),
                }))}
                catalog={serviceCatalog}
              />
            </div>
          ) : (
            <div className="rounded-[8px] bg-white/6 p-5 text-sm text-white/68 ring-1 ring-white/10">
              Você já atingiu o limite de {MAX_OWNER_ESTABLISHMENTS} estabelecimentos.
            </div>
          )}
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#1A2033] px-4 py-8 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl items-center justify-center">
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
            Crie seu estabelecimento
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/72">
            Depois da aprovação do Admin VIP, entre aqui para criar o estabelecimento e liberar seu painel.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="/login?mode=login&next=/dono"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] px-5 text-sm font-semibold text-white transition hover:opacity-90 sm:w-auto"
            >
              Entrar com acesso liberado
            </Link>
            <Link
              href="/admin/dashboard"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-white/8 px-5 text-sm font-semibold text-white transition hover:bg-white/12 sm:w-auto"
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
