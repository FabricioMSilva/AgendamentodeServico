'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import DashboardStatCard from '@/components/ui/DashboardStatCard'
import CompactStatIcon from '@/components/ui/CompactStatIcon'
import { MdStorefront, MdPeople, MdLink, MdCalendarMonth, MdSchedule, MdPauseCircle, MdCheckCircle } from 'react-icons/md'

export type PendingMerchant = {
  id: string
  nome: string | null
  telefone: string | null
  email: string | null
  cnpj: string | null
  criado_em: string
}

export type PendingEstablishment = {
  id: string
  nome: string
  slug: string
  tipo_negocio: string
  telefone: string | null
  email: string | null
  criado_em: string
  ownerName: string | null
  ownerPhone: string | null
  ownerEmail: string | null
}

export type DashboardEstablishment = {
  id: string
  nome: string
  slug: string
  email: string | null
  telefone: string | null
  bloqueado: boolean
  usuario_admin_id: string | null
  ownerName: string | null
  ownerEmail: string | null
  ownerPhone: string | null
}

export type DashboardProfile = {
  id: string
  nome: string | null
  telefone: string | null
  email: string | null
  nivel_acesso: string
  tipo_cadastro: string
  comerciante_status: string
  comerciante_ativo: boolean
  conta_bloqueada: boolean
  criado_em: string
}

export type DashboardAppointment = {
  id: string
  nome_cliente: string | null
  telefone_cliente: string | null
  horario: string
  status: string
  preco_total: number
  estabelecimentoNome: string | null
  estabelecimentoSlug: string | null
}

type Stats = {
  total: number
  profileCount: number
  linked: number
  appointmentCount: number
  awaiting: number
  blocked: number
}

export default function SalesDashboardInteractive({
  stats,
  establishments,
  profiles,
  appointments,
  pendingMerchants,
  pendingEstablishments,
  approvalActions,
  establishmentApprovalActions,
  accountActions,
}: {
  stats: Stats
  establishments: DashboardEstablishment[]
  profiles: DashboardProfile[]
  appointments: DashboardAppointment[]
  pendingMerchants: PendingMerchant[]
  pendingEstablishments: PendingEstablishment[]
  approvalActions: Record<string, ReactNode>
  establishmentApprovalActions: Record<string, ReactNode>
  accountActions: Record<string, ReactNode>
}) {
  const [activeMenu, setActiveMenu] = useState<MenuKey>('approvals')
  const [searchBusiness, setSearchBusiness] = useState('')
  const [searchProfiles, setSearchProfiles] = useState('')
  const [searchAppointments, setSearchAppointments] = useState('')
  const [filterProfiles, setFilterProfiles] = useState<'all' | 'cliente' | 'comerciante'>('all')
  const approvals = pendingMerchants.length + pendingEstablishments.length
  const linkedEstablishments = establishments.filter((establishment) => establishment.usuario_admin_id)
  const awaitingEstablishments = establishments.filter((establishment) => !establishment.usuario_admin_id)
  const blockedEstablishments = establishments.filter((establishment) => establishment.bloqueado)

  return (
    <section className="space-y-6">
      {/* Compact stat icons - organized grid - responsive */}
      <div className="flex justify-center gap-2 sm:gap-3 sm:grid sm:grid-cols-4 lg:grid-cols-7 bg-gradient-to-br from-white/5 to-white/3 rounded-lg sm:rounded-xl p-2 sm:p-4 border border-white/10">
        <CompactStatIcon
          title="Negócios"
          value={stats.total}
          icon={<MdStorefront />}
          color="text-blue-400"
          isActive={activeMenu === 'businesses'}
          onClick={() => setActiveMenu('businesses')}
        />
        <CompactStatIcon
          title="Cadastros"
          value={stats.profileCount}
          icon={<MdPeople />}
          color="text-purple-400"
          isActive={activeMenu === 'profiles'}
          onClick={() => setActiveMenu('profiles')}
        />
        <CompactStatIcon
          title="Vinculados"
          value={stats.linked}
          icon={<MdLink />}
          color="text-pink-400"
          isActive={activeMenu === 'linked'}
          onClick={() => setActiveMenu('linked')}
        />
        <CompactStatIcon
          title="Agenda"
          value={stats.appointmentCount}
          icon={<MdCalendarMonth />}
          color="text-green-400"
          isActive={activeMenu === 'appointments'}
          onClick={() => setActiveMenu('appointments')}
        />
        <CompactStatIcon
          title="Aguardando"
          value={stats.awaiting}
          icon={<MdSchedule />}
          color="text-yellow-400"
          isActive={activeMenu === 'awaiting'}
          onClick={() => setActiveMenu('awaiting')}
        />
        <CompactStatIcon
          title="Pausados"
          value={stats.blocked}
          icon={<MdPauseCircle />}
          color="text-red-400"
          isActive={activeMenu === 'blocked'}
          onClick={() => setActiveMenu('blocked')}
        />
        <CompactStatIcon
          title="Aprovações"
          value={approvals}
          icon={<MdCheckCircle />}
          color="text-emerald-400"
          isActive={activeMenu === 'approvals'}
          onClick={() => setActiveMenu('approvals')}
        />
      </div>

      <div className="rounded-[10px] border border-white/10 bg-white/5 p-3 shadow-none sm:p-4">
        {activeMenu === 'businesses' ? (
          <EstablishmentListWithSearch
            title="Negócios cadastrados"
            emptyText="Nenhum estabelecimento cadastrado ainda."
            establishments={establishments}
            searchTerm={searchBusiness}
            onSearchChange={setSearchBusiness}
            searchPlaceholder="Pesquisar por nome ou slug..."
          />
        ) : null}

        {activeMenu === 'profiles' ? (
          <ProfileList profiles={profiles} total={stats.profileCount} accountActions={accountActions} searchTerm={searchProfiles} onSearchChange={setSearchProfiles} filterType={filterProfiles} onFilterChange={setFilterProfiles} />
        ) : null}

        {activeMenu === 'linked' ? (
          <EstablishmentListWithSearch
            title="Estabelecimentos vinculados"
            emptyText="Nenhum estabelecimento tem dono liberado ainda."
            establishments={linkedEstablishments}
            searchTerm={searchBusiness}
            onSearchChange={setSearchBusiness}
            searchPlaceholder="Pesquisar por nome ou proprietário..."
          />
        ) : null}

        {activeMenu === 'appointments' ? (
          <AppointmentListWithSearch appointments={appointments} total={stats.appointmentCount} searchTerm={searchAppointments} onSearchChange={setSearchAppointments} />
        ) : null}

        {activeMenu === 'awaiting' ? (
          <EstablishmentListWithSearch
            title="Aguardando primeiro vínculo"
            emptyText="Nenhum estabelecimento aguardando vínculo."
            establishments={awaitingEstablishments}
            searchTerm={searchBusiness}
            onSearchChange={setSearchBusiness}
            searchPlaceholder="Pesquisar por nome..."
          />
        ) : null}

        {activeMenu === 'blocked' ? (
          <EstablishmentListWithSearch
            title="Estabelecimentos pausados"
            emptyText="Nenhum estabelecimento pausado no momento."
            establishments={blockedEstablishments}
            searchTerm={searchBusiness}
            onSearchChange={setSearchBusiness}
            searchPlaceholder="Pesquisar por nome..."
          />
        ) : null}

        {activeMenu === 'approvals' ? (
          <ApprovalsList
            pendingMerchants={pendingMerchants}
            pendingEstablishments={pendingEstablishments}
            approvalActions={approvalActions}
            establishmentApprovalActions={establishmentApprovalActions}
          />
        ) : null}
      </div>
    </section>
  )
}

type MenuKey = 'businesses' | 'profiles' | 'linked' | 'appointments' | 'awaiting' | 'blocked' | 'approvals'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR')
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function EstablishmentList({
  title,
  emptyText,
  establishments,
}: {
  title: string
  emptyText: string
  establishments: DashboardEstablishment[]
}) {
  return (
    <div>
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <div className="mt-4 divide-y divide-white/10 overflow-hidden rounded-[8px] border border-white/10 bg-[#11172B]/42">
        {establishments.map((establishment) => (
          <div key={establishment.id} className="flex flex-col gap-3 border-b border-white/5 p-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">{establishment.nome}</p>
              <p className="mt-1 text-sm text-white/55 truncate">
                /{establishment.slug}
              </p>
              <p className="mt-1 text-xs text-white/55 truncate">{establishment.ownerEmail ?? establishment.email ?? 'sem e-mail vinculado'}</p>
              <p className="mt-1 text-xs text-white/42">
                {establishment.usuario_admin_id
                  ? `Dono: ${establishment.ownerName ?? establishment.ownerPhone ?? 'liberado'}`
                  : 'Ainda sem dono vinculado'}
              </p>
            </div>
            <div className="flex items-center gap-2 justify-between flex-wrap">
              <span
                className={[
                  'rounded-full px-3 py-1 text-xs font-semibold',
                  establishment.bloqueado
                    ? 'bg-[#ff8ea8]/12 text-[#ff8ea8]'
                    : 'bg-emerald-400/10 text-emerald-100',
                ].join(' ')}
              >
                {establishment.bloqueado ? 'Pausado' : 'Ativo'}
              </span>
            </div>
          </div>
        ))}
        {establishments.length === 0 ? <p className="p-4 text-sm text-white/55">{emptyText}</p> : null}
      </div>
    </div>
  )
}

function EstablishmentListWithSearch({
  title,
  emptyText,
  establishments,
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Pesquisar...',
}: {
  title: string
  emptyText: string
  establishments: DashboardEstablishment[]
  searchTerm: string
  onSearchChange: (term: string) => void
  searchPlaceholder?: string
}) {
  const filtered = establishments.filter((est) =>
    est.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    est.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (est.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  )

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <p className="text-xs text-white/48">Mostrando {filtered.length} de {establishments.length}</p>
      </div>

      <div className="mt-3">
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-white/40 transition focus:border-[#8FF0F4]/50 focus:bg-white/8 focus:outline-none"
        />
      </div>

      <div className="mt-4 divide-y divide-white/10 overflow-hidden rounded-[8px] border border-white/10 bg-[#11172B]/42">
        {filtered.map((establishment) => (
          <div key={establishment.id} className="flex flex-col gap-3 border-b border-white/5 p-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">{establishment.nome}</p>
              <p className="mt-1 text-sm text-white/55 truncate">
                /{establishment.slug}
              </p>
              <p className="mt-1 text-xs text-white/55 truncate">{establishment.ownerEmail ?? establishment.email ?? 'sem e-mail vinculado'}</p>
              <p className="mt-1 text-xs text-white/42">
                {establishment.usuario_admin_id
                  ? `Dono: ${establishment.ownerName ?? establishment.ownerPhone ?? 'liberado'}`
                  : 'Ainda sem dono vinculado'}
              </p>
            </div>
            <div className="flex items-center gap-2 justify-between flex-wrap">
              <span
                className={[
                  'rounded-full px-3 py-1 text-xs font-semibold',
                  establishment.bloqueado
                    ? 'bg-[#ff8ea8]/12 text-[#ff8ea8]'
                    : 'bg-emerald-400/10 text-emerald-100',
                ].join(' ')}
              >
                {establishment.bloqueado ? 'Pausado' : 'Ativo'}
              </span>
            </div>
          </div>
        ))}
        {filtered.length === 0 ? <p className="p-4 text-sm text-white/55">{emptyText}</p> : null}
      </div>
    </div>
  )
}

function ProfileList({
  profiles,
  total,
  accountActions,
  searchTerm,
  onSearchChange,
  filterType,
  onFilterChange,
}: {
  profiles: DashboardProfile[]
  total: number
  accountActions: Record<string, ReactNode>
  searchTerm: string
  onSearchChange: (term: string) => void
  filterType: 'all' | 'cliente' | 'comerciante'
  onFilterChange: (type: 'all' | 'cliente' | 'comerciante') => void
}) {
  const filteredProfiles = profiles.filter((profile) => {
    const matchesSearch =
      (profile.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (profile.telefone?.includes(searchTerm) ?? false)
    
    const matchesType =
      filterType === 'all' ||
      (filterType === 'cliente' && profile.tipo_cadastro === 'cliente') ||
      (filterType === 'comerciante' && profile.tipo_cadastro === 'comerciante')
    
    return matchesSearch && matchesType
  })

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-base font-semibold text-white">Cadastros recentes</h2>
        <p className="text-xs text-white/48">Mostrando {filteredProfiles.length} de {total}</p>
      </div>

      {/* Search and filters */}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Pesquisar por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-white/40 transition focus:border-[#8FF0F4]/50 focus:bg-white/8 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onFilterChange('all')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
              filterType === 'all'
                ? 'bg-white/15 border border-white/30 text-white'
                : 'border border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => onFilterChange('cliente')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
              filterType === 'cliente'
                ? 'bg-blue-500/20 border border-blue-400/50 text-blue-300'
                : 'border border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            Clientes
          </button>
          <button
            onClick={() => onFilterChange('comerciante')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
              filterType === 'comerciante'
                ? 'bg-purple-500/20 border border-purple-400/50 text-purple-300'
                : 'border border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            Comerciantes
          </button>
        </div>
      </div>

      <div className="mt-4 divide-y divide-white/10 overflow-hidden rounded-[8px] border border-white/10 bg-[#11172B]/42">
        {filteredProfiles.map((profile) => (
          <div key={profile.id} className="flex flex-col gap-3 border-b border-white/5 p-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-white truncate">{profile.nome ?? 'Sem nome'}</p>
                {profile.conta_bloqueada ? (
                  <span className="rounded-full bg-[#ff8ea8]/12 px-2.5 py-1 text-[11px] font-semibold text-[#ff8ea8] shrink-0">
                    bloqueado
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-white/55 truncate">{profile.telefone ?? profile.email ?? 'sem contato'}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-white/68">
                  {profile.nivel_acesso}
                </span>
                <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-white/68">
                  {profile.tipo_cadastro}
                </span>
                {profile.tipo_cadastro === 'comerciante' ? (
                  <span className="rounded-full bg-[#8FF0F4]/10 px-3 py-1 text-xs font-semibold text-[#8FF0F4]">
                    {profile.comerciante_status}
                  </span>
                ) : null}
                {profile.comerciante_ativo ? (
                  <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                    ativo
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ))}
        {filteredProfiles.length === 0 ? <p className="p-4 text-sm text-white/55">Nenhum cadastro encontrado.</p> : null}
      </div>
    </div>
  )
}

function AppointmentList({ appointments, total }: { appointments: DashboardAppointment[]; total: number }) {
  return (
    <div>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-base font-semibold text-white">Agenda recente</h2>
        <p className="text-xs text-white/48">Mostrando {appointments.length} de {total}</p>
      </div>
      <div className="mt-3 divide-y divide-white/10 overflow-hidden rounded-[10px] border border-white/10 bg-[#11172B]/35">
        {appointments.map((appointment) => (
          <div key={appointment.id} className="flex flex-col gap-3 border-b border-white/5 p-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">{appointment.nome_cliente ?? 'Cliente'}</p>
              <p className="mt-1 text-sm text-white/55 truncate">
                {appointment.estabelecimentoNome ?? 'Estabelecimento'}
              </p>
              <p className="mt-1 text-xs text-white/42">
                {formatDateTime(appointment.horario)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-white/68">
                {appointment.status}
              </span>
            </div>
          </div>
        ))}
        {appointments.length === 0 ? <p className="p-4 text-sm text-white/55">Nenhum agendamento registrado ainda.</p> : null}
      </div>
    </div>
  )
}

function AppointmentListWithSearch({
  appointments,
  total,
  searchTerm,
  onSearchChange,
}: {
  appointments: DashboardAppointment[]
  total: number
  searchTerm: string
  onSearchChange: (term: string) => void
}) {
  const filtered = appointments.filter((apt) =>
    (apt.nome_cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (apt.estabelecimentoNome?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  )

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-base font-semibold text-white">Agenda recente</h2>
        <p className="text-xs text-white/48">Mostrando {filtered.length} de {total}</p>
      </div>

      <div className="mt-3">
        <input
          type="text"
          placeholder="Pesquisar por cliente ou estabelecimento..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-white/40 transition focus:border-[#8FF0F4]/50 focus:bg-white/8 focus:outline-none"
        />
      </div>

      <div className="mt-4 divide-y divide-white/10 overflow-hidden rounded-[10px] border border-white/10 bg-[#11172B]/35">
        {filtered.map((appointment) => (
          <div key={appointment.id} className="flex flex-col gap-3 border-b border-white/5 p-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">{appointment.nome_cliente ?? 'Cliente'}</p>
              <p className="mt-1 text-sm text-white/55 truncate">
                {appointment.estabelecimentoNome ?? 'Estabelecimento'}
              </p>
              <p className="mt-1 text-xs text-white/42">
                {formatDateTime(appointment.horario)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-white/68">
                {appointment.status}
              </span>
            </div>
          </div>
        ))}
        {filtered.length === 0 ? <p className="p-4 text-sm text-white/55">Nenhum agendamento encontrado.</p> : null}
      </div>
    </div>
  )
}

function ApprovalsList({
  pendingMerchants,
  pendingEstablishments,
  approvalActions,
  establishmentApprovalActions,
}: {
  pendingMerchants: PendingMerchant[]
  pendingEstablishments: PendingEstablishment[]
  approvalActions: Record<string, ReactNode>
  establishmentApprovalActions: Record<string, ReactNode>
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white">Aprovações pendentes</h2>
      <div className="mt-3 divide-y divide-white/10 overflow-hidden rounded-[10px] border border-white/10 bg-[#11172B]/35">
        {pendingEstablishments.map((establishment) => (
          <div key={establishment.id} className="flex flex-col gap-3 border-b border-white/5 p-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">{establishment.nome}</p>
              <p className="mt-1 text-sm text-white/58 truncate">
                /{establishment.slug} · {establishment.tipo_negocio}
              </p>
              <p className="mt-1 text-xs text-white/55">
                {establishment.ownerName ?? establishment.ownerPhone ?? establishment.ownerEmail ?? 'sem dono'}
              </p>
              <p className="mt-1 text-xs text-white/42">Solicitado em {formatDate(establishment.criado_em)}</p>
            </div>
            {establishmentApprovalActions[establishment.id]}
          </div>
        ))}
        {pendingMerchants.map((merchant) => (
          <div key={merchant.id} className="flex flex-col gap-3 border-b border-white/5 p-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">{merchant.nome ?? 'Comerciante'}</p>
              <p className="mt-1 text-sm text-white/58 truncate">
                CNPJ {merchant.cnpj ?? 'não informado'}
              </p>
              <p className="mt-1 text-xs text-white/55">{merchant.telefone ?? merchant.email ?? 'sem contato'}</p>
              <p className="mt-1 text-xs text-white/42">Solicitado em {formatDate(merchant.criado_em)}</p>
            </div>
            {approvalActions[merchant.id]}
          </div>
        ))}
        {pendingMerchants.length === 0 && pendingEstablishments.length === 0 ? (
          <p className="p-4 text-sm text-white/55">Nenhuma aprovação pendente.</p>
        ) : null}
      </div>
    </div>
  )
}
