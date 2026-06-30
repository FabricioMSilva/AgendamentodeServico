import type { AppointmentStatus } from '@/database.types'

const statusConfig: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  pending: {
    label: 'Aguardando',
    className: 'bg-white/8 text-white/68 ring-1 ring-white/10',
  },
  confirmed: {
    label: 'Aceito',
    className: 'bg-emerald-300/12 text-emerald-100 ring-1 ring-emerald-200/20',
  },
  checked_in: {
    label: 'Aguardando confirmação',
    className: 'bg-amber-300/12 text-amber-100 ring-1 ring-amber-200/20',
  },
  completed: {
    label: 'Concluído',
    className: 'bg-emerald-300/12 text-emerald-100 ring-1 ring-emerald-200/20',
  },
  cancelled: {
    label: 'Recusado',
    className: 'bg-[#ff8ea8]/12 text-[#ff8ea8] ring-1 ring-[#ff8ea8]/20',
  },
  no_show: {
    label: 'Não Compareceu',
    className: 'bg-white/8 text-white/68 ring-1 ring-white/10',
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
