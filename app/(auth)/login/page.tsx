import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LoginButton from '@/components/auth/LoginButton'

export default async function LoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect('/')

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f8f3ff_100%)] px-5 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center">
        <div className="w-full space-y-6 rounded-[8px] border border-[#ece4f7] bg-white p-6 shadow-[0_18px_50px_rgba(106,0,255,0.08)]">
          <div className="text-center">
            <img
              src="/imagens/LogoHorizontal.png"
              alt="IBeleza"
              className="mx-auto h-12 w-auto"
            />
            <p className="mt-3 text-sm text-[#6a6a6a]">
              Entre para gerenciar seu negócio de saúde e beleza.
            </p>
          </div>
          <LoginButton />
        </div>
      </div>
    </main>
  )
}
