'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  MdCalendarMonth,
  MdHome,
  MdImage,
  MdPeople,
  MdPerson,
  MdSchedule,
  MdStorefront,
  MdViewList,
} from 'react-icons/md'
import LogoutButton from '@/components/auth/LogoutButton'
import type { MerchantEstablishmentNavItem } from '@/lib/merchant/panel-data'

const NAV = [
  { href: '/comerciante', label: 'Painel', icon: MdHome },
  { href: '/comerciante/agendamentos', label: 'Agendamentos', icon: MdCalendarMonth },
  { href: '/comerciante/clientes', label: 'Clientes', icon: MdPeople },
  { href: '/comerciante/servicos', label: 'Serviços', icon: MdViewList },
  { href: '/comerciante/horarios', label: 'Horários', icon: MdSchedule },
  { href: '/comerciante/midia', label: 'Mídia', icon: MdImage },
  { href: '/comerciante/perfil', label: 'Perfil', icon: MdPerson },
] as const

function withEstablishment(href: string, establishmentId: string | null) {
  if (!establishmentId) return href
  return `${href}?establishment=${establishmentId}`
}

export default function MerchantShell({
  children,
  establishments,
}: {
  children: React.ReactNode
  establishments: MerchantEstablishmentNavItem[]
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selectedEstablishmentId = searchParams.get('establishment') ?? establishments[0]?.id ?? null

  return (
    <main className="min-h-screen bg-[#1A2033] text-white">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl gap-0 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden border-r border-white/10 bg-[#11172B] px-4 py-5 lg:block">
          <Link href={withEstablishment('/comerciante', selectedEstablishmentId)} className="flex items-center gap-3">
            <img src="/imagens/ibeleza.png" alt="IBeleza" className="h-8 w-auto object-contain" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/50">
              comerciante
            </span>
          </Link>

          <div className="mt-6 rounded-[8px] bg-white/6 p-3 ring-1 ring-white/10">
            <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/42">
              Negócio
            </label>
            <div className="mt-2 space-y-1">
              {establishments.map((item) => {
                const active = item.id === selectedEstablishmentId
                return (
                  <Link
                    key={item.id}
                    href={`${pathname}?establishment=${item.id}`}
                    className={[
                      'block rounded-[8px] px-3 py-2 transition',
                      active ? 'bg-[#8FF0F4]/10 text-[#8FF0F4]' : 'text-white/68 hover:bg-white/8 hover:text-white',
                    ].join(' ')}
                  >
                    <span className="block truncate text-sm font-semibold">{item.name}</span>
                    <span className="block truncate text-xs opacity-65">/{item.slug}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          <nav className="mt-5 space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={withEstablishment(item.href, selectedEstablishmentId)}
                  className={[
                    'flex min-h-11 items-center gap-3 rounded-[8px] px-3 text-sm font-semibold transition',
                    active ? 'bg-white text-[#11172B]' : 'text-white/68 hover:bg-white/8 hover:text-white',
                  ].join(' ')}
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="mt-6">
            <LogoutButton redirectTo="/login" />
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-[#11172B]/95 px-3 py-3 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <Link href={withEstablishment('/comerciante', selectedEstablishmentId)} className="flex items-center gap-2">
                <img src="/imagens/ibeleza.png" alt="IBeleza" className="h-7 w-auto object-contain" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/48">
                  comerciante
                </span>
              </Link>
              <Link href="/dono" className="inline-flex min-h-9 items-center rounded-full bg-white/8 px-3 text-xs font-semibold text-white/72 ring-1 ring-white/10">
                Negócios
              </Link>
            </div>
            <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {NAV.map((item) => {
                const Icon = item.icon
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={withEstablishment(item.href, selectedEstablishmentId)}
                    className={[
                      'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition',
                      active ? 'bg-white text-[#11172B]' : 'bg-white/8 text-white/70 ring-1 ring-white/10',
                    ].join(' ')}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </header>

          <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </div>
      </div>
    </main>
  )
}
