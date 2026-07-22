'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeCep } from '@/lib/address'
import { normalizeName } from '@/lib/name'
import { canonicalizeBrazilPhoneDigits, toBrazilAuthPhone } from '@/lib/phone'

export type ProfileFormState = {
  ok?: boolean
  message?: string
}

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

export async function updateUserProfile(
  _state: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const name = normalizeName(value(formData, 'name'))
  const phoneDigits = canonicalizeBrazilPhoneDigits(value(formData, 'phone').replace(/\D/g, ''))
  const phone = phoneDigits ? toBrazilAuthPhone(phoneDigits) : ''
  const zipCode = normalizeCep(value(formData, 'zip_code'))
  const street = value(formData, 'street')
  const number = value(formData, 'number')
  const complement = value(formData, 'complement')
  const neighborhood = value(formData, 'neighborhood')
  const city = value(formData, 'city')
  const state = value(formData, 'state').toUpperCase()

  if (name.length < 2) {
    return { message: 'Informe seu nome.' }
  }

  if (phone.length < 10) {
    return { message: 'Informe um telefone válido.' }
  }

  const db = createAdminClient()
  const { data: current } = await db
    .from('usuarios')
    .select('nivel_acesso, senha_definida')
    .eq('id', user.id)
    .maybeSingle()

  const { error: userError } = await db.from('usuarios').upsert({
    id: user.id,
    nivel_acesso: current?.nivel_acesso ?? 'cliente',
    nome: name,
    telefone: phone,
    email: user.email ?? null,
    cep: zipCode || null,
    rua: street || null,
    numero: number || null,
    complemento: complement || null,
    bairro: neighborhood || null,
    cidade: city || null,
    estado: state || null,
    senha_definida: current?.senha_definida ?? false,
    atualizado_em: new Date().toISOString(),
  })

  if (userError) {
    return { message: userError.message }
  }

  await db.from('profiles').upsert({
    id: user.id,
    role:
      current?.nivel_acesso === 'administrador'
        ? 'super_admin'
        : current?.nivel_acesso === 'profissional'
          ? 'merchant'
          : 'customer',
    name,
    phone,
    email: user.email ?? `${user.id}@auth.ibeleza.local`,
    zip_code: zipCode || null,
    street: street || null,
    number: number || null,
    complement: complement || null,
    neighborhood: neighborhood || null,
    city: city || null,
    state: state || null,
  })

  revalidatePath('/perfil')
  revalidatePath('/buscar')
  redirect('/')
}
