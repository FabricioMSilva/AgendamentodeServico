'use client'

import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import OwnerSetupForm from '@/components/owner/OwnerSetupForm'
import type { ServiceCatalogCategory } from '@/lib/services/categories'

export default function NewEstablishmentModal({
  currentCount,
  maxEstablishments,
  catalog,
}: {
  currentCount: number
  maxEstablishments: number
  catalog: ServiceCatalogCategory[]
}) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  return (
    <>
      <div className="rounded-lg bg-[#11172B]/70 p-5 ring-1 ring-white/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
              Novo estabelecimento
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">Abra seu painel de dono</h2>
            <p className="mt-2 text-sm leading-6 text-white/68">
              Crie seu estabelecimento dentro do painel do dono e gerencie agenda, serviços e mídia com um só clique.
            </p>
          </div>

          <Button variant="secondary" size="md" onClick={() => setIsOpen(true)}>
            Abrir formulário
          </Button>
        </div>
      </div>

      {isOpen ? (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-6 sm:items-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-6xl max-h-[calc(100vh-8rem)] overflow-hidden sm:rounded-[18px] rounded-none border border-white/10 bg-[#0f1527] shadow-[0_24px_80px_rgba(0,0,0,0.44)] ring-1 ring-white/10"
          >
            <div className="flex items-center justify-between border-b border-white/10 bg-[#12182b] px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
                  Criar estabelecimento
                </p>
                <h3 className="mt-1 text-lg font-semibold text-white">Abra seu painel do dono</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/8 text-white ring-1 ring-white/15 transition hover:bg-white/15"
                aria-label="Fechar modal"
              >
                ×
              </button>
            </div>
            <div className="max-h-[calc(100vh-8rem)] overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
              <OwnerSetupForm
                currentCount={currentCount}
                maxEstablishments={maxEstablishments}
                catalog={catalog}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
