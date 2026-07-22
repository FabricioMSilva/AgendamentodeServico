import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsappText } from '@/lib/whatsapp/provider'
import { normalizeWhatsappPhone } from '@/lib/whatsapp/messages'
import {
  createLoginCode,
  getLoginPhoneCandidates,
  hashLoginCode,
  normalizeLoginPhone,
  toLoginAuthPhone,
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
  const authPhone = toLoginAuthPhone(phone)

  const { data: profile } = await supabase
    .from('usuarios')
    .select('id, telefone')
    .in('telefone', [authPhone, ...candidates])
    .maybeSingle()

  if (profile?.id) {
    return { id: profile.id, phone: profile.telefone ?? phone }
  }

  return null
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
    const authPhone = toLoginAuthPhone(phone)
    const account = await findAccountByPhone(supabase, phone)

    if (!account?.phone) {
      return NextResponse.json({ error: 'Não encontramos uma conta para esse telefone.' }, { status: 404 })
    }

    const code = createLoginCode()
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString()
    const codeHash = hashLoginCode(authPhone, code)

    await supabase.from('codigos_login').delete().eq('telefone', authPhone)

    const { error: insertError } = await supabase.from('codigos_login').insert({
      telefone: authPhone,
      codigo_hash: codeHash,
      expira_em: expiresAt,
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
      to: normalizeWhatsappPhone(authPhone),
      message,
    })

    if (!sendResult.ok) {
      await supabase.from('codigos_login').delete().eq('telefone', authPhone)
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
