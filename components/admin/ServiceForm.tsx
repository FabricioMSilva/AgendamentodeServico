'use client'

import { useState } from 'react'
import { createService } from '@/actions/admin'
import Button from '@/components/ui/Button'

export default function ServiceForm() {
  const [pending, setPending] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const inputClass =
    'rounded-[8px] border border-white/10 bg-[#11172B] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25'

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPending(true)
    setErrors({})
    const result = await createService(new FormData(e.currentTarget))
    if (result.error) {
      setErrors(result.error)
    } else {
      ;(e.target as HTMLFormElement).reset()
    }
    setPending(false)
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-[8px] border border-white/10 bg-white/5 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <input
          name="name"
          placeholder="Ex: Limpeza de pele, manicure ou corte"
          required
          className={inputClass}
        />
        <input
          name="category"
          placeholder="Categoria: Unhas, Cabelo, Pele, Massagem"
          className={inputClass}
        />
      </div>

      <textarea
        name="description"
        placeholder="Descrição curta do serviço"
        rows={2}
        className={inputClass}
      />

      <div className="grid gap-3 md:grid-cols-[1fr_120px_120px_140px]">
        <input
          name="image_url"
          placeholder="URL da foto do serviço"
          className={inputClass}
        />
        <input
          name="duration_minutes"
          type="number"
          placeholder="Duração"
          defaultValue={45}
          min="10"
          max="480"
          className={inputClass}
        />
        <input
          name="price"
          type="number"
          placeholder="Preço"
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
