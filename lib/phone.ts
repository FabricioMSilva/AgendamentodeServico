export function normalizePhone(value: string) {
  return value.replace(/\D/g, '')
}

export function formatBrazilPhone(value: string) {
  const digits = normalizePhone(value).slice(0, 11)
  if (!digits) return ''

  if (digits.length <= 2) return `(${digits}`

  const area = digits.slice(0, 2)
  const rest = digits.slice(2)

  if (digits.length <= 6) return `(${area}) ${rest}`
  if (digits.length <= 10) {
    return `(${area}) ${rest.slice(0, 4)}-${rest.slice(4)}`
  }

  return `(${area}) ${rest.slice(0, 5)}-${rest.slice(5)}`
}
