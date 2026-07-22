'use client'

import { useMemo, useState } from 'react'
import { createServiceFromCatalog, suggestService } from '@/actions/admin'
import Button from '@/components/ui/Button'
import type { ServiceCatalogItem, ServiceSuggestion } from '@/database.types'
import { DEFAULT_SERVICE_CATEGORY, SERVICE_CATEGORY_VALUES } from '@/lib/services/categories'

const inputClass =
  'w-full rounded-[8px] border border-white/10 bg-[#11172B] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25'

const categoryOptions = SERVICE_CATEGORY_VALUES

export default function ServiceCatalogPicker({
  catalog,
  suggestions,
}: {
  catalog: ServiceCatalogItem[]
  suggestions: ServiceSuggestion[]
}) {
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return catalog
    return catalog.filter((item) =>
      `${item.name} ${item.category}`.toLowerCase().includes(needle),
    )
  }, [catalog, query])

  const handleSuggest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    setErrors({})
    const result = await suggestService(new FormData(event.currentTarget))
    if (result.error) {
      setErrors(result.error)
    } else {
      setMessage('Sugestão enviada para aprovação.')
      event.currentTarget.reset()
    }
  }

  const handleAdd = async (event: React.FormEvent<HTMLFormElement>, name: string) => {
    event.preventDefault()
    setMessage(null)
    const result = await createServiceFromCatalog(new FormData(event.currentTarget))
    if (result.error) setMessage(result.error)
    else setMessage(`${name} adicionado.`)
  }

  return (
    <div className="space-y-5">
      <div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar serviço sugerido"
          className={inputClass}
        />
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {visible.map((item) => (
          <form
            key={item.id}
            onSubmit={(event) => handleAdd(event, item.name)}
            className="rounded-[8px] border border-white/10 bg-white/5 p-3"
          >
            <input type="hidden" name="catalog_id" value={item.id} />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{item.name}</p>
                <p className="mt-1 text-xs text-white/55">{item.category} · {item.default_duration_minutes} min</p>
              </div>
              <button className="rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/10">
                Adicionar
              </button>
            </div>
          </form>
        ))}
      </div>

      <form onSubmit={handleSuggest} className="grid gap-3 rounded-[8px] border border-white/10 bg-[#11172B] p-4 md:grid-cols-[1fr_180px_auto]">
        <input name="suggested_name" placeholder="Serviço que não encontrei" className={inputClass} />
        <select name="category" defaultValue={DEFAULT_SERVICE_CATEGORY} className={inputClass}>
          {categoryOptions.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <Button type="submit">Sugerir</Button>
        {errors.suggested_name ? <p className="text-xs text-[#ff8ea8] md:col-span-3">{errors.suggested_name.join(', ')}</p> : null}
        {errors._form ? <p className="text-xs text-[#ff8ea8] md:col-span-3">{errors._form.join(', ')}</p> : null}
      </form>

      {suggestions.length > 0 ? (
        <div className="rounded-[8px] border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold text-white">Sugestões enviadas</p>
          <div className="mt-3 space-y-2">
            {suggestions.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-white/72">{item.suggested_name}</span>
                <span className="rounded-full bg-white/8 px-2 py-1 text-xs text-white/55">{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {message ? <p className="text-sm text-white/70">{message}</p> : null}
    </div>
  )
}
