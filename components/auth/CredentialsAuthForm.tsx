'use client'

import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import AddressFields from '@/components/forms/AddressFields'
import PhoneField from '@/components/forms/PhoneField'
import { createClient } from '@/lib/supabase/client'
import { normalizePhone } from '@/lib/phone'
import { normalizeName } from '@/lib/name'

type Mode = 'login' | 'signup'
type LoginMethod = 'whatsapp' | 'password'

type Props = {
  initialMode?: Mode
  returnTo?: string
}

function phoneToEmail(phone: string) {
  return `phone-${normalizePhone(phone)}@ibeleza.local`
}

type PhoneCheckState = 'idle' | 'checking' | 'valid' | 'invalid' | 'unavailable'

function friendlyAuthError(message: string) {
  if (
    message.toLowerCase().includes('fetch failed') ||
    message.toLowerCase().includes('failed to fetch') ||
    message.toLowerCase().includes('networkerror')
  ) {
    return 'Não consegui conectar ao Supabase. Confira as chaves do .env.local e reinicie o servidor.'
  }

  return message
}

export default function CredentialsAuthForm({ initialMode = 'login', returnTo = '/' }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loginCode, setLoginCode] = useState('')
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('whatsapp')
  const [loginStep, setLoginStep] = useState<'phone' | 'code'>('phone')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [phoneCheck, setPhoneCheck] = useState<PhoneCheckState>('idle')

  const isSignup = mode === 'signup'
  const phoneDigits = useMemo(() => normalizePhone(phone), [phone])
  const title = useMemo(
    () =>
      isSignup
        ? 'Criar conta'
        : loginMethod === 'password'
          ? 'Entrar'
          : loginStep === 'phone'
            ? 'Enviar código'
            : 'Entrar',
    [isSignup, loginMethod, loginStep],
  )

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
  }, [phoneDigits])

  useEffect(() => {
    setLoginCode('')
    setLoginStep('phone')
    setMessage(null)
  }, [mode])

  useEffect(() => {
    setLoginCode('')
    setPassword('')
    setLoginStep('phone')
    setMessage(null)
  }, [loginMethod])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setMessage(null)

    const supabase = createClient()
    const email = phoneToEmail(phone)
    const form = new FormData(event.currentTarget)

    try {
      if (isSignup) {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: normalizeName(name),
            phone,
            zip_code: String(form.get('zip_code') ?? ''),
            street: String(form.get('street') ?? ''),
            number: String(form.get('number') ?? ''),
            neighborhood: String(form.get('neighborhood') ?? ''),
            city: String(form.get('city') ?? ''),
            state: String(form.get('state') ?? ''),
          }),
        })

        const result = (await response.json()) as { error?: string; tempPassword?: string; email?: string }
        if (!response.ok) {
          setMessage(result.error ?? 'Não foi possível criar sua conta.')
          return
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: result.email ?? email,
          password: result.tempPassword ?? '',
        })

        if (error) {
          setMessage(friendlyAuthError(error.message))
          return
        }
      } else if (loginMethod === 'password') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          setMessage(friendlyAuthError(error.message))
          return
        }
      } else if (loginStep === 'phone') {
        const response = await fetch('/api/auth/login/request-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone,
            channel: loginMethod,
          }),
        })

        const result = (await response.json()) as { error?: string; message?: string }
        if (!response.ok) {
          setMessage(result.error ?? 'Não foi possível enviar o código.')
          return
        }

        setLoginStep('code')
        setMessage(result.message ?? 'Enviamos um código para o seu WhatsApp.')
        return
      } else {
        const response = await fetch('/api/auth/login/verify-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone,
            code: loginCode,
          }),
        })

        const result = (await response.json()) as { error?: string; ok?: boolean; tempPassword?: string }
        if (!response.ok) {
          setMessage(result.error ?? 'Não foi possível validar o código.')
          return
        }

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: result.tempPassword ?? '',
        })

        if (error) {
          setMessage(friendlyAuthError(error.message))
          return
        }
      }

      router.refresh()
      router.push(returnTo)
    } catch (error) {
      setMessage(
        friendlyAuthError(error instanceof Error ? error.message : 'Não foi possível concluir o cadastro.'),
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
        <p className="mt-3 text-sm leading-6 text-white/68 sm:text-base">
          {isSignup
            ? 'Use nome, telefone e endereço básico. Depois preencha só o CEP e número para completar o endereço.'
            : loginMethod === 'password'
              ? 'Use telefone e senha para entrar.'
              : loginStep === 'phone'
                ? 'Use seu telefone para receber um código no WhatsApp e entrar sem senha.'
                : 'Digite o código enviado para o seu WhatsApp.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-full bg-white/5 p-1">
        <button
          type="button"
          onClick={() => {
            setMode('login')
            setLoginStep('phone')
            setLoginCode('')
            setLoginMethod('whatsapp')
          }}
          className={[
            'rounded-full px-4 py-2 text-sm font-semibold transition',
            !isSignup
              ? 'bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] text-white shadow-[0_10px_24px_rgba(106,0,255,0.2)]'
              : 'text-white/76 hover:text-white',
          ].join(' ')}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('signup')
            setLoginStep('phone')
            setLoginCode('')
            setLoginMethod('whatsapp')
          }}
          className={[
            'rounded-full px-4 py-2 text-sm font-semibold transition',
            isSignup
              ? 'bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] text-white shadow-[0_10px_24px_rgba(106,0,255,0.2)]'
              : 'text-white/76 hover:text-white',
          ].join(' ')}
        >
          Criar conta
        </button>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {!isSignup ? (
          <div className="mx-auto w-full max-w-sm">
            <span className="mb-2 block text-sm font-medium text-white/80">Entrar com</span>
            <div className="grid grid-cols-2 gap-2 rounded-full bg-white/5 p-1">
              {[
                { key: 'whatsapp' as const, label: 'WhatsApp' },
                { key: 'password' as const, label: 'Senha' },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setLoginMethod(option.key)}
                  className={[
                    'rounded-full px-4 py-2.5 text-sm font-semibold transition',
                    loginMethod === option.key
                      ? 'bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] text-white shadow-[0_10px_24px_rgba(106,0,255,0.2)]'
                      : 'text-white/76 hover:text-white',
                  ].join(' ')}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {isSignup ? (
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-white/80">Nome</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Seu nome"
              className="w-full rounded-[8px] border border-white/10 bg-[#11172B] px-4 py-3 text-sm uppercase text-white outline-none transition placeholder:text-white/30 focus:border-white/25"
            />
          </label>
        ) : null}

        <PhoneField
          label="Telefone"
          value={phone}
          onChange={setPhone}
          hint="Use o mesmo número do seu WhatsApp."
          status={phoneCheck}
          statusMessage={
            phoneDigits.length >= 10
              ? phoneCheck === 'checking'
                ? 'Validando esse número no WhatsApp...'
                : phoneCheck === 'valid'
                  ? 'Esse número parece estar no WhatsApp.'
                  : phoneCheck === 'invalid'
                    ? 'Não encontrei esse número no WhatsApp. Você ainda pode continuar.'
                    : phoneCheck === 'unavailable'
                      ? 'Não consegui validar agora, mas você pode continuar.'
                      : null
              : null
          }
        />

        {isSignup ? (
          <AddressFields
            title="Endereço de cadastro"
            description="Comece pelo CEP. O resto aparece aos poucos, para não pesar no cadastro."
            tone="dark"
            mode="compact"
            showComplement={false}
          />
        ) : null}

        {!isSignup && loginStep === 'code' ? (
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-white/80">Código do WhatsApp</span>
            <input
              value={loginCode}
              onChange={(event) => setLoginCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              className="w-full rounded-[8px] border border-white/10 bg-[#11172B] px-4 py-3 text-sm uppercase tracking-[0.3em] text-white outline-none transition placeholder:text-white/30 focus:border-white/25"
            />
            <button
              type="button"
              onClick={() => {
                setLoginStep('phone')
                setLoginCode('')
                setMessage('Digite novamente o telefone para reenviar o código.')
              }}
              className="mt-2 text-xs font-semibold text-[#8FF0F4] transition hover:text-white"
              >
              Reenviar código
            </button>
          </label>
        ) : null}

        {!isSignup && loginMethod === 'password' ? (
          <label className="block">
            <span className="mb-2 flex items-center justify-between gap-3 text-sm font-medium text-white/80">
              <span>Senha</span>
              <Link
                href="/recuperar-senha"
                className="text-xs font-semibold text-[#8FF0F4] transition hover:text-white"
              >
                Esqueceu a senha?
              </Link>
            </span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              placeholder="Digite sua senha"
              className="w-full rounded-[8px] border border-white/10 bg-[#11172B] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25"
            />
          </label>
        ) : null}

        {message ? <p className="text-sm text-[#ff8ea8]">{message}</p> : null}

        <Button
          type="submit"
          variant="primary"
          className="w-full rounded-full"
          size="md"
          disabled={busy}
        >
          {busy ? 'Aguarde...' : title}
        </Button>
      </form>
    </div>
  )
}
