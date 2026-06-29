import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CredentialsAuthForm from '@/components/auth/CredentialsAuthForm'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect('/')

  const params = await searchParams
  const initialMode = params?.mode === 'signup' ? 'signup' : 'login'

  return (
    <main className="min-h-screen bg-[#1A2033] px-5 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center">
        <CredentialsAuthForm initialMode={initialMode} />
      </div>
    </main>
  )
}
