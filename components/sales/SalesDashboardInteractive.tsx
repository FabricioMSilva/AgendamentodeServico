'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import DashboardStatCard from '@/components/ui/DashboardStatCard'

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
  const approvals = pendingMerchants.length + pendingEstablishments.length
  const linkedEstablishments = establishments.filter((establishment) => establishment.usuario_admin_id)
  const awaitingEstablishments = establishments.filter((establishment) => !establishment.usuario_admin_id)
  const blockedEstablishments = establishments.filter((establishment) => establishment.bloqueado)

  const menuItems: Array<{
    key: MenuKey
    title: string
    value: number
    detail: string
  }> = [
    { key: 'businesses', title: 'Negócios', value: stats.total, detail: 'cadastrados no sistema' },
    { key: 'profiles', title: 'Cadastros', value: stats.profileCount, detail: 'clientes, donos e perfis' },
    { key: 'linked', title: 'Vinculados', value: stats.linked, detail: 'com dono já liberado' },
    { key: 'appointments', title: 'Agenda', value: stats.appointmentCount, detail: 'agendamentos registrados' },
    { key: 'awaiting', title: 'Aguardando', value: stats.awaiting, detail: 'sem primeiro vínculo' },
    { key: 'blocked', title: 'Pausados', value: stats.blocked, detail: 'desativados no momento' },
    {
      key: 'approvals',
      title: 'Aprovações',
      value: approvals,
      detail: approvals > 0 ? 'clique para revisar' : 'comerciantes pendentes',
    },
  ]

  return (
    <section className="space-y-4">
      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {menuItems.map((item) => {
          const isActive = activeMenu === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveMenu(item.key)}
              className="group text-left focus:outline-none"
              aria-pressed={isActive}
            >
              <DashboardStatCard
                title={item.title}
                value={item.value}
                detail={item.detail}
                className={[
                  'h-full transition group-hover:border-[#8FF0F4]/35 group-hover:bg-white/8',
                  isActive ? 'border-[#8FF0F4]/55 bg-white/10 shadow-[0_10px_25px_rgba(143,240,244,0.08)]' : 'bg-white/5',
                ].join(' ')}
              />
            </button>
          )
        })}
      </section>

      <div className="rounded-[10px] border border-white/10 bg-white/5 p-3 shadow-none sm:p-4">
        {activeMenu === 'businesses' ? (
          <EstablishmentList
            title="Negócios cadastrados"
            emptyText="Nenhum estabelecimento cadastrado ainda."
            establishments={establishments}
          />
        ) : null}

        {activeMenu === 'profiles' ? (
          <ProfileList profiles={profiles} total={stats.profileCount} accountActions={accountActions} />
        ) : null}

        {activeMenu === 'linked' ? (
          <EstablishmentList
            title="Estabelecimentos vinculados"
            emptyText="Nenhum estabelecimento tem dono liberado ainda."
            establishments={linkedEstablishments}
          />
        ) : null}

        {activeMenu === 'appointments' ? (
          <AppointmentList appointments={appointments} total={stats.appointmentCount} />
        ) : null}

        {activeMenu === 'awaiting' ? (
          <EstablishmentList
            title="Aguardando primeiro vínculo"
            emptyText="Nenhum estabelecimento aguardando vínculo."
            establishments={awaitingEstablishments}
          />
        ) : null}

        {activeMenu === 'blocked' ? (
          <EstablishmentList
            title="Estabelecimentos pausados"
            emptyText="Nenhum estabelecimento pausado no momento."
            establishments={blockedEstablishments}
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
          <div key={establishment.id} className="flex flex-col gap-2 border-b border-white/5 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-white">{establishment.nome}</p>
              <p className="mt-1 text-sm text-white/55">
                /{establishment.slug} · {establishment.ownerEmail ?? establishment.email ?? 'sem e-mail vinculado'}
              </p>
              <p className="mt-1 text-xs text-white/42">
                {establishment.usuario_admin_id
                  ? `Dono: ${establishment.ownerName ?? establishment.ownerPhone ?? 'liberado'}`
                  : 'Ainda sem dono vinculado'}
              </p>
            </div>
            <span
              className={[
                'w-fit rounded-full px-3 py-1 text-xs font-semibold',
                establishment.bloqueado
                  ? 'bg-[#ff8ea8]/12 text-[#ff8ea8]'
                  : 'bg-emerald-400/10 text-emerald-100',
              ].join(' ')}
            >
              {establishment.bloqueado ? 'Pausado' : 'Ativo'}
            </span>
          </div>
        ))}
        {establishments.length === 0 ? <p className="p-4 text-sm text-white/55">{emptyText}</p> : null}
      </div>
    </div>
  )
}

function ProfileList({
  profiles,
  total,
  accountActions,
}: {
  profiles: DashboardProfile[]
  total: number
  accountActions: Record<string, ReactNode>
}) {
  return (
    <div>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-base font-semibold text-white">Cadastros recentes</h2>
        <p className="text-xs text-white/48">Mostrando {profiles.length} de {total}</p>
      </div>
      <div className="mt-4 divide-y divide-white/10 overflow-hidden rounded-[8px] border border-white/10 bg-[#11172B]/42">
        {profiles.map((profile) => (
          <div key={profile.id} className="grid gap-2 border-b border-white/5 p-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-white">{profile.nome ?? 'Sem nome'}</p>
                {profile.conta_bloqueada ? (
                  <span className="rounded-full bg-[#ff8ea8]/12 px-2.5 py-1 text-[11px] font-semibold text-[#ff8ea8]">
                    bloqueado
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-white/55">{profile.telefone ?? profile.email ?? 'sem contato'}</p>
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
            {accountActions[profile.id]}
          </div>
        ))}
        {profiles.length === 0 ? <p className="p-4 text-sm text-white/55">Nenhum cadastro encontrado.</p> : null}
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
          <div key={appointment.id} className="flex flex-col gap-2 border-b border-white/5 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-white">{appointment.nome_cliente ?? 'Cliente'}</p>
              <p className="mt-1 text-sm text-white/55">
                {appointment.estabelecimentoNome ?? 'Estabelecimento'} · {formatDateTime(appointment.horario)}
              </p>
            </div>
            <span className="w-fit rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-white/68">
              {appointment.status}
            </span>
          </div>
        ))}
        {appointments.length === 0 ? <p className="p-4 text-sm text-white/55">Nenhum agendamento registrado ainda.</p> : null}
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
          <div key={establishment.id} className="flex flex-col gap-2 border-b border-white/5 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-white">{establishment.nome}</p>
              <p className="mt-1 text-sm text-white/58">
                /{establishment.slug} · {establishment.tipo_negocio} · {establishment.ownerName ?? establishment.ownerPhone ?? establishment.ownerEmail ?? 'sem dono'}
              </p>
              <p className="mt-1 text-xs text-white/42">Solicitado em {formatDate(establishment.criado_em)}</p>
            </div>
            {establishmentApprovalActions[establishment.id]}
          </div>
        ))}
        {pendingMerchants.map((merchant) => (
          <div key={merchant.id} className="flex flex-col gap-2 border-b border-white/5 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-white">{merchant.nome ?? 'Comerciante'}</p>
              <p className="mt-1 text-sm text-white/58">
                CNPJ {merchant.cnpj ?? 'não informado'} · {merchant.telefone ?? merchant.email ?? 'sem contato'}
              </p>
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
