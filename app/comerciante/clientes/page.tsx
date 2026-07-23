import Card from '@/components/ui/Card'
import { getMerchantAppointments, getMerchantContext } from '@/lib/merchant/panel-data'

type Props = {
  searchParams?: Promise<{ establishment?: string }>
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: 'Pendente',
    confirmed: 'Confirmado',
    checked_in: 'Em atendimento',
    completed: 'Concluído',
    cancelled: 'Cancelado',
    no_show: 'Não compareceu',
  }

  return labels[status] ?? status
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export default async function MerchantClientsPage({ searchParams }: Props) {
  const { est } = await getMerchantContext(searchParams)
  const appointments = await getMerchantAppointments(est.id)
  const clientsMap = appointments.reduce((map, appointment) => {
      const key = appointment.customer_phone || appointment.customer_name || appointment.profiles?.email || appointment.id
      const existing = map.get(key)
      const current = {
        key,
        name: appointment.customer_name ?? appointment.profiles?.name ?? 'Cliente',
        phone: appointment.customer_phone ?? 'Telefone não informado',
        appointments: (existing?.appointments ?? 0) + 1,
        lastAppointment: existing && new Date(existing.lastAppointment) > new Date(appointment.scheduled_at)
          ? existing.lastAppointment
          : appointment.scheduled_at,
        lastStatus: existing && new Date(existing.lastAppointment) > new Date(appointment.scheduled_at)
          ? existing.lastStatus
          : appointment.status,
        revenue: (existing?.revenue ?? 0) + Number(appointment.total_price ?? 0),
      }
      map.set(key, current)
      return map
    }, new Map<string, {
      key: string
      name: string
      phone: string
      appointments: number
      lastAppointment: string
      lastStatus: string
      revenue: number
    }>())
  const clients = Array.from(clientsMap.values())
    .sort((a, b) => new Date(b.lastAppointment).getTime() - new Date(a.lastAppointment).getTime())

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8FF0F4]">
          Clientes
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Clientes agendados</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">
          Consulte quem já agendou em {est.name}, histórico de atendimento e contato.
        </p>
      </header>

      <Card title={`${clients.length} cliente${clients.length === 1 ? '' : 's'}`}>
        {clients.length === 0 ? (
          <p className="rounded-[8px] bg-[#11172B] p-4 text-sm text-white/55">
            Nenhum cliente agendado ainda.
          </p>
        ) : (
          <div className="overflow-hidden rounded-[8px] border border-white/10">
            <div className="hidden grid-cols-[1.4fr_1fr_110px_130px_120px] gap-3 bg-white/6 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/42 md:grid">
              <span>Cliente</span>
              <span>Telefone</span>
              <span>Agendas</span>
              <span>Último horário</span>
              <span>Status</span>
            </div>
            <div className="divide-y divide-white/10">
              {clients.map((client) => (
                <div key={client.key} className="grid gap-2 bg-[#11172B] px-4 py-3 text-sm md:grid-cols-[1.4fr_1fr_110px_130px_120px] md:items-center md:gap-3">
                  <div>
                    <p className="font-semibold text-white">{client.name}</p>
                    <p className="text-xs text-white/45">R$ {client.revenue.toFixed(2)} em histórico</p>
                  </div>
                  <p className="text-white/65">{client.phone}</p>
                  <p className="text-white/65">{client.appointments}</p>
                  <p className="text-white/65">{dateLabel(client.lastAppointment)}</p>
                  <p className="w-fit rounded-full bg-white/8 px-2.5 py-1 text-xs font-semibold text-white/68 ring-1 ring-white/10">
                    {statusLabel(client.lastStatus)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
