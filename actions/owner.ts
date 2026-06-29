'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatAddress, normalizeCep } from '@/lib/address'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const OwnerEstablishmentSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().max(50).optional(),
  contact: z.string().max(100).optional(),
  zip_code: z.string().max(9).optional(),
  street: z.string().max(120).optional(),
  number: z.string().max(20).optional(),
  complement: z.string().max(60).optional(),
  neighborhood: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(2).optional(),
})

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

export async function createOwnerEstablishment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?mode=signup&next=/dono')
  }

  const parsed = OwnerEstablishmentSchema.safeParse({
    name: formData.get('name'),
    slug: (formData.get('slug') || '').toString().trim(),
    contact: formData.get('contact') || undefined,
    zip_code: formData.get('zip_code') || undefined,
    street: formData.get('street') || undefined,
    number: formData.get('number') || undefined,
    complement: formData.get('complement') || undefined,
    neighborhood: formData.get('neighborhood') || undefined,
    city: formData.get('city') || undefined,
    state: formData.get('state') || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const db = createAdminClient()
  const { data: existing, error: lookupError } = await db
    .from('establishments')
    .select('id')
    .eq('admin_id', user.id)
    .maybeSingle()

  if (lookupError) {
    return { error: { _form: [lookupError.message] } }
  }

  if (existing?.id) {
    return { error: { _form: ['Você já tem um estabelecimento vinculado.'] } }
  }

  const finalSlug = slugify(parsed.data.slug ?? parsed.data.name)

  if (finalSlug.length < 2) {
    return { error: { slug: ['Informe um nome ou slug mais claro.'] } }
  }

  const zipCode = normalizeCep(parsed.data.zip_code ?? '')
  const address = formatAddress({
    zip_code: zipCode || null,
    street: parsed.data.street ?? null,
    number: parsed.data.number ?? null,
    complement: parsed.data.complement ?? null,
    neighborhood: parsed.data.neighborhood ?? null,
    city: parsed.data.city ?? null,
    state: parsed.data.state ?? null,
  })

  const { data: establishment, error } = await db
    .from('establishments')
    .insert({
      admin_id: user.id,
      owner_email: user.email ?? `user-${user.id}@ibeleza.local`,
      name: parsed.data.name,
      slug: finalSlug,
      address: address || null,
      contact: parsed.data.contact ?? null,
      zip_code: zipCode || null,
      street: parsed.data.street ?? null,
      number: parsed.data.number ?? null,
      complement: parsed.data.complement ?? null,
      neighborhood: parsed.data.neighborhood ?? null,
      city: parsed.data.city ?? null,
      state: parsed.data.state ?? null,
      business_hours: {
        1: { open: '09:00', close: '19:00' },
        2: { open: '09:00', close: '19:00' },
        3: { open: '09:00', close: '19:00' },
        4: { open: '09:00', close: '19:00' },
        5: { open: '09:00', close: '19:00' },
        6: { open: '09:00', close: '16:00' },
      },
      is_blocked: false,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      if (error.message.toLowerCase().includes('slug')) {
        return { error: { slug: ['Esse endereço já está em uso.'] } }
      }
      return { error: { _form: ['Já existe um cadastro com esses dados.'] } }
    }

    return { error: { _form: [error.message] } }
  }

  const { error: profileError } = await db
    .from('profiles')
    .update({ role: 'admin', name: user.user_metadata?.full_name ?? user.email })
    .eq('id', user.id)

  if (profileError) {
    return { error: { _form: [`Cadastro criado, mas não consegui liberar seu painel: ${profileError.message}`] } }
  }

  revalidatePath('/')
  revalidatePath('/dono')
  revalidatePath('/admin/dashboard')

  return { success: true, id: establishment.id }
}
