'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import { confirmAppointment, finalizeAppointment, refuseAppointment } from '@/actions/admin'
import Badge from '@/components/ui/Badge'
import type { AppointmentStatus } from '@/database.types'

dayjs.locale('pt-br')

// Agendamentos unidos com perfis e servicos, no formato retornado pelo select do Supabase.
type AppointmentWithRelations = {
  id: string
  appointment_code?: string | null
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

type ActionChildProps = {
  children?: React.ReactNode
  onError?: (msg: string) => void
}

type ActionNotification = {
  phone: string | null
  message: string
}

type ActionFeedback = {
  title: string
  detail: string
}

type MobileTab = 'pending' | 'confirmed' | 'history'

function attachActionError(
  children: React.ReactNode,
  onError: (msg: string) => void,
): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (!React.isValidElement<ActionChildProps>(child)) return child

    if (child.type === React.Fragment) {
      return attachActionError(child.props.children, onError)
    }

    return React.cloneElement(child, { onError })
  })
}

function money(value: number | null) {
  return value == null ? 'Sob consulta' : `R$ ${Number(value).toFixed(2)}`
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function dateGroupLabel(date: string) {
  const scheduled = dayjs(date)
  const today = dayjs()
  const tomorrow = today.add(1, 'day')

  if (scheduled.isSame(today, 'day')) return 'Hoje'
  if (scheduled.isSame(tomorrow, 'day')) return 'Amanhã'

  return capitalize(scheduled.format('dddd, DD/MM'))
}

function groupByDate(appointments: AppointmentWithRelations[]) {
  return appointments.reduce<{ label: string; appointments: AppointmentWithRelations[] }[]>((groups, appt) => {
    const label = dateGroupLabel(appt.scheduled_at)
    const existing = groups.find((group) => group.label === label)

    if (existing) {
      existing.appointments.push(appt)
      return groups
    }

    return [...groups, { label, appointments: [appt] }]
  }, [])
}

function whatsappUrl(phone: string, appt: AppointmentWithRelations) {
  const digits = phone.replace(/\D/g, '')
  const text = encodeURIComponent(
    `Olá, ${appt.customer_name ?? 'tudo bem'}! Seu horário em nosso estabelecimento está marcado para ${dayjs(appt.scheduled_at).format('DD/MM [às] HH:mm')}. Pode confirmar sua presença?`,
  )
  return `https://wa.me/${digits}?text=${text}`
}

function serviceLabel(appt: AppointmentWithRelations) {
  if (appt.appointment_items.length > 0) {
    return appt.appointment_items.map((item) => item.service_name).join(' + ')
  }

  return appt.services?.name ?? 'serviço'
}

function customerLabel(appt: AppointmentWithRelations) {
  return appt.customer_name ?? appt.profiles?.name ?? 'tudo bem'
}

function confirmationMessage(appt: AppointmentWithRelations, establishmentName: string) {
  return [
    `Olá, ${customerLabel(appt)}!`,
    `Seu agendamento em ${establishmentName} foi confirmado para ${dayjs(appt.scheduled_at).format('DD/MM [às] HH:mm')}.`,
    `Serviço: ${serviceLabel(appt)}.`,
    'Te esperamos!',
  ].join(' ')
}

function refusalMessage(appt: AppointmentWithRelations, establishmentName: string) {
  return [
    `Olá, ${customerLabel(appt)}!`,
    `Seu pedido de agendamento em ${establishmentName} para ${dayjs(appt.scheduled_at).format('DD/MM [às] HH:mm')} não pôde ser aprovado.`,
    'Chame a gente por aqui para escolher outro horário.',
  ].join(' ')
}

function openWhatsappNotification(notification?: ActionNotification) {
  const digits = notification?.phone?.replace(/\D/g, '')
  if (!digits || !notification) return

  const href = `https://wa.me/${digits}?text=${encodeURIComponent(notification.message)}`
  window.open(href, '_blank', 'noopener,noreferrer')
}

function AppointmentCard({
  appt,
  actions,
  compact = false,
}: {
  appt: AppointmentWithRelations
  actions?: React.ReactNode
  compact?: boolean
}) {
  const [actionError, setActionError] = useState<string | null>(null)

  const actionsWithError = actions ? attachActionError(actions, setActionError) : null

  return (
    <div className={`space-y-1 rounded-[8px] border border-white/10 bg-[#11172B] ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className={`truncate font-semibold text-white ${compact ? 'text-[13px]' : 'text-sm'}`}>
          {appt.customer_name ?? appt.profiles?.name ?? appt.profiles?.email ?? 'Cliente'}
        </p>
        <Badge status={appt.status} />
      </div>
      {appt.appointment_code ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8FF0F4]">
          {appt.appointment_code}
        </p>
      ) : null}
      <p className="text-xs text-white/60">
        {appt.appointment_items.length > 0
          ? appt.appointment_items.map((item) => item.service_name).join(' + ')
          : appt.services?.name}
      </p>
      <p className="text-xs text-white/45">
        {compact ? dayjs(appt.scheduled_at).format('HH:mm') : dayjs(appt.scheduled_at).format('ddd, D MMM [às] HH:mm')} · {appt.total_duration_minutes} min
      </p>
      <p className="text-xs text-white/45">
        {money(appt.total_price)}
        {appt.customer_phone ? ` · ${appt.customer_phone}` : ''}
      </p>
      {actionError && (
        <p className="pt-1 text-xs text-[#ff8ea8]">{actionError}</p>
      )}
      <div className={`flex flex-wrap gap-2 ${compact ? 'pt-2 [&>*]:min-h-9 [&>*]:flex-1 [&>*]:justify-center' : 'pt-2'}`}>
        {appt.customer_phone && (
          <a
            href={whatsappUrl(appt.customer_phone, appt)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-[8px] bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-100 transition hover:bg-emerald-400/15"
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
  loadingLabel,
  onClick,
  onError = () => {},
  onSuccess,
  successFeedback,
  notify,
  variant = 'primary',
}: {
  label: string
  loadingLabel?: string
  onClick: () => Promise<{ error?: string } | undefined>
  onError?: (msg: string) => void
  onSuccess?: (feedback: ActionFeedback) => void
  successFeedback: ActionFeedback
  notify?: ActionNotification
  variant?: ActionVariant
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

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
        try {
          const result = await onClick()
          if (result?.error) {
            onError(result.error)
            return
          }

          openWhatsappNotification(notify)
          onSuccess?.(successFeedback)
          router.refresh()
        } catch (err: unknown) {
          onError(err instanceof Error ? err.message : 'Não foi possível executar esta ação.')
        } finally {
          setLoading(false)
        }
      }}
      className={`inline-flex items-center justify-center rounded-[8px] px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${colors[variant]}`}
    >
      {loading ? (loadingLabel ?? 'Processando...') : label}
    </button>
  )
}

function ActionToast({
  feedback,
  onClose,
}: {
  feedback: ActionFeedback | null
  onClose: () => void
}) {
  if (!feedback) return null

  return (
    <div className="fixed left-1/2 top-24 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 rounded-[8px] border border-emerald-300/25 bg-[#10231F] px-4 py-3 text-white shadow-2xl shadow-black/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-100">{feedback.title}</p>
          <p className="mt-1 text-xs leading-5 text-white/68">{feedback.detail}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-2 text-lg leading-none text-white/55 transition hover:bg-white/10 hover:text-white"
          aria-label="Fechar aviso"
        >
          x
        </button>
      </div>
    </div>
  )
}

function MobileAppointmentList({
  appointments,
  emptyMessage,
  renderActions,
}: {
  appointments: AppointmentWithRelations[]
  emptyMessage: string
  renderActions?: (appointment: AppointmentWithRelations) => React.ReactNode
}) {
  const groups = groupByDate(appointments)

  if (appointments.length === 0) {
    return (
      <p className="rounded-[8px] border border-white/10 bg-[#11172B] p-4 text-sm text-white/50">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.label} className="space-y-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
            {group.label}
          </h4>
          <div className="space-y-2">
            {group.appointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appt={appointment}
                compact
                actions={renderActions?.(appointment)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

interface AppointmentBoardProps {
  pendingApproval: AppointmentWithRelations[]
  confirmed: AppointmentWithRelations[]
  completedServices: AppointmentWithRelations[]
  establishmentId: string
  establishmentName: string
}

export default function AppointmentBoard({
  pendingApproval,
  confirmed,
  completedServices,
  establishmentId,
  establishmentName,
}: AppointmentBoardProps) {
  const [activeTab, setActiveTab] = useState<MobileTab>('pending')
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null)

  const showFeedback = (nextFeedback: ActionFeedback) => {
    setFeedback(nextFeedback)
    window.setTimeout(() => setFeedback(null), 3200)
  }

  const tabs: { id: MobileTab; label: string; count: number }[] = [
    { id: 'pending', label: 'Pendentes', count: pendingApproval.length },
    { id: 'confirmed', label: 'Confirmados', count: confirmed.length },
    { id: 'history', label: 'Histórico', count: completedServices.length },
  ]

  const renderPendingActions = (a: AppointmentWithRelations) => (
    <>
      <ActionButton
        label="Confirmar"
        loadingLabel="Confirmando..."
        variant="success"
        onClick={() => confirmAppointment(a.id, establishmentId)}
        onSuccess={showFeedback}
        successFeedback={{
          title: 'Agendamento confirmado',
          detail: `${customerLabel(a)} saiu de pendentes e foi para confirmados.`,
        }}
        notify={{
          phone: a.customer_phone,
          message: confirmationMessage(a, establishmentName),
        }}
      />
      <ActionButton
        label="Recusar"
        loadingLabel="Recusando..."
        variant="danger"
        onClick={() => refuseAppointment(a.id, establishmentId)}
        onSuccess={showFeedback}
        successFeedback={{
          title: 'Agendamento recusado',
          detail: `${customerLabel(a)} foi movido para o histórico.`,
        }}
        notify={{
          phone: a.customer_phone,
          message: refusalMessage(a, establishmentName),
        }}
      />
    </>
  )

  const renderConfirmedActions = (a: AppointmentWithRelations) => (
    <>
      <ActionButton
        label="Concluir"
        loadingLabel="Concluindo..."
        variant="success"
        onClick={() => finalizeAppointment(a.id, 'completed', establishmentId)}
        onSuccess={showFeedback}
        successFeedback={{
          title: 'Serviço concluído',
          detail: `${customerLabel(a)} foi movido para o histórico.`,
        }}
      />
      <ActionButton
        label="Não Compareceu"
        loadingLabel="Marcando..."
        variant="danger"
        onClick={() => finalizeAppointment(a.id, 'no_show', establishmentId)}
        onSuccess={showFeedback}
        successFeedback={{
          title: 'Não comparecimento registrado',
          detail: `${customerLabel(a)} foi movido para o histórico.`,
        }}
      />
      <ActionButton
        label="Cancelar"
        loadingLabel="Cancelando..."
        variant="danger"
        onClick={() => finalizeAppointment(a.id, 'cancelled', establishmentId)}
        onSuccess={showFeedback}
        successFeedback={{
          title: 'Agendamento cancelado',
          detail: `${customerLabel(a)} foi movido para o histórico.`,
        }}
      />
    </>
  )

  const mobileAppointments =
    activeTab === 'pending'
      ? pendingApproval
      : activeTab === 'confirmed'
        ? confirmed
        : completedServices

  const mobileEmptyMessage =
    activeTab === 'pending'
      ? 'Nenhuma solicitação pendente.'
      : activeTab === 'confirmed'
        ? 'Nenhum agendamento confirmado.'
        : 'Nenhum serviço concluído ainda.'

  const mobileActions =
    activeTab === 'pending'
      ? renderPendingActions
      : activeTab === 'confirmed'
        ? renderConfirmedActions
        : undefined

  return (
    <>
      <ActionToast feedback={feedback} onClose={() => setFeedback(null)} />

      <div className="md:hidden">
        <div className="sticky top-20 z-20 -mx-1 mb-4 rounded-[8px] border border-white/10 bg-[#171D30]/95 p-1 shadow-lg shadow-black/20 backdrop-blur">
          <div className="grid grid-cols-3 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-[7px] px-2 py-2 text-center text-[11px] font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-white text-[#11172B]'
                    : 'bg-transparent text-white/60 hover:bg-white/8 hover:text-white'
                }`}
              >
                <span className="block truncate">{tab.label}</span>
                <span className="mt-0.5 block text-[10px] opacity-70">{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        <MobileAppointmentList
          appointments={mobileAppointments}
          emptyMessage={mobileEmptyMessage}
          renderActions={mobileActions}
        />
      </div>

      <div className="hidden grid-cols-1 gap-6 md:grid md:grid-cols-3">
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
                actions={renderPendingActions(a)}
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
                actions={renderConfirmedActions(a)}
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
    </>
  )
}
