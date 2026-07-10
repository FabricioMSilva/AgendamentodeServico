import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsappText } from '@/lib/whatsapp/provider'
import { normalizeWhatsappPhone } from '@/lib/whatsapp/messages'
import {
  createLoginCode,
  getLoginPhoneCandidates,
  hashLoginCode,
  normalizeLoginPhone,
  toLoginEmail,
} from '@/lib/login'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const RESPONSE_MESSAGE =
  'Se o telefone estiver cadastrado, você receberá um código pelo WhatsApp.'
const CODE_TTL_MINUTES = 10

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

async function findAccountByPhone(
  supabase: ReturnType<typeof createAdminClient>,
  phone: string,
) {
  const candidates = getLoginPhoneCandidates(phone)

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, phone')
    .in('phone', candidates)
    .maybeSingle()

  if (profile?.id) {
    return profile
  }

  const email = toLoginEmail(phone)
  const { data: users } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const user = users.users.find((entry) => {
    const userPhone = typeof entry.user_metadata?.phone === 'string' ? entry.user_metadata.phone : ''
    return (
      entry.email?.toLowerCase() === email.toLowerCase() ||
      candidates.includes(userPhone.replace(/\D/g, ''))
    )
  })

  return user ? { id: user.id, phone } : null
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { phone?: string }
    const phone = normalizeLoginPhone(body.phone ?? '')

    if (phone.length < 10) {
      return NextResponse.json({ error: 'Informe um telefone válido.' }, { status: 400 })
    }

    if (!hasSupabaseConfig()) {
      return NextResponse.json({ error: 'Configure o Supabase antes de usar o login por WhatsApp.' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const account = await findAccountByPhone(supabase, phone)

    if (!account?.phone) {
      return NextResponse.json({ error: 'Não encontramos uma conta para esse telefone.' }, { status: 404 })
    }

    const code = createLoginCode()
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString()
    const codeHash = hashLoginCode(phone, code)

    await supabase.from('login_codes').delete().eq('phone', phone)

    const { error: insertError } = await supabase.from('login_codes').insert({
      phone,
      code_hash: codeHash,
      expires_at: expiresAt,
    })

    if (insertError) {
      return NextResponse.json({ error: 'Não consegui preparar o código de login.' }, { status: 500 })
    }

    const message = [
      `Seu código de acesso ao IBeleza é ${code}.`,
      `Ele vale por ${CODE_TTL_MINUTES} minutos.`,
      'Se você não pediu esse acesso, ignore esta mensagem.',
    ].join('\n')

    const sendResult = await sendWhatsappText({
      to: normalizeWhatsappPhone(phone),
      message,
    })

    if (!sendResult.ok) {
      await supabase.from('login_codes').delete().eq('phone', phone)
      return NextResponse.json(
        { error: sendResult.error || 'Não consegui enviar o código por WhatsApp.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ message: RESPONSE_MESSAGE })
  } catch (error) {
    console.error('login/request-code failed', error)

    const detail =
      error instanceof Error && error.message.trim()
        ? error.message
        : 'Não foi possível enviar o código de login.'

    return NextResponse.json({ error: detail }, { status: 500 })
  }
}
