import AppointmentBoard from '@/components/admin/AppointmentBoard'
import Card from '@/components/ui/Card'
import {
  getMerchantAppointments,
  getMerchantContext,
  splitMerchantAppointments,
} from '@/lib/merchant/panel-data'

type Props = {
  searchParams?: Promise<{ establishment?: string }>
}

export default async function MerchantAppointmentsPage({ searchParams }: Props) {
  const { est } = await getMerchantContext(searchParams)
  const appointments = await getMerchantAppointments(est.id)
  const { pending, confirmed, completed } = splitMerchantAppointments(appointments)

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8FF0F4]">
          Agendamentos
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Solicitações dos clientes</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">
          Confirme, recuse ou finalize os horários solicitados em {est.name}.
        </p>
      </header>

      <Card title={`${pending.length} pendente${pending.length === 1 ? '' : 's'}`}>
        <AppointmentBoard
          pendingApproval={pending}
          confirmed={confirmed}
          completedServices={completed}
          establishmentId={est.id}
          establishmentName={est.name}
        />
      </Card>
    </div>
  )
}
