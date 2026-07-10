import { createAdminClient } from '@/lib/supabase/admin'
import CreateEstablishmentForm from '@/components/sales/CreateEstablishmentForm'
import { setEstablishmentBlocked } from '@/actions/consultant'
import LogoutButton from '@/components/auth/LogoutButton'
import Card from '@/components/ui/Card'

export default async function SalesDashboard() {
  const db = createAdminClient()
  const [
    { data: establishments },
    { count: profileCount },
    { count: appointmentCount },
  ] = await Promise.all([
    db
      .from('establishments')
      .select('id, name, slug, owner_email, is_blocked, admin_id, profiles(name, phone)')
      .order('created_at', { ascending: false }),
    db.from('profiles').select('id', { count: 'exact', head: true }),
    db.from('appointments').select('id', { count: 'exact', head: true }),
  ])

  const total = establishments?.length ?? 0
  const linked = establishments?.filter((establishment) => establishment.admin_id).length ?? 0
  const blocked = establishments?.filter((establishment) => establishment.is_blocked).length ?? 0
  const awaiting = Math.max(total - linked, 0)

  return (
    <main className="min-h-screen bg-[#1A2033] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/48">
              Painel VIP do site
            </p>
            <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Controle geral do negócio</h1>
            <p className="mt-1 text-sm text-white/60">
              Aqui você vê todos os estabelecimentos, vincula quem entra e acompanha o que está ativo ou pausado.
            </p>
          </div>
          <LogoutButton redirectTo="/login" />
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card title="Negócios" className="bg-white/5">
            <p className="text-3xl font-semibold">{total}</p>
            <p className="mt-1 text-sm text-white/60">cadastrados no sistema</p>
          </Card>
          <Card title="Cadastros" className="bg-white/5">
            <p className="text-3xl font-semibold">{profileCount ?? 0}</p>
            <p className="mt-1 text-sm text-white/60">clientes, donos e perfis</p>
          </Card>
          <Card title="Vinculados" className="bg-white/5">
            <p className="text-3xl font-semibold">{linked}</p>
            <p className="mt-1 text-sm text-white/60">com dono já liberado</p>
          </Card>
          <Card title="Agenda" className="bg-white/5">
            <p className="text-3xl font-semibold">{appointmentCount ?? 0}</p>
            <p className="mt-1 text-sm text-white/60">agendamentos registrados</p>
          </Card>
          <Card title="Aguardando" className="bg-white/5">
            <p className="text-3xl font-semibold">{awaiting}</p>
            <p className="mt-1 text-sm text-white/60">sem primeiro vínculo</p>
          </Card>
          <Card title="Pausados" className="bg-white/5">
            <p className="text-3xl font-semibold">{blocked}</p>
            <p className="mt-1 text-sm text-white/60">desativados no momento</p>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div id="novo-comerciante">
            <Card title="Novo comerciante" className="bg-white/5">
              <div className="space-y-4">
                <p className="text-sm leading-6 text-white/68">
                  Cadastre aqui o dono do comércio. Depois ele entra pelo acesso liberado e aprova os próprios agendamentos.
                </p>
                <CreateEstablishmentForm />
              </div>
            </Card>
          </div>

          <Card title="Atalhos" className="bg-white/5">
            <div className="space-y-3 text-sm text-white/72">
              <p>O painel do comerciante cuida de horários, fotos, serviços e aprovações.</p>
              <a
                href="/dono"
                className="block rounded-[8px] bg-white/8 px-4 py-3 ring-1 ring-white/10 transition hover:bg-white/12"
              >
                Abrir acesso do comerciante
              </a>
              <a
                href="/admin/dashboard"
                className="block rounded-[8px] bg-white/8 px-4 py-3 ring-1 ring-white/10 transition hover:bg-white/12"
              >
                Ver painel do comerciante
              </a>
              <a
                href="#novo-comerciante"
                className="block rounded-[8px] bg-white/8 px-4 py-3 ring-1 ring-white/10 transition hover:bg-white/12"
              >
                Ir para cadastro
              </a>
            </div>
          </Card>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-white">Todos os estabelecimentos</h2>
          <div className="divide-y divide-white/10 rounded-[8px] border border-white/10 bg-white/6">
            {establishments?.map((e) => {
              const blockAction = async () => {
                'use server'
                await setEstablishmentBlocked(e.id, !e.is_blocked)
              }
              return (
                <div key={e.id} className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="font-medium text-white">{e.name}</p>
                    <p className="text-sm text-white/55">/{e.slug} · {e.owner_email}</p>
                    {e.admin_id ? (
                      <span className="text-xs text-emerald-100">Vinculado</span>
                    ) : (
                      <span className="text-xs text-amber-200">Aguardando primeiro acesso</span>
                    )}
                  </div>
                  <form action={blockAction}>
                    <button
                      type="submit"
                      className={`rounded-[8px] px-3 py-1.5 text-sm font-medium transition ${
                        e.is_blocked
                          ? 'bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15'
                          : 'bg-[#ff8ea8]/12 text-[#ff8ea8] hover:bg-[#ff8ea8]/18'
                      }`}
                    >
                      {e.is_blocked ? 'Desbloquear' : 'Bloquear'}
                    </button>
                  </form>
                </div>
              )
            })}
            {(!establishments || establishments.length === 0) && (
              <p className="p-4 text-sm text-white/55">Nenhum estabelecimento cadastrado ainda.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
