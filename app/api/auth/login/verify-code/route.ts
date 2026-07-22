import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getLoginPhoneCandidates,
  hashLoginCode,
  normalizeLoginPhone,
  toLoginAuthPhone,
} from '@/lib/login'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
  return randomBytes(12).toString('base64url')
}

async function findAccountByPhone(
  supabase: ReturnType<typeof createAdminClient>,
  phone: string,
) {
  const candidates = getLoginPhoneCandidates(phone)
  const authPhone = toLoginAuthPhone(phone)

  const { data: profile } = await supabase
    .from('usuarios')
    .select('id, telefone, email')
    .in('telefone', [authPhone, ...candidates])
    .maybeSingle()

  if (profile?.id) {
    return { id: profile.id, phone: profile.telefone ?? phone, email: profile.email }
  }

  return null
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { phone?: string; code?: string }
    const phone = normalizeLoginPhone(body.phone ?? '')
    const code = (body.code ?? '').replace(/\D/g, '')

    if (phone.length < 10) {
      return NextResponse.json({ error: 'Informe um telefone válido.' }, { status: 400 })
    }

    if (code.length !== 6) {
      return NextResponse.json({ error: 'Informe o código de 6 dígitos.' }, { status: 400 })
    }

    if (!hasSupabaseConfig()) {
      return NextResponse.json({ error: 'Configure o Supabase antes de usar o login por WhatsApp.' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const authPhone = toLoginAuthPhone(phone)
    const { data: record } = await supabase
      .from('codigos_login')
      .select('id, codigo_hash, expira_em, tentativas, consumido_em')
      .eq('telefone', authPhone)
      .is('consumido_em', null)
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!record) {
      return NextResponse.json({ error: 'Código inválido ou expirado.' }, { status: 400 })
    }

    if (new Date(record.expira_em).getTime() < Date.now()) {
      await supabase.from('codigos_login').delete().eq('id', record.id)
      return NextResponse.json({ error: 'Código inválido ou expirado.' }, { status: 400 })
    }

    if (record.tentativas >= 5) {
      await supabase.from('codigos_login').delete().eq('id', record.id)
      return NextResponse.json({ error: 'Código inválido ou expirado.' }, { status: 400 })
    }

    const expectedHash = hashLoginCode(authPhone, code)
    if (expectedHash !== record.codigo_hash) {
      await supabase
        .from('codigos_login')
        .update({ tentativas: record.tentativas + 1 })
        .eq('id', record.id)

      return NextResponse.json({ error: 'Código inválido ou expirado.' }, { status: 400 })
    }

    const account = await findAccountByPhone(supabase, phone)
    if (!account?.id) {
      return NextResponse.json({ error: 'Não encontramos uma conta para esse telefone.' }, { status: 404 })
    }

    const temporaryPassword = createTemporaryPassword()
    const { error: updateError } = await supabase.auth.admin.updateUserById(account.id, {
      password: temporaryPassword,
    })

    if (updateError) {
      return NextResponse.json({ error: 'Não consegui concluir o login.' }, { status: 500 })
    }

    await supabase
      .from('codigos_login')
      .update({ consumido_em: new Date().toISOString() })
      .eq('id', record.id)

    return NextResponse.json({
      ok: true,
      email: account.email,
      tempPassword: temporaryPassword,
    })
  } catch {
    return NextResponse.json({ error: 'Não foi possível validar o código.' }, { status: 500 })
  }
}
