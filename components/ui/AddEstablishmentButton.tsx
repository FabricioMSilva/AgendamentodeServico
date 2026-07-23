'use client'

import { useState } from 'react'
import NewEstablishmentModal from '@/components/owner/NewEstablishmentModal'
import type { ServiceCatalog } from '@/lib/services/catalog-server'

type Props = {
  currentCount: number
  maxEstablishments: number
  catalog: ServiceCatalog
  showLabel?: boolean
}

export default function AddEstablishmentButton({ currentCount, maxEstablishments, catalog, showLabel = true }: Props) {
  const [showModal, setShowModal] = useState(false)
  const canAdd = currentCount < maxEstablishments

  if (!canAdd) return null

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
      >
        {showLabel ? '+ Loja' : '+'}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white">
            <button
              onClick={() => setShowModal(false)}
              className="sticky top-4 right-4 float-right rounded-lg bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
            >
              ✕
            </button>
            <div className="p-6">
              <NewEstablishmentModal
                currentCount={currentCount}
                maxEstablishments={maxEstablishments}
                catalog={catalog}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
