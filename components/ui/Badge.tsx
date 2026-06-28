import type { AppointmentStatus } from '@/database.types'

const statusConfig: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  pending: {
    label: 'Aguardando',
    className: 'bg-amber-100 text-amber-800',
  },
  confirmed: {
    label: 'Confirmado',
    className: 'bg-blue-100 text-blue-800',
  },
  checked_in: {
    label: 'Presente',
    className: 'bg-purple-100 text-purple-800',
  },
  completed: {
    label: 'Concluído',
    className: 'bg-green-100 text-green-800',
  },
  cancelled: {
    label: 'Cancelado',
    className: 'bg-red-100 text-red-800',
  },
  no_show: {
    label: 'Não Compareceu',
    className: 'bg-gray-100 text-gray-700',
  },
}

interface BadgeProps {
  status: AppointmentStatus
}

export default function Badge({ status }: BadgeProps) {
  const config = statusConfig[status]
  return (
    <span
      className={[
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.className,
      ].join(' ')}
    >
      {config.label}
    </span>
  )
}
