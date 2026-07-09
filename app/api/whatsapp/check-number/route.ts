import { NextResponse } from 'next/server'
import { checkWhatsappNumbers } from '@/lib/whatsapp/provider'
import { normalizeWhatsappPhone } from '@/lib/whatsapp/messages'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function normalizePhone(input: string) {
  return input.replace(/\D/g, '')
}

function hasWhatsappConfig() {
  return Boolean(
    process.env.EVOLUTION_API_URL?.trim() &&
      process.env.EVOLUTION_API_KEY?.trim() &&
      process.env.EVOLUTION_INSTANCE?.trim(),
  )
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
