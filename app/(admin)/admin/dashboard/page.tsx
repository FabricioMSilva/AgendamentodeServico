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
import ServiceCatalogPicker from '@/components/admin/ServiceCatalogPicker'
import AppointmentHistoryDashboard from '@/components/admin/AppointmentHistoryDashboard'
import Card from '@/components/ui/Card'
import type { AppointmentEvent, AppointmentStatus, Establishment, EstablishmentMedia, Service, ServiceCatalogItem, ServiceSuggestion } from '@/database.types'

export const metadata: Metadata = {
  title: 'Painel do Negócio | IBeleza',
  description: 'Gerencie seus agendamentos, procedimentos e perfil do negócio.',
}

// Shape of appointment rows joined with profiles + services
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
  searchParams?: Promise<{ tab?: string }>
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

  const { data: establishment } = await supabase
    .from('establishments')
    .select('*, services(*)')
    .eq('admin_id', user.id)
    .single()

  if (!establishment) {
    return (
      <main className="min-h-screen bg-[#1A2033] p-6 text-white">
        <p className="text-sm text-white/60">
          Nenhum estabelecimento configurado ainda. Entre em contato com o suporte.
        </p>
      </main>
    )
  }

  const historyStart = new Date()
  historyStart.setDate(historyStart.getDate() - 90)

  const [
    { data: rawAppointments },
    { data: mediaRaw },
    { data: catalogRaw },
    { data: suggestionsRaw },
    { data: eventsRaw },
  ] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, scheduled_at, status, customer_name, customer_phone, total_price, total_duration_minutes, profiles(name, email), services(name), appointment_items(service_name, price, duration_minutes)')
      .eq('establishment_id', establishment.id)
      .gte('scheduled_at', historyStart.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(500),
    supabase
      .from('establishment_media')
      .select('*')
      .eq('establishment_id', establishment.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('service_catalog')
      .select('*')
      .eq('business_type', establishment.business_type ?? 'salao_feminino')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('service_suggestions')
      .select('*')
      .eq('establishment_id', establishment.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('appointment_events')
      .select('*')
      .eq('establishment_id', establishment.id)
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  // Type-narrow the joined rows
  const appointments: AppointmentRow[] = (rawAppointments ?? []).map((a) => ({
    id: a.id,
    scheduled_at: a.scheduled_at,
    status: a.status as AppointmentStatus,
    customer_name: a.customer_name,
    customer_phone: a.customer_phone,
    total_price: a.total_price,
    total_duration_minutes: a.total_duration_minutes,
    profiles: Array.isArray(a.profiles) ? (a.profiles[0] ?? null) : a.profiles,
    services: Array.isArray(a.services) ? (a.services[0] ?? null) : a.services,
    appointment_items: a.appointment_items ?? [],
  }))

  const pending = appointments.filter((a) => a.status === 'pending')
  const confirmed = appointments.filter((a) =>
    (['confirmed', 'checked_in'] as AppointmentStatus[]).includes(a.status)
  )
  const completed = appointments.filter((a) =>
    (['completed', 'cancelled', 'no_show'] as AppointmentStatus[]).includes(a.status)
  )

  const services: Service[] = establishment.services ?? []
  const media = (mediaRaw ?? []) as EstablishmentMedia[]
  const catalog = (catalogRaw ?? []) as ServiceCatalogItem[]
  const suggestions = (suggestionsRaw ?? []) as ServiceSuggestion[]
  const events = (eventsRaw ?? []) as AppointmentEvent[]
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
        {establishment.is_blocked && (
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
                Painel do dono
              </p>
              <h1 className="mt-2 text-3xl font-bold leading-tight text-white sm:text-4xl">
                {establishment.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/64">
                <span className="rounded-full bg-white/8 px-3 py-1.5 ring-1 ring-white/10">
                  /{establishment.slug}
                </span>
                <span className="rounded-full bg-white/8 px-3 py-1.5 ring-1 ring-white/10">
                  {establishment.is_blocked ? 'Agenda pausada' : 'Agenda ativa'}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <LogoUpload
                establishmentId={establishment.id}
                currentLogoUrl={establishment.logo_url}
              />
              <Link
                href={`/${establishment.slug}`}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] px-5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Ver página pública
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Pendentes" value={String(pending.length)} detail="aguardando aprovação" />
          <Metric label="Hoje" value={String(appointmentsToday.length)} detail="horários futuros" />
          <Metric label="Serviços ativos" value={String(activeServices.length)} detail={`${services.length} cadastrados`} />
          <Metric label="Próximo horário" value={formatNextAppointment(nextAppointment)} detail={nextAppointment?.customer_name ?? 'sem cliente na fila'} />
        </section>

        <nav className="flex gap-2 overflow-x-auto rounded-[8px] bg-white/5 p-1 ring-1 ring-white/10">
          {TABS.map((tab) => (
            <Link
              key={tab.id}
              href={`/admin/dashboard?tab=${tab.id}`}
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
                <ProfileSettingsForm establishment={establishment as Establishment} />
              </Card>
            ) : null}

            {activeTab === 'midia' ? (
              <Card title="Mídia">
                <MediaManager media={media} />
              </Card>
            ) : null}

            {activeTab === 'funcionamento' ? (
              <Card title="Funcionamento">
                <BusinessHoursForm establishment={establishment as Establishment} />
              </Card>
            ) : null}

            {activeTab === 'servicos' ? (
              <Card title="Serviços">
                <ServiceCatalogPicker catalog={catalog} suggestions={suggestions} />
                <div className="mt-5 border-t border-white/10 pt-5">
                  <ServiceForm />
                </div>
                <div className="mt-5">
                  <ServiceList services={services} />
                </div>
              </Card>
            ) : null}
          </div>

          <Card title="Resumo">
            <div className="space-y-3 text-sm">
              <SummaryRow label="Contato" value={establishment.contact || establishment.whatsapp_phone || 'Não informado'} />
              <SummaryRow label="Endereço" value={establishment.address || 'Não informado'} />
              <SummaryRow label="Receita confirmada" value={money(confirmedRevenue)} />
              <SummaryRow label="Mídia" value={`${media.filter((item) => item.media_type === 'image').length}/6 fotos`} />
            </div>
          </Card>
        </div>
      </div>
    </main>
  )
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-[8px] bg-white/6 p-4 ring-1 ring-white/10">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-white/55">{detail}</p>
    </div>
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
