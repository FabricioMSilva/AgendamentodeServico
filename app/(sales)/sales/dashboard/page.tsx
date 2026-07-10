import { createAdminClient } from '@/lib/supabase/admin'
import CreateEstablishmentForm from '@/components/sales/CreateEstablishmentForm'
import { setEstablishmentBlocked } from '@/actions/consultant'
import LogoutButton from '@/components/auth/LogoutButton'

export default async function SalesDashboard() {
  const db = createAdminClient()
  const { data: establishments } = await db
    .from('establishments')
    .select('id, name, slug, owner_email, is_blocked, admin_id, profiles(name, phone)')
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-[#1A2033] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cadastro de Negócios</h1>
          <p className="mt-1 text-sm text-white/60">Gerencie salões, clínicas e espaços de saúde e beleza</p>
        </div>
        <LogoutButton redirectTo="/login" />
      </header>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">Novo estabelecimento</h2>
        <CreateEstablishmentForm />
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
                    <span className="text-xs text-emerald-100">Linked</span>
                  ) : (
                    <span className="text-xs text-amber-200">Awaiting first login</span>
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
                    {e.is_blocked ? 'Unblock' : 'Block'}
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
