'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'

type Props = {
  redirectTo?: string
  className?: string
}

export default function LogoutButton({ redirectTo = '/login', className = '' }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const handleLogout = async () => {
    setBusy(true)

    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.refresh()
      router.push(redirectTo)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={handleLogout}
      loading={busy}
      className={className}
    >
      Sair
    </Button>
  )
}
