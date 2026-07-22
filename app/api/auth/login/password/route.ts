import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLoginPhoneCandidates, normalizeLoginPhone, toLoginAuthPhone } from '@/lib/login'

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { phone?: string }
    const phone = normalizeLoginPhone(body.phone ?? '')

    if (phone.length < 10) {
      return NextResponse.json({ error: 'Informe um telefone válido.' }, { status: 400 })
    }

    if (!hasSupabaseConfig()) {
      return NextResponse.json({ error: 'Configure o Supabase antes de entrar.' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const authPhone = toLoginAuthPhone(phone)
    const phoneCandidates = getLoginPhoneCandidates(phone)

    const { data: user, error } = await supabase
      .from('usuarios')
      .select('email, conta_bloqueada')
      .in('telefone', [authPhone, ...phoneCandidates])
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!user?.email) {
      return NextResponse.json({ error: 'Não encontramos uma conta para esse telefone.' }, { status: 404 })
    }

    if (user.conta_bloqueada) {
      return NextResponse.json({ error: 'Esta conta está bloqueada. Fale com o suporte.' }, { status: 403 })
    }

    return NextResponse.json({ email: user.email })
  } catch {
    return NextResponse.json({ error: 'Não foi possível preparar o login.' }, { status: 500 })
  }
}
