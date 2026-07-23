import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  mapEstabelecimento,
  mapMidiaEstabelecimento,
  toLegacyAppointmentStatus,
  type AgendamentoPortugues,
} from '@/lib/supabase/portuguese-schema-adapter'
import type { AppointmentStatus, EstablishmentMedia, Service } from '@/database.types'
import type { ScheduleException } from '@/lib/schedule/availability'

export type MerchantAppointment = {
  id: string
  appointment_code: string
  scheduled_at: string
  status: AppointmentStatus
  customer_name: string | null
  customer_phone: string | null
  total_price: number | null
  total_duration_minutes: number
  profiles: { name: string | null; email: string } | null
  services: { name: string } | null
  appointment_items: {
    service_name: string
    price: number | null
    duration_minutes: number
  }[]
}

export type MerchantEstablishmentNavItem = {
  id: string
  name: string
  slug: string
  blocked: boolean
}

type SearchParamsInput = Promise<{ establishment?: string } | undefined> | { establishment?: string } | undefined

async function readSearchParams(searchParams?: SearchParamsInput) {
  return searchParams && 'then' in searchParams ? await searchParams : searchParams
}

export async function getMerchantContext(searchParams?: SearchParamsInput) {
  const params = await readSearchParams(searchParams)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('usuarios')
    .select('nivel_acesso, comerciante_status, comerciante_ativo, conta_bloqueada')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.conta_bloqueada) redirect('/conta-bloqueada')
  if (profile?.comerciante_status !== 'aprovado' || !profile?.comerciante_ativo) {
    redirect('/aguardando-aprovacao')
  }

  const db = createAdminClient()
  const { data: establishments } = await db
    .from('estabelecimentos')
    .select('*, servicos(*)')
    .eq('usuario_admin_id', user.id)
    .eq('status_aprovacao', 'aprovado')
    .order('criado_em', { ascending: true })

  if (!establishments || establishments.length === 0) redirect('/dono')

  const selectedEstablishment =
    establishments.find((item) => item.id === params?.establishment) ?? establishments[0]
  const est = mapEstabelecimento(selectedEstablishment)

  return {
    db,
    user,
    rawEstablishments: establishments,
    selectedEstablishment,
    est,
    navEstablishments: establishments.map((item) => ({
      id: item.id,
      name: item.nome,
      slug: item.slug,
      blocked: item.bloqueado,
    })) satisfies MerchantEstablishmentNavItem[],
  }
}

export async function getMerchantAppointments(establishmentId: string) {
  const db = createAdminClient()
  const historyStart = new Date()
  historyStart.setDate(historyStart.getDate() - 90)

  const { data: rawAppointments } = await db
    .from('agendamentos')
    .select('id, codigo, horario, status, nome_cliente, telefone_cliente, preco_total, duracao_total_minutos, usuarios(nome, email), itens_agendamento(nome_servico, preco, duracao_minutos)')
    .eq('estabelecimento_id', establishmentId)
    .gte('horario', historyStart.toISOString())
    .order('horario', { ascending: true })
    .limit(500)

  return ((rawAppointments ?? []) as AgendamentoPortugues[]).map((appointment) => ({
    id: appointment.id,
    appointment_code: appointment.codigo,
    scheduled_at: appointment.horario,
    status: toLegacyAppointmentStatus(appointment.status),
    customer_name: appointment.nome_cliente,
    customer_phone: appointment.telefone_cliente,
    total_price: appointment.preco_total,
    total_duration_minutes: appointment.duracao_total_minutos,
    profiles: (() => {
      const profile = Array.isArray(appointment.usuarios)
        ? (appointment.usuarios[0] ?? null)
        : appointment.usuarios
      return profile ? { name: profile.nome, email: profile.email ?? '' } : null
    })(),
    services: null,
    appointment_items: (appointment.itens_agendamento ?? []).map((item) => ({
      service_name: item.nome_servico,
      price: item.preco,
      duration_minutes: item.duracao_minutos,
    })),
  })) satisfies MerchantAppointment[]
}

export async function getMerchantMedia(establishmentId: string) {
  const db = createAdminClient()
  const { data: mediaRaw } = await db
    .from('midias_estabelecimento')
    .select('*')
    .eq('estabelecimento_id', establishmentId)
    .order('ordem', { ascending: true })
    .order('criado_em', { ascending: true })

  return ((mediaRaw ?? []) as Parameters<typeof mapMidiaEstabelecimento>[0][])
    .map(mapMidiaEstabelecimento) as EstablishmentMedia[]
}

export async function getMerchantScheduleExceptions(establishmentId: string) {
  const db = createAdminClient()
  const { data } = await db
    .from('excecoes_horario_estabelecimento')
    .select('id, data, tipo, inicio, fim, motivo')
    .eq('estabelecimento_id', establishmentId)
    .gte('data', new Date().toISOString().slice(0, 10))
    .order('data', { ascending: true })
    .limit(100)

  return ((data ?? []) as {
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
  })) satisfies ScheduleException[]
}

export function splitMerchantAppointments(appointments: MerchantAppointment[]) {
  const pending = appointments.filter((appointment) => appointment.status === 'pending')
  const confirmed = appointments.filter((appointment) =>
    (['confirmed', 'checked_in'] as AppointmentStatus[]).includes(appointment.status),
  )
  const completed = appointments.filter((appointment) =>
    (['completed', 'cancelled', 'no_show'] as AppointmentStatus[]).includes(appointment.status),
  )

  return { pending, confirmed, completed }
}

export function getMerchantServices(est: { services?: Service[] }) {
  return est.services ?? []
}
