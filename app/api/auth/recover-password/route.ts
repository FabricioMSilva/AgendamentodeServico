import { randomInt } from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSmsText } from '@/lib/sms/provider'
import { normalizeWhatsappPhone } from '@/lib/whatsapp/messages'
import { sendWhatsappText } from '@/lib/whatsapp/provider'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const RECOVERY_RESPONSE =
  'Se o telefone estiver cadastrado, você receberá uma senha temporária pelo canal escolhido.'

type RecoveryChannel = 'whatsapp' | 'sms'

function normalizePhone(input: string) {
  return input.replace(/\D/g, '')
}

function hasSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  return Boolean(
    url &&
      serviceRoleKey &&
      !url.includes('your-project.supabase.co') &&
      serviceRoleKey !== 'your-service-role-key',
  )
}

function createTemporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  let password = ''

  for (let index = 0; index < 10; index += 1) {
    password += alphabet[randomInt(0, alphabet.length)]
  }

  return password
}

function getRecoveryChannel(value: unknown): RecoveryChannel {
  return value === 'sms' ? 'sms' : 'whatsapp'
}

function buildRecoveryMessage(password: string) {
  return [
    `Sua senha temporária do IBeleza é: ${password}`,
    'Use essa senha para entrar no app.',
    'Se você não pediu isso, ignore esta mensagem.',
  ].join('\n')
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { phone?: string; channel?: string }
    const phone = normalizePhone(body.phone ?? '')
    const channel = getRecoveryChannel(body.channel)

    if (phone.length < 10) {
      return NextResponse.json({ error: 'Informe um telefone válido.' }, { status: 400 })
    }

    if (!hasSupabaseConfig()) {
      return NextResponse.json({ message: RECOVERY_RESPONSE })
    }

    const supabase = createAdminClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, phone')
      .eq('phone', phone)
      .maybeSingle()

    if (!profile?.phone) {
      return NextResponse.json({ message: RECOVERY_RESPONSE })
    }

    const temporaryPassword = createTemporaryPassword()
    const message = buildRecoveryMessage(temporaryPassword)
    const sendResult =
      channel === 'whatsapp'
        ? await sendWhatsappText({
            to: normalizeWhatsappPhone(profile.phone),
            message,
          })
        : await sendSmsText({
            to: profile.phone,
            message,
          })

    if (!sendResult.ok) {
      return NextResponse.json({ message: RECOVERY_RESPONSE })
    }

    await supabase.auth.admin.updateUserById(profile.id, {
      password: temporaryPassword,
    })

    return NextResponse.json({ message: RECOVERY_RESPONSE })
  } catch {
    return NextResponse.json({ message: RECOVERY_RESPONSE })
  }
}
