type SuperAdminIdentity = {
  email?: string | null
  phone?: string | null
}

function normalizePhone(value: string | null | undefined) {
  return (value ?? '').replace(/\D/g, '')
}

export function isSuperAdmin(identity: SuperAdminIdentity | string | undefined): boolean {
  if (!identity) return false

  const email = typeof identity === 'string' ? identity : identity.email ?? undefined
  const phone = typeof identity === 'string' ? undefined : identity.phone ?? undefined

  const allowedEmails = (process.env.SUPER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  const allowedPhones = (process.env.SUPER_ADMIN_PHONES ?? '24993081222')
    .split(',')
    .map((value) => normalizePhone(value))
    .filter(Boolean)

  if (email && allowedEmails.includes(email.toLowerCase())) {
    return true
  }

  const phoneDigits = normalizePhone(phone)
  return Boolean(phoneDigits && allowedPhones.includes(phoneDigits))
}
