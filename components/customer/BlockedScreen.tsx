export default function BlockedScreen({ name }: { name: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#1A2033] px-5">
      <div className="w-full max-w-sm space-y-4 rounded-[8px] bg-white/8 p-8 text-center ring-1 ring-white/10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[8px] bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] text-2xl text-white shadow-[0_16px_30px_rgba(106,0,255,0.26)]">
          !
        </div>
        <h1 className="font-brand text-2xl text-white">Indisponível no momento</h1>
        <p className="text-base font-medium text-white/82">{name}</p>
        <p className="text-sm leading-6 text-white/62">
          Este estabelecimento está temporariamente indisponível. Entre em contato diretamente com a equipe.
        </p>
      </div>
    </main>
  )
}
