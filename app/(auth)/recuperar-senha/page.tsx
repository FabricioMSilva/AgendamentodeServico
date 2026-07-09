import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PasswordRecoveryForm from '@/components/auth/PasswordRecoveryForm'

export const dynamic = 'force-dynamic'

export default async function RecoverPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/')

  return (
    <main className="min-h-screen bg-[#1A2033] px-5 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center">
        <PasswordRecoveryForm />
      </div>
    </main>
  )
}
