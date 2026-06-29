'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

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

const EstablishmentSettingsSchema = z.object({
  name: z.string().min(2).max(100),
  address: z.string().max(200).optional(),
  contact: z.string().max(100).optional(),
  whatsapp_phone: z.string().max(30).optional(),
  slots_per_schedule: z.coerce.number().int().min(1).max(48),
  reminder_hours_before: z.coerce.number().int().min(1).max(72).default(12),
})

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
    address: formData.get('address') || undefined,
    contact: formData.get('contact') || undefined,
    whatsapp_phone: formData.get('whatsapp_phone') || undefined,
    slots_per_schedule: formData.get('slots_per_schedule'),
    reminder_hours_before: formData.get('reminder_hours_before') || 12,
  })

  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors as Record<string, string[]> }

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
      address: parsed.data.address || null,
      contact: parsed.data.contact || null,
      whatsapp_phone: parsed.data.whatsapp_phone || null,
    })
    .eq('id', establishmentId)

  if (error) return { error: { _form: [error.message] } }

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

// ── Appointment management ────────────────────────────────────────────────────

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

  const { error } = await supabase
    .from('appointments')
    .update({ status: 'confirmed' })
    .eq('id', appointmentId)
    .eq('establishment_id', establishmentId)

  if (error) return { error: error.message }

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

  const { error } = await supabase
    .from('appointments')
    .update({ status: outcome })
    .eq('id', appointmentId)
    .eq('establishment_id', establishmentId)

  if (error) {
    if (error.message.includes('P0002'))
      return { error: 'Este agendamento já está em estado final.' }
    if (error.message.includes('P0003'))
      return { error: 'Transição de status inválida.' }
    return { error: error.message }
  }

  revalidatePath('/admin/dashboard')
  return { success: true }
}
