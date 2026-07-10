'use client'

import { useEffect } from 'react'

async function clearCaches() {
  if (!('caches' in window)) return

  const cacheNames = await caches.keys()
  await Promise.all(cacheNames.map((name) => caches.delete(name)))
}

export default function PwaCleanup() {
  useEffect(() => {
    let active = true

    const cleanup = async () => {
      try {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations()
          await Promise.all(registrations.map((registration) => registration.unregister()))
        }

        await clearCaches()

        if (active && 'serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().catch(() => null)
        }
      } catch {
        // Ignora falhas de limpeza para nao quebrar a app.
      }
    }

    void cleanup()

    return () => {
      active = false
    }
  }, [])

  return null
}
