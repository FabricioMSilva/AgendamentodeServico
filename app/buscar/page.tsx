import Link from 'next/link'
import type { Metadata } from 'next'
import dayjs from 'dayjs'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getNeedInfo, getNeedTerms, type SearchMode } from '@/lib/search/needs'
import type { Database, Service } from '@/database.types'

type BusinessHours = Record<string, { open: string; close: string } | null>

type ReservedSlot = {
  establishment_id: string
  scheduled_at: string
  total_duration_minutes: number
}

type SearchParams = {
  need?: string
  mode?: string
}

type EstablishmentWithServices = Database['public']['Tables']['establishments']['Row'] & {
  services: Service[]
}

const categoryLabels: Record<string, string> = {
  'Cortar cabelo': 'corte',
  'Fazer unha': 'unhas',
  Depilação: 'depilação',
  Estética: 'estética',
  Clínica: 'clínica',
  Outro: 'geral',
}

function money(value: number | null) {
  return value == null ? 'Sob consulta' : `R$ ${Number(value).toFixed(2)}`
}

function parseBusinessHours(value: unknown): BusinessHours {
  if (!value || typeof value !== 'object') return {}
  return value as BusinessHours
}

function hasOverlap(
  start: dayjs.Dayjs,
  durationMinutes: number,
  reservedSlots: ReservedSlot[],
) {
  const end = start.add(durationMinutes, 'minute')
  return reservedSlots.some((slot) => {
    const reservedStart = dayjs(slot.scheduled_at)
    const reservedEnd = reservedStart.add(slot.total_duration_minutes ?? 30, 'minute')
    return start.isBefore(reservedEnd) && end.isAfter(reservedStart)
  })
}

function generateTimeSlots(
  date: Date,
  businessHours: BusinessHours,
  reservedSlots: ReservedSlot[],
  totalDurationMinutes: number,
  slotDurationMinutes = 30,
) {
  const dow = dayjs(date).day().toString()
  const hours = businessHours[dow]
  if (!hours) return []

  const slots: string[] = []
  const base = dayjs(date).format('YYYY-MM-DD')
  let current = dayjs(`${base}T${hours.open}`)
  const close = dayjs(`${base}T${hours.close}`)
  const now = dayjs()

  while (!current.add(totalDurationMinutes, 'minute').isAfter(close)) {
    if (current.isAfter(now) && !hasOverlap(current, totalDurationMinutes, reservedSlots)) {
      slots.push(current.format('HH:mm'))
    }
    current = current.add(slotDurationMinutes, 'minute')
  }

  return slots
}

function getNextSlots(
  businessHours: BusinessHours,
  reservedSlots: ReservedSlot[],
  durationMinutes: number,
  slotStep: number,
) {
  for (let offset = 0; offset < 7; offset += 1) {
    const date = dayjs().add(offset, 'day').toDate()
    const daySlots = generateTimeSlots(date, businessHours, reservedSlots, durationMinutes, slotStep)
    if (daySlots.length > 0) {
      return {
        label: offset === 0 ? 'Hoje' : dayjs(date).format('ddd, DD/MM'),
        slots: daySlots.slice(0, 3),
      }
    }
  }

  return null
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}): Promise<Metadata> {
  const params = await searchParams
  const need = getNeedInfo(params?.need)
  return {
    title: `${need.title} | IBeleza`,
    description: need.subtitle,
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const params = await searchParams
  const need = getNeedInfo(params?.need)
  const mode = (params?.mode === 'horario' ? 'horario' : 'estabelecimento') as SearchMode
  const terms = getNeedTerms(params?.need)

  const supabase = await createClient()
  const { data: establishmentsRaw } = await supabase
    .from('establishments')
    .select('id, slug, name, address, contact, whatsapp_phone, logo_url, business_hours, slots_per_schedule, services(id, name, price, price_type, duration_minutes, category, description, image_url, is_active)')
    .eq('is_blocked', false)

  const establishments = (establishmentsRaw ?? []) as EstablishmentWithServices[]
  const matched = establishments
    .map((establishment) => {
      const services = (establishment.services ?? []).filter((service) => {
        if (!service.is_active) return false
        const haystack = [
          service.name,
          service.description ?? '',
          service.category,
        ]
          .join(' ')
          .toLowerCase()
        return terms.some((term) => haystack.includes(term.toLowerCase()))
      })

      return {
        ...establishment,
        services,
      }
    })
    .filter((establishment) => establishment.services.length > 0)

  const sorted = (matched.length > 0 ? matched : establishments)
    .slice()
    .sort((a, b) => b.services.length - a.services.length || a.name.localeCompare(b.name))

  const reservedSlots: ReservedSlot[] = []
  if (sorted.length > 0) {
    const db = createAdminClient()
    const { data: reservedRaw } = await db
      .from('appointments')
      .select('establishment_id, scheduled_at, total_duration_minutes')
      .in(
        'establishment_id',
        sorted.map((item) => item.id),
      )
      .in('status', ['pending', 'confirmed', 'checked_in'])
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })

    reservedSlots.push(...((reservedRaw ?? []) as ReservedSlot[]))
  }

  return (
    <main className="min-h-screen bg-[#1A2033] text-white">
      <section className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <img
            src="/imagens/ibeleza.png"
            alt="IBeleza"
            className="h-auto w-[128px] max-w-full object-contain sm:w-[156px]"
          />
          <p className="mt-5 text-[11px] uppercase tracking-[0.24em] text-white/70 sm:text-xs">
            Busca guiada
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
            {need.title}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/74 sm:text-base">
            {need.subtitle}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <span className="rounded-full bg-white/8 px-4 py-2 text-xs font-semibold text-white/80">
              {mode === 'horario' ? 'Ver por horário' : 'Ver por estabelecimento'}
            </span>
            <span className="rounded-full bg-white/8 px-4 py-2 text-xs font-semibold text-white/80">
              {sorted.length} opções
            </span>
            <span className="rounded-full bg-white/8 px-4 py-2 text-xs font-semibold text-white/80">
              foco em {categoryLabels[need.key]}
            </span>
          </div>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            {sorted.length > 0 ? (
              sorted.map((establishment) => {
              const services = establishment.services.slice(0, 3)
              const hours = parseBusinessHours(establishment.business_hours)
              const cheapestPrice = services
                .map((service) => service.price)
                .filter((price): price is number => price != null)
                .sort((a, b) => a - b)[0]
              const duration = Math.min(...services.map((service) => service.duration_minutes))
              const slotStep = Math.max(15, Math.round(480 / Math.max(establishment.slots_per_schedule, 1)))
              const nextSlots = getNextSlots(
                hours,
                reservedSlots.filter((slot) => slot.establishment_id === establishment.id),
                Number.isFinite(duration) ? duration : 30,
                slotStep,
              )

              return (
                <article
                  key={establishment.id}
                  className="grid gap-4 rounded-[8px] bg-white/6 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.18)] ring-1 ring-white/8 sm:grid-cols-[116px_1fr_auto]"
                >
                  <div className="overflow-hidden rounded-[8px] bg-white/10">
                    {establishment.logo_url ? (
                      <img
                        src={establishment.logo_url}
                        alt={`${establishment.name} logo`}
                        className="h-28 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-28 items-center justify-center bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] text-3xl font-semibold text-white">
                        {establishment.name.slice(0, 1)}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-white">{establishment.name}</p>
                    <p className="mt-1 text-sm leading-6 text-white/72">
                      {establishment.address || establishment.contact || 'Agenda e atendimento online'}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {services.map((service) => (
                        <span
                          key={service.id}
                          className="rounded-full bg-white/8 px-3 py-1 text-xs font-medium text-white/78"
                        >
                          {service.name}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-white/76 sm:grid-cols-3">
                      <div>
                        <p className="text-white">{money(cheapestPrice ?? null)}</p>
                        <p className="mt-1 text-xs text-white/55">a partir de</p>
                      </div>
                      <div>
                        <p className="text-white">{services[0]?.duration_minutes ?? 30} min</p>
                        <p className="mt-1 text-xs text-white/55">duração base</p>
                      </div>
                      <div>
                        <p className="text-white">{nextSlots ? nextSlots.label : 'Agenda livre'}</p>
                        <p className="mt-1 text-xs text-white/55">próxima janela</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-3">
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.22em] text-white/55">Horários sugeridos</p>
                      <div className="flex flex-wrap gap-2">
                        {nextSlots?.slots.map((slot) => (
                          <span
                            key={slot}
                            className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#1A2033]"
                          >
                            {slot}
                          </span>
                        ))}
                        {!nextSlots && (
                          <span className="rounded-full bg-white/8 px-3 py-2 text-xs font-semibold text-white/75">
                            Sem vagas para hoje
                          </span>
                        )}
                      </div>
                    </div>

                    <Link
                      href={`/${establishment.slug}`}
                      className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] px-4 text-sm font-semibold text-white transition hover:opacity-90"
                    >
                      Abrir agenda
                    </Link>
                  </div>
                </article>
              )
            })
            ) : (
              <div className="rounded-[8px] bg-white/6 p-6 ring-1 ring-white/8">
                <p className="text-lg font-semibold text-white">Ainda não encontrei opções próximas.</p>
                <p className="mt-2 text-sm leading-6 text-white/72">
                  Quando houver estabelecimentos cadastrados com esse serviço, eles aparecem aqui com preço e horário.
                </p>
              </div>
            )}
          </div>

          <aside className="h-fit rounded-[8px] bg-white/6 p-5 ring-1 ring-white/8">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/60">
              Resumo da busca
            </p>
            <p className="mt-3 text-2xl font-semibold">{need.title}</p>
            <p className="mt-2 text-sm leading-6 text-white/72">
              Mostrando estabelecimentos e serviços que combinam com a necessidade escolhida.
            </p>

            <div className="mt-5 space-y-3">
              <div className="rounded-[8px] bg-white/8 p-4">
                <p className="text-sm text-white/66">Necessidade</p>
                <p className="mt-1 font-semibold text-white">{need.key}</p>
              </div>
              <div className="rounded-[8px] bg-white/8 p-4">
                <p className="text-sm text-white/66">Modo</p>
                <p className="mt-1 font-semibold text-white">
                  {mode === 'horario' ? 'Buscar por horário' : 'Escolher estabelecimento'}
                </p>
              </div>
              <div className="rounded-[8px] bg-white/8 p-4">
                <p className="text-sm text-white/66">Próximo passo</p>
                <p className="mt-1 font-semibold text-white">Abrir a agenda do local e confirmar o horário</p>
              </div>
            </div>

            <div className="mt-5">
              <Link
                href="/"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/14"
              >
                Refazer busca
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}
