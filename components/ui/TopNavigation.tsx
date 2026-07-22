'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LogoutButton from '@/components/auth/LogoutButton'

type MenuItem = {
  label: string
  href: string
}

type Props = {
  loggedIn: boolean
  userName?: string
  userLabel?: string
  panelHref?: string
}

const anonymousMenu: MenuItem[] = [
  { label: 'Buscar', href: '/buscar' },
  { label: 'Login', href: '/login' },
]

export default function TopNavigation({ loggedIn, userName, userLabel, panelHref }: Props) {
  const pathname = usePathname()

  const menuItems: MenuItem[] = loggedIn
    ? [
        { label: 'Buscar', href: '/buscar' },
        { label: userName ? userName : 'Perfil', href: '/perfil' },
        { label: 'Painel', href: panelHref ?? '/buscar' },
      ]
    : anonymousMenu

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-200/70 bg-white/95 shadow-sm backdrop-blur backdrop-saturate-150">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link href="/buscar" className="text-lg font-semibold tracking-tight text-slate-950">
            IBeleza
          </Link>
          {userLabel ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              {userLabel}
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition duration-150 ${
                  isActive ? 'bg-slate-950 text-white' : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </Link>
            )
          })}

          {loggedIn ? (
            <LogoutButton className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800" />
          ) : null}
        </div>
      </div>
    </header>
  )
}
