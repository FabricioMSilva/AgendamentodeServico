'use server'

import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSuperAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { formatAddress, normalizeCep } from '@/lib/address'
import { canonicalizeBrazilPhoneDigits, toBrazilAuthPhone } from '@/lib/phone'

const getDb = () => createAdminClient()

function createTemporaryPassword() {
  return randomBytes(12).toString('base64url')
}

const EstablishmentSchema = z.object({
  name: z.string().min(2).max(100),
  owner_name: z.string().max(100).optional(),
  owner_email: z.string().email(),
  owner_phone: z.string().max(30).optional(),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífens'),
  business_type: z.string().min(2).max(60).default('salao_feminino'),
  address: z.string().max(200).optional(),
  contact: z.string().max(100).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  whatsapp_phone: z.string().max(30).optional(),
  zip_code: z.string().max(9).optional(),
  street: z.string().max(120).optional(),
  number: z.string().max(20).optional(),
  complement: z.string().max(80).optional(),
  neighborhood: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(2).optional(),
  slots_per_schedule: z.coerce.number().int().min(1).max(48).default(10),
  reminder_hours_before: z.coerce.number().int().min(1).max(72).default(24),
  auto_cancel_hours_before: z.coerce.number().int().min(1).max(72).default(4),
})

const InitialServiceSchema = z.object({
  name: z.string().min(1).max(100),
  duration_minutes: z.coerce.number().int().min(10).max(480),
  price: z.coerce.number().min(0).optional(),
  category: z.string().min(2).max(80),
})

type FieldErrors = Record<string, string[]>

export type CreateEstablishmentResult =
  | { success: true; id: string }
  | { error: FieldErrors }

async function assertSuperAdmin() {
  await getSuperAdminUser()
}

async function getSuperAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('usuarios')
    .select('nivel_acesso, telefone, email')
    .eq('id', user.id)
    .maybeSingle()

  if (
    profile?.nivel_acesso !== 'administrador' &&
    !isSuperAdmin({ email: user.email ?? profile?.email, phone: profile?.telefone })
  ) {
    throw new Error('Acesso VIP não autorizado para criar estabelecimento.')
  }

  return user
}

function getInitialServices(formData: FormData, fallbackCategory: string) {
  const names = formData.getAll('service_name').map((item) => String(item ?? '').trim())
  const durations = formData.getAll('service_duration')
  const prices = formData.getAll('service_price')
  const categories = formData.getAll('service_category')

  const services = names
    .map((name, index) => ({
      name,
      duration_minutes: durations[index] || 30,
      price: prices[index] || undefined,
      category: String(categories[index] ?? '').trim() || fallbackCategory,
    }))
    .filter((service) => service.name)

  if (services.length === 0) return { services: [], error: null }

  const parsed = z.array(InitialServiceSchema).safeParse(services)
  if (!parsed.success) {
    return { services: [], error: { services: ['Revise nome, duração e preço dos serviços.'] } }
  }

  return { services: parsed.data, error: null }
}

export async function createEstablishment(formData: FormData): Promise<CreateEstablishmentResult> {
  await assertSuperAdmin()

  const parsed = EstablishmentSchema.safeParse({
    name: formData.get('name'),
    owner_name: formData.get('owner_name') || undefined,
    owner_email: formData.get('owner_email'),
    owner_phone: formData.get('owner_phone') || undefined,
    slug: formData.get('slug'),
    business_type: formData.get('business_type') || 'salao_feminino',
    address: formData.get('address') || undefined,
    contact: formData.get('contact') || undefined,
    email: formData.get('email') || undefined,
    phone: formData.get('phone') || undefined,
    whatsapp_phone: formData.get('whatsapp_phone') || undefined,
    zip_code: formData.get('zip_code') || undefined,
    street: formData.get('street') || undefined,
    number: formData.get('number') || undefined,
    complement: formData.get('complement') || undefined,
    neighborhood: formData.get('neighborhood') || undefined,
    city: formData.get('city') || undefined,
    state: formData.get('state') || undefined,
    slots_per_schedule: formData.get('slots_per_schedule'),
    reminder_hours_before: formData.get('reminder_hours_before') || 24,
    auto_cancel_hours_before: formData.get('auto_cancel_hours_before') || 4,
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const initialServices = getInitialServices(formData, parsed.data.business_type.replace(/_/g, ' '))
  if (initialServices.error) {
    return { error: initialServices.error }
  }

  const db = getDb()
  const zipCode = normalizeCep(parsed.data.zip_code ?? '')
  const phone = parsed.data.phone
    ? toBrazilAuthPhone(canonicalizeBrazilPhoneDigits(parsed.data.phone.replace(/\D/g, '')))
    : null
  const ownerPhone = parsed.data.owner_phone
    ? toBrazilAuthPhone(canonicalizeBrazilPhoneDigits(parsed.data.owner_phone.replace(/\D/g, '')))
    : null
  const whatsappPhone = parsed.data.whatsapp_phone
    ? toBrazilAuthPhone(canonicalizeBrazilPhoneDigits(parsed.data.whatsapp_phone.replace(/\D/g, '')))
    : phone
  const address =
    parsed.data.address ||
    formatAddress({
      zip_code: zipCode || null,
      street: parsed.data.street || null,
      number: parsed.data.number || null,
      complement: parsed.data.complement || null,
      neighborhood: parsed.data.neighborhood || null,
      city: parsed.data.city || null,
      state: parsed.data.state || null,
    })

  let ownerUserId: string | null = null

  const ownerLookups = [
    db.from('usuarios').select('id').eq('email', parsed.data.owner_email).maybeSingle(),
    ownerPhone
      ? db.from('usuarios').select('id').eq('telefone', ownerPhone).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ] as const
  const [{ data: existingUserByEmail }, { data: existingUserByPhone }] = await Promise.all(ownerLookups)
  ownerUserId = existingUserByEmail?.id ?? existingUserByPhone?.id ?? null

  if (!ownerUserId) {
    const { data: createdOwner, error: ownerAuthError } = await db.auth.admin.createUser({
      email: parsed.data.owner_email,
      password: createTemporaryPassword(),
      email_confirm: true,
      user_metadata: {
        full_name: parsed.data.owner_name ?? parsed.data.name,
        phone: ownerPhone,
      },
    })

    if (ownerAuthError || !createdOwner.user?.id) {
      return {
        error: {
          owner_email: [
            ownerAuthError?.message ?? 'Não foi possível liberar o acesso do comerciante.',
          ],
        },
      }
    }

    ownerUserId = createdOwner.user.id
  }

  const { error: ownerProfileError } = await db.from('usuarios').upsert({
    id: ownerUserId,
    nivel_acesso: 'profissional',
    nome: parsed.data.owner_name || parsed.data.name,
    telefone: ownerPhone,
    email: parsed.data.owner_email,
    senha_definida: false,
  })

  if (ownerProfileError) {
    return { error: { _form: ['Não foi possível liberar o comerciante: ' + ownerProfileError.message] } }
  }

  const { data: establishment, error } = await db
    .from('estabelecimentos')
    .insert({
      nome: parsed.data.name,
      slug: parsed.data.slug,
      tipo_negocio: parsed.data.business_type,
      endereco: address || null,
      telefone: phone,
      whatsapp: whatsappPhone,
      email: parsed.data.email || null,
      cep: zipCode || null,
      rua: parsed.data.street || null,
      numero: parsed.data.number || null,
      complemento: parsed.data.complement || null,
      bairro: parsed.data.neighborhood || null,
      cidade: parsed.data.city || null,
      estado: parsed.data.state || null,
      vagas_por_horario: parsed.data.slots_per_schedule,
      usuario_admin_id: ownerUserId,
      status_aprovacao: 'aprovado',
      bloqueado: false,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      if (error.message.toLowerCase().includes('slug')) {
        return { error: { slug: ['Este endereço já está em uso'] } }
      }
      return { error: { _form: ['Conflito de dados: ' + error.message] } }
    }
    return { error: { _form: [error.message] } }
  }

  if (initialServices.services.length > 0) {
    const { error: servicesError } = await db.from('servicos').insert(
      initialServices.services.map((service) => ({
        estabelecimento_id: establishment.id,
        nome: service.name,
        tipo_preco: 'fixo' as const,
        preco: service.price ?? null,
        duracao_minutos: service.duration_minutes,
        categoria: service.category,
        descricao: null,
        imagem_url: null,
        ativo: true,
      })),
    )

    if (servicesError) {
      return { error: { _form: ['Estabelecimento criado, mas falha ao salvar serviços: ' + servicesError.message] } }
    }
  }

  revalidatePath('/sales/dashboard')
  return { success: true, id: establishment.id }
}

export async function setEstablishmentBlocked(
  establishmentId: string,
  isBlocked: boolean
): Promise<void> {
  await assertSuperAdmin()

  const db = getDb()
  const { error } = await db
    .from('estabelecimentos')
    .update({ bloqueado: isBlocked })
    .eq('id', establishmentId)

  if (error) throw new Error(error.message)

  revalidatePath('/sales/dashboard')
}

export async function approveMerchantUser(userId: string): Promise<void> {
  await assertSuperAdmin()

  const db = getDb()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await db
    .from('usuarios')
    .update({
      nivel_acesso: 'profissional',
      tipo_cadastro: 'comerciante',
      comerciante_status: 'aprovado',
      comerciante_ativo: true,
      comerciante_aprovado_em: new Date().toISOString(),
      comerciante_aprovado_por: user?.id ?? null,
    })
    .eq('id', userId)
    .eq('tipo_cadastro', 'comerciante')

  if (error) throw new Error(error.message)

  revalidatePath('/sales/dashboard')
}

export async function approveEstablishment(establishmentId: string): Promise<void> {
  const currentUser = await getSuperAdminUser()

  const db = getDb()
  const { error } = await db
    .from('estabelecimentos')
    .update({
      status_aprovacao: 'aprovado',
      bloqueado: false,
      aprovado_em: new Date().toISOString(),
      aprovado_por: currentUser.id,
    })
    .eq('id', establishmentId)

  if (error) throw new Error(error.message)

  revalidatePath('/sales/dashboard')
  revalidatePath('/admin/dashboard')
  revalidatePath('/buscar')
}

const UserAccountSchema = z.object({
  user_id: z.string().uuid(),
  nivel_acesso: z.enum(['cliente', 'profissional', 'administrador']),
  tipo_cadastro: z.enum(['usuario', 'comerciante']),
  comerciante_status: z.enum(['nao_solicitado', 'pendente', 'aprovado', 'reprovado']),
  conta_bloqueada: z.enum(['on']).optional(),
})

export async function updateUserAccount(formData: FormData): Promise<void> {
  const currentUser = await getSuperAdminUser()
  const parsed = UserAccountSchema.parse({
    user_id: formData.get('user_id'),
    nivel_acesso: formData.get('nivel_acesso'),
    tipo_cadastro: formData.get('tipo_cadastro'),
    comerciante_status: formData.get('comerciante_status'),
    conta_bloqueada: formData.get('conta_bloqueada') || undefined,
  })

  const isSelf = currentUser.id === parsed.user_id
  const shouldBlock = parsed.conta_bloqueada === 'on'

  if (isSelf && shouldBlock) {
    throw new Error('Você não pode bloquear a própria conta.')
  }

  if (isSelf && parsed.nivel_acesso !== 'administrador') {
    throw new Error('Você não pode remover seu próprio acesso de administrador.')
  }

  const isMerchant = parsed.tipo_cadastro === 'comerciante'
  const merchantStatus = isMerchant ? parsed.comerciante_status : 'nao_solicitado'
  const merchantActive = isMerchant && merchantStatus === 'aprovado' && !shouldBlock
  const accessLevel =
    isMerchant && merchantStatus === 'aprovado'
      ? 'profissional'
      : parsed.nivel_acesso

  const db = getDb()
  const { error } = await db
    .from('usuarios')
    .update({
      nivel_acesso: accessLevel,
      tipo_cadastro: parsed.tipo_cadastro,
      comerciante_status: merchantStatus,
      comerciante_ativo: merchantActive,
      conta_bloqueada: shouldBlock,
      bloqueado_em: shouldBlock ? new Date().toISOString() : null,
      bloqueado_por: shouldBlock ? currentUser.id : null,
      comerciante_aprovado_em: merchantActive ? new Date().toISOString() : null,
      comerciante_aprovado_por: merchantActive ? currentUser.id : null,
    })
    .eq('id', parsed.user_id)

  if (error) throw new Error(error.message)

  revalidatePath('/sales/dashboard')
}
