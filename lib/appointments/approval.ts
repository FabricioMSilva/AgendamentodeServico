import { createAdminClient } from '@/lib/supabase/admin'
import {
  buildCustomerApprovedMessage,
  buildCustomerRejectedMessage,
  buildOwnerApprovalRequestMessage,
  normalizeWhatsappPhone,
} from '@/lib/whatsapp/messages'

type AppointmentDecision = 'approved' | 'rejected'

type AppointmentForDecision = {
  id: string
  establishment_id: string
  scheduled_at: string
  status: string
  customer_id: string | null
  customer_name: string | null
  customer_phone: string | null
  total_price: number | null
  establishments: {
    name: string
    whatsapp_phone: string | null
    phone: string | null
    contact: string | null
  } | null
  appointment_items: {
    service_name: string
  }[]
}

function appointmentCode(appointmentId: string) {
  return appointmentId.replace(/-/g, '').slice(0, 8).toLowerCase()
}

function serviceNames(appointment: AppointmentForDecision) {
  return appointment.appointment_items.map((item) => item.service_name).filter(Boolean)
}

async function queueCustomerDecisionMessage(
  appointment: AppointmentForDecision,
  decision: AppointmentDecision,
) {
  const phone = normalizeWhatsappPhone(appointment.customer_phone)
  if (!phone) return

  const establishmentName = appointment.establishments?.name ?? 'IBeleza'
  const services = serviceNames(appointment)
  const message =
    decision === 'approved'
      ? buildCustomerApprovedMessage({
          establishmentName,
          customerName: appointment.customer_name,
          scheduledAt: appointment.scheduled_at,
          services,
        })
      : buildCustomerRejectedMessage({
          establishmentName,
          customerName: appointment.customer_name,
          scheduledAt: appointment.scheduled_at,
          services,
        })

  const supabase = createAdminClient()
  await supabase.from('whatsapp_messages').insert({
    establishment_id: appointment.establishment_id,
    appointment_id: appointment.id,
    recipient_phone: phone,
    recipient_role: 'customer',
    template_key: decision === 'approved' ? 'appointment_approved' : 'appointment_rejected',
    message_body: message,
    provider: process.env.WHATSAPP_PROVIDER?.trim() || 'twilio',
    status: 'queued',
    scheduled_for: new Date().toISOString(),
  })
}

export async function queueOwnerApprovalRequest(appointmentId: string) {
  const supabase = createAdminClient()
  const { data: appointment } = await supabase
    .from('appointments')
    .select(
      'id, establishment_id, scheduled_at, status, customer_id, customer_name, customer_phone, total_price, establishments(name, whatsapp_phone, phone, contact), appointment_items(service_name)',
    )
    .eq('id', appointmentId)
    .maybeSingle()

  const current = appointment as unknown as AppointmentForDecision | null
  if (!current || current.status !== 'pending') return { queued: false }

  const rawPhone =
    current.establishments?.whatsapp_phone ||
    current.establishments?.phone ||
    current.establishments?.contact
  const ownerPhone = normalizeWhatsappPhone(rawPhone)
  if (!ownerPhone) return { queued: false }

  const code = appointmentCode(current.id)
  const message = buildOwnerApprovalRequestMessage({
    establishmentName: current.establishments?.name ?? 'IBeleza',
    customerName: current.customer_name,
    customerPhone: current.customer_phone,
    scheduledAt: current.scheduled_at,
    services: serviceNames(current),
    code,
  })

  const { data: existing } = await supabase
    .from('whatsapp_messages')
    .select('id')
    .eq('appointment_id', current.id)
    .eq('recipient_role', 'owner')
    .eq('template_key', 'appointment_approval_request')
    .in('status', ['queued', 'sent', 'delivered'])
    .limit(1)
    .maybeSingle()

  if (existing) return { queued: false }

  await supabase.from('whatsapp_messages').insert({
    establishment_id: current.establishment_id,
    appointment_id: current.id,
    recipient_phone: ownerPhone,
    recipient_role: 'owner',
    template_key: 'appointment_approval_request',
    message_body: message,
    provider: process.env.WHATSAPP_PROVIDER?.trim() || 'twilio',
    status: 'queued',
    scheduled_for: new Date().toISOString(),
  })

  await supabase.from('notifications').insert({
    recipient_profile_id: null,
    establishment_id: current.establishment_id,
    appointment_id: current.id,
    channel: 'whatsapp',
    title: 'Novo pedido de agendamento',
    body: 'Pedido enviado ao WhatsApp do estabelecimento para aprovação.',
  })

  return { queued: true }
}

export async function decideAppointmentApproval({
  appointmentId,
  decision,
  actorProfileId = null,
  notes,
}: {
  appointmentId: string
  decision: AppointmentDecision
  actorProfileId?: string | null
  notes?: string
}) {
  const supabase = createAdminClient()
  const { data: appointment, error: fetchError } = await supabase
    .from('appointments')
    .select(
      'id, establishment_id, scheduled_at, status, customer_id, customer_name, customer_phone, total_price, establishments(name, whatsapp_phone, phone, contact), appointment_items(service_name)',
    )
    .eq('id', appointmentId)
    .maybeSingle()

  if (fetchError) return { error: fetchError.message }

  const current = appointment as unknown as AppointmentForDecision | null
  if (!current) return { error: 'Agendamento não encontrado.' }
  if (current.status !== 'pending') return { error: 'Este agendamento não está aguardando aprovação.' }

  const now = new Date().toISOString()
  const nextStatus = decision === 'approved' ? 'confirmed' : 'cancelled'
  const { error: updateError } = await supabase
    .from('appointments')
    .update({
      status: nextStatus,
      owner_decision_at: now,
      owner_decision_by: actorProfileId,
      customer_confirmation_status: decision === 'approved' ? 'not_requested' : 'declined',
      cancelled_reason: decision === 'rejected' ? 'Recusado pelo estabelecimento' : null,
    })
    .eq('id', current.id)
    .eq('status', 'pending')

  if (updateError) return { error: updateError.message }

  await Promise.all([
    supabase.from('appointment_events').insert({
      appointment_id: current.id,
      establishment_id: current.establishment_id,
      actor_profile_id: actorProfileId,
      event_type: decision === 'approved' ? 'owner_confirmed' : 'owner_rejected',
      status_from: current.status,
      status_to: nextStatus,
      amount: decision === 'approved' ? current.total_price : null,
      notes,
    }),
    supabase.from('notifications').insert({
      recipient_profile_id: current.customer_id,
      establishment_id: current.establishment_id,
      appointment_id: current.id,
      channel: 'panel',
      title: decision === 'approved' ? 'Agendamento aprovado' : 'Agendamento recusado',
      body:
        decision === 'approved'
          ? 'O estabelecimento confirmou seu horário.'
          : 'O estabelecimento recusou este horário.',
    }),
    queueCustomerDecisionMessage(current, decision),
  ])

  return { success: true }
}

export function getAppointmentApprovalCode(appointmentId: string) {
  return appointmentCode(appointmentId)
}
