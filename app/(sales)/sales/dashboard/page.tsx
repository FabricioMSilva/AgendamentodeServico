import { createAdminClient } from '@/lib/supabase/admin'
import CreateEstablishmentForm from '@/components/sales/CreateEstablishmentForm'
import { setEstablishmentBlocked } from '@/actions/consultant'

export default async function SalesDashboard() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any
  const { data: establishments } = await db
    .from('establishments')
    .select('id, name, slug, owner_email, is_blocked, admin_id, profiles(name, email)')
    .order('created_at', { ascending: false })

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Cadastro de Negócios</h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie salões, clínicas e espaços de saúde e beleza</p>
      </header>

      <section>
        <h2 className="text-lg font-semibold mb-4">Novo estabelecimento</h2>
        <CreateEstablishmentForm />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Todos os estabelecimentos</h2>
        <div className="divide-y rounded-xl border">
          {establishments?.map((e: any) => {
            const blockAction = async () => {
              'use server'
              await setEstablishmentBlocked(e.id, !e.is_blocked)
            }
            return (
              <div key={e.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{e.name}</p>
                  <p className="text-sm text-gray-500">/{e.slug} · {e.owner_email}</p>
                  {e.admin_id ? (
                    <span className="text-xs text-green-600">Linked ✓</span>
                  ) : (
                    <span className="text-xs text-amber-600">Awaiting first login</span>
                  )}
                </div>
                <form action={blockAction}>
                  <button
                    type="submit"
                    className={`text-sm px-3 py-1.5 rounded-lg font-medium ${
                      e.is_blocked
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    {e.is_blocked ? 'Unblock' : 'Block'}
                  </button>
                </form>
              </div>
            )
          })}
          {(!establishments || establishments.length === 0) && (
            <p className="p-4 text-sm text-gray-500">Nenhum estabelecimento cadastrado ainda.</p>
          )}
        </div>
      </section>
    </main>
  )
}
