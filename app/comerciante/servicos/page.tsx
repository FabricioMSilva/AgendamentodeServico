import ServiceForm from '@/components/admin/ServiceForm'
import ServiceList from '@/components/admin/ServiceList'
import Card from '@/components/ui/Card'
import { getMerchantContext, getMerchantServices } from '@/lib/merchant/panel-data'
import { getServiceCatalog } from '@/lib/services/catalog-server'

type Props = {
  searchParams?: Promise<{ establishment?: string }>
}

export default async function MerchantServicesPage({ searchParams }: Props) {
  const { est } = await getMerchantContext(searchParams)
  const catalog = await getServiceCatalog()
  const services = getMerchantServices(est)

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8FF0F4]">
          Serviços
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Serviços e preços</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">
          Cadastre o que o cliente pode escolher na agenda. A duração bloqueia o tempo correto.
        </p>
      </header>

      <Card title="Novo serviço">
        <ServiceForm catalog={catalog} establishmentId={est.id} />
      </Card>

      <Card title={`${services.length} serviço${services.length === 1 ? '' : 's'} cadastrado${services.length === 1 ? '' : 's'}`}>
        <ServiceList services={services} catalog={catalog} establishmentId={est.id} />
      </Card>
    </div>
  )
}
