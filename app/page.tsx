import EntryQuiz from '@/components/customer/EntryQuiz'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type InitialIdentity = {
  name: string | null
  email: string | null
}

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const initialIdentity: InitialIdentity | null = user
    ? {
        name:
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          (user.email ? user.email.split('@')[0] : null),
        email: user.email ?? null,
      }
    : null

  return <EntryQuiz initialIdentity={initialIdentity} />
}
