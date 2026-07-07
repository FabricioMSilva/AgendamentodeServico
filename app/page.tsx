import EntryQuiz from '@/components/customer/EntryQuiz'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type InitialIdentity = {
  name: string | null
  email: string | null
}

export default async function Home() {
  const hasSupabaseConfig =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  if (!hasSupabaseConfig) {
    return (
      <main className="min-h-screen bg-[#121829] text-white">
        <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
          <div className="rounded-[24px] border border-white/10 bg-[#0f1527]/90 p-10 shadow-[0_30px_120px_rgba(0,0,0,0.4)]">
            <h1 className="text-4xl font-semibold text-white">Aguardando configuração</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-white/70">
              O aplicativo está funcionando, mas não foi possível conectar ao Supabase.
            </p>
            <p className="mt-4 text-sm text-white/50">
              Se você estiver usando este site sem ambiente configurado, algumas funcionalidades podem ficar indisponíveis.
            </p>
          </div>
        </div>
      </main>
    )
  }

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
