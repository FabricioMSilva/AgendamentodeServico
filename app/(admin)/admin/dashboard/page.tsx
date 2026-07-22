import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ServiceList from '@/components/admin/ServiceList'
import ServiceForm from '@/components/admin/ServiceForm'
import LogoUpload from '@/components/admin/LogoUpload'
import AppointmentBoard from '@/components/admin/AppointmentBoard'
import BusinessHoursForm from '@/components/admin/BusinessHoursForm'
import MediaManager from '@/components/admin/MediaManager'
import ProfileSettingsForm from '@/components/admin/ProfileSettingsForm'
import AppointmentHistoryDashboard from '@/components/admin/AppointmentHistoryDashboard'
import LogoutButton from '@/components/auth/LogoutButton'
import Card from '@/components/ui/Card'
import DashboardStatCard from '@/components/ui/DashboardStatCard'
import {
  mapEstabelecimento,
  mapMidiaEstabelecimento,
  toLegacyAppointmentStatus,
  type AgendamentoPortugues,
} from '@/lib/supabase/portuguese-schema-adapter'
import { getServiceCatalog } from '@/lib/services/catalog-server'
import type { AppointmentEvent, AppointmentStatus, Establishment, Service } from '@/database.types'

export const metadata: Metadata = {
  title: 'Painel do Negócio | IBeleza',
  description: 'Gerencie seus agendamentos, procedimentos e perfil do negócio.',
}

// Formato dos agendamentos unidos com perfis e servicos.
type AppointmentRow = {
  id: string
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

type DashboardTab = 'agenda' | 'historico' | 'perfil' | 'midia' | 'funcionamento' | 'servicos'

type Props = {
  searchParams?: Promise<{ tab?: string; establishment?: string }>
}

const TABS: { id: DashboardTab; label: string }[] = [
  { id: 'agenda', label: 'Agenda' },
  { id: 'historico', label: 'Histórico' },
  { id: 'perfil', label: 'Perfil' },
  { id: 'midia', label: 'Mídia' },
  { id: 'funcionamento', label: 'Funcionamento' },
  { id: 'servicos', label: 'Serviços' },
]

function money(value: number | null) {
  return value == null ? 'Sob consulta' : `R$ ${Number(value).toFixed(2)}`
}

function formatNextAppointment(appointment?: AppointmentRow) {
  if (!appointment) return 'Nenhum horário futuro'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(appointment.scheduled_at))
}

function isSameDay(date: Date, compare: Date) {
  return (
    date.getFullYear() === compare.getFullYear() &&
    date.getMonth() === compare.getMonth() &&
    date.getDate() === compare.getDate()
  )
}

export default async function AdminDashboard({ searchParams }: Props) {
  const params = await searchParams
  const activeTab = TABS.some((tab) => tab.id === params?.tab)
    ? (params?.tab as DashboardTab)
    : 'agenda'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: establishments } = await supabase
    .from('estabelecimentos')
    .select('*, servicos(*)')
    .eq('usuario_admin_id', user.id)
    .eq('status_aprovacao', 'aprovado')
    .order('criado_em', { ascending: true })

  if (!establishments || establishments.length === 0) {
    return (
      <main className="min-h-screen bg-[#1A2033] p-6 text-white">
        <p className="text-sm text-white/60">
          Nenhum estabelecimento configurado ainda. Cadastre seu primeiro negócio para liberar o painel.
        </p>
        <Link
          href="/dono"
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] px-5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Criar estabelecimento
        </Link>
      </main>
    )
  }

  const selectedEstablishment =
    establishments.find((item) => item.id === params?.establishment) ?? establishments[0]
  const selectedQuery = `establishment=${selectedEstablishment.id}`

  const historyStart = new Date()
  historyStart.setDate(historyStart.getDate() - 90)

  const [
    { data: rawAppointments },
    { data: mediaRaw },
    serviceCatalog,
  ] = await Promise.all([
    supabase
      .from('agendamentos')
      .select('id, horario, status, nome_cliente, telefone_cliente, preco_total, duracao_total_minutos, usuarios(nome, email), itens_agendamento(nome_servico, preco, duracao_minutos)')
      .eq('estabelecimento_id', selectedEstablishment.id)
      .gte('horario', historyStart.toISOString())
      .order('horario', { ascending: true })
      .limit(500),
    supabase
      .from('midias_estabelecimento')
      .select('*')
      .eq('estabelecimento_id', selectedEstablishment.id)
      .order('ordem', { ascending: true })
      .order('criado_em', { ascending: true }),
    getServiceCatalog(),
  ])

  const est = mapEstabelecimento(selectedEstablishment)

  // Estreita os tipos das linhas retornadas pelos joins.
  const appointments: AppointmentRow[] = ((rawAppointments ?? []) as AgendamentoPortugues[]).map((a) => ({
    id: a.id,
    scheduled_at: a.horario,
    status: toLegacyAppointmentStatus(a.status),
    customer_name: a.nome_cliente,
    customer_phone: a.telefone_cliente,
    total_price: a.preco_total,
    total_duration_minutes: a.duracao_total_minutos,
    profiles: (() => {
      const profile = Array.isArray(a.usuarios) ? (a.usuarios[0] ?? null) : a.usuarios
      return profile ? { name: profile.nome, email: profile.email ?? '' } : null
    })(),
    services: null,
    appointment_items: (a.itens_agendamento ?? []).map((item) => ({
      service_name: item.nome_servico,
      price: item.preco,
      duration_minutes: item.duracao_minutos,
    })),
  }))

  const pending = appointments.filter((a) => a.status === 'pending')
  const confirmed = appointments.filter((a) =>
    (['confirmed', 'checked_in'] as AppointmentStatus[]).includes(a.status)
  )
  const completed = appointments.filter((a) =>
    (['completed', 'cancelled', 'no_show'] as AppointmentStatus[]).includes(a.status)
  )

  const services: Service[] = est.services ?? []
  const media = ((mediaRaw ?? []) as Parameters<typeof mapMidiaEstabelecimento>[0][]).map(mapMidiaEstabelecimento)
  const events: AppointmentEvent[] = []
  const activeServices = services.filter((service) => service.is_active)
  const now = new Date()
  const upcomingAppointments = appointments.filter(
    (appointment) =>
      (['pending', 'confirmed', 'checked_in'] as AppointmentStatus[]).includes(appointment.status) &&
      new Date(appointment.scheduled_at) >= now,
  )
  const nextAppointment = upcomingAppointments[0]
  const appointmentsToday = upcomingAppointments.filter((appointment) =>
    isSameDay(new Date(appointment.scheduled_at), now),
  )
  const confirmedRevenue = confirmed.reduce(
    (sum, appointment) => sum + Number(appointment.total_price ?? 0),
    0,
  )

  return (
    <main className="min-h-screen bg-[#1A2033] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {est.is_blocked && (
          <div className="rounded-[8px] border border-[#ff8ea8]/20 bg-[#ff8ea8]/12 p-4">
            <p className="text-sm font-semibold text-[#ff8ea8]">
              Estabelecimento suspenso
            </p>
            <p className="mt-1 text-sm text-white/68">
              Novos agendamentos estão pausados. Entre em contato com o suporte para resolver.
            </p>
          </div>
        )}

        <header className="rounded-[8px] bg-[linear-gradient(180deg,#11172a_0%,#171f38_56%,#241737_100%)] p-5 ring-1 ring-white/10 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/48">
                Painel do comerciante
              </p>
              <h1 className="mt-2 text-3xl font-bold leading-tight text-white sm:text-4xl">
                {est.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/64">
                <span className="rounded-full bg-white/8 px-3 py-1.5 ring-1 ring-white/10">
                  /{est.slug}
                </span>
                <span className="rounded-full bg-white/8 px-3 py-1.5 ring-1 ring-white/10">
                  {est.is_blocked ? 'Agenda pausada' : 'Agenda ativa'}
                </span>
                <span className="rounded-full bg-white/8 px-3 py-1.5 ring-1 ring-white/10">
                  Aprovações e horários ficam aqui
                </span>
              </div>
            </div>

            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <LogoUpload
                establishmentId={est.id}
                currentLogoUrl={est.logo_url}
              />
              <Link
                href={`/${est.slug}`}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] px-5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Ver página pública
              </Link>
              <LogoutButton redirectTo="/login" />
            </div>
          </div>
        </header>

        <section className="rounded-[8px] border border-white/10 bg-white/5 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8FF0F4]">
                Seus estabelecimentos
              </p>
              <p className="mt-1 text-sm text-white/60">
                Escolha qual negócio deseja administrar agora. Você pode ter até 3.
              </p>
            </div>
            <Link
              href="/dono"
              className="inline-flex min-h-10 w-full items-center justify-center rounded-full bg-white/8 px-4 text-sm font-semibold text-white transition hover:bg-white/12 sm:w-fit"
            >
              Gerenciar negócios
            </Link>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {establishments.map((item) => {
              const selected = item.id === selectedEstablishment.id
              return (
                <Link
                  key={item.id}
                  href={`/admin/dashboard?tab=${activeTab}&establishment=${item.id}`}
                  className={[
                    'rounded-[8px] border p-3 transition',
                    selected
                      ? 'border-[#8FF0F4]/55 bg-[#8FF0F4]/10'
                      : 'border-white/10 bg-[#11172B]/50 hover:border-white/20 hover:bg-white/8',
                  ].join(' ')}
                >
                  <p className="truncate text-sm font-semibold text-white">{item.nome}</p>
                  <p className="mt-1 text-xs text-white/48">/{item.slug}</p>
                  <p className={['mt-2 text-xs font-semibold', item.bloqueado ? 'text-[#ff8ea8]' : 'text-emerald-100'].join(' ')}>
                    {item.bloqueado ? 'Pausado' : 'Ativo'}
                  </p>
                </Link>
              )
            })}
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <Card title="Atalhos rápidos" className="bg-white/5">
            <div className="space-y-2 text-sm text-white/72">
              <p>Gerencie agenda, aprovações, fotos e horários sem sair do painel.</p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Link href={`/admin/dashboard?tab=agenda&${selectedQuery}`} className="rounded-full bg-white/8 px-3 py-1.5 ring-1 ring-white/10 transition hover:bg-white/12">
                  Agenda
                </Link>
                <Link href={`/admin/dashboard?tab=funcionamento&${selectedQuery}`} className="rounded-full bg-white/8 px-3 py-1.5 ring-1 ring-white/10 transition hover:bg-white/12">
                  Horários
                </Link>
                <Link href={`/admin/dashboard?tab=midia&${selectedQuery}`} className="rounded-full bg-white/8 px-3 py-1.5 ring-1 ring-white/10 transition hover:bg-white/12">
                  Fotos
                </Link>
                <Link href="/dono" className="rounded-full bg-white/8 px-3 py-1.5 ring-1 ring-white/10 transition hover:bg-white/12">
                  Meus negócios
                </Link>
              </div>
            </div>
          </Card>
          <Card title="Quem aprova" className="bg-white/5">
            <div className="space-y-2 text-sm text-white/72">
              <p>O comerciante aprova ou recusa agendamentos.</p>
              <p>O painel VIP do site vê todo o conjunto de negócios, clientes e status.</p>
            </div>
          </Card>
          <Card title="Acesso" className="bg-white/5">
            <div className="space-y-2 text-sm text-white/72">
              <p>Use este painel depois que o seu acesso for liberado por convite.</p>
              <p>Se precisar sair, o botão de logout fica no topo.</p>
            </div>
          </Card>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardStatCard title="Pendentes" value={pending.length} detail="aguardando aprovação" className="bg-white/5" />
          <DashboardStatCard title="Hoje" value={appointmentsToday.length} detail="horários futuros" className="bg-white/5" />
          <DashboardStatCard title="Serviços ativos" value={activeServices.length} detail={`${services.length} cadastrados`} className="bg-white/5" />
          <DashboardStatCard
            title="Próximo horário"
            value={formatNextAppointment(nextAppointment)}
            detail={nextAppointment?.customer_name ?? 'sem cliente na fila'}
            className="bg-white/5"
          />
        </section>

        <nav className="flex gap-2 overflow-x-auto rounded-[8px] bg-white/5 p-1 ring-1 ring-white/10">
          {TABS.map((tab) => (
            <Link
              key={tab.id}
              href={`/admin/dashboard?tab=${tab.id}&${selectedQuery}`}
              className={[
                'inline-flex min-h-10 shrink-0 items-center justify-center rounded-[8px] px-4 text-sm font-semibold transition',
                activeTab === tab.id
                  ? 'bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] text-white shadow-[0_10px_24px_rgba(106,0,255,0.2)]'
                  : 'text-white/68 hover:bg-white/8 hover:text-white',
              ].join(' ')}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            {activeTab === 'agenda' ? (
              <Card title="Agenda">
                <AppointmentBoard
                  pendingApproval={pending}
                  confirmed={confirmed}
                  completedServices={completed}
                  establishmentId={est.id}
                />
              </Card>
            ) : null}

            {activeTab === 'historico' ? (
              <Card title="Histórico e ganhos">
                <AppointmentHistoryDashboard appointments={appointments} events={events} />
              </Card>
            ) : null}

            {activeTab === 'perfil' ? (
              <Card title="Perfil">
                <ProfileSettingsForm establishment={est as Establishment} />
              </Card>
            ) : null}

            {activeTab === 'midia' ? (
              <Card title="Mídia">
                <MediaManager media={media} establishmentId={est.id} />
              </Card>
            ) : null}

            {activeTab === 'funcionamento' ? (
              <Card title="Funcionamento">
                <BusinessHoursForm establishment={est as Establishment} />
              </Card>
            ) : null}

            {activeTab === 'servicos' ? (
              <Card title="Serviços">
                <ServiceForm catalog={serviceCatalog} establishmentId={est.id} />
                <div className="mt-5">
                  <ServiceList services={services} catalog={serviceCatalog} establishmentId={est.id} />
                </div>
              </Card>
            ) : null}
          </div>

          <Card title="Resumo">
            <div className="space-y-3 text-sm">
              <SummaryRow label="Contato" value={est.contact || est.whatsapp_phone || 'Não informado'} />
              <SummaryRow label="Endereço" value={est.address || 'Não informado'} />
              <SummaryRow label="Receita confirmada" value={money(confirmedRevenue)} />
              <SummaryRow label="Mídia" value={`${media.filter((item) => item.media_type === 'image').length}/6 fotos`} />
            </div>
          </Card>
        </div>
      </div>
    </main>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-[#11172B] p-3 ring-1 ring-white/10">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/42">{label}</p>
      <p className="mt-1 leading-6 text-white/78">{value}</p>
    </div>
  )
}
