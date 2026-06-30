import React from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type ButtonSize = 'sm' | 'md'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  startIcon?: React.ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] text-white shadow-[0_12px_28px_rgba(106,0,255,0.22)] hover:shadow-[0_16px_32px_rgba(106,0,255,0.28)]',
  secondary:
    'bg-white/8 text-white ring-1 ring-white/12 hover:bg-white/12',
  ghost:
    'bg-white/8 text-white ring-1 ring-white/12 hover:bg-white/12',
  danger:
    'bg-[linear-gradient(135deg,#ef4444_0%,#fb7185_100%)] text-white shadow-[0_12px_28px_rgba(239,68,68,0.18)]',
  success:
    'bg-[linear-gradient(135deg,#16a34a_0%,#22c55e_52%,#84cc16_100%)] text-white shadow-[0_12px_28px_rgba(34,197,94,0.18)]',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-10 px-4 text-xs',
  md: 'min-h-12 px-5 text-sm',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  startIcon,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const hasIcon = Boolean(startIcon)
  return (
    <button
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-3 rounded-full font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        hasIcon ? 'pl-3' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {hasIcon && (
        <span
          className={[
            'flex h-7 w-7 items-center justify-center rounded-full',
            variant === 'secondary'
              ? 'bg-white/12 text-white ring-1 ring-white/20'
              : 'bg-white/12 text-white ring-1 ring-white/20',
          ].join(' ')}
        >
          {startIcon}
        </span>
      )}
      {loading ? '...' : children}
    </button>
  )
}
