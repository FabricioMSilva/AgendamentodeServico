import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Establishment, Service } from '@/database.types'

type SearchParamValue = string | string[] | undefined
type SearchParams = Promise<Record<string, SearchParamValue>>

type BusinessHours = Record<string, { open: string; close: string } | null>

type ServiceSurface = Service & {
  establishment_name: string
  establishment_slug: string
  establishment_address: string | null
}

type EstablishmentSurface = Establishment & {
  services: Service[]
  open_days: number
  starting_price: number | null
}

const pillPrimary =
  'inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(106,0,255,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(106,0,255,0.28)]'

const pillSecondary =
  'inline-flex min-h-12 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-black ring-1 ring-black/10 transition hover:bg-[#f8f3ff]'

const fallbackServices: ServiceSurface[] = [
  {
    id: 'demo-service-1',
    establishment_id: 'demo-establishment-1',
    name: 'Limpeza de pele premium',
    price_type: 'fixed',
    price: 120,
    description: 'Procedimento facial para renovar a pele com atendimento guiado.',
    image_url:
      'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80',
    duration_minutes: 50,
    category: 'Estética',
    is_active: true,
    created_at: new Date().toISOString(),
    establishment_name: 'Bella Studio',
    establishment_slug: 'bella-studio',
    establishment_address: 'Centro',
  },
  {
    id: 'demo-service-2',
    establishment_id: 'demo-establishment-2',
    name: 'Manicure em gel',
    price_type: 'fixed',
    price: 68,
    description: 'Acabamento duradouro com visual limpo e agenda rápida.',
    image_url:
      'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1200&q=80',
    duration_minutes: 45,
    category: 'Unhas',
    is_active: true,
    created_at: new Date().toISOString(),
    establishment_name: 'Nail Glow',
    establishment_slug: 'nail-glow',
    establishment_address: 'Jardim América',
  },
  {
    id: 'demo-service-3',
    establishment_id: 'demo-establishment-3',
    name: 'Corte + escova',
    price_type: 'fixed',
    price: 95,
    description: 'Cabelo alinhado, finalização polida e horário sem espera.',
    image_url:
      'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=1200&q=80',
    duration_minutes: 60,
    category: 'Cabelo',
    is_active: true,
    created_at: new Date().toISOString(),
    establishment_name: 'Lume Hair',
    establishment_slug: 'lume-hair',
    establishment_address: 'Vila Nova',
  },
]

const fallbackEstablishments: EstablishmentSurface[] = [
  {
    id: 'demo-establishment-1',
    admin_id: null,
    owner_email: 'contato@bellastudio.com',
    slug: 'bella-studio',
    name: 'Bella Studio',
    address: 'Centro',
    contact: '(11) 99999-0001',
    whatsapp_phone: '(11) 99999-0001',
    logo_url: '/imagens/icon.png',
    business_hours: {},
    slots_per_schedule: 12,
    reminder_hours_before: 12,
    is_blocked: false,
    created_at: new Date().toISOString(),
    services: [fallbackServices[0]],
    open_days: 5,
    starting_price: 120,
  },
  {
    id: 'demo-establishment-2',
    admin_id: null,
    owner_email: 'contato@nailglow.com',
    slug: 'nail-glow',
    name: 'Nail Glow',
    address: 'Jardim América',
    contact: '(11) 98888-2222',
    whatsapp_phone: '(11) 98888-2222',
    logo_url: '/imagens/icon.png',
    business_hours: {},
    slots_per_schedule: 10,
    reminder_hours_before: 12,
    is_blocked: false,
    created_at: new Date().toISOString(),
    services: [fallbackServices[1]],
    open_days: 6,
    starting_price: 68,
  },
  {
    id: 'demo-establishment-3',
    admin_id: null,
    owner_email: 'contato@lumehair.com',
    slug: 'lume-hair',
    name: 'Lume Hair',
    address: 'Vila Nova',
    contact: '(11) 97777-3333',
    whatsapp_phone: '(11) 97777-3333',
    logo_url: '/imagens/icon.png',
    business_hours: {},
    slots_per_schedule: 8,
    reminder_hours_before: 12,
    is_blocked: false,
    created_at: new Date().toISOString(),
    services: [fallbackServices[2]],
    open_days: 4,
    starting_price: 95,
  },
]

const fallbackCategories = ['Unhas', 'Cabelo', 'Estética']

function firstValue(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function money(value: number | null | undefined) {
  if (value == null) return 'Sob consulta'
  return `R$ ${Number(value).toFixed(2).replace('.', ',')}`
}

function openDays(hours: Establishment['business_hours']) {
  const normalized = (hours ?? {}) as BusinessHours
  return Object.values(normalized).filter(Boolean).length
}

function buildServicesByEstablishment(services: Service[]) {
  const map = new Map<string, Service[]>()
  for (const service of services) {
    const current = map.get(service.establishment_id) ?? []
    current.push(service)
    map.set(service.establishment_id, current)
  }

  for (const [key, items] of map) {
    map.set(
      key,
      [...items].sort((a, b) => {
        const priceA = a.price ?? Number.POSITIVE_INFINITY
        const priceB = b.price ?? Number.POSITIVE_INFINITY
        if (priceA !== priceB) return priceA - priceB
        return a.name.localeCompare(b.name)
      }),
    )
  }

  return map
}

export default async function Home({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  const params = (await searchParams) ?? {}
  const query = firstValue(params.q)?.trim() ?? ''
  const category = firstValue(params.categoria)?.trim() || 'Todos'

  const supabase = await createClient()
  const [establishmentsResult, servicesResult] = await Promise.all([
    supabase
      .from('establishments')
      .select(
        'id, admin_id, owner_email, slug, name, address, contact, whatsapp_phone, logo_url, business_hours, slots_per_schedule, reminder_hours_before, is_blocked, created_at',
      )
      .eq('is_blocked', false)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('services')
      .select(
        'id, establishment_id, name, price_type, price, description, image_url, duration_minutes, category, is_active, created_at',
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(36),
  ])

  const liveEstablishments = establishmentsResult.data ?? []
  const liveServices = servicesResult.data ?? []
  const hasLiveData = liveEstablishments.length > 0 || liveServices.length > 0

  const servicesByEstablishment = buildServicesByEstablishment(liveServices)
  const establishmentLookup = new Map(
    liveEstablishments.map((establishment) => [establishment.id, establishment] as const),
  )
  const enrichedLiveEstablishments: EstablishmentSurface[] = liveEstablishments.map((establishment) => {
    const services = servicesByEstablishment.get(establishment.id) ?? []
    const pricedServices = services.filter((service) => service.price != null)

    return {
      ...establishment,
      services,
      open_days: openDays(establishment.business_hours),
      starting_price: pricedServices[0]?.price ?? null,
    }
  })

  const surfacedEstablishments = hasLiveData ? enrichedLiveEstablishments : fallbackEstablishments
  const surfacedServices: ServiceSurface[] = hasLiveData
    ? liveServices.map((service) => {
        const establishment = establishmentLookup.get(service.establishment_id)
        return {
          ...service,
          establishment_name: establishment?.name ?? 'Estabelecimento',
          establishment_slug: establishment?.slug ?? '',
          establishment_address: establishment?.address ?? null,
        }
      })
    : fallbackServices

  const search = normalize(query)
  const normalizedCategory = normalize(category)

  const visibleEstablishments = surfacedEstablishments.filter((establishment) => {
    const establishmentServices = establishment.services
    const haystack = normalize(
      [
        establishment.name,
        establishment.address ?? '',
        establishment.contact ?? '',
        establishment.slug,
        establishmentServices.map((service) => service.name).join(' '),
        establishmentServices.map((service) => service.category).join(' '),
      ].join(' '),
    )
    const matchesSearch = !search || haystack.includes(search)
    const matchesCategory =
      category === 'Todos' ||
      establishmentServices.some((service) => normalize(service.category) === normalizedCategory)

    return matchesSearch && matchesCategory
  })

  const visibleServices = surfacedServices.filter((service) => {
    const haystack = normalize(
      [service.name, service.category, service.description ?? '', service.establishment_name ?? ''].join(' '),
    )
    const matchesSearch = !search || haystack.includes(search)
    const matchesCategory = category === 'Todos' || normalize(service.category) === normalizedCategory
    return matchesSearch && matchesCategory
  })

  const categories = Array.from(
    new Set([
      'Todos',
      ...(hasLiveData
        ? liveServices.map((service) => service.category)
        : fallbackCategories),
    ]),
  )

  const topServices = [...visibleServices]
    .sort((a, b) => {
      const priceA = a.price ?? Number.POSITIVE_INFINITY
      const priceB = b.price ?? Number.POSITIVE_INFINITY
      if (priceA !== priceB) return priceA - priceB
      return a.duration_minutes - b.duration_minutes
    })
    .slice(0, 6)

  const featureCards = visibleEstablishments.slice(0, 6)
  const totalServices = surfacedServices.length
  const totalEstablishments = surfacedEstablishments.length

  return (
    <main className="bg-white text-black">
      <section className="relative overflow-hidden bg-black text-white">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?auto=format&fit=crop&w=2200&q=85"
            alt=""
            className="h-full w-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(0,196,204,0.84)_0%,rgba(106,0,255,0.9)_48%,rgba(255,0,127,0.88)_100%)] mix-blend-screen" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_20%),radial-gradient(circle_at_20%_30%,rgba(203,166,247,0.25),transparent_16%)]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-5 py-5 md:px-8">
          <div className="flex items-center justify-between">
            <a href="#" className="flex items-center gap-3">
              <img
                src="/imagens/icon.png"
                alt="IBeleza"
                className="h-10 w-10 rounded-[12px] md:hidden"
              />
              <img
                src="/imagens/LogoHorizontal.png"
                alt="IBeleza"
                className="hidden h-10 w-auto md:block"
              />
            </a>

            <div className="hidden items-center gap-7 text-sm font-medium text-white/80 md:flex">
              <a href="#buscar">Buscar vagas</a>
              <a href="#procedimentos">Procedimentos</a>
              <a href="#negocios">Negócios</a>
            </div>

            <Link href="/login" className={pillSecondary}>
              Entrar
            </Link>
          </div>
        </div>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 pb-14 pt-10 md:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:pb-20 lg:pt-14">
          <div>
            <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/85">
              Saúde e beleza com preço, procedimento e vaga livre
            </p>
            <h1 className="mt-6 max-w-4xl font-brand text-6xl leading-[0.9] tracking-tight md:text-8xl">
              IBeleza conecta quem quer agendar com quem atende.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/82 md:text-xl">
              A cliente procura o procedimento, vê o valor antes de entrar e abre
              a agenda já no dia e horário que quiser. O negócio recebe
              organização, confirmação e pagamento pelo site.
            </p>

            <form
              id="buscar"
              method="get"
              className="mt-8 grid gap-3 sm:grid-cols-[1.2fr_0.8fr_auto] sm:rounded-[8px] sm:bg-white sm:p-2 sm:shadow-2xl sm:shadow-black/30 lg:max-w-4xl"
            >
              <input
                name="q"
                defaultValue={query}
                placeholder="Buscar por estabelecimento, clínica ou procedimento"
                className="min-h-12 rounded-[6px] border border-white/30 bg-white px-4 text-sm text-black outline-none focus:border-[#6A00FF] sm:border-transparent"
              />
              <select
                name="categoria"
                defaultValue={category}
                className="min-h-12 rounded-[6px] border border-white/30 bg-white px-4 text-sm text-black outline-none focus:border-[#6A00FF] sm:border-transparent"
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <button type="submit" className={pillPrimary}>
                Ver vagas
              </button>
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
              {categories.slice(1, 6).map((item) => (
                <Link
                  key={item}
                  href={`/?categoria=${encodeURIComponent(item)}`}
                  className="rounded-full border border-white/18 bg-white/8 px-4 py-2 text-xs font-medium text-white/84 transition hover:bg-white/14"
                >
                  {item}
                </Link>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="#procedimentos" className={pillSecondary}>
                Ver procedimentos
              </Link>
              <Link href="#negocios" className={pillSecondary}>
                Ver estabelecimentos
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="overflow-hidden rounded-[8px] border border-white/15 bg-white/10 p-4 backdrop-blur">
              <img
                src="/imagens/Logo%20Horizontal%20maior.png"
                alt="IBeleza"
                className="h-auto w-full"
              />
            </div>
            <div className="overflow-hidden rounded-[8px] border border-white/15 bg-white/10 backdrop-blur">
              <img
                src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80"
                alt=""
                className="h-[320px] w-full object-cover"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-[8px] bg-black/35 p-4 ring-1 ring-white/15">
                <p className="text-2xl font-semibold">{totalEstablishments}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/70">
                  estabelecimentos
                </p>
              </div>
              <div className="rounded-[8px] bg-black/35 p-4 ring-1 ring-white/15">
                <p className="text-2xl font-semibold">{totalServices}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/70">
                  procedimentos ativos
                </p>
              </div>
              <div className="rounded-[8px] bg-black/35 p-4 ring-1 ring-white/15">
                <p className="text-2xl font-semibold">WhatsApp</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/70">
                  lembrete e confirmação
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="procedimentos" className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#6A00FF]">
              Procedimentos em destaque
            </p>
            <h2 className="mt-3 max-w-xl font-brand text-5xl leading-[0.96]">
              O valor aparece antes da cliente abrir a agenda.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#505050]">
              A busca já mostra preço, duração e categoria. Isso ajuda a comparar
              rapidamente limpeza de pele, manicure, corte, escova, micropigmentação
              e outros atendimentos.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {topServices.map((service) => (
              <article
                key={service.id}
                className="rounded-[8px] border border-[#ece4f7] bg-[#f9f6ff] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6A00FF]">
                      {service.category}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold">{service.name}</h3>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#6A00FF] ring-1 ring-[#ece4f7]">
                    {money(service.price)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#505050]">
                  {service.description || 'Procedimento profissional com agenda reservável.'}
                </p>
                <div className="mt-4 flex items-center justify-between gap-3 text-sm text-[#524a43]">
                  <span>{service.duration_minutes} min</span>
                  {service.establishment_slug ? (
                    <Link
                      href={`/${service.establishment_slug}`}
                      className="font-semibold text-[#FF007F]"
                    >
                      Ver agenda
                    </Link>
                  ) : (
                    <span className="font-semibold text-[#FF007F]">Ver agenda</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="negocios" className="border-y border-[#ece4f7] bg-[#faf8ff]">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#00C4CC]">
                Estabelecimentos com agenda ativa
              </p>
              <h2 className="mt-3 font-brand text-5xl leading-[0.96]">
                Compare procedimento, valor e encaixe disponível.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-[#505050]">
              Abra um perfil para escolher o dia, ver as vagas e finalizar o
              agendamento sem conversa longa.
            </p>
          </div>

          {visibleEstablishments.length > 0 ? (
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {featureCards.map((establishment) => {
                const cheapestService = establishment.services[0]
                const serviceSummary = establishment.services
                  .slice(0, 2)
                  .map((service) => service.name)
                  .join(' · ')

                return (
                  <article
                    key={establishment.id}
                    className="overflow-hidden rounded-[8px] bg-white shadow-[0_10px_30px_rgba(106,0,255,0.08)] ring-1 ring-black/5"
                  >
                    <div className="relative h-56 overflow-hidden bg-black/5">
                      <img
                        src={
                          establishment.logo_url ||
                          'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80'
                        }
                        alt={establishment.name}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.72))] p-4 text-white">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/70">
                          {establishment.open_days} dias com agenda aberta
                        </p>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">{establishment.name}</h3>
                          <p className="mt-1 text-sm text-[#6a6a6a]">
                            {establishment.address || establishment.contact || 'Atendimento sob agenda'}
                          </p>
                        </div>
                        <span className="rounded-full bg-[#f2e6ff] px-3 py-1 text-xs font-semibold text-[#6A00FF]">
                          {money(establishment.starting_price ?? cheapestService?.price ?? null)}
                        </span>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-[#505050]">
                        {serviceSummary || 'Seleção de procedimentos com disponibilidade real.'}
                      </p>

                      <div className="mt-5 flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-[#6a6a6a]">
                          {establishment.slots_per_schedule} vagas por grade
                        </p>
                        <Link href={`/${establishment.slug}`} className={pillPrimary}>
                          Ver vagas
                        </Link>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="mt-8 rounded-[8px] border border-dashed border-[#d7c9f1] bg-white p-6 text-sm text-[#505050]">
              Nenhum resultado para esse filtro. Tente buscar por outro procedimento
              ou abrir a agenda geral.
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#FF007F]">
              Como funciona
            </p>
            <h2 className="mt-3 max-w-2xl font-brand text-5xl leading-[0.96]">
              A cliente escolhe o procedimento e enxerga a vaga antes de pagar.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#505050]">
              O fluxo começa no web, porque o celular é o centro da operação.
              Depois entramos com WhatsApp, notificações e app Android.
            </p>
          </div>

          <div className="rounded-[8px] border border-[#ece4f7] bg-white p-5">
            <p className="text-sm font-semibold text-[#6a6a6a]">Resumo do produto</p>
            <div className="mt-4 grid gap-3">
              {[
                ['Busca', 'Estabelecimento, clínica ou procedimento'],
                ['Valor', 'Preço visível antes do agendamento'],
                ['Agenda', 'Dia e horário livres'],
                ['Avisos', 'WhatsApp 12h antes'],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-[6px] bg-[#f8f5ff] px-4 py-3"
                >
                  <span className="text-sm text-[#6a6a6a]">{label}</span>
                  <strong className="text-sm">{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="rounded-[8px] bg-[linear-gradient(135deg,#00C4CC_0%,#6A00FF_50%,#FF007F_100%)] px-6 py-8 text-white md:px-10">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 className="font-brand text-4xl leading-tight">
                Buscar agora é o jeito mais rápido de entender o serviço.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/78">
                Abra um estabelecimento, compare o preço e veja as vagas antes de
                concluir o agendamento.
              </p>
            </div>
            <Link href="#buscar" className={pillSecondary}>
              Buscar procedimento
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
