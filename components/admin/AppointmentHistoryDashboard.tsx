import type { AppointmentEvent } from '@/database.types'

type HistoryAppointment = {
  id: string
  scheduled_at: string
  status: string
  customer_name: string | null
  customer_phone: string | null
  total_price: number | null
  appointment_items: {
    service_name: string
    price: number | null
    duration_minutes: number
  }[]
}

function money(value: number) {
  return `R$ ${value.toFixed(2)}`
}

function eventLabel(type: AppointmentEvent['event_type']) {
  const labels: Record<AppointmentEvent['event_type'], string> = {
    created: 'Agendamento criado',
    owner_confirmed: 'Aceito pelo dono',
    owner_rejected: 'Recusado pelo dono',
    customer_confirmed: 'Confirmado pelo cliente',
    customer_declined: 'Cancelado pelo cliente',
    completed: 'Atendimento realizado',
    cancelled: 'Cancelado',
    no_show: 'Não compareceu',
    reminder_sent: 'Lembrete enviado',
  }
  return labels[type]
}

function isWithinDays(date: string, days: number) {
  const current = new Date(date).getTime()
  const start = Date.now() - days * 24 * 60 * 60 * 1000
  return current >= start
}

export default function AppointmentHistoryDashboard({
  appointments,
  events,
}: {
  appointments: HistoryAppointment[]
  events: AppointmentEvent[]
}) {
  const completed = appointments.filter((item) => item.status === 'completed')
  const weeklyRevenue = completed
    .filter((item) => isWithinDays(item.scheduled_at, 7))
    .reduce((sum, item) => sum + Number(item.total_price ?? 0), 0)
  const monthlyRevenue = completed
    .filter((item) => isWithinDays(item.scheduled_at, 30))
    .reduce((sum, item) => sum + Number(item.total_price ?? 0), 0)
  const cancelled = appointments.filter((item) => ['cancelled', 'no_show'].includes(item.status))
  const confirmed = appointments.filter((item) => item.status === 'confirmed')

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Semana" value={money(weeklyRevenue)} detail="ganhos em 7 dias" />
        <Metric label="Mês" value={money(monthlyRevenue)} detail="ganhos em 30 dias" />
        <Metric label="Realizados" value={String(completed.length)} detail="atendimentos concluídos" />
        <Metric label="Cancelados" value={String(cancelled.length)} detail="recusas e faltas" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <section className="rounded-[8px] border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold text-white">Histórico de agendamentos</p>
          <div className="mt-4 space-y-3">
            {appointments.slice(0, 20).map((item) => (
              <div key={item.id} className="rounded-[8px] bg-[#11172B] p-3 ring-1 ring-white/10">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.customer_name || 'Cliente'}</p>
                    <p className="mt-1 text-xs text-white/55">
                      {new Intl.DateTimeFormat('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(new Date(item.scheduled_at))}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-white/70 ring-1 ring-white/10">
                    {item.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-white/60">
                  {item.appointment_items.map((service) => service.service_name).join(' + ') || 'Serviço'}
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {item.total_price == null ? 'Sob consulta' : money(Number(item.total_price))}
                </p>
              </div>
            ))}
            {appointments.length === 0 ? (
              <p className="text-sm text-white/55">Nenhum agendamento registrado ainda.</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-[8px] border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold text-white">Linha do tempo</p>
          <div className="mt-4 space-y-3">
            {events.slice(0, 30).map((event) => (
              <div key={event.id} className="rounded-[8px] bg-[#11172B] p-3 ring-1 ring-white/10">
                <p className="text-sm font-semibold text-white">{eventLabel(event.event_type)}</p>
                <p className="mt-1 text-xs text-white/55">
                  {new Intl.DateTimeFormat('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(new Date(event.created_at))}
                  {event.status_to ? ` · ${event.status_to}` : ''}
                </p>
                {event.amount != null ? (
                  <p className="mt-2 text-xs text-emerald-100">{money(Number(event.amount))}</p>
                ) : null}
              </div>
            ))}
            {events.length === 0 ? (
              <p className="text-sm text-white/55">Os eventos aparecerão aqui conforme a agenda for usada.</p>
            ) : null}
          </div>
        </section>
      </div>

      <div className="rounded-[8px] border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-semibold text-white">Situação atual</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <Metric label="Aceitos" value={String(confirmed.length)} detail="aguardando atendimento" />
          <Metric label="Pendentes" value={String(appointments.filter((item) => item.status === 'pending').length)} detail="precisam de resposta" />
          <Metric label="Ticket médio" value={money(completed.length ? monthlyRevenue / completed.length : 0)} detail="base últimos 30 dias" />
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[8px] bg-[#11172B] p-4 ring-1 ring-white/10">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-white/55">{detail}</p>
    </div>
  )
}
