import React from 'react'

interface CardProps {
  title?: string
  children: React.ReactNode
  className?: string
}

export default function Card({ title, children, className = '' }: CardProps) {
  return (
    <div className={['bg-white border border-gray-200 rounded-xl p-6', className].join(' ')}>
      {title && <h2 className="text-lg font-semibold mb-4">{title}</h2>}
      {children}
    </div>
  )
}
