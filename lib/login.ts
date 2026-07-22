import { createHash, randomInt } from 'crypto'
import { canonicalizeBrazilPhoneDigits, normalizePhone, toBrazilAuthPhone } from '@/lib/phone'

export function normalizeLoginPhone(input: string) {
  return canonicalizeBrazilPhoneDigits(input)
}

export function toLoginAuthPhone(phoneDigits: string) {
  return toBrazilAuthPhone(phoneDigits)
}

export function getLegacyLoginEmailCandidates(input: string) {
  const digits = normalizeLoginPhone(input)
  const candidates = getLoginPhoneCandidates(input).map((candidate) => {
    const canonical = canonicalizeBrazilPhoneDigits(candidate)
    return `phone-${canonical}@ibeleza.local`
  })

  return Array.from(
    new Set([
      ...candidates,
      `phone-${digits}@ibeleza.local`,
      `phone-${canonicalizeBrazilPhoneDigits(digits)}@ibeleza.local`,
    ]),
  )
}

export function getLoginPhoneCandidates(input: string) {
  const digits = canonicalizeBrazilPhoneDigits(input)
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
