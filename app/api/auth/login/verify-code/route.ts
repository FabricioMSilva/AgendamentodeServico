import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getLoginPhoneCandidates,
  hashLoginCode,
  normalizeLoginPhone,
  toLoginEmail,
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
    const { data: record } = await supabase
      .from('login_codes')
      .select('id, code_hash, expires_at, attempts, consumed_at')
      .eq('phone', phone)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!record) {
      return NextResponse.json({ error: 'Código inválido ou expirado.' }, { status: 400 })
    }

    if (new Date(record.expires_at).getTime() < Date.now()) {
      await supabase.from('login_codes').delete().eq('id', record.id)
      return NextResponse.json({ error: 'Código inválido ou expirado.' }, { status: 400 })
    }

    if (record.attempts >= 5) {
      await supabase.from('login_codes').delete().eq('id', record.id)
      return NextResponse.json({ error: 'Código inválido ou expirado.' }, { status: 400 })
    }

    const expectedHash = hashLoginCode(phone, code)
    if (expectedHash !== record.code_hash) {
      await supabase
        .from('login_codes')
        .update({ attempts: record.attempts + 1 })
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
      .from('login_codes')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', record.id)

    return NextResponse.json({
      ok: true,
      tempPassword: temporaryPassword,
    })
  } catch {
    return NextResponse.json({ error: 'Não foi possível validar o código.' }, { status: 500 })
  }
}
