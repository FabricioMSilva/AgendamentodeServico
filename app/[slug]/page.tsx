import { cache } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import BlockedScreen from '@/components/customer/BlockedScreen'
import BookingForm from '@/components/customer/BookingForm'
import EstablishmentInfoMenu from '@/components/customer/EstablishmentInfoMenu'
import { mapEstabelecimento, mapMidiaEstabelecimento } from '@/lib/supabase/portuguese-schema-adapter'
import type { EstablishmentMedia, Service } from '@/database.types'

type BusinessHours = Record<string, { open: string; close: string } | null>
type ReservedSlot = {
  scheduled_at: string
  total_duration_minutes: number
  customer_name: string | null
}

type Props = {
  params: Promise<{ slug: string }>
}

function getInitials(name: string) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 3)
    .toUpperCase()

  return initials || 'IB'
}

function money(value: number | null) {
  return value == null ? 'Sob consulta' : `R$ ${Number(value).toFixed(2)}`
}

const weekdayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function formatBusinessHours(hours: BusinessHours) {
  return weekdayLabels.map((label, index) => {
    const slot = hours[String(index)]
    return {
      label,
      value: slot ? `${slot.open} - ${slot.close}` : 'Fechado',
      open: Boolean(slot),
    }
  })
}

// O cache do React deduplica esta busca entre generateMetadata e page() na mesma request.
const getEstablishment = cache(async (slug: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('estabelecimentos')
    .select('*, servicos(*)')
    .eq('slug', slug)
    .single()
  return data ? mapEstabelecimento(data) : null
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const establishment = await getEstablishment(slug)
  const name = establishment?.name ?? 'Estabelecimento'
  return {
    title: `${name} | IBeleza`,
    description: `Veja procedimentos, preços e horários em ${name}.`,
  }
}

export default async function SlugPage({ params }: Props) {
  const { slug } = await params
  const establishment = await getEstablishment(slug)

  if (!establishment) notFound()

  if (establishment.is_blocked) {
    return <BlockedScreen name={establishment.name} />
  }

  type EstablishmentWithServices = typeof establishment & {
    services: Service[]
  }

  const est = establishment as EstablishmentWithServices
  const db = createAdminClient()
  const availabilityEnd = new Date()
  availabilityEnd.setDate(availabilityEnd.getDate() + 180)
  const [{ data: reservedSlots }, { data: mediaRaw }] = await Promise.all([
    db
      .from('agendamentos')
      .select('horario, duracao_total_minutos, nome_cliente')
      .eq('estabelecimento_id', est.id)
      .in('status', ['pendente', 'confirmado', 'em_atendimento'])
      .gte('horario', new Date().toISOString())
      .lt('horario', availabilityEnd.toISOString())
      .order('horario', { ascending: true })
      .limit(1000),
    db
      .from('midias_estabelecimento')
      .select('*')
      .eq('estabelecimento_id', est.id)
      .order('ordem', { ascending: true })
      .order('criado_em', { ascending: true }),
  ])

  const services = (est.services ?? [])
    .filter((service) => service.is_active)
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
  const reserved = ((reservedSlots ?? []) as {
    horario: string
    duracao_total_minutos: number
    nome_cliente: string | null
  }[]).map((slot) => ({
    scheduled_at: slot.horario,
    total_duration_minutes: slot.duracao_total_minutos,
    customer_name: slot.nome_cliente,
  }))
  const hours = (est.business_hours as BusinessHours) ?? {}
  const openDays = Object.values(hours).filter(Boolean).length
  const initials = getInitials(est.name)
  const gallery = ((mediaRaw ?? []) as Parameters<typeof mapMidiaEstabelecimento>[0][])
    .map(mapMidiaEstabelecimento)
    .filter((item) => item.media_type === 'image') as EstablishmentMedia[]
  const heroImage = gallery[0]?.url ?? est.logo_url
  const categoryGroups = Array.from(
    services.reduce((groups, service) => {
      const list = groups.get(service.category) ?? []
      list.push(service)
      groups.set(service.category, list)
      return groups
    }, new Map<string, Service[]>()),
  )
  const cheapestService = services
    .filter((service) => service.price != null)
    .sort((a, b) => Number(a.price) - Number(b.price))[0]
  const totalMinutes = services.reduce((sum, service) => sum + service.duration_minutes, 0)
  const averageDuration = services.length > 0 ? Math.round(totalMinutes / services.length) : 0
  const scheduleRows = formatBusinessHours(hours)
  const socials = [
    est.instagram_url ? { label: 'Instagram', href: est.instagram_url } : null,
    est.facebook_url ? { label: 'Facebook', href: est.facebook_url } : null,
    est.tiktok_url ? { label: 'TikTok', href: est.tiktok_url } : null,
    est.youtube_url ? { label: 'YouTube', href: est.youtube_url } : null,
  ].filter((item): item is { label: string; href: string } => Boolean(item))
  const modalServices = services.map((service) => ({
    id: service.id,
    name: service.name,
    category: service.category,
    description: service.description,
    duration: service.duration_minutes,
    price: money(service.price),
  }))
  const modalPhotos = gallery.slice(0, 12).map((item) => ({
    id: item.id,
    url: item.url,
    title: item.title,
  }))
  const cityState = est.city || est.state
    ? [est.city, est.state].filter(Boolean).join(' - ')
    : 'Cidade não informada'

  return (
    <main className="min-h-screen bg-[#0c1120] text-white">
      <div className="mx-auto grid h-full max-w-7xl grid-rows-[auto_minmax(0,1fr)] gap-3 px-3 py-3 sm:px-4">
        <nav className="flex h-10 items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-3">
            <img src="/imagens/ibeleza.png" alt="IBeleza" className="h-8 w-auto object-contain" />
            <span className="hidden text-xs uppercase tracking-[0.24em] text-white/52 sm:inline">
              agenda online
            </span>
          </Link>
          <Link
            href="#agendar"
            className="inline-flex min-h-9 w-full items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-[#11172b] transition hover:bg-white/90 lg:w-auto"
          >
            Agendar
          </Link>
        </nav>

        <div className="grid min-h-0 gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="grid min-h-0 gap-3 overflow-hidden rounded-[8px] bg-[#12182b] p-3 ring-1 ring-white/10">
            <div className="relative min-h-[140px] overflow-hidden rounded-[8px] bg-[#20283c] ring-1 ring-white/10 lg:min-h-0">
              {heroImage ? (
                <img
                  src={heroImage}
                  alt={gallery[0]?.title || est.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-[#161d31] text-5xl font-semibold text-white/28">
                  {initials}
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent_0%,rgba(12,17,32,0.92)_100%)] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/52">destaque</p>
                <p className="mt-1 text-sm font-semibold leading-snug">Serviços, fotos e agenda em um só lugar.</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {est.logo_url ? (
                <img src={est.logo_url} alt={`Logo de ${est.name}`} className="h-11 w-11 rounded-[8px] object-cover ring-1 ring-white/15" />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-[8px] bg-[#ff2f92] text-sm font-semibold text-white ring-1 ring-white/15">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8FF0F4]">
                  {est.business_type?.replace(/_/g, ' ') || 'beleza'}
                </p>
                <h1 className="mt-1 truncate font-brand text-3xl leading-none text-white">{est.name}</h1>
                <p className="mt-1 text-xs text-white/55">{openDays} dias de atendimento na semana</p>
              </div>
            </div>

            <EstablishmentInfoMenu
              services={modalServices}
              photos={modalPhotos}
              schedule={scheduleRows}
              address={est.address || 'Endereço não informado'}
              cityState={cityState}
              contact={est.contact || est.whatsapp_phone || 'Contato não informado'}
              socials={socials}
            />

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-[8px] bg-white/6 p-2 ring-1 ring-white/8">
                <p className="text-lg font-semibold">{services.length}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/45">serviços</p>
              </div>
              <div className="rounded-[8px] bg-white/6 p-2 ring-1 ring-white/8">
                <p className="text-lg font-semibold">{categoryGroups.length}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/45">categorias</p>
              </div>
              <div className="rounded-[8px] bg-white/6 p-2 ring-1 ring-white/8">
                <p className="text-lg font-semibold">{averageDuration || '--'}min</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/45">média</p>
              </div>
              <div className="rounded-[8px] bg-white/6 p-2 ring-1 ring-white/8">
                <p className="truncate text-lg font-semibold">{cheapestService ? money(cheapestService.price) : '--'}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/45">a partir</p>
              </div>
            </div>
          </aside>

          <section id="agendar" className="min-h-0 overflow-hidden rounded-[8px] bg-white/6 p-3 shadow-[0_28px_60px_rgba(0,0,0,0.16)] ring-1 ring-white/10">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-[#8FF0F4]">reserve</p>
                <h2 className="mt-0.5 font-brand text-3xl leading-none text-white">Escolha o horário.</h2>
              </div>
              <p className="max-w-md text-xs leading-5 text-white/62">
                Toque em um procedimento e escolha um dia com vaga.
              </p>
            </div>

            <BookingForm
              establishmentId={est.id}
              services={services}
              businessHours={hours}
              slotsPerSchedule={est.slots_per_schedule}
              reservedSlots={reserved}
            />
          </section>
        </div>
      </div>
    </main>
  )
}
