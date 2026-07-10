import { NextResponse } from 'next/server'
import { checkWhatsappNumbers } from '@/lib/whatsapp/provider'
import { normalizeWhatsappPhone } from '@/lib/whatsapp/messages'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function normalizePhone(input: string) {
  return input.replace(/\D/g, '')
}

function hasWhatsappConfig() {
  const provider = process.env.WHATSAPP_PROVIDER?.trim().toLowerCase() || 'twilio'

  if (provider === 'twilio') {
    return Boolean(
      process.env.TWILIO_ACCOUNT_SID?.trim() &&
        process.env.TWILIO_AUTH_TOKEN?.trim() &&
        process.env.TWILIO_WHATSAPP_FROM?.trim(),
    )
  }

  if (provider === 'evolution') {
    return Boolean(
      process.env.EVOLUTION_API_URL?.trim() &&
        process.env.EVOLUTION_API_KEY?.trim() &&
        process.env.EVOLUTION_INSTANCE?.trim(),
    )
  }

  return false
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { phone?: string }
    const phone = normalizePhone(body.phone ?? '')

    if (phone.length < 10) {
      return NextResponse.json({ error: 'Informe um telefone válido.' }, { status: 400 })
    }

    if (!hasWhatsappConfig()) {
      return NextResponse.json({ exists: null, normalized: normalizeWhatsappPhone(phone) })
    }

    const result = await checkWhatsappNumbers({ numbers: [normalizeWhatsappPhone(phone)] })
    if (!result.ok) {
      return NextResponse.json({ exists: null, normalized: normalizeWhatsappPhone(phone) })
    }

    return NextResponse.json({
      exists: result.numbers[0]?.exists ?? null,
      normalized: normalizeWhatsappPhone(phone),
    })
  } catch {
    return NextResponse.json({ exists: null }, { status: 200 })
  }
}
