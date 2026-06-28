'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSuperAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const EstablishmentSchema = z.object({
  name: z.string().min(2).max(100),
  owner_email: z.string().email(),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  address: z.string().max(200).optional(),
  contact: z.string().max(100).optional(),
  slots_per_schedule: z.coerce.number().int().min(1).max(200).default(10),
})

async function assertSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isSuperAdmin(user.email)) throw new Error('Forbidden')
}

export async function createEstablishment(formData: FormData) {
  await assertSuperAdmin()

  const parsed = EstablishmentSchema.safeParse({
    name: formData.get('name'),
    owner_email: formData.get('owner_email'),
    slug: formData.get('slug'),
    address: formData.get('address') || undefined,
    contact: formData.get('contact') || undefined,
    slots_per_schedule: formData.get('slots_per_schedule'),
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  // Cast to any: Database stub uses Record<string,unknown> so table-level types
  // resolve to never for insert/update. Cast is safe — service role client has
  // unrestricted access and schema is enforced by Supabase at runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any

  // Check if owner already has an account — handle race with trigger
  const { data: existingProfile } = await db
    .from('profiles')
    .select('id')
    .eq('email', parsed.data.owner_email)
    .single()

  const { data: establishment, error } = await db
    .from('establishments')
    .insert({
      ...parsed.data,
      // Pre-link admin_id if user already exists (trigger only fires on signup)
      admin_id: existingProfile?.id ?? null,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { error: { slug: ['This slug is already taken'] } }
    }
    return { error: { _form: [error.message] } }
  }

  // If owner already exists, also update their role to admin
  if (existingProfile && establishment) {
    await db
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', existingProfile.id)
  }

  revalidatePath('/sales/dashboard')
  return { success: true, id: establishment.id }
}

export async function setEstablishmentBlocked(
  establishmentId: string,
  isBlocked: boolean
) {
  await assertSuperAdmin()

  // Cast to any: Database stub uses Record<string,unknown> — see createEstablishment
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any
  const { error } = await db
    .from('establishments')
    .update({ is_blocked: isBlocked })
    .eq('id', establishmentId)

  if (error) return { error: error.message }

  revalidatePath('/sales/dashboard')
  return { success: true }
}
