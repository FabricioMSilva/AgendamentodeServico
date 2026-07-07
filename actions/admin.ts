'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { formatAddress, normalizeCep } from '@/lib/address'
import { decideAppointmentApproval } from '@/lib/appointments/approval'

async function getAdminEstablishmentId(): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data } = await supabase
    .from('establishments')
    .select('id')
    .eq('admin_id', user.id)
    .single()

  if (!data) throw new Error('Nenhum estabelecimento encontrado para este administrador')
  return data.id
}

const ServiceSchema = z.object({
  name: z.string().min(1).max(100),
  price_type: z.enum(['fixed', 'variable']),
  price: z.coerce.number().min(0).optional(),
  duration_minutes: z.coerce.number().int().min(10).max(480).default(30),
  category: z.string().min(2).max(60).default('Saúde e beleza'),
  description: z.string().max(500).optional(),
  image_url: z.string().url().optional().or(z.literal('')),
})

export async function createService(formData: FormData): Promise<{
  success?: boolean
  error?: Record<string, string[]>
}> {
  let establishmentId: string
  try {
    establishmentId = await getAdminEstablishmentId()
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
    category: formData.get('category') || 'Saúde e beleza',
    description: formData.get('description') || undefined,
    image_url: formData.get('image_url') || undefined,
  })

  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  const { error } = await supabase
    .from('services')
    .insert({
      ...parsed.data,
      image_url: parsed.data.image_url || null,
      description: parsed.data.description || null,
      establishment_id: establishmentId,
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
    establishmentId = await getAdminEstablishmentId()
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
    category: formData.get('category') || 'Saúde e beleza',
    description: formData.get('description') || undefined,
    image_url: formData.get('image_url') || undefined,
  })

  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  const supabase = await createClient()
  const { error } = await supabase
    .from('services')
    .update({
      ...parsed.data,
      image_url: parsed.data.image_url || null,
      description: parsed.data.description || null,
    })
    .eq('id', id.data)
    .eq('establishment_id', establishmentId)

  if (error) return { error: { _form: [error.message] } }

  revalidatePath('/admin/dashboard')
  return { success: true }
}

export async function setServiceActive(
  serviceId: string,
  isActive: boolean,
): Promise<{ success?: boolean; error?: string }> {
  let establishmentId: string
  try {
    establishmentId = await getAdminEstablishmentId()
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro desconhecido' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('services')
    .update({ is_active: isActive })
    .eq('id', serviceId)
    .eq('establishment_id', establishmentId)

  if (error) return { error: error.message }

  revalidatePath('/admin/dashboard')
  return { success: true }
}

export async function deleteService(
  serviceId: string
): Promise<{ success?: boolean; error?: string }> {
  let establishmentId: string
  try {
    establishmentId = await getAdminEstablishmentId()
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro desconhecido' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', serviceId)
    .eq('establishment_id', establishmentId)

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

const BusinessHoursSchema = z.object({
  reminder_hours_before: z.coerce.number().int().min(1).max(72).default(24),
  auto_cancel_hours_before: z.coerce.number().int().min(1).max(72).default(4),
  reminder_message: z.string().max(500).optional(),
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
    return 'Seu banco ainda não tem os campos de endereço. Rode a migration supabase/migrations/20240101000004_address_fields.sql no Supabase.'
  }

  return message
}

export async function updateProfileSettings(formData: FormData): Promise<{
  success?: boolean
  error?: Record<string, string[]>
}> {
  let establishmentId: string
  try {
    establishmentId = await getAdminEstablishmentId()
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
    .from('establishments')
    .update({
      name: parsed.data.name,
      contact: cleanOptional(parsed.data.contact),
      phone: cleanOptional(parsed.data.phone),
      email: cleanOptional(parsed.data.email),
      whatsapp_phone: cleanOptional(parsed.data.whatsapp_phone),
      instagram_url: cleanOptional(parsed.data.instagram_url),
      facebook_url: cleanOptional(parsed.data.facebook_url),
      youtube_url: cleanOptional(parsed.data.youtube_url),
      tiktok_url: cleanOptional(parsed.data.tiktok_url),
      business_type: parsed.data.business_type,
      address: address || null,
      zip_code: zipCode || null,
      street: cleanOptional(parsed.data.street),
      number: cleanOptional(parsed.data.number),
      complement: cleanOptional(parsed.data.complement),
      neighborhood: cleanOptional(parsed.data.neighborhood),
      city: cleanOptional(parsed.data.city),
      state: cleanOptional(parsed.data.state),
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
    establishmentId = await getAdminEstablishmentId()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return { error: { _form: [message] } }
  }

  const parsed = BusinessHoursSchema.safeParse({
    reminder_hours_before: formData.get('reminder_hours_before') || 24,
    auto_cancel_hours_before: formData.get('auto_cancel_hours_before') || 4,
    reminder_message: formData.get('reminder_message') || undefined,
  })

  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors as Record<string, string[]> }

  const businessHours = DAY_KEYS.reduce<Record<string, { open: string; close: string } | null>>(
    (hours, day) => {
      const enabled = formData.get(`day_${day}_enabled`) === 'on'
      const open = String(formData.get(`day_${day}_open`) || '08:00')
      const close = String(formData.get(`day_${day}_close`) || '18:00')
      hours[day] = enabled ? { open, close } : null
      return hours
    },
    {},
  )

  const supabase = await createClient()
  const { error } = await supabase
    .from('establishments')
    .update({
      business_hours: businessHours,
      reminder_hours_before: parsed.data.reminder_hours_before,
      auto_cancel_hours_before: parsed.data.auto_cancel_hours_before,
      reminder_message: cleanOptional(parsed.data.reminder_message),
    })
    .eq('id', establishmentId)

  if (error) return { error: { _form: [friendlyEstablishmentError(error.message)] } }

  revalidatePath('/admin/dashboard')
  return { success: true }
}

export async function updateEstablishmentSettings(formData: FormData): Promise<{
  success?: boolean
  error?: Record<string, string[]>
}> {
  let establishmentId: string
  try {
    establishmentId = await getAdminEstablishmentId()
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
    .from('establishments')
    .update({
      ...parsed.data,
      business_hours: businessHours,
      contact: parsed.data.contact || null,
      whatsapp_phone: parsed.data.whatsapp_phone || null,
      address: address || null,
      zip_code: zipCode || null,
      street: parsed.data.street || null,
      number: parsed.data.number || null,
      complement: parsed.data.complement || null,
      neighborhood: parsed.data.neighborhood || null,
      city: parsed.data.city || null,
      state: parsed.data.state || null,
    })
    .eq('id', establishmentId)

  if (error) return { error: { _form: [friendlyEstablishmentError(error.message)] } }

  revalidatePath('/admin/dashboard')
  return { success: true }
}

export async function updateLogoUrl(
  logoUrl: string
): Promise<{ success?: boolean; error?: string }> {
  let establishmentId: string
  try {
    establishmentId = await getAdminEstablishmentId()
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro desconhecido' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('establishments')
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
    establishmentId = await getAdminEstablishmentId()
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

  const updateResult = await updateLogoUrl(data.publicUrl)
  if (updateResult.error) return { error: updateResult.error }

  return { url: data.publicUrl }
}

export async function uploadMediaImage(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  let establishmentId: string
  try {
    establishmentId = await getAdminEstablishmentId()
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro desconhecido' }
  }

  const supabase = await createClient()
  const { count, error: countError } = await supabase
    .from('establishment_media')
    .select('id', { count: 'exact', head: true })
    .eq('establishment_id', establishmentId)
    .eq('media_type', 'image')

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
  const { error } = await supabase.from('establishment_media').insert({
    establishment_id: establishmentId,
    media_type: 'image',
    provider: 'upload',
    url: data.publicUrl,
    sort_order: count ?? 0,
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
    establishmentId = await getAdminEstablishmentId()
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
  const { error } = await supabase.from('establishment_media').insert({
    establishment_id: establishmentId,
    media_type: 'video',
    provider,
    url: parsed.data.url,
    title: parsed.data.title || null,
    sort_order: 100,
  })

  if (error) return { error: { _form: [error.message] } }

  revalidatePath('/admin/dashboard')
  revalidatePath('/')
  return { success: true }
}

export async function deleteMedia(mediaId: string): Promise<{ success?: boolean; error?: string }> {
  let establishmentId: string
  try {
    establishmentId = await getAdminEstablishmentId()
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro desconhecido' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('establishment_media')
    .delete()
    .eq('id', mediaId)
    .eq('establishment_id', establishmentId)

  if (error) return { error: error.message }

  revalidatePath('/admin/dashboard')
  revalidatePath('/')
  return { success: true }
}

export async function createServiceFromCatalog(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  let establishmentId: string
  try {
    establishmentId = await getAdminEstablishmentId()
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
  return { success: true }
}

export async function suggestService(formData: FormData): Promise<{
  success?: boolean
  error?: Record<string, string[]>
}> {
  let establishmentId: string
  try {
    establishmentId = await getAdminEstablishmentId()
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
  return { success: true }
}

// ── Gestao de agendamentos ────────────────────────────────────────────────────

export async function confirmAppointment(
  appointmentId: string
): Promise<{ success?: boolean; error?: string }> {
  let establishmentId: string
  try {
    establishmentId = await getAdminEstablishmentId()
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro desconhecido' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: appointment } = await supabase
    .from('appointments')
    .select('id')
    .eq('id', appointmentId)
    .eq('establishment_id', establishmentId)
    .single()

  if (!appointment) return { error: 'Agendamento não encontrado.' }

  const result = await decideAppointmentApproval({
    appointmentId,
    decision: 'approved',
    actorProfileId: user?.id ?? null,
    notes: 'Aprovado pelo painel administrativo.',
  })
  if (result.error) return { error: result.error }

  revalidatePath('/admin/dashboard')
  return { success: true }
}

export async function finalizeAppointment(
  appointmentId: string,
  outcome: 'completed' | 'cancelled' | 'no_show'
): Promise<{ success?: boolean; error?: string }> {
  let establishmentId: string
  try {
    establishmentId = await getAdminEstablishmentId()
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro desconhecido' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: before } = await supabase
    .from('appointments')
    .select('status, total_price')
    .eq('id', appointmentId)
    .eq('establishment_id', establishmentId)
    .single()

  if (outcome === 'cancelled' && before?.status === 'pending') {
    const result = await decideAppointmentApproval({
      appointmentId,
      decision: 'rejected',
      actorProfileId: user?.id ?? null,
      notes: 'Recusado pelo painel administrativo.',
    })
    if (result.error) return { error: result.error }
    revalidatePath('/admin/dashboard')
    return { success: true }
  }

  const { error } = await supabase
    .from('appointments')
    .update({
      status: outcome,
      owner_decision_at: new Date().toISOString(),
      owner_decision_by: user?.id ?? null,
      customer_confirmation_status: outcome === 'completed' ? 'confirmed' : 'not_requested',
    })
    .eq('id', appointmentId)
    .eq('establishment_id', establishmentId)

  if (error) {
    if (error.message.includes('P0002'))
      return { error: 'Este agendamento já está em estado final.' }
    if (error.message.includes('P0003'))
      return { error: 'Transição de status inválida.' }
    return { error: error.message }
  }

  const eventType =
    outcome === 'completed' ? 'completed' : outcome === 'no_show' ? 'no_show' : 'owner_rejected'

  await supabase.from('appointment_events').insert({
    appointment_id: appointmentId,
    establishment_id: establishmentId,
    actor_profile_id: user?.id ?? null,
    event_type: eventType,
    status_from: before?.status ?? null,
    status_to: outcome,
    amount: outcome === 'completed' ? before?.total_price ?? null : null,
  })

  revalidatePath('/admin/dashboard')
  return { success: true }
}
