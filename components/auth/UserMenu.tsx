'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Props = {
  userName: string
  userLabel: string
  panelHref: string
}

function UserMenuIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" />
      <path d="M6 20c0-2.21 1.79-4 4-4h4c2.21 0 4 1.79 4 4" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function PanelIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
      <path d="M4 5h16v14H4z" />
      <path d="M8 9h8M8 13h4" />
    </svg>
  )
}

function ExitIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M21 19V5" />
    </svg>
  )
}

export default function UserMenu({ userName, userLabel, panelHref }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return

    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleLogout = async () => {
    setBusy(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  return (
    <div ref={menuRef} className="fixed right-4 top-4 z-50 sm:right-6">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={open}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/14 bg-[#10172a]/92 text-white shadow-[0_14px_34px_rgba(0,0,0,0.28)] backdrop-blur transition hover:border-[#8FF0F4]/55 hover:text-[#8FF0F4] focus:outline-none focus:ring-2 focus:ring-[#8FF0F4]/70"
      >
        <UserMenuIcon />
      </button>

      {open ? (
        <div className="absolute right-0 mt-3 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-[8px] border border-white/12 bg-[#11172b]/96 text-white shadow-[0_24px_70px_rgba(0,0,0,0.38)] backdrop-blur">
          <div className="border-b border-white/10 px-4 py-3">
            <p className="truncate text-sm font-semibold">{userName}</p>
            <p className="mt-0.5 text-xs uppercase tracking-[0.18em] text-white/48">{userLabel}</p>
          </div>

          <nav className="p-2" aria-label="Menu do usuário">
            <Link href="/perfil" className="flex min-h-11 items-center gap-3 rounded-[8px] px-3 text-sm font-semibold text-white/84 transition hover:bg-white/8 hover:text-white">
              <UserIcon />
              Perfil
            </Link>
            <Link href={panelHref} className="flex min-h-11 items-center gap-3 rounded-[8px] px-3 text-sm font-semibold text-white/84 transition hover:bg-white/8 hover:text-white">
              <PanelIcon />
              Painel
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              disabled={busy}
              className="flex min-h-11 w-full items-center gap-3 rounded-[8px] px-3 text-left text-sm font-semibold text-white/84 transition hover:bg-white/8 hover:text-white disabled:opacity-55"
            >
              <ExitIcon />
              {busy ? 'Saindo...' : 'Sair'}
            </button>
          </nav>
        </div>
      ) : null}
    </div>
  )
}
