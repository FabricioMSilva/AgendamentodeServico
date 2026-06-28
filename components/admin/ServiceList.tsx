'use client'

import { deleteService } from '@/actions/admin'
import type { Service } from '@/database.types'
import Button from '@/components/ui/Button'

interface ServiceListProps {
  services: Service[]
}

export default function ServiceList({ services }: ServiceListProps) {
  if (services.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Nenhum serviço cadastrado. Adicione um acima.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
      {services.map((s) => (
        <li key={s.id} className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium">{s.name}</p>
            <p className="text-xs text-gray-500">
              {s.price_type === 'fixed' && s.price != null
                ? `R$ ${Number(s.price).toFixed(2)}`
                : 'Preço variável'}
            </p>
          </div>
          <form
            action={async () => {
              await deleteService(s.id)
            }}
          >
            <Button type="submit" variant="danger" size="sm">
              Remover
            </Button>
          </form>
        </li>
      ))}
    </ul>
  )
}
