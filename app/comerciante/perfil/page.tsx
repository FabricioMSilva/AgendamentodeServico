import ProfileSettingsForm from '@/components/admin/ProfileSettingsForm'
import Card from '@/components/ui/Card'
import { getMerchantContext } from '@/lib/merchant/panel-data'
import type { Establishment } from '@/database.types'

type Props = {
  searchParams?: Promise<{ establishment?: string }>
}

export default async function MerchantProfilePage({ searchParams }: Props) {
  const { est } = await getMerchantContext(searchParams)

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8FF0F4]">
          Perfil
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Dados do negócio</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">
          Edite nome, endereço, contatos e redes sociais exibidos para clientes.
        </p>
      </header>

      <Card title={est.name}>
        <ProfileSettingsForm establishment={est as Establishment} />
      </Card>
    </div>
  )
}
