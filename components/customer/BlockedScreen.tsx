export default function BlockedScreen({ name }: { name: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-sm w-full text-center p-8 space-y-4">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <span className="text-2xl" role="img" aria-label="bloqueado">
            🚫
          </span>
        </div>
        <h1 className="text-xl font-bold">{name}</h1>
        <p className="text-base font-semibold text-gray-800">Indisponível no momento</p>
        <p className="text-sm text-gray-600">
          Este salão está temporariamente indisponível. Entre em contato diretamente com o salão.
        </p>
      </div>
    </main>
  )
}
