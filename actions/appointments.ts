'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import dayjs from 'dayjs'

const BookSchema = z.object({
  establishment_id: z.string().uuid(),
  service_ids: z
    .string()
    .transform((value, ctx) => {
      try {
        return JSON.parse(value)
      } catch {
        ctx.addIssue({ code: 'custom', message: 'Carrinho inválido' })
        return z.NEVER
      }
    })
    .pipe(z.array(z.string().uuid()).min(1).max(6)),
  scheduled_at: z.string().datetime(),
  customer_name: z.string().min(2).max(100),
  customer_phone: z.string().min(8).max(30),
  notes: z.string().max(500).optional(),
})

type BookResult =
  | { success: true; error?: never }
  | { error: Record<string, string[]>; success?: never }

export async function bookAppointment(formData: FormData): Promise<BookResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const parsed = BookSchema.safeParse({
    establishment_id: formData.get('establishment_id'),
    service_ids: formData.get('service_ids'),
    scheduled_at: formData.get('scheduled_at'),
    customer_name: formData.get('customer_name'),
    customer_phone: formData.get('customer_phone'),
    notes: formData.get('notes') || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('id, name, price_type, price, duration_minutes, is_active')
    .eq('establishment_id', parsed.data.establishment_id)
    .in('id', parsed.data.service_ids)
    .eq('is_active', true)

  if (servicesError) return { error: { _form: [servicesError.message] } }

  if (!services || services.length !== parsed.data.service_ids.length) {
    return { error: { _form: ['Um ou mais serviços não estão disponíveis.'] } }
  }

  const orderedServices = parsed.data.service_ids.map((id) => {
    const service = services.find((item) => item.id === id)
    if (!service) throw new Error('Serviço inválido')
    return service
  })

  const totalDuration = orderedServices.reduce(
    (sum, service) => sum + service.duration_minutes,
    0,
  )
  const fixedPrices = orderedServices
    .filter((service) => service.price_type === 'fixed' && service.price != null)
    .map((service) => Number(service.price))
  const totalPrice =
    fixedPrices.length === orderedServices.length
      ? fixedPrices.reduce((sum, price) => sum + price, 0)
      : null

  const requestedStart = dayjs(parsed.data.scheduled_at)
  const requestedEnd = requestedStart.add(totalDuration, 'minute')
  const { data: appointments, error: appointmentsError } = await supabase
    .from('appointments')
    .select('scheduled_at, total_duration_minutes')
    .eq('establishment_id', parsed.data.establishment_id)
    .in('status', ['pending', 'confirmed', 'checked_in'])
    .gte('scheduled_at', requestedStart.startOf('day').toISOString())
    .lt('scheduled_at', requestedStart.endOf('day').toISOString())

  if (appointmentsError) return { error: { _form: [appointmentsError.message] } }

  const hasConflict = (appointments ?? []).some((appointment) => {
    const existingStart = dayjs(appointment.scheduled_at)
    const existingEnd = existingStart.add(
      appointment.total_duration_minutes ?? 30,
      'minute',
    )
    return requestedStart.isBefore(existingEnd) && requestedEnd.isAfter(existingStart)
  })

  if (hasConflict) {
    return { error: { _form: ['Este horário acabou de ser ocupado. Escolha outro.'] } }
  }

  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert({
      customer_id: user.id,
      establishment_id: parsed.data.establishment_id,
      service_id: orderedServices[0].id,
      scheduled_at: parsed.data.scheduled_at,
      customer_name: parsed.data.customer_name,
      customer_phone: parsed.data.customer_phone,
      notes: parsed.data.notes ?? null,
      total_price: totalPrice,
      total_duration_minutes: totalDuration,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '42501') {
      return {
        error: {
          _form: [
            'Não foi possível agendar: você pode estar bloqueado ou ter atingido o limite de agendamentos.',
          ],
        },
      }
    }
    return { error: { _form: [error.message] } }
  }

  const { error: itemError } = await supabase.from('appointment_items').insert(
    orderedServices.map((service) => ({
      appointment_id: appointment.id,
      service_id: service.id,
      service_name: service.name,
      price_type: service.price_type,
      price: service.price,
      duration_minutes: service.duration_minutes,
    })),
  )

  if (itemError) return { error: { _form: [itemError.message] } }

  revalidatePath('/')
  return { success: true }
}
