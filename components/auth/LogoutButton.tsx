'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'

type Props = {
  redirectTo?: string
  className?: string
  label?: string
}

export default function LogoutButton({ redirectTo = '/login', className = '', label = 'Sair' }: Props) {
  const [busy, setBusy] = useState(false)

  const handleLogout = async () => {
    setBusy(true)
    window.dispatchEvent(new Event('ibeleza-loading:start'))

    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      window.location.assign(redirectTo)
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
      {label}
    </Button>
  )
}
