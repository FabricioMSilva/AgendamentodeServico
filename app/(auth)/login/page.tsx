import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LoginButton from '@/components/auth/LoginButton'

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/')

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-sm w-full p-8 bg-white rounded-2xl shadow-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Vip Space</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to continue</p>
        </div>
        <LoginButton />
      </div>
    </main>
  )
}
