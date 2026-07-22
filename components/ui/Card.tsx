import React from 'react'

interface CardProps {
  title?: string
  children: React.ReactNode
  className?: string
}

export default function Card({ title, children, className = '' }: CardProps) {
  return (
    <div className={['rounded-[10px] border border-white/10 bg-white/5 p-4 text-white shadow-lg/5', className].join(' ')}>
      {title && <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-white/75">{title}</h2>}
      {children}
    </div>
  )
}
