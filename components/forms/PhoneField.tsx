'use client'

import type { ChangeEvent } from 'react'
import { formatBrazilPhone, normalizePhone } from '@/lib/phone'

type PhoneStatus = 'idle' | 'checking' | 'valid' | 'invalid' | 'unavailable'

type Props = {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  status?: PhoneStatus
  statusMessage?: string | null
}

function BrazilFlagIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 28 28"
      className="h-7 w-7"
    >
      <circle cx="14" cy="14" r="14" fill="#009739" />
      <path d="M14 5.4 23 14l-9 8.6L5 14z" fill="#FEDD00" />
      <circle cx="14" cy="14" r="4.8" fill="#012169" />
      <path
        d="M9.8 12.9c2.9-.9 6.2-.6 9.4.9"
        fill="none"
        stroke="#fff"
        strokeLinecap="round"
        strokeWidth="1.2"
      />
    </svg>
  )
}

export default function PhoneField({
  label,
  value,
  onChange,
  hint = 'Use o mesmo número do seu WhatsApp.',
  status = 'idle',
  statusMessage = null,
}: Props) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(formatBrazilPhone(event.target.value))
  }

  const phoneDigits = normalizePhone(value)

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-white/80">{label}</span>

      <div className="flex overflow-hidden rounded-[8px] border border-white/10 bg-[#11172B] focus-within:border-white/25">
        <div className="flex min-w-[76px] items-center gap-2 border-r border-white/10 px-3 text-sm text-white/78">
          <span
            className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full shadow-[0_0_0_1px_rgba(255,255,255,0.12)]"
            aria-label="Brasil"
          >
            <BrazilFlagIcon />
          </span>
          <span className="text-xs font-semibold text-white/72">+55</span>
        </div>

        <input
          value={value}
          onChange={handleChange}
          placeholder="(11) 99999-9999"
          inputMode="tel"
          autoComplete="tel-national"
          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
        />
      </div>

      <span className="mt-2 block text-xs leading-5 text-white/56">{hint}</span>

      {phoneDigits.length >= 10 ? (
        <p
          className={[
            'mt-2 text-xs leading-5',
            status === 'valid'
              ? 'text-emerald-300'
              : status === 'invalid'
                ? 'text-[#ff8ea8]'
                : 'text-white/56',
          ].join(' ')}
        >
          {statusMessage ??
            (status === 'checking'
              ? 'Validando esse número no WhatsApp...'
              : status === 'valid'
                ? 'Esse número parece estar no WhatsApp.'
                : status === 'invalid'
                  ? 'Não encontrei esse número no WhatsApp.'
                  : status === 'unavailable'
                    ? 'Não consegui validar agora, mas você pode continuar.'
                    : null)}
        </p>
      ) : null}
    </label>
  )
}
