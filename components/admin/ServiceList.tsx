'use client'

import { deleteService, setServiceActive, updateService } from '@/actions/admin'
import type { Service } from '@/database.types'
import Button from '@/components/ui/Button'

interface ServiceListProps {
  services: Service[]
}

function money(value: number | null) {
  return value == null ? 'Sob consulta' : `R$ ${Number(value).toFixed(2)}`
}

export default function ServiceList({ services }: ServiceListProps) {
  const inputClass =
    'rounded-[8px] border border-white/10 bg-[#11172B] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25'

  if (services.length === 0) {
    return (
      <p className="text-sm text-white/60">
        Nenhum serviço cadastrado. Adicione seu primeiro serviço acima.
      </p>
    )
  }

  return (
    <div className="divide-y divide-white/10 rounded-[8px] border border-white/10">
      {services.map((service) => (
        <details key={service.id} className="group p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 overflow-hidden rounded-[8px] bg-white/8">
                {service.image_url ? (
                  <img
                    src={service.image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white/45">
                    {service.category.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-white">{service.name}</p>
                  {!service.is_active && (
                    <span className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] font-medium text-white/55 ring-1 ring-white/10">
                      pausado
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/55">
                  {service.category} · {service.duration_minutes} min · {money(service.price)}
                </p>
              </div>
            </div>
            <span className="text-xs font-medium text-white/55 group-open:hidden">
              Editar
            </span>
          </summary>

          <form
            action={async (formData) => {
              await updateService(formData)
            }}
            className="mt-4 grid gap-3"
          >
            <input type="hidden" name="id" value={service.id} />
            <div className="grid gap-3 md:grid-cols-2">
              <input
                name="name"
                defaultValue={service.name}
                required
                className={inputClass}
              />
              <input
                name="category"
                defaultValue={service.category}
                className={inputClass}
              />
            </div>
            <textarea
              name="description"
              defaultValue={service.description ?? ''}
              rows={2}
              className={inputClass}
            />
            <div className="grid gap-3 md:grid-cols-[1fr_120px_120px_140px]">
              <input
                name="image_url"
                defaultValue={service.image_url ?? ''}
                placeholder="URL da foto"
                className={inputClass}
              />
              <input
                name="duration_minutes"
                type="number"
                defaultValue={service.duration_minutes}
                min="10"
                max="480"
                className={inputClass}
              />
              <input
                name="price"
                type="number"
                defaultValue={service.price ?? ''}
                step="0.01"
                min="0"
                className={inputClass}
              />
              <select
                name="price_type"
                defaultValue={service.price_type}
                className={inputClass}
              >
                <option value="fixed">Preço fixo</option>
                <option value="variable">Sob consulta</option>
              </select>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="submit" variant="primary" size="sm">
                Salvar alterações
              </Button>
              <button
                type="button"
                onClick={() => setServiceActive(service.id, !service.is_active)}
                className="rounded-[8px] border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/12"
              >
                {service.is_active ? 'Pausar' : 'Ativar'}
              </button>
              <button
                type="button"
                onClick={() => deleteService(service.id)}
                className="rounded-[8px] bg-[#ff8ea8]/12 px-3 py-1.5 text-xs font-medium text-[#ff8ea8] transition hover:bg-[#ff8ea8]/18"
              >
                Remover
              </button>
            </div>
          </form>
        </details>
      ))}
    </div>
  )
}
