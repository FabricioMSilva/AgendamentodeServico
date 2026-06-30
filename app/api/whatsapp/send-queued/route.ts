import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsappText } from '@/lib/whatsapp/provider'
import { isAuthorizedAutomationRequest, unauthorizedJson } from '@/lib/whatsapp/security'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type QueuedMessage = {
  id: string
  establishment_id: string | null
  appointment_id: string | null
  recipient_phone: string
  message_body: string
}

async function sendQueuedMessages() {
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('id, establishment_id, appointment_id, recipient_phone, message_body')
    .eq('status', 'queued')
    .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
    .order('created_at', { ascending: true })
    .limit(20)

  if (error) {
    return { error: error.message, sent: 0, failed: 0 }
  }

  const messages = (data ?? []) as QueuedMessage[]
  let sent = 0
  let failed = 0

  for (const message of messages) {
    const result = await sendWhatsappText({
      to: message.recipient_phone,
      message: message.message_body,
    })

    if (!result.ok) {
      failed += 1
      await supabase
        .from('whatsapp_messages')
        .update({
          status: 'failed',
          provider: result.provider,
          error_message: result.error,
        })
        .eq('id', message.id)
      continue
    }

    sent += 1
    const sentAt = new Date().toISOString()
    await Promise.all([
      supabase
        .from('whatsapp_messages')
        .update({
          status: 'sent',
          provider: result.provider,
          provider_message_id: result.providerMessageId,
          sent_at: sentAt,
          error_message: null,
        })
        .eq('id', message.id),
      message.appointment_id
        ? supabase
            .from('appointments')
            .update({
              reminder_sent_at: sentAt,
              customer_notified_at: sentAt,
            })
            .eq('id', message.appointment_id)
        : Promise.resolve({ error: null }),
      message.appointment_id && message.establishment_id
        ? supabase.from('appointment_events').insert({
            appointment_id: message.appointment_id,
            establishment_id: message.establishment_id,
            event_type: 'reminder_sent',
            status_to: 'confirmed',
            notes: 'Lembrete enviado por WhatsApp.',
          })
        : Promise.resolve({ error: null }),
    ])
  }

  return { sent, failed }
}

export async function GET(request: Request) {
  if (!isAuthorizedAutomationRequest(request)) return unauthorizedJson()
  const result = await sendQueuedMessages()
  return NextResponse.json(result, { status: 'error' in result ? 500 : 200 })
}

export async function POST(request: Request) {
  if (!isAuthorizedAutomationRequest(request)) return unauthorizedJson()
  const result = await sendQueuedMessages()
  return NextResponse.json(result, { status: 'error' in result ? 500 : 200 })
}
