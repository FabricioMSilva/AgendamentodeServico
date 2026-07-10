import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildReminderMessage, normalizeWhatsappPhone } from '@/lib/whatsapp/messages'
import { isAuthorizedAutomationRequest, unauthorizedJson } from '@/lib/whatsapp/security'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type ReminderAppointment = {
  id: string
  establishment_id: string
  scheduled_at: string
  customer_name: string | null
  customer_phone: string | null
  customer_confirmation_status: string
  establishments: {
    name: string
    reminder_hours_before: number
    reminder_message: string | null
  } | null
  appointment_items: {
    service_name: string
  }[]
}

async function queueReminders() {
  const supabase = createAdminClient()
  const now = new Date()
  const maxReminderWindow = new Date(now)
  maxReminderWindow.setHours(maxReminderWindow.getHours() + 72)

  const { data, error } = await supabase
    .from('appointments')
    .select(
      'id, establishment_id, scheduled_at, customer_name, customer_phone, customer_confirmation_status, establishments(name, reminder_hours_before, reminder_message), appointment_items(service_name)',
    )
    .in('status', ['confirmed'])
    .is('reminder_sent_at', null)
    .gte('scheduled_at', now.toISOString())
    .lte('scheduled_at', maxReminderWindow.toISOString())
    .limit(100)

  if (error) {
    return { error: error.message, queued: 0, skipped: 0 }
  }

  const appointments = (data ?? []) as unknown as ReminderAppointment[]
  let queued = 0
  let skipped = 0

  for (const appointment of appointments) {
    const establishment = appointment.establishments
    const reminderHours = establishment?.reminder_hours_before ?? 24
    const reminderAt = new Date(appointment.scheduled_at)
    reminderAt.setHours(reminderAt.getHours() - reminderHours)

    if (reminderAt > now) {
      skipped += 1
      continue
    }

    const phone = normalizeWhatsappPhone(appointment.customer_phone)
    if (!phone) {
      skipped += 1
      continue
    }

    const { data: existing } = await supabase
      .from('whatsapp_messages')
      .select('id')
      .eq('appointment_id', appointment.id)
      .eq('template_key', 'appointment_reminder')
      .in('status', ['queued', 'sent', 'delivered'])
      .limit(1)
      .maybeSingle()

    if (existing) {
      skipped += 1
      continue
    }

    const message = buildReminderMessage({
      establishmentName: establishment?.name ?? 'IBeleza',
      customerName: appointment.customer_name,
      scheduledAt: appointment.scheduled_at,
      services: appointment.appointment_items.map((item) => item.service_name),
      customMessage: establishment?.reminder_message ?? null,
    })

    const { error: insertError } = await supabase.from('whatsapp_messages').insert({
      establishment_id: appointment.establishment_id,
      appointment_id: appointment.id,
      recipient_phone: phone,
      recipient_role: 'customer',
      template_key: 'appointment_reminder',
      message_body: message,
      provider: process.env.WHATSAPP_PROVIDER?.trim() || 'twilio',
      status: 'queued',
      scheduled_for: now.toISOString(),
    })

    if (insertError) {
      skipped += 1
      continue
    }

    await supabase
      .from('appointments')
      .update({
        customer_confirmation_status: 'awaiting',
        reminder_due_at: reminderAt.toISOString(),
      })
      .eq('id', appointment.id)

    queued += 1
  }

  return { queued, skipped }
}

export async function GET(request: Request) {
  if (!isAuthorizedAutomationRequest(request)) return unauthorizedJson()
  const result = await queueReminders()
  return NextResponse.json(result, { status: 'error' in result ? 500 : 200 })
}

export async function POST(request: Request) {
  if (!isAuthorizedAutomationRequest(request)) return unauthorizedJson()
  const result = await queueReminders()
  return NextResponse.json(result, { status: 'error' in result ? 500 : 200 })
}
