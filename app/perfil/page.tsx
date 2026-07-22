import Link from 'next/link'
import { redirect } from 'next/navigation'
import ProfileForm from '@/components/profile/ProfileForm'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('usuarios')
    .select('nome, telefone, cep, rua, numero, complemento, bairro, cidade, estado')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <main className="min-h-screen bg-[#1A2033] px-5 py-20 text-white md:px-8">
      <section className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-semibold text-[#8FF0F4] transition hover:text-white">
          Voltar
        </Link>

        <div className="mt-5 rounded-[8px] bg-white/6 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.24)] ring-1 ring-white/10 sm:p-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/48">Minha conta</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">Perfil</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/68">
            Atualize seus dados cadastrais para agilizar agendamentos e melhorar a busca por locais próximos.
          </p>

          <div className="mt-7">
            <ProfileForm
              initialValues={{
                name: profile?.nome ?? '',
                phone: profile?.telefone ?? '',
                zip_code: profile?.cep ?? null,
                street: profile?.rua ?? null,
                number: profile?.numero ?? null,
                complement: profile?.complemento ?? null,
                neighborhood: profile?.bairro ?? null,
                city: profile?.cidade ?? null,
                state: profile?.estado ?? null,
              }}
            />
          </div>
        </div>
      </section>
    </main>
  )
}
