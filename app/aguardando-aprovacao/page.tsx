import Link from 'next/link'
import LogoutButton from '@/components/auth/LogoutButton'

type Props = {
  searchParams?: Promise<{ tipo?: string }>
}

export default async function WaitingApprovalPage({ searchParams }: Props) {
  const params = await searchParams
  const isEstablishment = params?.tipo === 'estabelecimento'

  return (
    <main className="min-h-screen bg-[#1A2033] px-4 py-8 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-2xl items-center justify-center">
        <div className="w-full rounded-[8px] bg-white/6 p-6 ring-1 ring-white/10">
          <img
            src="/imagens/ibeleza.png"
            alt="IBeleza"
            className="h-auto w-[132px] max-w-full object-contain"
          />
          <p className="mt-5 text-[11px] uppercase tracking-[0.24em] text-[#8FF0F4]">
            Cadastro em análise
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight">
            {isEstablishment
              ? 'Seu estabelecimento está aguardando aprovação.'
              : 'Seu acesso de comerciante está aguardando aprovação.'}
          </h1>
          <p className="mt-4 text-sm leading-6 text-white/72">
            {isEstablishment
              ? 'O Admin VIP precisa revisar o cadastro do negócio antes de liberar sua página e seu painel.'
              : 'O Admin VIP precisa validar seu CNPJ e ativar seu cadastro. Depois disso, ao entrar novamente você será levado ao cadastro do estabelecimento.'}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/buscar"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-white/8 px-5 text-sm font-semibold text-white transition hover:bg-white/12"
            >
              Voltar para busca
            </Link>
            <LogoutButton redirectTo="/login" />
          </div>
        </div>
      </section>
    </main>
  )
}
