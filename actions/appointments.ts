'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const BookSchema = z.object({
  establishment_id: z.string().uuid(),
  service_id: z.string().uuid(),
  scheduled_at: z.string().datetime(),
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
    service_id: formData.get('service_id'),
    scheduled_at: formData.get('scheduled_at'),
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const { error } = await supabase.from('appointments').insert({
    customer_id: user.id,
    ...parsed.data,
  })

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

  revalidatePath('/')
  return { success: true }
}
