'use client'

import { useMemo, useState } from 'react'

type InfoTab = 'services' | 'photos' | 'hours' | 'local'

type InfoService = {
  id: string
  name: string
  category: string
  description: string | null
  duration: number
  price: string
}

type InfoPhoto = {
  id: string
  url: string
  title: string | null
}

type ScheduleRow = {
  label: string
  value: string
  open: boolean
}

type SocialLink = {
  label: string
  href: string
}

export default function EstablishmentInfoMenu({
  services,
  photos,
  schedule,
  address,
  cityState,
  contact,
  socials,
}: {
  services: InfoService[]
  photos: InfoPhoto[]
  schedule: ScheduleRow[]
  address: string
  cityState: string
  contact: string
  socials: SocialLink[]
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<InfoTab>('services')
  const groupedServices = useMemo(() => {
    return services.reduce<Record<string, InfoService[]>>((groups, service) => {
      groups[service.category] = groups[service.category] ?? []
      groups[service.category].push(service)
      return groups
    }, {})
  }, [services])

  const openTab = (nextTab: InfoTab) => {
    setTab(nextTab)
    setOpen(true)
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => openTab('services')}
          className="min-h-10 rounded-full bg-white/9 px-4 text-sm font-semibold text-white ring-1 ring-white/12 transition hover:bg-white/13"
        >
          Serviços
        </button>
        <button
          type="button"
          onClick={() => openTab('photos')}
          className="min-h-10 rounded-full bg-white/9 px-4 text-sm font-semibold text-white ring-1 ring-white/12 transition hover:bg-white/13"
        >
          Fotos
        </button>
        <button
          type="button"
          onClick={() => openTab('hours')}
          className="min-h-10 rounded-full bg-white/9 px-4 text-sm font-semibold text-white ring-1 ring-white/12 transition hover:bg-white/13"
        >
          Funcionamento
        </button>
        <button
          type="button"
          onClick={() => openTab('local')}
          className="min-h-10 rounded-full bg-white/9 px-4 text-sm font-semibold text-white ring-1 ring-white/12 transition hover:bg-white/13"
        >
          Local
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end bg-[#070a13]/78 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
          <button
            type="button"
            aria-label="Fechar informações"
            className="absolute inset-0"
            onClick={() => setOpen(false)}
          />
          <section className="relative z-[81] max-h-[88svh] w-full max-w-3xl overflow-y-auto rounded-[8px] bg-[#12182b] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.42)] ring-1 ring-white/12 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8FF0F4]">
                  informações
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-white">Detalhes do estabelecimento</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/8 text-lg text-white ring-1 ring-white/10"
                aria-label="Fechar informações"
              >
                ×
              </button>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {[
                ['services', 'Serviços'],
                ['photos', 'Fotos'],
                ['hours', 'Horários'],
                ['local', 'Local'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id as InfoTab)}
                  className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition ${
                    tab === id
                      ? 'bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] text-white'
                      : 'bg-white/8 text-white/70 ring-1 ring-white/10'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'services' ? (
              <div className="mt-5 space-y-5">
                {Object.entries(groupedServices).map(([category, items]) => (
                  <div key={category}>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                      {category}
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {items.map((service) => (
                        <div key={service.id} className="rounded-[8px] bg-[#0f1527] p-3 ring-1 ring-white/8">
                          <div className="flex justify-between gap-3">
                            <p className="font-semibold text-white">{service.name}</p>
                            <p className="shrink-0 text-sm font-semibold text-white">{service.price}</p>
                          </div>
                          <p className="mt-1 text-xs text-white/52">{service.duration} min</p>
                          {service.description ? (
                            <p className="mt-2 text-sm leading-6 text-white/62">{service.description}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {tab === 'photos' ? (
              photos.length > 0 ? (
                <div className="mt-5 grid auto-rows-[150px] gap-3 sm:grid-cols-3 sm:auto-rows-[190px]">
                  {photos.map((photo, index) => (
                    <img
                      key={photo.id}
                      src={photo.url}
                      alt={photo.title ?? `Foto ${index + 1}`}
                      className={`h-full w-full rounded-[8px] object-cover ring-1 ring-white/10 ${
                        index === 0 ? 'sm:col-span-2 sm:row-span-2' : ''
                      }`}
                    />
                  ))}
                </div>
              ) : (
                <p className="mt-5 rounded-[8px] bg-white/7 p-4 text-sm text-white/60 ring-1 ring-white/10">
                  Este estabelecimento ainda não adicionou fotos.
                </p>
              )
            ) : null}

            {tab === 'hours' ? (
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {schedule.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-3 rounded-[8px] bg-[#0f1527] px-3 py-3 ring-1 ring-white/8">
                    <span className="text-sm font-semibold text-white">{row.label}</span>
                    <span className={row.open ? 'text-sm text-white/72' : 'text-sm text-white/32'}>{row.value}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {tab === 'local' ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[8px] bg-[#0f1527] p-4 ring-1 ring-white/8">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/42">Endereço</p>
                  <p className="mt-2 text-sm leading-6 text-white/78">{address}</p>
                  <p className="mt-3 text-xs text-white/42">{cityState}</p>
                </div>
                <div className="rounded-[8px] bg-[#0f1527] p-4 ring-1 ring-white/8">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/42">Contato</p>
                  <p className="mt-2 text-sm leading-6 text-white/78">{contact}</p>
                  {socials.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {socials.map((item) => (
                        <a
                          key={item.label}
                          href={item.href}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-white/8 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/10"
                        >
                          {item.label}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  )
}
