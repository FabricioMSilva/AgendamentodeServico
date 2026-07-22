import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatAddress, normalizeCep } from '@/lib/address'
import { normalizeName } from '@/lib/name'
import { canonicalizeBrazilPhoneDigits, toBrazilAuthPhone } from '@/lib/phone'

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
  return randomBytes(12).toString('base64url')
}

function createTechnicalEmail() {
  return `usuario-${randomBytes(8).toString('hex')}@auth.ibeleza.local`
}

function getAuthErrorMessage(error: unknown) {
  if (!error) return 'Erro desconhecido no Supabase Auth.'

  if (error instanceof Error && error.message.trim() && error.message !== '{}') {
    return error.message
  }

  if (typeof error === 'object') {
    const detail = JSON.stringify(error)
    if (detail && detail !== '{}') return detail
  }

  return 'Não foi possível criar o usuário no Supabase Auth.'
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string
      phone?: string
      password?: string
      account_type?: 'usuario' | 'comerciante'
      document?: string
      zip_code?: string
      street?: string
      number?: string
      complement?: string
      neighborhood?: string
      city?: string
      state?: string
    }

    const name = normalizeName(body.name ?? '')
    const phoneDigits = canonicalizeBrazilPhoneDigits(normalizePhone(body.phone ?? ''))
    const providedPassword = typeof body.password === 'string' ? body.password.trim() : ''
    const accountType = body.account_type === 'comerciante' ? 'comerciante' : 'usuario'
    const documentDigits = normalizePhone(body.document ?? '')
    const zipCode = normalizeCep(body.zip_code ?? '')
    const street = body.street?.trim() ?? ''
    const number = body.number?.trim() ?? ''
    const complement = body.complement?.trim() ?? ''
    const neighborhood = body.neighborhood?.trim() ?? ''
    const city = body.city?.trim() ?? ''
    const state = body.state?.trim() ?? ''

    if (name.length < 2) {
      return NextResponse.json({ error: 'Informe seu nome.' }, { status: 400 })
    }

    if (phoneDigits.length < 10) {
      return NextResponse.json({ error: 'Informe um telefone válido.' }, { status: 400 })
    }

    if (providedPassword && providedPassword.length < 6) {
      return NextResponse.json(
        { error: 'A senha precisa ter pelo menos 6 caracteres.' },
        { status: 400 },
      )
    }

    if (accountType === 'usuario' && documentDigits.length > 0 && documentDigits.length !== 11) {
      return NextResponse.json({ error: 'Informe um CPF válido.' }, { status: 400 })
    }

    if (accountType === 'comerciante' && documentDigits.length > 0 && documentDigits.length !== 14) {
      return NextResponse.json({ error: 'Informe um CNPJ válido.' }, { status: 400 })
    }

    if (!hasSupabaseConfig()) {
      return NextResponse.json(
        { error: 'Configure as chaves reais do Supabase antes de criar contas.' },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()
    const password = providedPassword || createTemporaryPassword()
    const technicalEmail = createTechnicalEmail()
    const authPhone = toBrazilAuthPhone(phoneDigits)
    const userMetadata = {
      full_name: name,
      phone: authPhone,
      zip_code: zipCode || null,
      street: street || null,
      number: number || null,
      complement: complement || null,
      neighborhood: neighborhood || null,
      city: city || null,
      state: state || null,
      address:
        formatAddress({
          zip_code: zipCode || null,
          street: street || null,
          number: number || null,
          complement: complement || null,
          neighborhood: neighborhood || null,
          city: city || null,
          state: state || null,
        }) || null,
    }

    const { data: existingProfile } = await supabase
      .from('usuarios')
      .select('id, email, nivel_acesso, comerciante_status, comerciante_ativo')
      .eq('telefone', authPhone)
      .maybeSingle()

    let existingUser = null
    if (existingProfile?.id) {
      const { data: authUser } = await supabase.auth.admin.getUserById(existingProfile.id)
      existingUser = authUser.user

      if (!existingUser) {
        await supabase.from('usuarios').delete().eq('id', existingProfile.id)
      }
    }

    if (existingUser) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
        password,
        user_metadata: userMetadata,
      })

      if (updateError) {
        return NextResponse.json({ error: getAuthErrorMessage(updateError) }, { status: 400 })
      }

      await supabase
        .from('usuarios')
        .delete()
        .eq('telefone', authPhone)
        .neq('id', existingUser.id)

      const { error: profileError } = await supabase.from('usuarios').upsert({
        id: existingUser.id,
        nivel_acesso: existingProfile?.nivel_acesso ?? 'cliente',
        nome: name,
        telefone: authPhone,
        email: existingUser.email ?? null,
        tipo_cadastro: accountType,
        cpf: accountType === 'usuario' && documentDigits ? documentDigits : null,
        cnpj: accountType === 'comerciante' && documentDigits ? documentDigits : null,
        comerciante_status:
          accountType === 'comerciante'
            ? existingProfile?.comerciante_status === 'aprovado'
              ? 'aprovado'
              : 'pendente'
            : 'nao_solicitado',
        comerciante_ativo:
          accountType === 'comerciante' && existingProfile?.comerciante_status === 'aprovado'
            ? existingProfile?.comerciante_ativo ?? true
            : false,
        avatar_url: null,
        cep: zipCode || null,
        rua: street || null,
        numero: number || null,
        complemento: complement || null,
        bairro: neighborhood || null,
        cidade: city || null,
        estado: state || null,
        senha_definida: true,
      })

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 400 })
      }

      return NextResponse.json({
        ok: true,
        userId: existingUser.id,
        phone: authPhone,
        email: existingUser.email ?? null,
        tempPassword: providedPassword ? null : password,
      })
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: technicalEmail,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    })

    if (error) {
      return NextResponse.json({ error: getAuthErrorMessage(error) }, { status: 400 })
    }

    if (!data.user?.id) {
      return NextResponse.json({ error: 'Supabase não retornou o usuário criado.' }, { status: 400 })
    }

    await supabase
      .from('usuarios')
      .delete()
      .eq('telefone', authPhone)
      .neq('id', data.user.id)

    const { error: profileError } = await supabase.from('usuarios').upsert({
      id: data.user.id,
      nivel_acesso: 'cliente',
      nome: name,
      telefone: authPhone,
      email: null,
      tipo_cadastro: accountType,
      cpf: accountType === 'usuario' && documentDigits ? documentDigits : null,
      cnpj: accountType === 'comerciante' && documentDigits ? documentDigits : null,
      comerciante_status: accountType === 'comerciante' ? 'pendente' : 'nao_solicitado',
      comerciante_ativo: false,
      avatar_url: null,
      cep: zipCode || null,
      rua: street || null,
      numero: number || null,
      complemento: complement || null,
      bairro: neighborhood || null,
      cidade: city || null,
      estado: state || null,
      senha_definida: true,
    })

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      userId: data.user?.id ?? null,
      phone: authPhone,
      email: technicalEmail,
      tempPassword: providedPassword ? null : password,
    })
  } catch {
    return NextResponse.json({ error: 'Não foi possível criar sua conta.' }, { status: 500 })
  }
}
