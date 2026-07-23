type Props = {
  title: string
  value: number
  icon: React.ReactNode
  color?: string
  isActive?: boolean
  onClick?: () => void
  compact?: boolean
}

export default function CompactStatIcon({ title, value, icon, color = 'text-slate-400', isActive, onClick, compact = false }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex relative items-center justify-center rounded-md p-1.5 transition-all md:flex md:flex-col md:items-center md:justify-center md:gap-2 md:rounded-lg md:rounded-xl md:p-4 md:min-w-20 ${
        isActive
          ? 'bg-white/20 border border-white/40 md:bg-white/15 md:shadow-lg md:scale-100 md:scale-105'
          : 'hover:bg-white/8 border border-white/5 hover:border-white/20 md:hover:bg-white/10'
      }`}
      title={title}
    >
      {/* Mobile: compact icon with badge */}
      <div className="md:hidden">
        <div className={`text-base ${color}`}>{icon}</div>
        <div className="absolute -top-1.5 -right-1.5 flex items-center justify-center bg-white rounded-full w-4 h-4 text-[10px] font-bold text-slate-900">
          {value}
        </div>
      </div>

      {/* Desktop: full view with icon, number and text */}
      <div className="hidden md:flex md:flex-col md:items-center md:justify-center md:gap-2">
        <div className={`text-4xl transition-transform ${color} ${isActive ? 'md:scale-110' : ''}`}>{icon}</div>
        <div className="text-lg font-bold text-white leading-tight">{value}</div>
        <div className="text-xs text-slate-300 text-center leading-tight max-w-16">{title}</div>
      </div>
    </button>
  )
}
