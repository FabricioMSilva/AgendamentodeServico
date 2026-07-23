'use client'

import { useState } from 'react'
import { MdClose } from 'react-icons/md'
import ServiceForm from '@/components/admin/ServiceForm'
import ServiceList from '@/components/admin/ServiceList'
import type { Service } from '@/database.types'
import type { ServiceCatalogCategory } from '@/lib/services/categories'

type OwnerEstablishment = {
  id: string
  name: string
  slug: string
  is_blocked: boolean
  services: Service[]
}

export default function OwnerEstablishmentEditor({
  establishments,
  catalog,
}: {
  establishments: OwnerEstablishment[]
  catalog: ServiceCatalogCategory[]
}) {
  const [selectedEstablishment, setSelectedEstablishment] = useState<OwnerEstablishment | null>(null)

  return (
    <div className="space-y-5">
      <div className="rounded-[18px] border border-white/10 bg-[#11172B]/50 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
              Estabelecimentos
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">Clique para editar</h2>
            <p className="mt-2 text-sm leading-6 text-white/68">
              Toque em um estabelecimento para abrir a edição de serviços, preços e catálogo nesta seção.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {establishments.map((establishment) => (
            <button
              key={establishment.id}
              type="button"
              onClick={() => setSelectedEstablishment(establishment)}
              className={[
                'group flex w-full flex-col gap-3 rounded-[18px] border p-4 text-left transition',
                selectedEstablishment?.id === establishment.id
                  ? 'border-[#8FF0F4]/55 bg-[#8FF0F4]/10'
                  : 'border-white/10 bg-[#131b2f] hover:border-white/20',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-white">{establishment.name}</p>
                  <p className="mt-1 text-sm text-white/55">/{establishment.slug}</p>
                </div>
                <span
                  className={[
                    'rounded-full px-3 py-1 text-xs font-semibold',
                    establishment.is_blocked
                      ? 'bg-[#ff8ea8]/12 text-[#ff8ea8]'
                      : 'bg-emerald-400/10 text-emerald-100',
                  ].join(' ')}
                >
                  {establishment.is_blocked ? 'Pausado' : 'Ativo'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm text-white/55">
                <span>{establishment.services.length} serviço{establishment.services.length === 1 ? '' : 's'}</span>
                <span className="rounded-full bg-white/5 px-2 py-1">Editar</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedEstablishment ? (
        <section className="overflow-hidden rounded-[18px] border border-white/10 bg-[#0f1527] shadow-[0_18px_50px_rgba(0,0,0,0.18)] ring-1 ring-white/10">
          <div className="border-b border-white/10 bg-[#12182b] px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
                  Editar estabelecimento
                </p>
                <h3 className="mt-1 text-2xl font-semibold text-white">
                  {selectedEstablishment.name}
                </h3>
                <p className="mt-2 text-sm text-white/60">/ {selectedEstablishment.slug}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEstablishment(null)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/8 text-xl leading-none text-white ring-1 ring-white/15 transition hover:bg-white/15"
                aria-label="Fechar edição do estabelecimento"
              >
                <MdClose aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="grid gap-4 px-5 py-5 sm:grid-cols-[1.1fr_0.9fr] sm:px-6 sm:py-6">
            <div className="space-y-4">
              <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">Adicionar novo serviço</p>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  Use o formulário abaixo para cadastrar serviços rápidos no estabelecimento selecionado.
                </p>
              </div>

              <ServiceForm establishmentId={selectedEstablishment.id} catalog={catalog} />
            </div>

            <div className="space-y-4">
              <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">Serviços cadastrados</p>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  Edite preços, duração, categoria ou pause e remova serviços já existentes.
                </p>
              </div>

              <ServiceList
                services={selectedEstablishment.services}
                establishmentId={selectedEstablishment.id}
                catalog={catalog}
              />
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
