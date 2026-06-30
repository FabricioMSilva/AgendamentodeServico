import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatAddress, normalizeCep } from '@/lib/address'

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string
      phone?: string
      password?: string
      zip_code?: string
      street?: string
      number?: string
      complement?: string
      neighborhood?: string
      city?: string
      state?: string
    }

    const name = body.name?.trim() ?? ''
    const phoneDigits = normalizePhone(body.phone ?? '')
    const password = body.password ?? ''
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

    if (password.length < 6) {
      return NextResponse.json({ error: 'A senha precisa ter pelo menos 6 caracteres.' }, { status: 400 })
    }

    if (!hasSupabaseConfig()) {
      return NextResponse.json(
        { error: 'Configure as chaves reais do Supabase antes de criar contas.' },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase.auth.admin.createUser({
      email: toAuthEmail(phoneDigits),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        phone: phoneDigits,
        zip_code: zipCode || null,
        street: street || null,
        number: number || null,
        complement: complement || null,
        neighborhood: neighborhood || null,
        city: city || null,
        state: state || null,
        address: formatAddress({
          zip_code: zipCode || null,
          street: street || null,
          number: number || null,
          complement: complement || null,
          neighborhood: neighborhood || null,
          city: city || null,
          state: state || null,
        }) || null,
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      userId: data.user?.id ?? null,
      email: toAuthEmail(phoneDigits),
    })
  } catch {
    return NextResponse.json({ error: 'Não foi possível criar sua conta.' }, { status: 500 })
  }
}
