import React from 'react'

type Props = {
  title: string
  value: string | number
  detail: string
  icon?: React.ReactNode
  className?: string
  compact?: boolean
}

// Ícone padrão que pode ser sobrescrito
function DefaultIcon() {
  return (
    <svg className="h-5 w-5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

// Cartão compacto para métricas do painel
export default function DashboardStatCard({ 
  title, 
  value, 
  detail, 
  icon,
  className = '', 
  compact = false 
}: Props) {
  if (compact) {
    return (
      <div className={`rounded-[8px] border border-white/10 bg-white/5 p-3 transition hover:border-white/20 hover:bg-white/8 ${className}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/48">{title}</p>
            <p className="mt-2 text-2xl font-bold text-white">{value}</p>
            <p className="mt-1 truncate text-xs text-white/60">{detail}</p>
          </div>
          <div className="shrink-0 text-white/40">
            {icon || <DefaultIcon />}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-[8px] border border-white/10 bg-white/5 p-4 ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-sm font-semibold text-white">{title}</p>
        <div className="text-white/40 shrink-0">
          {icon || <DefaultIcon />}
        </div>
      </div>
      <p className="text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-white/60">{detail}</p>
    </div>
  )
}
