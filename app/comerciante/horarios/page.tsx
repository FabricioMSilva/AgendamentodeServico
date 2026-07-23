import BusinessHoursForm from '@/components/admin/BusinessHoursForm'
import Card from '@/components/ui/Card'
import {
  getMerchantContext,
  getMerchantScheduleExceptions,
} from '@/lib/merchant/panel-data'
import type { Establishment } from '@/database.types'

type Props = {
  searchParams?: Promise<{ establishment?: string }>
}

export default async function MerchantHoursPage({ searchParams }: Props) {
  const { est } = await getMerchantContext(searchParams)
  const exceptions = await getMerchantScheduleExceptions(est.id)

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8FF0F4]">
          Horários
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Agenda de trabalho</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">
          Defina os dias, períodos, intervalos, bloqueios e horários extras que aparecem para clientes.
        </p>
      </header>

      <Card title={est.name}>
        <BusinessHoursForm establishment={est as Establishment} exceptions={exceptions} />
      </Card>
    </div>
  )
}
