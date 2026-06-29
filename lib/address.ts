export type AddressParts = {
  zip_code?: string | null
  street?: string | null
  number?: string | null
  complement?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
}

export type AddressLookup = {
  zip_code: string
  street: string
  neighborhood: string
  city: string
  state: string
}

export function normalizeCep(value: string) {
  return value.replace(/\D/g, '').slice(0, 8)
}

export function formatPostalCode(value: string) {
  const digits = normalizeCep(value)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`
}

export function formatAddress(parts: AddressParts) {
  const street = parts.street?.trim() ?? ''
  const number = parts.number?.trim() ?? ''
  const complement = parts.complement?.trim() ?? ''
  const neighborhood = parts.neighborhood?.trim() ?? ''
  const city = parts.city?.trim() ?? ''
  const state = parts.state?.trim() ?? ''

  const firstLine = [street, number].filter(Boolean).join(', ')
  const secondLine = [neighborhood, city, state].filter(Boolean).join(' - ')
  const finalParts = [firstLine, secondLine, complement].filter(Boolean)

  return finalParts.join(' | ')
}

export async function lookupCep(cep: string): Promise<AddressLookup | null> {
  const digits = normalizeCep(cep)
  if (digits.length !== 8) return null

  const response = await fetch(`/api/address/cep/${digits}`, { cache: 'no-store' })
  if (!response.ok) return null

  const data = (await response.json()) as {
    zip_code?: string
    street?: string
    neighborhood?: string
    city?: string
    state?: string
  }

  if (!data.street && !data.neighborhood && !data.city && !data.state) return null

  return {
    zip_code: data.zip_code ?? digits,
    street: data.street ?? '',
    neighborhood: data.neighborhood ?? '',
    city: data.city ?? '',
    state: data.state ?? '',
  }
}
