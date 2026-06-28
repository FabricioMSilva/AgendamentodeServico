'use client'

import { useState } from 'react'
import { createService } from '@/actions/admin'
import Button from '@/components/ui/Button'

export default function ServiceForm() {
  const [pending, setPending] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

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
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 mb-4">
      <input
        name="name"
        placeholder="Nome do serviço"
        required
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-40 focus:outline-none focus:ring-2 focus:ring-black"
      />
      <select
        name="price_type"
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
      >
        <option value="fixed">Preço fixo</option>
        <option value="variable">Preço variável</option>
      </select>
      <input
        name="price"
        type="number"
        placeholder="Preço"
        step="0.01"
        min="0"
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-black"
      />
      <Button type="submit" variant="primary" size="md" loading={pending}>
        Adicionar serviço
      </Button>
      {errors._form && (
        <p className="w-full text-xs text-red-600">{errors._form.join(', ')}</p>
      )}
    </form>
  )
}
