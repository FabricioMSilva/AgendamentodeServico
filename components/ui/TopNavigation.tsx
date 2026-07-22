'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
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

function HamburgerIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export default function TopNavigation({ loggedIn, userName, userLabel, panelHref }: Props) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const menuItems: MenuItem[] = loggedIn
    ? [
        { label: 'Buscar', href: '/buscar' },
        { label: userName ? userName : 'Perfil', href: '/perfil' },
        { label: 'Painel', href: panelHref ?? '/buscar' },
      ]
    : anonymousMenu

  // Close menu when pathname changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Close menu when clicking outside
  useEffect(() => {
    if (!mobileMenuOpen) return

    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMobileMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', handleClick)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handleClick)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileMenuOpen])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileMenuOpen])

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-200/70 bg-white/95 shadow-sm backdrop-blur backdrop-saturate-150">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/buscar" className="text-lg font-semibold tracking-tight text-slate-950">
            IBeleza
          </Link>

          {userLabel ? (
            <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 sm:inline-block">
              {userLabel}
            </span>
          ) : null}

          {/* Desktop menu */}
          <div className="hidden flex-wrap items-center justify-end gap-2 sm:flex sm:gap-3">
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

          {/* Mobile menu button - only show if logged in */}
          {loggedIn ? (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={mobileMenuOpen}
              className="inline-flex sm:hidden h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 transition"
            >
              {mobileMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
            </button>
          ) : null}
        </div>
      </header>

      {/* Mobile menu overlay */}
      {loggedIn && mobileMenuOpen && (
        <div className="fixed inset-0 z-30 bg-slate-950/50 sm:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Mobile menu drawer */}
      {loggedIn && mobileMenuOpen && (
        <div
          ref={menuRef}
          className="fixed right-0 top-16 z-40 h-[calc(100vh-4rem)] w-full max-w-sm bg-white/98 backdrop-blur backdrop-saturate-150 flex flex-col sm:hidden"
        >
          {/* User info */}
          <div className="border-b border-slate-200/70 px-4 py-4">
            <p className="truncate text-sm font-semibold text-slate-900">{userName}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{userLabel}</p>
          </div>

          {/* Scrollable menu items */}
          <nav className="flex-1 overflow-y-auto">
            <div className="flex flex-col gap-1 p-2">
              {menuItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center rounded-lg px-4 py-3 text-sm font-semibold transition ${
                      isActive
                        ? 'bg-slate-950 text-white'
                        : 'text-slate-700 hover:bg-slate-100 active:bg-slate-200'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* Logout button */}
          <div className="border-t border-slate-200/70 p-4">
            <LogoutButton className="w-full rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition" />
          </div>
        </div>
      )}
    </>
  )
}
