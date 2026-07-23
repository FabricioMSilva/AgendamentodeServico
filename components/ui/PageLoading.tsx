type PageLoadingProps = {
  label?: string
  variant?: 'public' | 'admin' | 'auth'
}

const variantCopy: Record<NonNullable<PageLoadingProps['variant']>, string> = {
  public: 'Carregando agenda',
  admin: 'Carregando painel',
  auth: 'Carregando acesso',
}

export default function PageLoading({
  label,
  variant = 'public',
}: PageLoadingProps) {
  const displayLabel = label ?? variantCopy[variant]

  return (
    <main className="min-h-screen bg-[#1A2033] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center gap-6">
        <section className="overflow-hidden rounded-[8px] bg-[linear-gradient(180deg,#11172a_0%,#171f38_56%,#241737_100%)] p-5 ring-1 ring-white/10 sm:p-7">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-[18px] bg-[#171F38] shadow-[0_18px_36px_rgba(106,0,255,0.24)] ring-1 ring-white/12">
                <span className="absolute inset-[-8px] animate-ping rounded-[24px] bg-[#FF007F]/18" />
                <img
                  src="/imagens/icon.transparent.png"
                  alt=""
                  className="relative h-11 w-11 animate-[ibeleza-float_1.35s_ease-in-out_infinite] object-contain"
                />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/48">
                  IBeleza
                </p>
                <h1 className="mt-2 font-brand text-3xl leading-none text-white sm:text-4xl">
                  {displayLabel}
                </h1>
              </div>
            </div>

            <div className="flex gap-2">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#00C4CC]" />
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#FF007F] [animation-delay:140ms]" />
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#FF66B2] [animation-delay:280ms]" />
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.75fr]">
            <div className="space-y-3 rounded-[8px] bg-white/5 p-4 ring-1 ring-white/10">
              <SkeletonBlock className="h-4 w-1/3" />
              <SkeletonBlock className="h-12" />
              <SkeletonBlock className="h-12" />
              <SkeletonBlock className="h-12" />
            </div>
            <div className="space-y-3 rounded-[8px] bg-white/5 p-4 ring-1 ring-white/10">
              <SkeletonBlock className="h-4 w-1/2" />
              <SkeletonBlock className="h-28" />
              <SkeletonBlock className="h-10" />
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={[
        'animate-pulse rounded-[8px] bg-[linear-gradient(90deg,rgba(255,255,255,0.07),rgba(255,255,255,0.14),rgba(255,255,255,0.07))]',
        className,
      ].join(' ')}
    />
  )
}
