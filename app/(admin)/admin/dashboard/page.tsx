import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ServiceList from '@/components/admin/ServiceList'
import ServiceForm from '@/components/admin/ServiceForm'
import LogoUpload from '@/components/admin/LogoUpload'
import AppointmentBoard from '@/components/admin/AppointmentBoard'
import Card from '@/components/ui/Card'
import type { AppointmentStatus, Service } from '@/database.types'

export const metadata: Metadata = {
  title: 'Painel do Salão | Vip Space',
  description: 'Gerencie seus agendamentos, serviços e perfil do salão.',
}

// Shape of appointment rows joined with profiles + services
type AppointmentRow = {
  id: string
  scheduled_at: string
  status: AppointmentStatus
  profiles: { name: string | null; email: string } | null
  services: { name: string } | null
}

export default async function AdminDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: establishment } = await supabase
    .from('establishments')
    .select('*, services(*)')
    .eq('admin_id', user.id)
    .single()

  if (!establishment) {
    return (
      <main className="p-6">
        <p className="text-sm text-gray-500">
          Nenhum estabelecimento configurado ainda. Entre em contato com o suporte.
        </p>
      </main>
    )
  }

  const { data: rawAppointments } = await supabase
    .from('appointments')
    .select('id, scheduled_at, status, profiles(name, email), services(name)')
    .eq('establishment_id', establishment.id)
    .order('scheduled_at', { ascending: true })

  // Type-narrow the joined rows
  const appointments: AppointmentRow[] = (rawAppointments ?? []).map((a) => ({
    id: a.id,
    scheduled_at: a.scheduled_at,
    status: a.status as AppointmentStatus,
    profiles: Array.isArray(a.profiles) ? (a.profiles[0] ?? null) : a.profiles,
    services: Array.isArray(a.services) ? (a.services[0] ?? null) : a.services,
  }))

  const pending = appointments.filter((a) => a.status === 'pending')
  const confirmed = appointments.filter((a) =>
    (['confirmed', 'checked_in'] as AppointmentStatus[]).includes(a.status)
  )
  const completed = appointments.filter((a) =>
    (['completed', 'cancelled', 'no_show'] as AppointmentStatus[]).includes(a.status)
  )

  const services: Service[] = establishment.services ?? []

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Aviso de suspensão */}
      {establishment.is_blocked && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-700">
            Estabelecimento Suspenso
          </p>
          <p className="text-sm text-red-600 mt-1">
            Seu salão foi suspenso. Novos agendamentos estão pausados. Entre em
            contato com o suporte para resolver.
          </p>
        </div>
      )}

      {/* Cabeçalho */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Painel do Salão</h1>
          <p className="text-lg text-gray-700 mt-1">{establishment.name}</p>
          <p className="text-sm text-gray-400">/{establishment.slug}</p>
        </div>
        <LogoUpload
          establishmentId={establishment.id}
          currentLogoUrl={establishment.logo_url}
        />
      </header>

      {/* Agendamentos */}
      <Card title="Agendamentos">
        <AppointmentBoard
          pendingApproval={pending}
          confirmed={confirmed}
          completedServices={completed}
        />
      </Card>

      {/* Serviços */}
      <Card title="Serviços">
        <ServiceForm />
        <ServiceList services={services} />
      </Card>
    </main>
  )
}
