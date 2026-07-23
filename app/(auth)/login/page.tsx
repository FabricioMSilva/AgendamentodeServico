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
    <main className="relative min-h-screen overflow-hidden bg-[#1A2033] px-5 py-8">
      <picture className="absolute inset-0" aria-hidden="true">
        <source
          media="(min-width: 768px)"
          srcSet="/imagens/Fundo_loading_notebook.png"
        />
        <img
          src="/imagens/Fundo_loading_celular.png"
          alt=""
          className="h-full w-full object-cover"
        />
      </picture>
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,127,0.16),transparent_34%),linear-gradient(135deg,rgba(106,0,255,0.20),rgba(17,23,42,0.82)_44%,rgba(0,196,204,0.14)),rgba(17,23,42,0.58)]"
        aria-hidden="true"
      />
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center">
        <CredentialsAuthForm initialMode={initialMode} returnTo={returnTo} />
      </div>
    </main>
  )
}
