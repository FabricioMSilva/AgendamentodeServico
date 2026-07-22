import LogoutButton from '@/components/auth/LogoutButton'

export default function BlockedAccountPage() {
  return (
    <main className="min-h-screen bg-[#1A2033] px-5 py-8 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center justify-center">
        <div className="w-full rounded-[8px] bg-white/6 p-6 text-center shadow-[0_18px_50px_rgba(0,0,0,0.18)] ring-1 ring-white/10">
          <img
            src="/imagens/ibeleza.png"
            alt="IBeleza"
            className="mx-auto h-auto w-[132px] max-w-full object-contain"
          />
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-[#8FF0F4]">
            Conta bloqueada
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-white">Seu acesso está pausado</h1>
          <p className="mt-3 text-sm leading-6 text-white/68">
            Fale com o suporte ou com o administrador do IBeleza para revisar sua conta.
          </p>
          <div className="mt-6 flex justify-center">
            <LogoutButton redirectTo="/login" />
          </div>
        </div>
      </section>
    </main>
  )
}
