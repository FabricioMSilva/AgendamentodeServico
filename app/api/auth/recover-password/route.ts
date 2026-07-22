import { randomInt } from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLegacyLoginEmailCandidates, getLoginPhoneCandidates, normalizeLoginPhone, toLoginAuthPhone } from '@/lib/login'
import { sendSmsText } from '@/lib/sms/provider'
import { normalizeWhatsappPhone } from '@/lib/whatsapp/messages'
import { sendWhatsappText } from '@/lib/whatsapp/provider'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const RECOVERY_RESPONSE =
  'Se o telefone estiver cadastrado, você receberá uma senha temporária pelo canal escolhido.'

type RecoveryChannel = 'whatsapp' | 'sms'

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
    const phone = normalizeLoginPhone(body.phone ?? '')
    const channel = getRecoveryChannel(body.channel)

    if (phone.length < 10) {
      return NextResponse.json({ error: 'Informe um telefone válido.' }, { status: 400 })
    }

    if (!hasSupabaseConfig()) {
      return NextResponse.json({ message: RECOVERY_RESPONSE })
    }

    const supabase = createAdminClient()
    const phoneCandidates = getLoginPhoneCandidates(phone)
    const authPhone = toLoginAuthPhone(phone)
    const legacyEmailCandidates = getLegacyLoginEmailCandidates(phone)

    const { data: profile } = await supabase
      .from('usuarios')
      .select('id, telefone, email')
      .in('telefone', phoneCandidates)
      .maybeSingle()

    if (!profile?.telefone) {
      const { data: users } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const user = users.users.find((entry) => {
        const authUserPhone = typeof entry.phone === 'string' ? entry.phone.replace(/\D/g, '') : ''
        const userPhone = typeof entry.user_metadata?.phone === 'string' ? entry.user_metadata.phone : ''
        return (
          authUserPhone === authPhone ||
          legacyEmailCandidates.includes(entry.email?.toLowerCase() ?? '') ||
          phoneCandidates.includes(userPhone.replace(/\D/g, ''))
        )
      })

      if (!user?.id) {
        return NextResponse.json({ message: RECOVERY_RESPONSE })
      }

      const temporaryPassword = createTemporaryPassword()
      const message = buildRecoveryMessage(temporaryPassword)
      const sendResult =
        channel === 'whatsapp'
          ? await sendWhatsappText({
              to: normalizeWhatsappPhone(phone),
              message,
            })
          : await sendSmsText({
              to: phone,
              message,
            })

      if (!sendResult.ok) {
        return NextResponse.json({ message: RECOVERY_RESPONSE })
      }

      await supabase.auth.admin.updateUserById(user.id, {
        password: temporaryPassword,
      })

      return NextResponse.json({ message: RECOVERY_RESPONSE })
    }

    const temporaryPassword = createTemporaryPassword()
    const message = buildRecoveryMessage(temporaryPassword)
    const sendResult =
      channel === 'whatsapp'
        ? await sendWhatsappText({
            to: normalizeWhatsappPhone(profile.telefone),
            message,
          })
        : await sendSmsText({
            to: profile.telefone,
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
