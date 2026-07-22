import Link from 'next/link'
import type { Metadata } from 'next'
import dayjs from 'dayjs'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPublicClient } from '@/lib/supabase/public'
import { getNeedInfo, getNeedTerms, type NeedKey } from '@/lib/search/needs'
import { mapEstabelecimento } from '@/lib/supabase/portuguese-schema-adapter'
import type { Database, Service } from '@/database.types'

type BusinessHours = Record<string, { open: string; close: string } | null>

type ReservedSlot = {
  establishment_id: string
  scheduled_at: string
  total_duration_minutes: number
}

type SearchParams = {
  need?: string
}

type EstablishmentWithServices = Database['public']['Tables']['establishments']['Row'] & {
  services: Service[]
}

type LocationFields = {
  zip_code: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  latitude?: number | null
  longitude?: number | null
}

type UserLocation = LocationFields

type NextSlots = {
  label: string
  slots: string[]
  rankMinutes: number
} | null

type RankedEstablishment = EstablishmentWithServices & {
  distanceKm: number | null
  distanceLabel: string | null
  exactServiceRank: number
  cheapestPrice: number | null
  duration: number
  slotStep: number
  nextSlots: NextSlots
}

const categoryLabels: Record<string, string> = {
  'Cortar cabelo': 'corte',
  'Fazer unha': 'unhas',
  Depilação: 'depilação',
  Estética: 'estética',
  Tatuagem: 'tatuagem',
  Piercing: 'piercing',
  Clínica: 'clínica',
  Outro: 'geral',
}

function money(value: number | null) {
  return value == null ? 'Sob consulta' : `R$ ${Number(value).toFixed(2)}`
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function normalizeZip(value: string | null | undefined) {
  return (value ?? '').replace(/\D/g, '')
}

function getAddressLocationFallback(address: string | null | undefined): Partial<LocationFields> {
  const match = (address ?? '').match(/,\s*([^,]+?)\s*-\s*([A-Za-z]{2})\s*$/)
  if (!match) return {}

  return {
    city: match[1].trim(),
    state: match[2].trim().toUpperCase(),
  }
}

function getLocationFields(
  location: LocationFields,
  address?: string | null,
): LocationFields {
  const fallback = getAddressLocationFallback(address)

  return {
    ...location,
    city: location.city ?? fallback.city ?? null,
    state: location.state ?? fallback.state ?? null,
  }
}

function toRadians(value: number) {
  return (value * Math.PI) / 180
}

function getCoordinateDistanceKm(origin: LocationFields | null, target: LocationFields) {
  if (
    origin?.latitude == null ||
    origin.longitude == null ||
    target.latitude == null ||
    target.longitude == null
  ) {
    return null
  }

  const earthRadiusKm = 6371
  const dLat = toRadians(target.latitude - origin.latitude)
  const dLon = toRadians(target.longitude - origin.longitude)
  const lat1 = toRadians(origin.latitude)
  const lat2 = toRadians(target.latitude)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function getAddressDistanceRank(origin: LocationFields | null, target: LocationFields) {
  if (!origin) return null

  const originZip = normalizeZip(origin.zip_code)
  const targetZip = normalizeZip(target.zip_code)
  const sameState = normalizeText(origin.state) && normalizeText(origin.state) === normalizeText(target.state)
  const sameCity = sameState && normalizeText(origin.city) === normalizeText(target.city)
  const sameNeighborhood =
    sameCity && normalizeText(origin.neighborhood) === normalizeText(target.neighborhood)

  if (originZip && targetZip && originZip === targetZip) return 0.2
  if (originZip && targetZip && originZip.slice(0, 5) === targetZip.slice(0, 5)) return 1.5
  if (sameNeighborhood) return 3
  if (sameCity) return 12
  if (sameState) return 80

  return null
}

function getDistanceKm(origin: LocationFields | null, target: LocationFields) {
  return getCoordinateDistanceKm(origin, target) ?? getAddressDistanceRank(origin, target)
}

const MAX_ESTABLISHMENT_DISTANCE_KM = 200

function formatDistance(distanceKm: number | null) {
  if (distanceKm == null) return null
  if (distanceKm < 1) return 'menos de 1 km'
  if (distanceKm < 10) return `${distanceKm.toFixed(1)} km`
  return `${Math.round(distanceKm)} km`
}

function isWithinSearchRadius(distanceKm: number | null) {
  return distanceKm == null || distanceKm <= MAX_ESTABLISHMENT_DISTANCE_KM
}

const quizOptions: Array<{
  key: NeedKey
  title: string
  description: string
}> = [
  {
    key: 'Cortar cabelo',
    title: 'Cabelo',
    description: 'Corte, escova, cor e acabamento.',
  },
  {
    key: 'Fazer unha',
    title: 'Unhas',
    description: 'Manicure, pedicure e alongamento.',
  },
  {
    key: 'Depilação',
    title: 'Depilação',
    description: 'Pele lisa, limpeza e cuidados rápidos.',
  },
  {
    key: 'Estética',
    title: 'Estética',
    description: 'Facial, massagem e bem-estar.',
  },
  {
    key: 'Tatuagem',
    title: 'Tatuagem',
    description: 'Tattoo, flash, cobertura e retoque.',
  },
  {
    key: 'Piercing',
    title: 'Piercing',
    description: 'Aplicação, troca de joia e avaliação.',
  },
  {
    key: 'Clínica',
    title: 'Clínica',
    description: 'Procedimentos e saúde estética.',
  },
  {
    key: 'Outro',
    title: 'Outro',
    description: 'Ver opções gerais perto de você.',
  },
]

function getDistanceBucket(distanceKm: number | null) {
  if (distanceKm == null) return Number.POSITIVE_INFINITY
  if (distanceKm <= 3) return 0
  if (distanceKm <= 8) return 1
  if (distanceKm <= 15) return 2
  if (distanceKm <= 30) return 3
  if (distanceKm <= 80) return 4
  return 5
}

function getExactServiceRank(services: Service[], terms: string[]) {
  if (terms.length === 0) return 9

  const normalizedTerms = terms.map(normalizeText).filter(Boolean)
  let bestRank = 9

  for (const service of services) {
    const name = normalizeText(service.name)
    const category = normalizeText(service.category)
    const description = normalizeText(service.description)

    for (const term of normalizedTerms) {
      if (name === term) bestRank = Math.min(bestRank, 0)
      else if (name.includes(term)) bestRank = Math.min(bestRank, 1)
      else if (category.includes(term)) bestRank = Math.min(bestRank, 2)
      else if (description.includes(term)) bestRank = Math.min(bestRank, 3)
    }
  }

  return bestRank
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
        rankMinutes: offset * 24 * 60 + Number(daySlots[0].slice(0, 2)) * 60 + Number(daySlots[0].slice(3, 5)),
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

  if (!params?.need) {
    return (
      <main className="min-h-screen bg-[#1A2033] px-5 py-20 text-white md:px-8">
        <section className="mx-auto max-w-5xl">
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
              O que você quer fazer hoje?
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/74 sm:text-base">
              Escolha uma necessidade para encontrar estabelecimentos, serviços e horários mais próximos.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quizOptions.map((option) => (
              <Link
                key={option.key}
                href={`/buscar?need=${encodeURIComponent(option.key)}`}
                className="group min-h-32 rounded-[8px] bg-white/6 p-5 ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-white/9 hover:ring-[#8FF0F4]/45"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] text-sm font-bold text-white shadow-[0_12px_24px_rgba(255,0,127,0.2)]">
                  {option.title.slice(0, 1)}
                </span>
                <p className="mt-4 text-xl font-semibold text-white">{option.title}</p>
                <p className="mt-2 text-sm leading-6 text-white/66">{option.description}</p>
                <p className="mt-4 text-sm font-semibold text-[#8FF0F4] opacity-80 transition group-hover:opacity-100">
                  Ver opções
                </p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    )
  }

  const need = getNeedInfo(params?.need)
  const terms = getNeedTerms(params?.need)

  const supabase = await createClient()
  const publicDb = createPublicClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const [establishmentsResult, profileResult] = await Promise.all([
    publicDb
      .from('estabelecimentos')
      .select('id, usuario_admin_id, slug, nome, endereco, telefone, whatsapp, email, cep, bairro, cidade, estado, latitude, longitude, logo_url, horarios_funcionamento, vagas_por_horario, tipo_negocio, bloqueado, criado_em, descricao, rua, numero, complemento, instagram_url, facebook_url, youtube_url, tiktok_url, servicos(id, estabelecimento_id, nome, categoria, descricao, tipo_preco, preco, duracao_minutos, imagem_url, ativo, criado_em, atualizado_em)')
      .eq('bloqueado', false),
    user
      ? supabase
          .from('usuarios')
          .select('cep, bairro, cidade, estado, latitude, longitude')
          .eq('id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  const establishments = ((establishmentsResult.data ?? []) as Parameters<typeof mapEstabelecimento>[0][]).map(
    mapEstabelecimento,
  ) as EstablishmentWithServices[]
  const profile = profileResult.data
  const userLocation = profile
    ? ({
        zip_code: profile.cep,
        neighborhood: profile.bairro,
        city: profile.cidade,
        state: profile.estado,
        latitude: profile.latitude,
        longitude: profile.longitude,
      } satisfies UserLocation)
    : null
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

  const candidates = matched.length > 0 ? matched : establishments

  const reservedSlots: ReservedSlot[] = []
  if (candidates.length > 0) {
    const db = createAdminClient()
    const availabilityEnd = new Date()
    availabilityEnd.setDate(availabilityEnd.getDate() + 180)
    const { data: reservedRaw } = await db
      .from('agendamentos')
      .select('estabelecimento_id, horario, duracao_total_minutos')
      .in(
        'estabelecimento_id',
        candidates.map((item) => item.id),
      )
      .in('status', ['pendente', 'confirmado', 'em_atendimento'])
      .gte('horario', new Date().toISOString())
      .lt('horario', availabilityEnd.toISOString())
      .order('horario', { ascending: true })
      .limit(1000)

    reservedSlots.push(
      ...((reservedRaw ?? []) as {
        estabelecimento_id: string
        horario: string
        duracao_total_minutos: number
      }[]).map((slot) => ({
        establishment_id: slot.estabelecimento_id,
        scheduled_at: slot.horario,
        total_duration_minutes: slot.duracao_total_minutos,
      })),
    )
  }

  const rankedEstablishments = candidates.map((establishment) => {
    const services = establishment.services
    const prices = services
      .map((service) => service.price)
      .filter((price): price is number => price != null)
    const cheapestPrice = prices.sort((a, b) => a - b)[0] ?? null
    const duration = Math.min(...services.map((service) => service.duration_minutes))
    const slotStep = Math.max(15, Math.round(480 / Math.max(establishment.slots_per_schedule, 1)))
    const hours = parseBusinessHours(establishment.business_hours)
    const nextSlots = getNextSlots(
      hours,
      reservedSlots.filter((slot) => slot.establishment_id === establishment.id),
      Number.isFinite(duration) ? duration : 30,
      slotStep,
    )
    const establishmentLocation = getLocationFields(establishment, establishment.address)
    const distanceKm = getDistanceKm(userLocation, establishmentLocation)

    return {
      ...establishment,
      distanceKm,
      distanceLabel: formatDistance(distanceKm),
      exactServiceRank: getExactServiceRank(services, terms),
      cheapestPrice,
      duration: Number.isFinite(duration) ? duration : 30,
      slotStep,
      nextSlots,
    }
  })

  const sortEstablishments = (a: RankedEstablishment, b: RankedEstablishment) => {
    const bucketA = getDistanceBucket(a.distanceKm)
    const bucketB = getDistanceBucket(b.distanceKm)
    const distanceA = a.distanceKm ?? Number.POSITIVE_INFINITY
    const distanceB = b.distanceKm ?? Number.POSITIVE_INFINITY
    return (
      bucketA - bucketB ||
      distanceA - distanceB ||
      a.exactServiceRank - b.exactServiceRank ||
      (a.nextSlots?.rankMinutes ?? Number.POSITIVE_INFINITY) -
        (b.nextSlots?.rankMinutes ?? Number.POSITIVE_INFINITY) ||
      (a.cheapestPrice ?? Number.POSITIVE_INFINITY) - (b.cheapestPrice ?? Number.POSITIVE_INFINITY) ||
      b.services.length - a.services.length ||
      a.name.localeCompare(b.name)
    )
  }

  // Do not filter establishments by distance — show all candidates sorted
  const sorted: RankedEstablishment[] = rankedEstablishments.sort(sortEstablishments)

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
              {sorted.length} opções
            </span>
            <span className="rounded-full bg-white/8 px-4 py-2 text-xs font-semibold text-white/80">
              foco em {categoryLabels[need.key]}
            </span>
            <span className="rounded-full bg-white/8 px-4 py-2 text-xs font-semibold text-white/80">
              até {MAX_ESTABLISHMENT_DISTANCE_KM} km
            </span>
          </div>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            {sorted.length > 0 ? (
              sorted.map((establishment) => {
              const services = establishment.services.slice(0, 3)
              const nextSlots = establishment.nextSlots

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
                    {establishment.distanceLabel ? (
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#8FF0F4]">
                        {establishment.distanceLabel} de você
                      </p>
                    ) : null}

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
                        <p className="text-white">{money(establishment.cheapestPrice)}</p>
                        <p className="mt-1 text-xs text-white/55">a partir de</p>
                      </div>
                      <div>
                        <p className="text-white">{establishment.duration} min</p>
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
                            className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/10"
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
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] px-4 text-sm font-semibold text-white transition hover:opacity-90 md:w-auto"
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
