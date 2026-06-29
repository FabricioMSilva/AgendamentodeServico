import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CredentialsAuthForm from '@/components/auth/CredentialsAuthForm'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string; next?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const params = await searchParams
  const initialMode = params?.mode === 'signup' ? 'signup' : 'login'
  const returnTo = params?.next && params.next.startsWith('/') ? params.next : '/'

  if (user) redirect(returnTo)

  return (
    <main className="min-h-screen bg-[#1A2033] px-5 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center">
        <CredentialsAuthForm initialMode={initialMode} returnTo={returnTo} />
      </div>
    </main>
  )
}
