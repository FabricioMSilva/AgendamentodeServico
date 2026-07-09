import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatAddress, normalizeCep } from '@/lib/address'
import { normalizeName } from '@/lib/name'

function normalizePhone(input: string) {
  return input.replace(/\D/g, '')
}

function toAuthEmail(phoneDigits: string) {
  return `phone-${phoneDigits}@ibeleza.local`
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

async function findAuthUserByEmail(
  supabase: ReturnType<typeof createAdminClient>,
  email: string,
) {
  const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  return data.users.find((entry) => entry.email?.toLowerCase() === email.toLowerCase()) ?? null
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string
      phone?: string
      zip_code?: string
      street?: string
      number?: string
      complement?: string
      neighborhood?: string
      city?: string
      state?: string
    }

    const name = normalizeName(body.name ?? '')
    const phoneDigits = normalizePhone(body.phone ?? '')
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

    if (!hasSupabaseConfig()) {
      return NextResponse.json(
        { error: 'Configure as chaves reais do Supabase antes de criar contas.' },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()
    const password = createTemporaryPassword()
    const email = toAuthEmail(phoneDigits)
    const userMetadata = {
      full_name: name,
      phone: phoneDigits,
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

    const existingUser = await findAuthUserByEmail(supabase, email)

    if (existingUser) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
        user_metadata: userMetadata,
      })

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 })
      }

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: existingUser.id,
        role: 'customer',
        name,
        phone: phoneDigits,
        email,
        avatar_url: null,
        zip_code: zipCode || null,
        street: street || null,
        number: number || null,
        complement: complement || null,
        neighborhood: neighborhood || null,
        city: city || null,
        state: state || null,
      })

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 400 })
      }

      return NextResponse.json({
        ok: true,
        userId: existingUser.id,
        email,
        tempPassword: password,
      })
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      userId: data.user?.id ?? null,
      email,
      tempPassword: password,
    })
  } catch {
    return NextResponse.json({ error: 'Não foi possível criar sua conta.' }, { status: 500 })
  }
}
