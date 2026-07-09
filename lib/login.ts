import { createHash, randomInt } from 'crypto'

export function normalizeLoginPhone(input: string) {
  return input.replace(/\D/g, '')
}

export function toLoginEmail(phoneDigits: string) {
  return `phone-${phoneDigits}@ibeleza.local`
}

export function getLoginPhoneCandidates(input: string) {
  const digits = normalizeLoginPhone(input)
  const compact = digits.startsWith('55') ? digits.slice(2) : digits
  const last11 = digits.slice(-11)
  const last10 = digits.slice(-10)

  return Array.from(
    new Set(
      [digits, compact, `55${compact}`, last11, last10]
        .map((value) => value.replace(/\D/g, ''))
        .filter(Boolean),
    ),
  )
}

export function createLoginCode() {
  return randomInt(100000, 1000000).toString()
}

export function hashLoginCode(phone: string, code: string) {
  const pepper = process.env.LOGIN_CODE_SECRET?.trim() ?? ''
  return createHash('sha256').update(`${phone}:${code}:${pepper}`).digest('hex')
}
