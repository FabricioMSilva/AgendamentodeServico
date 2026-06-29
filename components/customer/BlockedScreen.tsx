export default function BlockedScreen({ name }: { name: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#f8f3ff_100%)] px-5">
      <div className="w-full max-w-sm space-y-4 rounded-[8px] border border-[#ece4f7] bg-white p-8 text-center shadow-[0_18px_50px_rgba(106,0,255,0.08)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ff007f_0%,#6a00ff_100%)] text-2xl text-white">
          !
        </div>
        <h1 className="text-xl font-bold text-black">Indisponível no momento</h1>
        <p className="text-base font-medium text-[#3a3a3a]">{name}</p>
        <p className="text-sm text-[#6a6a6a]">
          Este estabelecimento está temporariamente indisponível. Entre em contato diretamente com a equipe.
        </p>
      </div>
    </main>
  )
}
