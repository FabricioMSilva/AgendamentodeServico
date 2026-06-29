'use client'

import React, { useState } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import { confirmAppointment, finalizeAppointment } from '@/actions/admin'
import Badge from '@/components/ui/Badge'
import type { AppointmentStatus } from '@/database.types'

dayjs.locale('pt-br')

// Appointments joined with profiles and services — shapes returned by Supabase select
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
    <div className="border border-gray-200 rounded-xl p-4 space-y-1 bg-white">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold truncate">
          {appt.customer_name ?? appt.profiles?.name ?? appt.profiles?.email ?? 'Cliente'}
        </p>
        <Badge status={appt.status} />
      </div>
      <p className="text-xs text-gray-500">
        {appt.appointment_items.length > 0
          ? appt.appointment_items.map((item) => item.service_name).join(' + ')
          : appt.services?.name}
      </p>
      <p className="text-xs text-gray-400">
        {dayjs(appt.scheduled_at).format('ddd, D MMM [às] HH:mm')} · {appt.total_duration_minutes} min
      </p>
      <p className="text-xs text-gray-400">
        {money(appt.total_price)}
        {appt.customer_phone ? ` · ${appt.customer_phone}` : ''}
      </p>
      {actionError && (
        <p className="text-xs text-red-600 pt-1">{actionError}</p>
      )}
      <div className="pt-2 flex flex-wrap gap-2">
        {appt.customer_phone && (
          <a
            href={whatsappUrl(appt.customer_phone, appt)}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
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
    primary: 'bg-black text-white hover:bg-gray-800',
    danger: 'bg-red-100 text-red-700 hover:bg-red-200',
    success: 'bg-green-100 text-green-700 hover:bg-green-200',
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
      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${colors[variant]}`}
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Coluna 1: Aguardando Aprovação */}
      <div>
        <h3 className="text-sm font-semibold text-amber-700 mb-3">
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
                    label="Cancelar"
                    variant="danger"
                    onClick={() => finalizeAppointment(a.id, 'cancelled')}
                  />
                </>
              }
            />
          ))}
          {pendingApproval.length === 0 && (
            <p className="text-sm text-gray-400">Nenhuma solicitação pendente.</p>
          )}
        </div>
      </div>

      {/* Coluna 2: Confirmados */}
      <div>
        <h3 className="text-sm font-semibold text-blue-700 mb-3">
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
            <p className="text-sm text-gray-400">Nenhum agendamento confirmado.</p>
          )}
        </div>
      </div>

      {/* Coluna 3: Serviços Concluídos */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 mb-3">
          Serviços Concluídos ({completedServices.length})
        </h3>
        <div className="space-y-3">
          {completedServices.map((a) => (
            <AppointmentCard key={a.id} appt={a} />
          ))}
          {completedServices.length === 0 && (
            <p className="text-sm text-gray-400">Nenhum serviço concluído ainda.</p>
          )}
        </div>
      </div>
    </div>
  )
}
