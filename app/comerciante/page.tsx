import Link from 'next/link'
import Card from '@/components/ui/Card'
import DashboardStatCard from '@/components/ui/DashboardStatCard'
import {
  getMerchantAppointments,
  getMerchantContext,
  getMerchantMedia,
  getMerchantServices,
  splitMerchantAppointments,
} from '@/lib/merchant/panel-data'
import type { AppointmentStatus } from '@/database.types'

type Props = {
  searchParams?: Promise<{ establishment?: string }>
}

function money(value: number | null) {
  return value == null ? 'Sob consulta' : `R$ ${Number(value).toFixed(2)}`
}

function isSameDay(date: Date, compare: Date) {
  return (
    date.getFullYear() === compare.getFullYear() &&
    date.getMonth() === compare.getMonth() &&
    date.getDate() === compare.getDate()
  )
}

function formatNextAppointment(date?: string) {
  if (!date) return 'Nenhum horário'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export default async function MerchantHomePage({ searchParams }: Props) {
  const { est } = await getMerchantContext(searchParams)
  const [appointments, media] = await Promise.all([
    getMerchantAppointments(est.id),
    getMerchantMedia(est.id),
  ])
  const { pending, confirmed } = splitMerchantAppointments(appointments)
  const services = getMerchantServices(est)
  const activeServices = services.filter((service) => service.is_active)
  const now = new Date()
  const upcomingAppointments = appointments.filter(
    (appointment) =>
      (['pending', 'confirmed', 'checked_in'] as AppointmentStatus[]).includes(appointment.status) &&
      new Date(appointment.scheduled_at) >= now,
  )
  const appointmentsToday = upcomingAppointments.filter((appointment) =>
    isSameDay(new Date(appointment.scheduled_at), now),
  )
  const confirmedRevenue = confirmed.reduce(
    (sum, appointment) => sum + Number(appointment.total_price ?? 0),
    0,
  )
  const query = `establishment=${est.id}`

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {est.is_blocked ? (
        <div className="rounded-[8px] border border-[#ff8ea8]/20 bg-[#ff8ea8]/12 p-4">
          <p className="text-sm font-semibold text-[#ff8ea8]">Estabelecimento pausado</p>
          <p className="mt-1 text-sm text-white/68">Novos agendamentos estão indisponíveis até a regularização.</p>
        </div>
      ) : null}

      <header className="rounded-[8px] bg-[linear-gradient(180deg,#11172a_0%,#171f38_56%,#241737_100%)] p-5 ring-1 ring-white/10 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/48">
          Painel do comerciante
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight text-white sm:text-4xl">
          {est.name}
        </h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/${est.slug}`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#11172B]">
            Ver página pública
          </Link>
          <Link href={`/comerciante/agendamentos?${query}`} className="rounded-full bg-white/8 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/10">
            Ver agendamentos
          </Link>
          <Link href={`/comerciante/horarios?${query}`} className="rounded-full bg-[#8FF0F4]/10 px-4 py-2 text-sm font-semibold text-[#8FF0F4] ring-1 ring-[#8FF0F4]/20">
            Ajustar horários
          </Link>
        </div>
      </header>

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardStatCard title="Pendentes" value={pending.length} detail="aguardando aprovação" className="bg-white/5" compact />
        <DashboardStatCard title="Hoje" value={appointmentsToday.length} detail="horários futuros" className="bg-white/5" compact />
        <DashboardStatCard title="Serviços" value={activeServices.length} detail={`${services.length} total`} className="bg-white/5" compact />
        <DashboardStatCard title="Próximo" value={formatNextAppointment(upcomingAppointments[0]?.scheduled_at)} detail={upcomingAppointments[0]?.customer_name ?? 'sem cliente'} className="bg-white/5" compact />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card title="Próximos passos">
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href={`/comerciante/agendamentos?${query}`} className="rounded-[8px] bg-[#11172B] p-4 ring-1 ring-white/10 transition hover:bg-white/8">
              <p className="font-semibold text-white">Aprovar solicitações</p>
              <p className="mt-1 text-sm text-white/55">{pending.length} pendente{pending.length === 1 ? '' : 's'}</p>
            </Link>
            <Link href={`/comerciante/servicos?${query}`} className="rounded-[8px] bg-[#11172B] p-4 ring-1 ring-white/10 transition hover:bg-white/8">
              <p className="font-semibold text-white">Organizar serviços</p>
              <p className="mt-1 text-sm text-white/55">Preço, duração e fotos</p>
            </Link>
            <Link href={`/comerciante/horarios?${query}`} className="rounded-[8px] bg-[#11172B] p-4 ring-1 ring-white/10 transition hover:bg-white/8">
              <p className="font-semibold text-white">Agenda de trabalho</p>
              <p className="mt-1 text-sm text-white/55">Dias, intervalos e extras</p>
            </Link>
            <Link href={`/comerciante/midia?${query}`} className="rounded-[8px] bg-[#11172B] p-4 ring-1 ring-white/10 transition hover:bg-white/8">
              <p className="font-semibold text-white">Atualizar mídia</p>
              <p className="mt-1 text-sm text-white/55">{media.filter((item) => item.media_type === 'image').length}/6 fotos</p>
            </Link>
          </div>
        </Card>

        <Card title="Resumo">
          <div className="space-y-3 text-sm">
            <SummaryRow label="Contato" value={est.contact || est.whatsapp_phone || 'Não informado'} />
            <SummaryRow label="Endereço" value={est.address || 'Não informado'} />
            <SummaryRow label="Receita confirmada" value={money(confirmedRevenue)} />
            <SummaryRow label="Página" value={`/${est.slug}`} />
          </div>
        </Card>
      </div>
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
