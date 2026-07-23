import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import NewEstablishmentModal from '@/components/owner/NewEstablishmentModal'
import OwnerEstablishmentEditor from '@/components/owner/OwnerEstablishmentEditor'
import AppointmentBoard from '@/components/admin/AppointmentBoard'
import {
  mapServico,
  toLegacyAppointmentStatus,
  type AgendamentoPortugues,
} from '@/lib/supabase/portuguese-schema-adapter'
import { getServiceCatalog } from '@/lib/services/catalog-server'
import type { AppointmentStatus } from '@/database.types'

export const dynamic = 'force-dynamic'

const MAX_OWNER_ESTABLISHMENTS = 3

type OwnerAppointment = {
  id: string
  establishment_id: string
  scheduled_at: string
  status: AppointmentStatus
  customer_name: string | null
  customer_phone: string | null
  total_price: number | null
  total_duration_minutes: number
  profiles: { name: string | null; email: string } | null
  services: { name: string } | null
  appointment_items: {
    service_name: string
    price: number | null
    duration_minutes: number
  }[]
}

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

    const establishmentIds = (establishments ?? []).map((establishment) => establishment.id)
    const historyStart = new Date()
    historyStart.setDate(historyStart.getDate() - 90)

    const { data: rawAppointments } = establishmentIds.length > 0
      ? await db
          .from('agendamentos')
          .select('id, estabelecimento_id, horario, status, nome_cliente, telefone_cliente, preco_total, duracao_total_minutos, usuarios(nome, email), itens_agendamento(nome_servico, preco, duracao_minutos)')
          .in('estabelecimento_id', establishmentIds)
          .gte('horario', historyStart.toISOString())
          .order('horario', { ascending: true })
          .limit(500)
      : { data: [] }

    const appointments: OwnerAppointment[] = ((rawAppointments ?? []) as AgendamentoPortugues[]).map((appointment) => ({
      id: appointment.id,
      establishment_id: appointment.estabelecimento_id,
      scheduled_at: appointment.horario,
      status: toLegacyAppointmentStatus(appointment.status),
      customer_name: appointment.nome_cliente,
      customer_phone: appointment.telefone_cliente,
      total_price: appointment.preco_total,
      total_duration_minutes: appointment.duracao_total_minutos,
      profiles: (() => {
        const profile = Array.isArray(appointment.usuarios) ? (appointment.usuarios[0] ?? null) : appointment.usuarios
        return profile ? { name: profile.nome, email: profile.email ?? '' } : null
      })(),
      services: null,
      appointment_items: (appointment.itens_agendamento ?? []).map((item) => ({
        service_name: item.nome_servico,
        price: item.preco,
        duration_minutes: item.duracao_minutos,
      })),
    }))

    const pendingCount = appointments.filter((appointment) => appointment.status === 'pending').length

    return (
      <main className="min-h-screen bg-[#1A2033] px-4 py-8 text-white sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-5xl space-y-5 py-8">
          <section className="rounded-[8px] bg-white/6 p-5 ring-1 ring-white/10">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
                  Aprovar agendamentos
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Solicitações dos clientes</h2>
                <p className="mt-2 text-sm leading-6 text-white/68">
                  Confirme, recuse ou finalize os horários solicitados em seus estabelecimentos.
                </p>
              </div>
              <span className="w-fit rounded-full bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100">
                {pendingCount} pendente{pendingCount === 1 ? '' : 's'}
              </span>
            </div>

            <div className="mt-5 space-y-6">
              {(establishments ?? []).map((establishment) => {
                const establishmentAppointments = appointments.filter(
                  (appointment) => appointment.establishment_id === establishment.id,
                )
                const pending = establishmentAppointments.filter((appointment) => appointment.status === 'pending')
                const confirmed = establishmentAppointments.filter((appointment) =>
                  (['confirmed', 'checked_in'] as AppointmentStatus[]).includes(appointment.status),
                )
                const completed = establishmentAppointments.filter((appointment) =>
                  (['completed', 'cancelled', 'no_show'] as AppointmentStatus[]).includes(appointment.status),
                )

                return (
                  <div key={establishment.id} className="rounded-[8px] border border-white/10 bg-[#11172B]/45 p-4">
                    <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="font-semibold text-white">{establishment.nome}</h3>
                        <p className="text-sm text-white/48">/{establishment.slug}</p>
                      </div>
                      <span className="w-fit rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-white/60">
                        {establishmentAppointments.length} agendamento{establishmentAppointments.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <AppointmentBoard
                      pendingApproval={pending}
                      confirmed={confirmed}
                      completedServices={completed}
                      establishmentId={establishment.id}
                      establishmentName={establishment.nome}
                    />
                  </div>
                )
              })}
              {(establishments ?? []).length === 0 ? (
                <p className="rounded-[8px] bg-[#11172B]/45 p-4 text-sm text-white/55">
                  Cadastre um estabelecimento para receber e aprovar agendamentos.
                </p>
              ) : null}
            </div>
          </section>

          {(establishments ?? []).length < MAX_OWNER_ESTABLISHMENTS ? (
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
