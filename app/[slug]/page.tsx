import { cache } from 'react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import BlockedScreen from '@/components/customer/BlockedScreen'
import BookingForm from '@/components/customer/BookingForm'
import type { Service } from '@/database.types'

type BusinessHours = Record<string, { open: string; close: string } | null>
type ReservedSlot = { scheduled_at: string; total_duration_minutes: number }

type Props = {
  params: Promise<{ slug: string }>
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
  const { data: reservedSlots } = await db
    .from('appointments')
    .select('scheduled_at, total_duration_minutes')
    .eq('establishment_id', est.id)
    .in('status', ['pending', 'confirmed', 'checked_in'])
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })

  const services = (est.services ?? [])
    .filter((service) => service.is_active)
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
  const hours = (est.business_hours as BusinessHours) ?? {}
  const openDays = Object.values(hours).filter(Boolean).length

  return (
    <main className="min-h-screen bg-[#f8f1ea] text-[#22201d]">
      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-8 md:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:py-12">
        <header className="relative overflow-hidden rounded-[8px] bg-[#241f1b] p-7 text-white lg:min-h-[520px]">
          <div className="absolute inset-x-0 bottom-0 h-44 bg-[linear-gradient(0deg,rgba(205,151,108,0.36),transparent)]" />
          <div className="relative z-10 flex h-full flex-col justify-between gap-10">
            <div>
              {est.logo_url ? (
                <img
                  src={est.logo_url}
                  alt={`${est.name} logo`}
                  className="h-20 w-20 rounded-[8px] border border-white/20 object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-[8px] bg-[#d6a47c] text-2xl font-semibold">
                  {est.name.slice(0, 1)}
                </div>
              )}
              <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-[#d6a47c]">
                Agenda online
              </p>
              <h1 className="mt-3 max-w-md text-5xl font-semibold leading-[0.95] text-white md:text-6xl">
                {est.name}
              </h1>
              <p className="mt-5 max-w-sm text-base leading-7 text-white/72">
                Escolha procedimentos, compare o valor e monte seu atendimento
                em um pacote só. O estabelecimento confirma o horário e te
                lembra pelo WhatsApp.
              </p>
            </div>

            <div className="grid gap-3 text-sm text-white/78">
              {est.address && <p>{est.address}</p>}
              {est.contact && <p>{est.contact}</p>}
              <p>{openDays} dias com agenda configurada</p>
            </div>
          </div>
        </header>

        <div className="flex flex-col justify-end pb-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-[8px] border border-[#eadfd5] bg-white p-4">
              <p className="text-2xl font-semibold">{services.length}</p>
              <p className="mt-1 text-xs text-[#75685f]">procedimentos ativos</p>
            </div>
            <div className="rounded-[8px] border border-[#eadfd5] bg-white p-4">
              <p className="text-2xl font-semibold">{est.slots_per_schedule}</p>
              <p className="mt-1 text-xs text-[#75685f]">encaixes por dia</p>
            </div>
            <div className="rounded-[8px] border border-[#eadfd5] bg-white p-4">
              <p className="text-2xl font-semibold">12h</p>
              <p className="mt-1 text-xs text-[#75685f]">lembrete antes</p>
            </div>
            </div>
            <div className="mt-6 rounded-[8px] border border-[#eadfd5] bg-white p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8b5f49]">
              Monte seu atendimento
              </p>
              <p className="mt-3 text-2xl font-semibold leading-tight">
                Combine serviços e escolha um horário que comporte tudo.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-12 md:px-8">
        <BookingForm
          establishmentId={est.id}
          services={services}
          businessHours={hours}
          slotsPerSchedule={est.slots_per_schedule}
          reservedSlots={(reservedSlots ?? []) as ReservedSlot[]}
        />
      </section>
    </main>
  )
}
