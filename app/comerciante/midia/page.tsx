import MediaManager from '@/components/admin/MediaManager'
import Card from '@/components/ui/Card'
import { getMerchantContext, getMerchantMedia } from '@/lib/merchant/panel-data'

type Props = {
  searchParams?: Promise<{ establishment?: string }>
}

export default async function MerchantMediaPage({ searchParams }: Props) {
  const { est } = await getMerchantContext(searchParams)
  const media = await getMerchantMedia(est.id)

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8FF0F4]">
          Mídia
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Fotos e vídeos</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">
          Atualize a vitrine visual da página pública de {est.name}.
        </p>
      </header>

      <Card title="Galeria">
        <MediaManager media={media} establishmentId={est.id} />
      </Card>
    </div>
  )
}
