'use client'

import React, { useState } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import { confirmAppointment, finalizeAppointment } from '@/actions/admin'
import Badge from '@/components/ui/Badge'
import type { AppointmentStatus } from '@/database.types'

dayjs.locale('pt-br')

// Agendamentos unidos com perfis e servicos, no formato retornado pelo select do Supabase.
type AppointmentWithRelations = {
  id: string
  scheduled_at: string
  status: AppointmentStatus
  customer_name: string | null
  customer_phone: string | null
  total_price: number | null
  total_duration_minutes: number
  profiles: { name: string | null; email: string } | null
  services: { name: string } | null
  appointment_items: {
    service_name: string
    price: number | null
    duration_minutes: number
  }[]
}

function money(value: number | null) {
  return value == null ? 'Sob consulta' : `R$ ${Number(value).toFixed(2)}`
}

function whatsappUrl(phone: string, appt: AppointmentWithRelations) {
  const digits = phone.replace(/\D/g, '')
  const text = encodeURIComponent(
    `Olá, ${appt.customer_name ?? 'tudo bem'}! Seu horário em nosso estabelecimento está marcado para ${dayjs(appt.scheduled_at).format('DD/MM [às] HH:mm')}. Pode confirmar sua presença?`,
  )
  return `https://wa.me/${digits}?text=${text}`
}

function AppointmentCard({
  appt,
  actions,
}: {
  appt: AppointmentWithRelations
  actions?: React.ReactNode
}) {
  const [actionError, setActionError] = useState<string | null>(null)

  const actionsWithError = actions
    ? React.Children.map(actions, (child) => {
        if (React.isValidElement<{ onError?: (msg: string) => void }>(child)) {
          return React.cloneElement(child, { onError: (msg: string) => setActionError(msg) })
        }
        return child
      })
    : null

  return (
    <div className="space-y-1 rounded-[8px] border border-white/10 bg-[#11172B] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold text-white">
          {appt.customer_name ?? appt.profiles?.name ?? appt.profiles?.email ?? 'Cliente'}
        </p>
        <Badge status={appt.status} />
      </div>
      <p className="text-xs text-white/60">
        {appt.appointment_items.length > 0
          ? appt.appointment_items.map((item) => item.service_name).join(' + ')
          : appt.services?.name}
      </p>
      <p className="text-xs text-white/45">
        {dayjs(appt.scheduled_at).format('ddd, D MMM [às] HH:mm')} · {appt.total_duration_minutes} min
      </p>
      <p className="text-xs text-white/45">
        {money(appt.total_price)}
        {appt.customer_phone ? ` · ${appt.customer_phone}` : ''}
      </p>
      {actionError && (
        <p className="pt-1 text-xs text-[#ff8ea8]">{actionError}</p>
      )}
      <div className="pt-2 flex flex-wrap gap-2">
        {appt.customer_phone && (
          <a
            href={whatsappUrl(appt.customer_phone, appt)}
            target="_blank"
            rel="noreferrer"
            className="rounded-[8px] bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-100 transition hover:bg-emerald-400/15"
          >
            WhatsApp
          </a>
        )}
        {actionsWithError}
      </div>
    </div>
  )
}

type ActionVariant = 'primary' | 'danger' | 'success'

function ActionButton({
  label,
  onClick,
  onError = () => {},
  variant = 'primary',
}: {
  label: string
  onClick: () => Promise<{ error?: string } | undefined>
  onError?: (msg: string) => void
  variant?: ActionVariant
}) {
  const [loading, setLoading] = useState(false)

  const colors: Record<ActionVariant, string> = {
    primary: 'bg-white/8 text-white hover:bg-white/12',
    danger: 'bg-[#ff8ea8]/12 text-[#ff8ea8] hover:bg-[#ff8ea8]/18',
    success: 'bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15',
  }

  return (
    <button
      disabled={loading}
      onClick={async () => {
        setLoading(true)
        const result = await onClick()
        if (result?.error) onError(result.error)
        setLoading(false)
      }}
      className={`rounded-[8px] px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${colors[variant]}`}
    >
      {loading ? '...' : label}
    </button>
  )
}

interface AppointmentBoardProps {
  pendingApproval: AppointmentWithRelations[]
  confirmed: AppointmentWithRelations[]
  completedServices: AppointmentWithRelations[]
}

export default function AppointmentBoard({
  pendingApproval,
  confirmed,
  completedServices,
}: AppointmentBoardProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {/* Coluna 1: Aguardando Aprovação */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-amber-200">
          Aguardando Aprovação ({pendingApproval.length})
        </h3>
        <div className="space-y-3">
          {pendingApproval.map((a) => (
            <AppointmentCard
              key={a.id}
              appt={a}
              actions={
                <>
                  <ActionButton
                    label="Confirmar"
                    variant="success"
                    onClick={() => confirmAppointment(a.id)}
                  />
                  <ActionButton
                    label="Recusar"
                    variant="danger"
                    onClick={() => finalizeAppointment(a.id, 'cancelled')}
                  />
                </>
              }
            />
          ))}
          {pendingApproval.length === 0 && (
            <p className="text-sm text-white/45">Nenhuma solicitação pendente.</p>
          )}
        </div>
      </div>

      {/* Coluna 2: Confirmados */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-sky-200">
          Confirmados ({confirmed.length})
        </h3>
        <div className="space-y-3">
          {confirmed.map((a) => (
            <AppointmentCard
              key={a.id}
              appt={a}
              actions={
                <>
                  <ActionButton
                    label="Concluir"
                    variant="success"
                    onClick={() => finalizeAppointment(a.id, 'completed')}
                  />
                  <ActionButton
                    label="Não Compareceu"
                    variant="danger"
                    onClick={() => finalizeAppointment(a.id, 'no_show')}
                  />
                  <ActionButton
                    label="Cancelar"
                    variant="danger"
                    onClick={() => finalizeAppointment(a.id, 'cancelled')}
                  />
                </>
              }
            />
          ))}
          {confirmed.length === 0 && (
            <p className="text-sm text-white/45">Nenhum agendamento confirmado.</p>
          )}
        </div>
      </div>

      {/* Coluna 3: Serviços Concluídos */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-white/68">
          Serviços Concluídos ({completedServices.length})
        </h3>
        <div className="space-y-3">
          {completedServices.map((a) => (
            <AppointmentCard key={a.id} appt={a} />
          ))}
          {completedServices.length === 0 && (
            <p className="text-sm text-white/45">Nenhum serviço concluído ainda.</p>
          )}
        </div>
      </div>
    </div>
  )
}
