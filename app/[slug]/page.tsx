import { cache } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import BlockedScreen from '@/components/customer/BlockedScreen'
import BookingForm from '@/components/customer/BookingForm'
import type { EstablishmentMedia, Service } from '@/database.types'

type BusinessHours = Record<string, { open: string; close: string } | null>
type ReservedSlot = { scheduled_at: string; total_duration_minutes: number }

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

// React cache deduplicates this across generateMetadata + page() in the same request
const getEstablishment = cache(async (slug: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('establishments')
    .select('*, services(*)')
    .eq('slug', slug)
    .single()
  return data
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
      .from('appointments')
      .select('scheduled_at, total_duration_minutes')
      .eq('establishment_id', est.id)
      .in('status', ['pending', 'confirmed', 'checked_in'])
      .gte('scheduled_at', new Date().toISOString())
      .lt('scheduled_at', availabilityEnd.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(1000),
    db
      .from('establishment_media')
      .select('*')
      .eq('establishment_id', est.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  const services = (est.services ?? [])
    .filter((service) => service.is_active)
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
  const highlightedServices = services
    .slice()
    .sort((a, b) => {
      const priceA = a.price ?? Number.POSITIVE_INFINITY
      const priceB = b.price ?? Number.POSITIVE_INFINITY
      return priceA - priceB || a.duration_minutes - b.duration_minutes
    })
    .slice(0, 3)
  const hours = (est.business_hours as BusinessHours) ?? {}
  const openDays = Object.values(hours).filter(Boolean).length
  const initials = getInitials(est.name)
  const gallery = ((mediaRaw ?? []) as EstablishmentMedia[]).filter((item) => item.media_type === 'image')

  return (
    <main className="min-h-screen bg-[#1A2033] text-white">
      <section className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid gap-5 lg:grid-cols-[1.02fr_0.98fr]">
          <header className="relative overflow-hidden rounded-[8px] bg-[linear-gradient(180deg,#11172a_0%,#171f38_55%,#241737_100%)] p-5 ring-1 ring-white/10 sm:p-7">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,0,127,0.26),transparent_28%),radial-gradient(circle_at_20%_20%,rgba(0,196,204,0.16),transparent_24%)]" />
            <div className="relative z-10 flex h-full flex-col justify-between gap-8">
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <img
                    src="/imagens/ibeleza.png"
                    alt="IBeleza"
                    className="h-9 w-auto object-contain sm:h-10"
                  />
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.28em] text-white/55 sm:text-[11px]">
                      IBeleza
                    </p>
                    <p className="text-sm text-white/75">Saúde e beleza no mesmo fluxo</p>
                  </div>
                </div>

                <div className="inline-flex rounded-full bg-white/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/72 ring-1 ring-white/10">
                  Agenda online
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[8px] bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] text-xl font-semibold text-white shadow-[0_16px_30px_rgba(106,0,255,0.28)] sm:h-20 sm:w-20 sm:text-2xl">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <h1 className="font-brand text-4xl leading-[0.92] text-white sm:text-5xl">
                      {est.name}
                    </h1>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-white/76 sm:text-base">
                      Escolha serviços, compare valores e veja os horários livres antes de reservar.
                      O salão confirma e te avisa pelo WhatsApp.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/8 px-3 py-2 text-xs font-medium text-white/78 ring-1 ring-white/10">
                    Combine mais de um serviço
                  </span>
                  <span className="rounded-full bg-white/8 px-3 py-2 text-xs font-medium text-white/78 ring-1 ring-white/10">
                    Lembrete 12h antes
                  </span>
                  <span className="rounded-full bg-white/8 px-3 py-2 text-xs font-medium text-white/78 ring-1 ring-white/10">
                    Toque no horário livre
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[8px] bg-white/7 p-4 ring-1 ring-white/10">
                  <p className="text-2xl font-semibold">{services.length}</p>
                  <p className="mt-1 text-xs text-white/62">procedimentos ativos</p>
                </div>
                <div className="rounded-[8px] bg-white/7 p-4 ring-1 ring-white/10">
                  <p className="text-2xl font-semibold">{est.slots_per_schedule}</p>
                  <p className="mt-1 text-xs text-white/62">encaixes por dia</p>
                </div>
                <div className="rounded-[8px] bg-white/7 p-4 ring-1 ring-white/10">
                  <p className="text-2xl font-semibold">12h</p>
                  <p className="mt-1 text-xs text-white/62">lembrete antes</p>
                </div>
              </div>
            </div>
          </header>

          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[8px] bg-white/7 p-4 ring-1 ring-white/10">
                <p className="text-xs uppercase tracking-[0.18em] text-white/56">Hoje</p>
                <p className="mt-2 text-2xl font-semibold">Agenda viva</p>
                <p className="mt-1 text-sm text-white/68">Toque em um serviço e veja as vagas livres.</p>
              </div>
              <div className="rounded-[8px] bg-white/7 p-4 ring-1 ring-white/10">
                <p className="text-xs uppercase tracking-[0.18em] text-white/56">Horários</p>
                <p className="mt-2 text-2xl font-semibold">{openDays} dias</p>
                <p className="mt-1 text-sm text-white/68">Com agenda configurada no estabelecimento.</p>
              </div>
              <div className="rounded-[8px] bg-white/7 p-4 ring-1 ring-white/10">
                <p className="text-xs uppercase tracking-[0.18em] text-white/56">Contato</p>
                <p className="mt-2 text-2xl font-semibold">WhatsApp</p>
                <p className="mt-1 text-sm text-white/68">Confirmação e lembrete direto com a equipe.</p>
              </div>
            </div>

            <div className="rounded-[8px] bg-white/7 p-5 ring-1 ring-white/10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/56">
                    Monte seu atendimento
                  </p>
                  <h2 className="mt-2 font-brand text-2xl leading-tight text-white sm:text-3xl">
                    Combine serviços e escolha uma vaga que caiba tudo.
                  </h2>
                </div>

                <Link
                  href="#agendar"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] px-5 text-sm font-semibold text-white transition hover:opacity-95"
                >
                  Ver horários
                </Link>
              </div>

              <div className="mt-5 space-y-3">
                {highlightedServices.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between gap-4 rounded-[8px] bg-white/8 px-4 py-3 ring-1 ring-white/10"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{service.name}</p>
                      <p className="mt-1 text-xs text-white/62">
                        {service.category} · {service.duration_minutes} min
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{money(service.price)}</p>
                      <p className="mt-1 text-xs text-white/55">a partir de</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[8px] bg-[#0f1527] p-4 ring-1 ring-white/10">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/48">Endereço</p>
                  <p className="mt-2 text-sm leading-6 text-white/82">
                    {est.address || 'Endereço não informado'}
                  </p>
                </div>
                <div className="rounded-[8px] bg-[#0f1527] p-4 ring-1 ring-white/10">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/48">Contato</p>
                  <p className="mt-2 text-sm leading-6 text-white/82">
                    {est.contact || 'Contato não informado'}
                  </p>
                </div>
              </div>

              {gallery.length > 0 ? (
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/48">
                    Fotos
                  </p>
                  <div className="mt-3 flex snap-x gap-3 overflow-x-auto pb-2">
                    {gallery.map((item) => (
                      <img
                        key={item.id}
                        src={item.url}
                        alt={item.title ?? ''}
                        className="aspect-[4/3] w-64 shrink-0 snap-start rounded-[8px] object-cover ring-1 ring-white/10"
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section id="agendar" className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.26em] text-white/48">
              Escolha e reserve
            </p>
            <h2 className="mt-2 font-brand text-3xl text-white sm:text-4xl">
              Agende em poucos toques
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-white/64">
            Selecione um ou mais procedimentos, escolha a data e toque em um horário livre.
          </p>
        </div>

        <div className="rounded-[8px] bg-white/6 p-4 shadow-[0_28px_60px_rgba(0,0,0,0.16)] ring-1 ring-white/10 sm:p-5">
        <BookingForm
          establishmentId={est.id}
          services={services}
          businessHours={hours}
          slotsPerSchedule={est.slots_per_schedule}
          reservedSlots={(reservedSlots ?? []) as ReservedSlot[]}
        />
        </div>
      </section>
    </main>
  )
}
