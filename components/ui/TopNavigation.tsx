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
  showAddEstablishment?: boolean
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

export default function TopNavigation({ loggedIn, userName, userLabel, panelHref, showAddEstablishment }: Props) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
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

          {loggedIn && userLabel ? (
            <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 sm:inline-block">
              {userLabel}
            </span>
          ) : null}

          {/* Desktop menu - for authenticated users */}
          {loggedIn ? (
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

              {showAddEstablishment && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition duration-150"
                >
                  + Loja
                </button>
              )}

              <LogoutButton className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800" />
            </div>
          ) : (
            /* Desktop menu for anonymous users - styled for better visibility */
            <div className="hidden sm:flex sm:gap-2">
              {menuItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition duration-150 ${
                      isActive 
                        ? 'bg-slate-950 text-white' 
                        : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          )}

          {/* Mobile menu button - for both logged in and anonymous */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
            className="inline-flex sm:hidden h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 transition"
          >
            {mobileMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
          </button>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 bg-slate-950/50 sm:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <div
          ref={menuRef}
          className="fixed right-0 top-16 z-40 h-[calc(100vh-4rem)] w-full max-w-sm bg-white/98 backdrop-blur backdrop-saturate-150 flex flex-col sm:hidden"
        >
          {/* User info - only for logged in users */}
          {loggedIn && (
            <div className="border-b border-slate-200/70 px-4 py-4">
              <p className="truncate text-sm font-semibold text-slate-900">{userName}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{userLabel}</p>
            </div>
          )}

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
              {showAddEstablishment && (
                <button
                  onClick={() => {
                    setShowAddModal(true)
                    setMobileMenuOpen(false)
                  }}
                  className="flex items-center rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition"
                >
                  + Loja
                </button>
              )}
            </div>
          </nav>

          {/* Logout button - only for logged in users */}
          {loggedIn && (
            <div className="border-t border-slate-200/70 p-4">
              <LogoutButton className="w-full rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition" />
            </div>
          )}
        </div>
      )}

      {/* Add Establishment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-700"
            >
              ✕
            </button>
            <h2 className="text-lg font-semibold text-slate-900">Adicionar loja</h2>
            <p className="mt-2 text-sm text-slate-600">
              Crie um novo estabelecimento e gerenciá-lo através do seu painel.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200 transition"
              >
                Cancelar
              </button>
              <Link
                href="/dono"
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700 transition"
                onClick={() => setShowAddModal(false)}
              >
                Ir para painel
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
