'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import dayjs from 'dayjs'
import { getWorkingIntervalsForDate, type BusinessHours, type ScheduleException } from '@/lib/schedule/availability'

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

type ActionResult =
  | { success: true; error?: never }
  | { error: Record<string, string[]>; success?: never }

type BookResult =
  | (ActionResult & {
      appointmentId: string
      appointmentCode: string
      scheduled_at: string
      created_at: string
      customer_name: string
      customer_phone: string
    })
  | ActionResult

export async function bookAppointment(formData: FormData): Promise<BookResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  console.log('[bookAppointment] auth user error', userError)
  console.log('[bookAppointment] auth user', user)
  if (!user) {
    console.log('[bookAppointment] user not authenticated')
    return { error: { _form: ['Faça login para agendar.'] } }
  }

  const adminDb = createAdminClient()
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

  const { data: services, error: servicesError } = await adminDb
    .from('servicos')
    .select('id, nome, tipo_preco, preco, duracao_minutos, ativo')
    .eq('estabelecimento_id', parsed.data.establishment_id)
    .in('id', parsed.data.service_ids)
    .eq('ativo', true)

  if (servicesError) {
    console.log('[bookAppointment] servicesError', servicesError)
    return { error: { _form: [servicesError.message] } }
  }

  if (!services || services.length !== parsed.data.service_ids.length) {
    return { error: { _form: ['Um ou mais serviços não estão disponíveis.'] } }
  }

  const orderedServices = parsed.data.service_ids.map((id) => {
    const service = services.find((item) => item.id === id)
    if (!service) throw new Error('Serviço inválido')
    return service
  })

  const totalDuration = orderedServices.reduce(
    (sum, service) => sum + service.duracao_minutos,
    0,
  )
  const fixedPrices = orderedServices
    .filter((service) => service.tipo_preco === 'fixo' && service.preco != null)
    .map((service) => Number(service.preco))
  const totalPrice =
    fixedPrices.length === orderedServices.length
      ? fixedPrices.reduce((sum, price) => sum + price, 0)
      : null

  const requestedStart = dayjs(parsed.data.scheduled_at)
  const requestedEnd = requestedStart.add(totalDuration, 'minute')
  const dayStart = requestedStart.startOf('day')
  const dayEnd = requestedStart.endOf('day')
  const [{ data: establishment, error: establishmentError }, { data: exceptionsRaw }, { data: appointments, error: appointmentsError }] = await Promise.all([
    adminDb
      .from('estabelecimentos')
      .select('horarios_funcionamento')
      .eq('id', parsed.data.establishment_id)
      .maybeSingle(),
    adminDb
      .from('excecoes_horario_estabelecimento')
      .select('id, data, tipo, inicio, fim, motivo')
      .eq('estabelecimento_id', parsed.data.establishment_id)
      .eq('data', requestedStart.format('YYYY-MM-DD')),
    adminDb
      .from('agendamentos')
      .select('horario, duracao_total_minutos')
      .eq('estabelecimento_id', parsed.data.establishment_id)
      .in('status', ['pendente', 'confirmado', 'em_atendimento'])
      .gte('horario', dayStart.toISOString())
      .lt('horario', dayEnd.toISOString()),
  ])

  if (establishmentError) {
    return { error: { _form: [establishmentError.message] } }
  }

  if (!establishment) {
    return { error: { _form: ['Estabelecimento não encontrado.'] } }
  }

  const scheduleExceptions: ScheduleException[] = ((exceptionsRaw ?? []) as {
    id: string
    data: string
    tipo: 'bloqueio' | 'extra' | 'fechado'
    inicio: string | null
    fim: string | null
    motivo: string | null
  }[]).map((exception) => ({
    id: exception.id,
    date: exception.data,
    type: exception.tipo,
    start_time: exception.inicio,
    end_time: exception.fim,
    reason: exception.motivo,
  }))

  const insideWorkSchedule = getWorkingIntervalsForDate(
    requestedStart.toDate(),
    establishment.horarios_funcionamento as BusinessHours,
    scheduleExceptions,
  ).some((interval) => {
    const intervalStart = dayjs(`${requestedStart.format('YYYY-MM-DD')}T${interval.open}`)
    const intervalEnd = dayjs(`${requestedStart.format('YYYY-MM-DD')}T${interval.close}`)
    return !requestedStart.isBefore(intervalStart) && !requestedEnd.isAfter(intervalEnd)
  })

  if (!insideWorkSchedule) {
    return { error: { _form: ['Este horário não está disponível na agenda de trabalho do salão.'] } }
  }

  if (appointmentsError) {
    console.log('[bookAppointment] appointmentsError', appointmentsError)
    return { error: { _form: [appointmentsError.message] } }
  }

  const hasConflict = (appointments ?? []).some((appointment) => {
    const existingStart = dayjs(appointment.horario)
    const existingEnd = existingStart.add(
      appointment.duracao_total_minutos ?? 30,
      'minute',
    )
    return requestedStart.isBefore(existingEnd) && requestedEnd.isAfter(existingStart)
  })

  if (hasConflict) {
    return { error: { _form: ['Este horário acabou de ser ocupado. Escolha outro.'] } }
  }

  const { data: appointment, error } = await adminDb
    .from('agendamentos')
    .insert({
      cliente_id: user.id,
      estabelecimento_id: parsed.data.establishment_id,
      horario: parsed.data.scheduled_at,
      nome_cliente: parsed.data.customer_name,
      telefone_cliente: parsed.data.customer_phone,
      observacoes: parsed.data.notes ?? null,
      preco_total: totalPrice ?? 0,
      duracao_total_minutos: totalDuration,
    })
    .select('id, codigo, horario, criado_em')
    .single()

  if (error) {
    console.log('[bookAppointment] insert appointment error', error)
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

  const { error: itemError } = await adminDb.from('itens_agendamento').insert(
    orderedServices.map((service) => ({
      agendamento_id: appointment.id,
      servico_id: service.id,
      nome_servico: service.nome,
      tipo_preco: service.tipo_preco,
      preco: service.preco,
      duracao_minutos: service.duracao_minutos,
    })),
  )

  if (itemError) {
    console.log('[bookAppointment] insert items error', itemError)
    return { error: { _form: [itemError.message] } }
  }

  revalidatePath('/')
  return {
    success: true,
    appointmentId: appointment.id,
    appointmentCode: appointment.codigo,
    scheduled_at: appointment.horario,
    created_at: appointment.criado_em ?? new Date().toISOString(),
    customer_name: parsed.data.customer_name,
    customer_phone: parsed.data.customer_phone,
  }
}

export async function cancelAppointment(appointmentId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const adminDb = createAdminClient()
  const { data: appointment, error: fetchError } = await adminDb
    .from('agendamentos')
    .select('status, cliente_id, estabelecimento_id')
    .eq('id', appointmentId)
    .single()

  if (fetchError) return { error: { _form: [fetchError.message] } }
  if (!appointment) return { error: { _form: ['Agendamento não encontrado.'] } }
  if (appointment.cliente_id !== user.id) {
    return { error: { _form: ['Este agendamento não pertence a você.'] } }
  }

  if (appointment.status === 'cancelado') {
    return { error: { _form: ['Este agendamento já foi cancelado.'] } }
  }

  const previousStatus = appointment.status
  const { error } = await adminDb.from('agendamentos').update({
    status: 'cancelado',
    observacoes: 'Cancelado pelo cliente',
  })
  .eq('id', appointmentId)

  if (error) return { error: { _form: [error.message] } }

  await adminDb.rpc('registrar_movimento_agendamento', {
    p_agendamento_id: appointmentId,
    p_codigo_movimento: 'CANCELADO_CLIENTE',
    p_usuario_id: user.id,
    p_status_anterior: previousStatus,
    p_status_novo: 'cancelado',
    p_metadata: {
      origem: 'cancelAppointment',
      estabelecimento_id: appointment.estabelecimento_id,
    },
  })

  revalidatePath('/')
  return { success: true }
}
