import Link from 'next/link'
import { redirect } from 'next/navigation'
import ProfileForm from '@/components/profile/ProfileForm'
import Badge from '@/components/ui/Badge'
import type { StatusAgendamentoPortugues } from '@/database.types'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { toLegacyAppointmentStatus } from '@/lib/supabase/portuguese-schema-adapter'

export const dynamic = 'force-dynamic'

type AppointmentHistoryItem = {
  id: string
  codigo: string
  horario: string
  status: StatusAgendamentoPortugues
  preco_total: number | null
  duracao_total_minutos: number
  estabelecimentos: { nome: string | null; slug: string | null } | null
  itens_agendamento: { nome_servico: string }[] | null
}

function formatAppointmentDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(new Date(value))
    .replace('.', '')
}

function money(value: number | null) {
  return value == null ? 'Sob consulta' : `R$ ${Number(value).toFixed(2)}`
}

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

  const db = createAdminClient()
  const { data: appointmentsRaw } = await db
    .from('agendamentos')
    .select('id, codigo, horario, status, preco_total, duracao_total_minutos, estabelecimentos(nome, slug), itens_agendamento(nome_servico)')
    .eq('cliente_id', user.id)
    .order('horario', { ascending: false })
    .limit(30)

  const appointments = (appointmentsRaw ?? []) as AppointmentHistoryItem[]

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

        <div className="mt-5 rounded-[8px] bg-white/6 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.18)] ring-1 ring-white/10 sm:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8FF0F4]">
                Meus horários
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Histórico de agendamentos</h2>
            </div>
            <span className="text-xs text-white/48">{appointments.length} registros</span>
          </div>

          {appointments.length > 0 ? (
            <div className="mt-5 space-y-3">
              {appointments.map((appointment) => {
                const services = appointment.itens_agendamento?.map((item) => item.nome_servico).join(', ')
                const establishment = appointment.estabelecimentos
                return (
                  <div
                    key={appointment.id}
                    className="rounded-[8px] border border-white/10 bg-[#11172B] p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold capitalize text-white">
                          {formatAppointmentDate(appointment.horario)}
                        </p>
                        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8FF0F4]">
                          {appointment.codigo}
                        </p>
                        <p className="mt-1 text-sm text-white/62">
                          {services || 'Serviço não informado'}
                        </p>
                        <p className="mt-1 text-xs text-white/45">
                          {establishment?.nome ?? 'Salão não informado'} · {appointment.duracao_total_minutos} min · {money(appointment.preco_total)}
                        </p>
                      </div>
                      <Badge status={toLegacyAppointmentStatus(appointment.status)} />
                    </div>

                    {establishment?.slug ? (
                      <Link
                        href={`/${establishment.slug}`}
                        className="mt-3 inline-flex text-xs font-semibold text-[#8FF0F4] transition hover:text-white"
                      >
                        Ver salão
                      </Link>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="mt-5 rounded-[8px] bg-[#11172B] p-4 text-sm leading-6 text-white/58 ring-1 ring-white/10">
              Você ainda não tem agendamentos. Quando enviar uma solicitação para um salão, ela aparece aqui com o status.
            </p>
          )}
        </div>
      </section>
    </main>
  )
}
