import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import BlockedScreen from '@/components/customer/BlockedScreen'
import BookingForm from '@/components/customer/BookingForm'
import type { Service } from '@/database.types'

type BusinessHours = Record<string, { open: string; close: string } | null>

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: establishment } = await supabase
    .from('establishments')
    .select('name')
    .eq('slug', slug)
    .single()

  const name = establishment?.name ?? 'Salão'
  return {
    title: `${name} | Vip Space`,
    description: `Agende seu horário em ${name}.`,
  }
}

export default async function SlugPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: establishment } = await supabase
    .from('establishments')
    .select('*, services(*)')
    .eq('slug', slug)
    .single()

  if (!establishment) notFound()

  if (establishment.is_blocked) {
    return <BlockedScreen name={establishment.name} />
  }

  type EstablishmentWithServices = typeof establishment & {
    services: Service[]
  }

  const est = establishment as EstablishmentWithServices

  return (
    <main className="max-w-lg mx-auto p-6 space-y-6">
      <header>
        {est.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={est.logo_url}
            alt={`${est.name} logo`}
            className="w-20 h-20 rounded-2xl object-cover border mb-4"
          />
        )}
        <h1 className="text-2xl font-bold">{est.name}</h1>
        {est.address && (
          <p className="text-sm text-gray-500">{est.address}</p>
        )}
      </header>
      <BookingForm
        establishmentId={est.id}
        services={est.services ?? []}
        businessHours={(est.business_hours as BusinessHours) ?? {}}
        slotsPerSchedule={est.slots_per_schedule}
      />
    </main>
  )
}
