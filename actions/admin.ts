'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { formatAddress, normalizeCep } from '@/lib/address'
import { DEFAULT_SERVICE_CATEGORY } from '@/lib/services/categories'

async function getAdminEstablishmentId(requestedEstablishmentId?: FormDataEntryValue | string | null): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  let query = supabase
    .from('estabelecimentos')
    .select('id')
    .eq('usuario_admin_id', user.id)

  if (typeof requestedEstablishmentId === 'string' && requestedEstablishmentId.trim()) {
    query = query.eq('id', requestedEstablishmentId.trim())
  }

  const { data } = await query
    .order('criado_em', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!data) throw new Error('Nenhum estabelecimento encontrado para este administrador')
  return data.id
}

async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user?.id ?? null
}

const ServiceSchema = z.object({
  name: z.string().min(1).max(100),
  price_type: z.enum(['fixed', 'variable']),
  price: z.coerce.number().min(0).optional(),
  duration_minutes: z.coerce.number().int().min(10).max(480).default(30),
  category: z.string().min(2).max(80).default(DEFAULT_SERVICE_CATEGORY),
  description: z.string().max(500).optional(),
  image_url: z.string().url().optional().or(z.literal('')),
})

function toTipoPreco(value: 'fixed' | 'variable') {
  return value === 'variable' ? 'variavel' : 'fixo'
}

export async function createService(formData: FormData): Promise<{
  success?: boolean
  error?: Record<string, string[]>
}> {
  let establishmentId: string
  try {
    establishmentId = await getAdminEstablishmentId(formData.get('establishment_id'))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return { error: { _form: [message] } }
  }

  const supabase = await createClient()

  const parsed = ServiceSchema.safeParse({
    name: formData.get('name'),
    price_type: formData.get('price_type'),
    price: formData.get('price') || undefined,
    duration_minutes: formData.get('duration_minutes') || 30,
    category: formData.get('category') || DEFAULT_SERVICE_CATEGORY,
    description: formData.get('description') || undefined,
    image_url: formData.get('image_url') || undefined,
  })

  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  const { error } = await supabase.from('servicos').insert({
    estabelecimento_id: establishmentId,
    nome: parsed.data.name,
    categoria: parsed.data.category,
    descricao: parsed.data.description || null,
    tipo_preco: toTipoPreco(parsed.data.price_type),
    preco: parsed.data.price ?? null,
    duracao_minutos: parsed.data.duration_minutes,
    imagem_url: parsed.data.image_url || null,
    ativo: true,
  })

  if (error) return { error: { _form: [error.message] } }

  revalidatePath('/admin/dashboard')
  return { success: true }
}

export async function updateService(formData: FormData): Promise<{
  success?: boolean
  error?: Record<string, string[]>
}> {
  let establishmentId: string
  try {
    establishmentId = await getAdminEstablishmentId(formData.get('establishment_id'))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return { error: { _form: [message] } }
  }

  const id = z.string().uuid().safeParse(formData.get('id'))
  if (!id.success) return { error: { _form: ['Serviço inválido'] } }

  const parsed = ServiceSchema.safeParse({
    name: formData.get('name'),
    price_type: formData.get('price_type'),
    price: formData.get('price') || undefined,
    duration_minutes: formData.get('duration_minutes') || 30,
    category: formData.get('category') || DEFAULT_SERVICE_CATEGORY,
    description: formData.get('description') || undefined,
    image_url: formData.get('image_url') || undefined,
  })

  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  const supabase = await createClient()
  const { error } = await supabase
    .from('servicos')
    .update({
      nome: parsed.data.name,
      categoria: parsed.data.category,
      descricao: parsed.data.description || null,
      tipo_preco: toTipoPreco(parsed.data.price_type),
      preco: parsed.data.price ?? null,
      duracao_minutos: parsed.data.duration_minutes,
      imagem_url: parsed.data.image_url || null,
    })
    .eq('id', id.data)
    .eq('estabelecimento_id', establishmentId)

  if (error) return { error: { _form: [error.message] } }

  revalidatePath('/admin/dashboard')
  return { success: true }
}

export async function setServiceActive(
  serviceId: string,
  isActive: boolean,
  requestedEstablishmentId?: string,
): Promise<{ success?: boolean; error?: string }> {
  let establishmentId: string
  try {
    establishmentId = await getAdminEstablishmentId(requestedEstablishmentId)
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro desconhecido' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('servicos')
    .update({ ativo: isActive })
    .eq('id', serviceId)
    .eq('estabelecimento_id', establishmentId)

  if (error) return { error: error.message }

  revalidatePath('/admin/dashboard')
  return { success: true }
}

export async function deleteService(
  serviceId: string,
  requestedEstablishmentId?: string
): Promise<{ success?: boolean; error?: string }> {
  let establishmentId: string
  try {
    establishmentId = await getAdminEstablishmentId(requestedEstablishmentId)
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro desconhecido' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('servicos')
    .delete()
    .eq('id', serviceId)
    .eq('estabelecimento_id', establishmentId)

  if (error) return { error: error.message }

  revalidatePath('/admin/dashboard')
  return { success: true }
}

const DAY_KEYS = ['0', '1', '2', '3', '4', '5', '6'] as const

const SOCIAL_HOSTS = {
  instagram_url: ['instagram.com'],
  facebook_url: ['facebook.com', 'fb.com'],
  youtube_url: ['youtube.com', 'youtu.be'],
  tiktok_url: ['tiktok.com'],
} as const

function optionalUrl(field: keyof typeof SOCIAL_HOSTS) {
  return z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((value) => {
      if (!value) return true
      try {
        const url = new URL(value)
        return SOCIAL_HOSTS[field].some((host) => url.hostname.replace(/^www\./, '').endsWith(host))
      } catch {
        return false
      }
    }, 'Informe um link válido.')
}

const ProfileSettingsSchema = z.object({
  name: z.string().min(2).max(100),
  contact: z.string().max(100).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().email().optional().or(z.literal('')),
  whatsapp_phone: z.string().max(30).optional(),
  instagram_url: optionalUrl('instagram_url'),
  facebook_url: optionalUrl('facebook_url'),
  youtube_url: optionalUrl('youtube_url'),
  tiktok_url: optionalUrl('tiktok_url'),
  business_type: z.string().min(2).max(60).default('salao_feminino'),
  zip_code: z.string().max(9).optional(),
  street: z.string().max(120).optional(),
  number: z.string().max(20).optional(),
  complement: z.string().max(60).optional(),
  neighborhood: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(2).optional(),
})

const EstablishmentSettingsSchema = z.object({
  name: z.string().min(2).max(100),
  contact: z.string().max(100).optional(),
  whatsapp_phone: z.string().max(30).optional(),
  zip_code: z.string().max(9).optional(),
  street: z.string().max(120).optional(),
  number: z.string().max(20).optional(),
  complement: z.string().max(60).optional(),
  neighborhood: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(2).optional(),
  slots_per_schedule: z.coerce.number().int().min(1).max(48),
  reminder_hours_before: z.coerce.number().int().min(1).max(72).default(12),
})

const ScheduleExceptionSchema = z.object({
  exception_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  exception_type: z.enum(['bloqueio', 'extra', 'fechado']),
  exception_start: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal('')),
  exception_end: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal('')),
  exception_reason: z.string().max(160).optional(),
})

const VideoSchema = z.object({
  url: z.string().url(),
  title: z.string().max(80).optional(),
})

function videoProvider(url: string): 'youtube' | 'tiktok' | 'vimeo' | null {
  const hostname = new URL(url).hostname.replace(/^www\./, '')
  if (hostname.endsWith('youtube.com') || hostname.endsWith('youtu.be')) return 'youtube'
  if (hostname.endsWith('tiktok.com')) return 'tiktok'
  if (hostname.endsWith('vimeo.com')) return 'vimeo'
  return null
}

function cleanOptional(value: string | undefined) {
  return value?.trim() || null
}

function isValidTimeRange(open: string, close: string) {
  return /^\d{2}:\d{2}$/.test(open) && /^\d{2}:\d{2}$/.test(close) && open < close
}

function makeAddressFromProfile(data: z.infer<typeof ProfileSettingsSchema>) {
  const zipCode = normalizeCep(data.zip_code ?? '')
  return {
    zipCode,
    address: formatAddress({
      zip_code: zipCode || null,
      street: data.street ?? null,
      number: data.number ?? null,
      complement: data.complement ?? null,
      neighborhood: data.neighborhood ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
    }),
  }
}

function friendlyEstablishmentError(message: string) {
  if (
    message.includes("'city' column") ||
    message.includes("'zip_code' column") ||
    message.includes("'street' column") ||
    message.includes("'neighborhood' column") ||
    message.includes("schema cache")
  ) {
    return 'Seu banco ainda não tem os campos de endereço. Rode o arquivo supabase/reset_portugues_login.sql no Supabase.'
  }

  return message
}

export async function updateProfileSettings(formData: FormData): Promise<{
  success?: boolean
  error?: Record<string, string[]>
}> {
  let establishmentId: string
  try {
    establishmentId = await getAdminEstablishmentId(formData.get('establishment_id'))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return { error: { _form: [message] } }
  }

  const parsed = ProfileSettingsSchema.safeParse({
    name: formData.get('name'),
    contact: formData.get('contact') || undefined,
    phone: formData.get('phone') || undefined,
    email: formData.get('email') || undefined,
    whatsapp_phone: formData.get('whatsapp_phone') || undefined,
    instagram_url: formData.get('instagram_url') || undefined,
    facebook_url: formData.get('facebook_url') || undefined,
    youtube_url: formData.get('youtube_url') || undefined,
    tiktok_url: formData.get('tiktok_url') || undefined,
    business_type: formData.get('business_type') || 'salao_feminino',
    zip_code: formData.get('zip_code') || undefined,
    street: formData.get('street') || undefined,
    number: formData.get('number') || undefined,
    complement: formData.get('complement') || undefined,
    neighborhood: formData.get('neighborhood') || undefined,
    city: formData.get('city') || undefined,
    state: formData.get('state') || undefined,
  })

  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  const { zipCode, address } = makeAddressFromProfile(parsed.data)
  const supabase = await createClient()
  const { error } = await supabase
    .from('estabelecimentos')
    .update({
      nome: parsed.data.name,
      telefone: cleanOptional(parsed.data.phone) ?? cleanOptional(parsed.data.contact),
      email: cleanOptional(parsed.data.email),
      whatsapp: cleanOptional(parsed.data.whatsapp_phone),
      instagram_url: cleanOptional(parsed.data.instagram_url),
      facebook_url: cleanOptional(parsed.data.facebook_url),
      youtube_url: cleanOptional(parsed.data.youtube_url),
      tiktok_url: cleanOptional(parsed.data.tiktok_url),
      tipo_negocio: parsed.data.business_type,
      endereco: address || null,
      cep: zipCode || null,
      rua: cleanOptional(parsed.data.street),
      numero: cleanOptional(parsed.data.number),
      complemento: cleanOptional(parsed.data.complement),
      bairro: cleanOptional(parsed.data.neighborhood),
      cidade: cleanOptional(parsed.data.city),
      estado: cleanOptional(parsed.data.state),
    })
    .eq('id', establishmentId)

  if (error) return { error: { _form: [friendlyEstablishmentError(error.message)] } }

  revalidatePath('/admin/dashboard')
  revalidatePath('/')
  return { success: true }
}

export async function updateBusinessHours(formData: FormData): Promise<{
  success?: boolean
  error?: Record<string, string[]>
}> {
  let establishmentId: string
  try {
    establishmentId = await getAdminEstablishmentId(formData.get('establishment_id'))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return { error: { _form: [message] } }
  }

  const businessHours = DAY_KEYS.reduce<Record<string, { open: string; close: string }[] | null>>(
    (hours, day) => {
      const enabled = formData.get(`day_${day}_enabled`) === 'on'
      const opens = formData.getAll(`day_${day}_open`).map(String)
      const closes = formData.getAll(`day_${day}_close`).map(String)
      const ranges = opens
        .map((open, index) => ({ open, close: closes[index] ?? '' }))
        .filter((range) => isValidTimeRange(range.open, range.close))

      hours[day] = enabled && ranges.length > 0 ? ranges : null
      return hours
    },
    {},
  )

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('estabelecimentos')
    .update({
      horarios_funcionamento: businessHours,
    })
    .eq('id', establishmentId)

  if (error) return { error: { _form: [friendlyEstablishmentError(error.message)] } }

  const deleteIds = formData
    .getAll('delete_exception_ids')
    .map(String)
    .filter((id) => z.string().uuid().safeParse(id).success)

  if (deleteIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('excecoes_horario_estabelecimento')
      .delete()
      .eq('estabelecimento_id', establishmentId)
      .in('id', deleteIds)

    if (deleteError) return { error: { _form: [deleteError.message] } }
  }

  if (formData.get('exception_date')) {
    const exception = ScheduleExceptionSchema.safeParse({
      exception_date: formData.get('exception_date'),
      exception_type: formData.get('exception_type') || 'bloqueio',
      exception_start: formData.get('exception_start') || '',
      exception_end: formData.get('exception_end') || '',
      exception_reason: formData.get('exception_reason') || undefined,
    })

    if (!exception.success) {
      return { error: { _form: ['Confira a data e os horários da exceção.'] } }
    }

    const needsTime = exception.data.exception_type !== 'fechado'
    if (
      needsTime &&
      !isValidTimeRange(exception.data.exception_start || '', exception.data.exception_end || '')
    ) {
      return { error: { _form: ['Informe início e fim válidos para bloqueio ou horário extra.'] } }
    }

    const { error: exceptionError } = await supabase
      .from('excecoes_horario_estabelecimento')
      .insert({
        estabelecimento_id: establishmentId,
        data: exception.data.exception_date,
        tipo: exception.data.exception_type,
        inicio: needsTime ? exception.data.exception_start : null,
        fim: needsTime ? exception.data.exception_end : null,
        motivo: cleanOptional(exception.data.exception_reason),
      })

    if (exceptionError) return { error: { _form: [exceptionError.message] } }
  }

  revalidatePath('/admin/dashboard')
  revalidatePath('/dono')
  revalidatePath('/')
  return { success: true }
}

export async function updateEstablishmentSettings(formData: FormData): Promise<{
  success?: boolean
  error?: Record<string, string[]>
}> {
  let establishmentId: string
  try {
    establishmentId = await getAdminEstablishmentId(formData.get('establishment_id'))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return { error: { _form: [message] } }
  }

  const parsed = EstablishmentSettingsSchema.safeParse({
    name: formData.get('name'),
    contact: formData.get('contact') || undefined,
    whatsapp_phone: formData.get('whatsapp_phone') || undefined,
    zip_code: formData.get('zip_code') || undefined,
    street: formData.get('street') || undefined,
    number: formData.get('number') || undefined,
    complement: formData.get('complement') || undefined,
    neighborhood: formData.get('neighborhood') || undefined,
    city: formData.get('city') || undefined,
    state: formData.get('state') || undefined,
    slots_per_schedule: formData.get('slots_per_schedule'),
    reminder_hours_before: formData.get('reminder_hours_before') || 12,
  })

  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors as Record<string, string[]> }

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

  const businessHours = DAY_KEYS.reduce<Record<string, { open: string; close: string } | null>>(
    (hours, day) => {
      const enabled = formData.get(`day_${day}_enabled`) === 'on'
      const open = String(formData.get(`day_${day}_open`) || '09:00')
      const close = String(formData.get(`day_${day}_close`) || '18:00')
      hours[day] = enabled ? { open, close } : null
      return hours
    },
    {},
  )

  const supabase = await createClient()
  const { error } = await supabase
    .from('estabelecimentos')
    .update({
      nome: parsed.data.name,
      telefone: parsed.data.contact || null,
      whatsapp: parsed.data.whatsapp_phone || null,
      endereco: address || null,
      cep: zipCode || null,
      rua: parsed.data.street || null,
      numero: parsed.data.number || null,
      complemento: parsed.data.complement || null,
      bairro: parsed.data.neighborhood || null,
      cidade: parsed.data.city || null,
      estado: parsed.data.state || null,
      vagas_por_horario: parsed.data.slots_per_schedule,
      horarios_funcionamento: businessHours,
    })
    .eq('id', establishmentId)

  if (error) return { error: { _form: [friendlyEstablishmentError(error.message)] } }

  revalidatePath('/admin/dashboard')
  return { success: true }
}

export async function updateLogoUrl(
  logoUrl: string,
  requestedEstablishmentId?: string
): Promise<{ success?: boolean; error?: string }> {
  let establishmentId: string
  try {
    establishmentId = await getAdminEstablishmentId(requestedEstablishmentId)
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro desconhecido' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('estabelecimentos')
    .update({ logo_url: logoUrl })
    .eq('id', establishmentId)

  if (error) return { error: error.message }

  revalidatePath('/admin/dashboard')
  return { success: true }
}

export async function uploadLogo(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  let establishmentId: string
  try {
    establishmentId = await getAdminEstablishmentId(formData.get('establishment_id'))
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro desconhecido' }
  }

  const supabase = await createClient()

  const file = formData.get('file')
  if (!(file instanceof Blob)) {
    return { error: 'Arquivo inválido' }
  }

  const MAX_SIZE_BYTES = 2 * 1024 * 1024
  if (file.size > MAX_SIZE_BYTES) {
    return { error: 'O logo deve ter menos de 2MB' }
  }

  const SAFE_EXT: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  const ext = SAFE_EXT[file.type] ?? 'bin'
  const path = `${establishmentId}/logo.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('logos')
    .upload(path, file, { upsert: true })

  if (uploadError) return { error: uploadError.message }

  const { data } = supabase.storage.from('logos').getPublicUrl(path)

  const updateResult = await updateLogoUrl(data.publicUrl, establishmentId)
  if (updateResult.error) return { error: updateResult.error }

  return { url: data.publicUrl }
}

export async function uploadMediaImage(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  let establishmentId: string
  try {
    establishmentId = await getAdminEstablishmentId(formData.get('establishment_id'))
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro desconhecido' }
  }

  const supabase = await createClient()
  const { count, error: countError } = await supabase
    .from('midias_estabelecimento')
    .select('id', { count: 'exact', head: true })
    .eq('estabelecimento_id', establishmentId)
    .eq('tipo', 'imagem')

  if (countError) return { error: countError.message }
  if ((count ?? 0) >= 6) return { error: 'Você já tem 6 fotos. Exclua uma para enviar outra.' }

  const file = formData.get('file')
  if (!(file instanceof Blob)) return { error: 'Arquivo inválido' }

  const MAX_SIZE_BYTES = 5 * 1024 * 1024
  if (file.size > MAX_SIZE_BYTES) return { error: 'A foto deve ter menos de 5MB.' }

  const SAFE_EXT: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  }
  const ext = SAFE_EXT[file.type]
  if (!ext) return { error: 'Envie uma imagem PNG, JPG ou WebP.' }

  const path = `${establishmentId}/gallery-${Date.now()}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('establishment-media')
    .upload(path, file, { upsert: false, contentType: file.type })

  if (uploadError) return { error: uploadError.message }

  const { data } = supabase.storage.from('establishment-media').getPublicUrl(path)
  const { error } = await supabase.from('midias_estabelecimento').insert({
    estabelecimento_id: establishmentId,
    tipo: 'imagem',
    url: data.publicUrl,
    ordem: count ?? 0,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/dashboard')
  revalidatePath('/')
  return { url: data.publicUrl }
}

export async function addMediaVideo(formData: FormData): Promise<{
  success?: boolean
  error?: Record<string, string[]>
}> {
  let establishmentId: string
  try {
    establishmentId = await getAdminEstablishmentId(formData.get('establishment_id'))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return { error: { _form: [message] } }
  }

  const parsed = VideoSchema.safeParse({
    url: formData.get('url'),
    title: formData.get('title') || undefined,
  })

  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  const provider = videoProvider(parsed.data.url)
  if (!provider) {
    return { error: { url: ['Use links do YouTube, TikTok ou Vimeo.'] } }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('midias_estabelecimento').insert({
    estabelecimento_id: establishmentId,
    tipo: 'video',
    url: parsed.data.url,
    titulo: parsed.data.title || provider,
    ordem: 100,
  })

  if (error) return { error: { _form: [error.message] } }

  revalidatePath('/admin/dashboard')
  revalidatePath('/')
  return { success: true }
}

export async function deleteMedia(
  mediaId: string,
  requestedEstablishmentId?: string
): Promise<{ success?: boolean; error?: string }> {
  let establishmentId: string
  try {
    establishmentId = await getAdminEstablishmentId(requestedEstablishmentId)
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro desconhecido' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('midias_estabelecimento')
    .delete()
    .eq('id', mediaId)
    .eq('estabelecimento_id', establishmentId)

  if (error) return { error: error.message }

  revalidatePath('/admin/dashboard')
  revalidatePath('/')
  return { success: true }
}

export async function createServiceFromCatalog(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  let establishmentId: string
  try {
    establishmentId = await getAdminEstablishmentId(formData.get('establishment_id'))
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro desconhecido' }
  }

  const catalogId = z.string().uuid().safeParse(formData.get('catalog_id'))
  if (!catalogId.success) return { error: 'Serviço sugerido inválido.' }

  const supabase = await createClient()
  const { data: catalog, error: catalogError } = await supabase
    .from('service_catalog')
    .select('name, category, default_duration_minutes, default_price_type')
    .eq('id', catalogId.data)
    .single()

  if (catalogError || !catalog) return { error: catalogError?.message ?? 'Serviço não encontrado.' }

  const { error } = await supabase.from('services').insert({
    establishment_id: establishmentId,
    name: catalog.name,
    category: catalog.category,
    duration_minutes: catalog.default_duration_minutes,
    price_type: catalog.default_price_type,
    price: null,
    is_active: true,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/dashboard')
  revalidatePath('/dono')
  return { success: true }
}

export async function suggestService(formData: FormData): Promise<{
  success?: boolean
  error?: Record<string, string[]>
}> {
  let establishmentId: string
  try {
    establishmentId = await getAdminEstablishmentId(formData.get('establishment_id'))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return { error: { _form: [message] } }
  }

  const parsed = z.object({
    suggested_name: z.string().min(2).max(100),
    category: z.string().min(2).max(60).default('Saúde e beleza'),
  }).safeParse({
    suggested_name: formData.get('suggested_name'),
    category: formData.get('category') || 'Saúde e beleza',
  })

  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  const supabase = await createClient()
  const { error } = await supabase.from('service_suggestions').insert({
    establishment_id: establishmentId,
    suggested_name: parsed.data.suggested_name,
    category: parsed.data.category,
  })

  if (error) return { error: { _form: [error.message] } }

  revalidatePath('/admin/dashboard')
  revalidatePath('/dono')
  return { success: true }
}

// ── Gestao de agendamentos ────────────────────────────────────────────────────

export async function confirmAppointment(
  appointmentId: string,
  requestedEstablishmentId?: string,
): Promise<{ success?: boolean; error?: string }> {
  let establishmentId: string
  try {
    establishmentId = await getAdminEstablishmentId(requestedEstablishmentId)
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro desconhecido' }
  }

  const supabase = createAdminClient()
  const actorId = await getAuthenticatedUserId()

  const { data: appointment, error: fetchError } = await supabase
    .from('agendamentos')
    .select('id, status')
    .eq('id', appointmentId)
    .eq('estabelecimento_id', establishmentId)
    .maybeSingle()

  if (fetchError) return { error: fetchError.message }
  if (!appointment) return { error: 'Agendamento não encontrado.' }

  const { error } = await supabase
    .from('agendamentos')
    .update({ status: 'confirmado' })
    .eq('id', appointmentId)
    .eq('estabelecimento_id', establishmentId)

  if (error) return { error: error.message }

  await supabase.rpc('registrar_movimento_agendamento', {
    p_agendamento_id: appointmentId,
    p_codigo_movimento: 'APROVADO_SALAO',
    p_usuario_id: actorId,
    p_status_anterior: appointment.status,
    p_status_novo: 'confirmado',
    p_metadata: {
      origem: 'confirmAppointment',
      estabelecimento_id: establishmentId,
    },
  })

  revalidatePath('/admin/dashboard')
  revalidatePath('/dono')
  return { success: true }
}

export async function refuseAppointment(
  appointmentId: string,
  requestedEstablishmentId?: string,
): Promise<{ success?: boolean; error?: string }> {
  let establishmentId: string
  try {
    establishmentId = await getAdminEstablishmentId(requestedEstablishmentId)
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro desconhecido' }
  }

  const supabase = createAdminClient()
  const actorId = await getAuthenticatedUserId()

  const { data: appointment, error: fetchError } = await supabase
    .from('agendamentos')
    .select('id, status')
    .eq('id', appointmentId)
    .eq('estabelecimento_id', establishmentId)
    .maybeSingle()

  if (fetchError) return { error: fetchError.message }
  if (!appointment) return { error: 'Agendamento não encontrado.' }

  const { data, error } = await supabase
    .from('agendamentos')
    .update({
      status: 'cancelado',
      observacoes: 'Recusado pelo comerciante',
    })
    .eq('id', appointmentId)
    .eq('estabelecimento_id', establishmentId)
    .select('id')
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: 'Agendamento não encontrado.' }

  await supabase.rpc('registrar_movimento_agendamento', {
    p_agendamento_id: appointmentId,
    p_codigo_movimento: 'RECUSADO_SALAO',
    p_usuario_id: actorId,
    p_status_anterior: appointment.status,
    p_status_novo: 'cancelado',
    p_metadata: {
      origem: 'refuseAppointment',
      estabelecimento_id: establishmentId,
    },
  })

  revalidatePath('/admin/dashboard')
  revalidatePath('/dono')
  return { success: true }
}

export async function finalizeAppointment(
  appointmentId: string,
  outcome: 'completed' | 'cancelled' | 'no_show',
  requestedEstablishmentId?: string,
): Promise<{ success?: boolean; error?: string }> {
  let establishmentId: string
  try {
    establishmentId = await getAdminEstablishmentId(requestedEstablishmentId)
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro desconhecido' }
  }

  const supabase = createAdminClient()
  const actorId = await getAuthenticatedUserId()

  const { data: before, error: fetchError } = await supabase
    .from('agendamentos')
    .select('status')
    .eq('id', appointmentId)
    .eq('estabelecimento_id', establishmentId)
    .maybeSingle()

  if (fetchError) return { error: fetchError.message }
  if (!before) return { error: 'Agendamento não encontrado.' }

  const status =
    outcome === 'completed' ? 'concluido' : outcome === 'no_show' ? 'nao_compareceu' : 'cancelado'
  const movementCode =
    outcome === 'completed'
      ? 'CONCLUIDO'
      : outcome === 'no_show'
        ? 'NAO_COMPARECEU'
        : 'CANCELADO_COMERCIANTE'

  const { error } = await supabase
    .from('agendamentos')
    .update({
      status,
    })
    .eq('id', appointmentId)
    .eq('estabelecimento_id', establishmentId)

  if (error) {
    if (error.message.includes('P0002'))
      return { error: 'Este agendamento já está em estado final.' }
    if (error.message.includes('P0003'))
      return { error: 'Transição de status inválida.' }
    return { error: error.message }
  }

  await supabase.rpc('registrar_movimento_agendamento', {
    p_agendamento_id: appointmentId,
    p_codigo_movimento: movementCode,
    p_usuario_id: actorId,
    p_status_anterior: before.status,
    p_status_novo: status,
    p_metadata: {
      origem: 'finalizeAppointment',
      estabelecimento_id: establishmentId,
      outcome,
    },
  })

  revalidatePath('/admin/dashboard')
  revalidatePath('/dono')
  return { success: true }
}
