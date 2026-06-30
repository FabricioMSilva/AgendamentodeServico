import React from 'react'

interface CardProps {
  title?: string
  children: React.ReactNode
  className?: string
}

export default function Card({ title, children, className = '' }: CardProps) {
  return (
    <div className={['rounded-[8px] border border-white/10 bg-white/6 p-6 text-white shadow-[0_18px_50px_rgba(0,0,0,0.18)]', className].join(' ')}>
      {title && <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>}
      {children}
    </div>
  )
}
