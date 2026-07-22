'use client'

import { useState } from 'react'
import { createService } from '@/actions/admin'
import Button from '@/components/ui/Button'
import {
  getFallbackServiceCatalog,
  type ServiceCatalogCategory,
} from '@/lib/services/categories'

function firstCategory(catalog: ServiceCatalogCategory[]) {
  return catalog[0]?.category ?? ''
}

function serviceOptions(catalog: ServiceCatalogCategory[], category: string) {
  return catalog.find((item) => item.category === category)?.services ?? []
}

function firstServiceName(catalog: ServiceCatalogCategory[], category: string) {
  return serviceOptions(catalog, category)[0]?.name ?? ''
}

export default function ServiceForm({
  catalog = getFallbackServiceCatalog(),
  establishmentId,
}: {
  catalog?: ServiceCatalogCategory[]
  establishmentId: string
}) {
  const initialCategory = firstCategory(catalog)
  const initialServiceName = firstServiceName(catalog, initialCategory)
  const initialService = serviceOptions(catalog, initialCategory)[0]
  const [pending, setPending] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [category, setCategory] = useState(initialCategory)
  const [serviceName, setServiceName] = useState(initialServiceName)
  const [durationMinutes, setDurationMinutes] = useState(initialService?.durationMinutes ?? 45)
  const [price, setPrice] = useState(initialService?.price == null ? '' : String(initialService.price))
  const inputClass =
    'rounded-[8px] border border-white/10 bg-[#11172B] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25'

  const changeCategory = (nextCategory: string) => {
    const nextService = serviceOptions(catalog, nextCategory)[0]
    setCategory(nextCategory)
    setServiceName(nextService?.name ?? '')
    setDurationMinutes(nextService?.durationMinutes ?? 45)
    setPrice(nextService?.price == null ? '' : String(nextService.price))
  }

  const changeService = (nextServiceName: string) => {
    const nextService = serviceOptions(catalog, category).find((service) => service.name === nextServiceName)
    setServiceName(nextServiceName)
    if (nextService) {
      setDurationMinutes(nextService.durationMinutes)
      setPrice(nextService.price == null ? '' : String(nextService.price))
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPending(true)
    setErrors({})
    const result = await createService(new FormData(e.currentTarget))
    if (result.error) {
      setErrors(result.error)
    } else {
      ;(e.target as HTMLFormElement).reset()
      const resetCategory = firstCategory(catalog)
      const resetService = serviceOptions(catalog, resetCategory)[0]
      setCategory(resetCategory)
      setServiceName(resetService?.name ?? '')
      setDurationMinutes(resetService?.durationMinutes ?? 45)
      setPrice(resetService?.price == null ? '' : String(resetService.price))
    }
    setPending(false)
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-[8px] border border-white/10 bg-white/5 p-4">
      <input type="hidden" name="establishment_id" value={establishmentId} />
      <div className="grid gap-3 md:grid-cols-2">
        <select
          name="category"
          value={category}
          onChange={(event) => changeCategory(event.target.value)}
          className={inputClass}
        >
          {catalog.map((item) => (
            <option key={item.category} value={item.category}>
              {item.category}
            </option>
          ))}
        </select>
        <select
          name="name"
          value={serviceName}
          onChange={(event) => changeService(event.target.value)}
          required
          className={inputClass}
        >
          {serviceOptions(catalog, category).map((option) => (
            <option key={option.name} value={option.name}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      <textarea
        name="description"
        placeholder="Descrição curta do serviço, se precisar"
        rows={2}
        className={inputClass}
      />

      <div className="grid gap-3 grid-cols-1 md:grid-cols-[1fr_120px_120px_140px]">
        <input
          name="image_url"
          placeholder="URL da foto do serviço"
          className={inputClass}
        />
        <input
          name="duration_minutes"
          type="number"
          placeholder="Duração"
          value={durationMinutes}
          onChange={(event) => setDurationMinutes(Number(event.target.value))}
          min="10"
          max="480"
          className={inputClass}
        />
        <input
          name="price"
          type="number"
          placeholder="Preço"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          step="0.01"
          min="0"
          className={inputClass}
        />
        <select
          name="price_type"
          className={inputClass}
        >
          <option value="fixed">Preço fixo</option>
          <option value="variable">Sob consulta</option>
        </select>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-white/55">
          Use duração real para a agenda bloquear o tempo correto.
        </p>
        <Button type="submit" variant="primary" size="md" loading={pending}>
          Adicionar serviço
        </Button>
      </div>

      {errors._form && (
        <p className="text-xs text-[#ff8ea8]">{errors._form.join(', ')}</p>
      )}
    </form>
  )
}
