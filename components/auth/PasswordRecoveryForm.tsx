'use client'

import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import PhoneField from '@/components/forms/PhoneField'
import { normalizePhone } from '@/lib/phone'

type RecoveryChannel = 'whatsapp' | 'sms'
type PhoneCheckState = 'idle' | 'checking' | 'valid' | 'invalid' | 'unavailable'

export default function PasswordRecoveryForm() {
  const [phone, setPhone] = useState('')
  const [channel, setChannel] = useState<RecoveryChannel>('whatsapp')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [phoneCheck, setPhoneCheck] = useState<PhoneCheckState>('idle')
  const phoneDigits = useMemo(() => normalizePhone(phone), [phone])

  useEffect(() => {
    if (phoneDigits.length < 10) {
      setPhoneCheck('idle')
      return
    }

    let active = true
    const timer = window.setTimeout(async () => {
      setPhoneCheck('checking')

      try {
        const response = await fetch('/api/whatsapp/check-number', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phone: phoneDigits }),
        })

        const result = (await response.json()) as { exists?: boolean | null }
        if (!active) return

        if (result.exists === true) {
          setPhoneCheck('valid')
        } else if (result.exists === false) {
          setPhoneCheck('invalid')
          if (channel === 'whatsapp') {
            setChannel('sms')
          }
        } else {
          setPhoneCheck('unavailable')
        }
      } catch {
        if (active) setPhoneCheck('unavailable')
      }
    }, 550)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [channel, phoneDigits])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    setError(null)

    try {
      const response = await fetch('/api/auth/recover-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, channel }),
      })
      const result = (await response.json()) as { message?: string; error?: string }

      if (!response.ok) {
        setError(result.error ?? 'Não foi possível solicitar a recuperação.')
        return
      }

      setMessage(
        result.message ??
          'Se o telefone estiver cadastrado, você receberá uma senha temporária pelo canal escolhido.',
      )
      setPhone('')
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível solicitar a recuperação.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="w-full space-y-5 rounded-[8px] bg-white/6 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.18)] sm:p-7">
      <div className="text-center">
        <img
          src="/imagens/ibeleza.png"
          alt="IBeleza"
          className="mx-auto h-auto w-[132px] max-w-full object-contain sm:w-[156px]"
        />
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8FF0F4]">
          Recuperar acesso
        </p>
        <h1 className="mt-3 text-2xl font-semibold leading-tight text-white">
          Receba uma senha temporária
        </h1>
        <p className="mt-3 text-sm leading-6 text-white/68 sm:text-base">
          Informe o telefone cadastrado. Se ele existir na sua conta, enviaremos uma senha temporária por WhatsApp ou SMS.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <span className="mb-2 block text-sm font-medium text-white/80">Receber por</span>
          <div className="grid grid-cols-2 gap-2 rounded-full bg-white/5 p-1">
            {[
              { key: 'whatsapp' as const, label: 'WhatsApp' },
              { key: 'sms' as const, label: 'SMS' },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setChannel(option.key)}
                className={[
                  'rounded-full px-4 py-2 text-sm font-semibold transition',
                  channel === option.key
                    ? 'bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] text-white shadow-[0_10px_24px_rgba(106,0,255,0.2)]'
                    : 'text-white/76 hover:text-white',
                ].join(' ')}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <PhoneField
          label="Telefone cadastrado"
          value={phone}
          onChange={setPhone}
          hint="Digite o mesmo número usado no cadastro."
          status={phoneCheck}
          statusMessage={
            phoneDigits.length >= 10
              ? phoneCheck === 'checking'
                ? 'Validando esse número no WhatsApp...'
                : phoneCheck === 'valid'
                  ? 'Esse número parece estar no WhatsApp.'
                  : phoneCheck === 'invalid'
                    ? 'Não encontrei WhatsApp nesse número. Troque para SMS se preferir.'
                    : phoneCheck === 'unavailable'
                      ? 'Não consegui validar agora, mas ainda posso enviar a recuperação.'
                      : null
              : null
          }
        />

        {error ? <p className="text-sm text-[#ff8ea8]">{error}</p> : null}
        {message ? (
          <p className="rounded-[8px] border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm leading-6 text-emerald-100">
            {message}
          </p>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          className="w-full rounded-full"
          size="md"
          disabled={busy || normalizePhone(phone).length < 10}
        >
          {busy ? 'Enviando...' : channel === 'whatsapp' ? 'Enviar pelo WhatsApp' : 'Enviar por SMS'}
        </Button>
      </form>

      <Link
        href="/login?mode=login"
        className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-white/8 px-4 text-sm font-semibold text-white transition hover:bg-white/12"
      >
        Voltar para entrar
      </Link>
    </div>
  )
}
