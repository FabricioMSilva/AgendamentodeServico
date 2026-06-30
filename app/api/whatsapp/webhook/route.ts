import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeWhatsappPhone, parseConfirmationIntent } from '@/lib/whatsapp/messages'
import { isAuthorizedWebhookRequest, unauthorizedJson } from '@/lib/whatsapp/security'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RecentReminder = {
  id: string
  appointment_id: string | null
  establishment_id: string | null
}

type AppointmentForReply = {
  id: string
  establishment_id: string
  status: string
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function pickNestedString(source: Record<string, unknown>, path: string[]) {
  let current: unknown = source
  for (const key of path) {
    current = asRecord(current)[key]
  }
  return readString(current)
}

function extractIncomingMessage(payload: unknown) {
  const body = asRecord(payload)
  const data = asRecord(body.data)
  const message = asRecord(data.message)
  const key = asRecord(data.key)

  const phone =
    readString(body.phone) ||
    readString(body.number) ||
    readString(body.remoteJid) ||
    readString(data.phone) ||
    readString(data.number) ||
    readString(data.remoteJid) ||
    readString(key.remoteJid) ||
    pickNestedString(body, ['sender', 'phone'])

  const text =
    readString(body.text) ||
    readString(body.message) ||
    readString(data.text) ||
    readString(data.message) ||
    readString(message.conversation) ||
    pickNestedString(message, ['extendedTextMessage', 'text'])

  return {
    phone: normalizeWhatsappPhone(phone.replace(/@.*/, '')),
    text,
  }
}

async function handleWebhook(payload: unknown) {
  const incoming = extractIncomingMessage(payload)
  const intent = parseConfirmationIntent(incoming.text)

  if (!incoming.phone || intent === 'unknown') {
    return { handled: false, reason: 'Mensagem sem telefone ou intenção reconhecida.' }
  }

  const supabase = createAdminClient()
  const { data: reminder } = await supabase
    .from('whatsapp_messages')
    .select('id, appointment_id, establishment_id')
    .eq('recipient_phone', incoming.phone)
    .eq('recipient_role', 'customer')
    .eq('template_key', 'appointment_reminder')
    .in('status', ['sent', 'delivered'])
    .not('appointment_id', 'is', null)
    .order('sent_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const recentReminder = reminder as RecentReminder | null
  if (!recentReminder?.appointment_id) {
    return { handled: false, reason: 'Nenhum lembrete recente encontrado para este telefone.' }
  }

  const { data: appointment } = await supabase
    .from('appointments')
    .select('id, establishment_id, status')
    .eq('id', recentReminder.appointment_id)
    .maybeSingle()

  const currentAppointment = appointment as AppointmentForReply | null
  if (!currentAppointment || !['pending', 'confirmed'].includes(currentAppointment.status)) {
    return { handled: false, reason: 'Agendamento não está aberto para confirmação.' }
  }

  const now = new Date().toISOString()
  if (intent === 'confirmed') {
    await Promise.all([
      supabase
        .from('appointments')
        .update({
          customer_confirmation_status: 'confirmed',
          customer_confirmed_at: now,
          confirmed_by_customer_at: now,
        })
        .eq('id', currentAppointment.id),
      supabase.from('appointment_events').insert({
        appointment_id: currentAppointment.id,
        establishment_id: currentAppointment.establishment_id,
        event_type: 'customer_confirmed',
        status_from: currentAppointment.status,
        status_to: currentAppointment.status,
        notes: 'Cliente confirmou pelo WhatsApp.',
      }),
      supabase.from('notifications').insert({
        establishment_id: currentAppointment.establishment_id,
        appointment_id: currentAppointment.id,
        channel: 'panel',
        title: 'Cliente confirmou presença',
        body: 'Confirmação recebida pelo WhatsApp.',
      }),
    ])

    return { handled: true, status: 'confirmed' }
  }

  await Promise.all([
    supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        customer_confirmation_status: 'declined',
        customer_declined_at: now,
        cancelled_reason: 'Cliente cancelou pelo WhatsApp.',
      })
      .eq('id', currentAppointment.id),
    supabase.from('appointment_events').insert({
      appointment_id: currentAppointment.id,
      establishment_id: currentAppointment.establishment_id,
      event_type: 'customer_declined',
      status_from: currentAppointment.status,
      status_to: 'cancelled',
      notes: 'Cliente cancelou pelo WhatsApp.',
    }),
    supabase.from('notifications').insert({
      establishment_id: currentAppointment.establishment_id,
      appointment_id: currentAppointment.id,
      channel: 'panel',
      title: 'Cliente cancelou o horário',
      body: 'Resposta recebida pelo WhatsApp. O horário foi liberado.',
    }),
  ])

  return { handled: true, status: 'declined' }
}

export async function POST(request: Request) {
  if (!isAuthorizedWebhookRequest(request)) return unauthorizedJson()

  try {
    const payload = (await request.json()) as unknown
    const result = await handleWebhook(payload)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Webhook inválido.' }, { status: 400 })
  }
}
