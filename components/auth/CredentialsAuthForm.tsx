'use client'

import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import AddressFields from '@/components/forms/AddressFields'
import PhoneField from '@/components/forms/PhoneField'
import { createClient } from '@/lib/supabase/client'
import { normalizePhone } from '@/lib/phone'
import { normalizeName } from '@/lib/name'

type Mode = 'login' | 'signup'
type AccountType = 'usuario' | 'comerciante'

type Props = {
  initialMode?: Mode
  returnTo?: string
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 drop-shadow-[0_0_7px_rgba(255,102,178,0.55)]"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    >
      {hidden ? (
        <>
          <path d="M3.5 3.5l17 17" />
          <path d="M10.7 10.7a2 2 0 0 0 2.6 2.6" />
          <path d="M9.4 5.6A9.7 9.7 0 0 1 12 5.2c5.2 0 8.4 4 9.2 6.8a10.4 10.4 0 0 1-2.2 3.4" />
          <path d="M6.3 7A11 11 0 0 0 2.8 12c.8 2.8 4 6.8 9.2 6.8a9.2 9.2 0 0 0 3.9-.9" />
        </>
      ) : (
        <>
          <path d="M2.8 12c.8-2.8 4-6.8 9.2-6.8s8.4 4 9.2 6.8c-.8 2.8-4 6.8-9.2 6.8S3.6 14.8 2.8 12z" />
          <circle cx="12" cy="12" r="2.35" />
          <path d="M18.2 5.3l.5-1.5.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5z" />
        </>
      )}
    </svg>
  )
}

const passwordToggleClass =
  'absolute right-2 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#FF66B2]/55 bg-[#25153a]/95 text-[#FFB6E0] shadow-[0_0_18px_rgba(255,0,127,0.24)] transition hover:border-[#8FF0F4]/70 hover:bg-[#33164d] hover:text-[#8FF0F4] focus:outline-none focus:ring-2 focus:ring-[#8FF0F4]/70'

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

async function getSessionTarget(returnTo: string) {
  try {
    const response = await fetch(`/api/auth/session-target?next=${encodeURIComponent(returnTo)}`, {
      cache: 'no-store',
    })
    const result = (await response.json()) as { target?: string }
    return result.target?.startsWith('/') ? result.target : returnTo
  } catch {
    return returnTo
  }
}

export default function CredentialsAuthForm({ initialMode = 'login', returnTo = '/' }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [accountType, setAccountType] = useState<AccountType>('usuario')
  const [documentNumber, setDocumentNumber] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const isSignup = mode === 'signup'
  const phoneDigits = useMemo(() => normalizePhone(phone), [phone])
  const title = isSignup ? 'Criar conta' : 'Entrar'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    window.dispatchEvent(new Event('ibeleza-loading:start'))

    const supabase = createClient()
    const form = new FormData(event.currentTarget)
    let navigating = false

    try {
      if (isSignup) {
        const cleanSignupPassword = signupPassword.trim()
        if (cleanSignupPassword.length < 6) {
          setMessage('Crie uma senha com pelo menos 6 caracteres.')
          return
        }

        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: normalizeName(name),
            phone,
            password: cleanSignupPassword,
            account_type: accountType,
            document: documentNumber,
            zip_code: String(form.get('zip_code') ?? ''),
            street: String(form.get('street') ?? ''),
            number: String(form.get('number') ?? ''),
            neighborhood: String(form.get('neighborhood') ?? ''),
            city: String(form.get('city') ?? ''),
            state: String(form.get('state') ?? ''),
          }),
        })

        const result = (await response.json()) as {
          error?: string
          tempPassword?: string
          phone?: string
          email?: string | null
        }
        if (!response.ok) {
          setMessage(result.error ?? 'Não foi possível criar sua conta.')
          return
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: result.email ?? '',
          password: cleanSignupPassword,
        })

        if (error) {
          setMessage(friendlyAuthError(error.message))
          return
        }
      } else {
        const response = await fetch('/api/auth/login/password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phone }),
        })

        const result = (await response.json()) as { error?: string; email?: string }
        if (!response.ok || !result.email) {
          setMessage(result.error ?? 'Não foi possível preparar o login.')
          return
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: result.email,
          password,
        })

        if (error) {
          setMessage(friendlyAuthError(error.message))
          return
        }
      }

      const target = await getSessionTarget(returnTo)
      navigating = true
      window.location.assign(target)
    } catch (error) {
      setMessage(
        friendlyAuthError(error instanceof Error ? error.message : 'Não foi possível concluir o cadastro.'),
      )
    } finally {
      setBusy(false)
      if (!navigating) {
        window.dispatchEvent(new Event('ibeleza-loading:stop'))
      }
    }
  }

  return (
    <div className="w-full space-y-5 rounded-[8px] bg-white/6 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.18)] sm:p-7">
      <div className="text-center">
        <img
          src="/imagens/LogoHorizontal.transparent.png"
          alt="IBeleza"
          className="mx-auto h-auto w-[220px] max-w-full object-contain sm:w-[260px]"
        />
        <p className="mt-3 text-sm leading-6 text-white/68 sm:text-base">
          {isSignup
            ? 'Use nome, telefone e endereço básico. Depois preencha só o CEP e número para completar o endereço.'
            : 'Use telefone e senha para entrar.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-full bg-white/5 p-1">
        <button
          type="button"
          onClick={() => {
            setMode('login')
            setMessage(null)
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
            setMessage(null)
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
        {isSignup ? (
          <div className="space-y-3 rounded-[8px] bg-white/5 p-3 ring-1 ring-white/10">
            <span className="block text-sm font-medium text-white/80">Tipo de cadastro</span>
            <div className="grid grid-cols-2 gap-2 rounded-full bg-[#11172B] p-1">
              {[
                { key: 'usuario' as const, label: 'Usuário CPF' },
                { key: 'comerciante' as const, label: 'Comerciante CNPJ' },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    setAccountType(option.key)
                    setDocumentNumber('')
                  }}
                  className={[
                    'rounded-full px-3 py-2 text-xs font-semibold transition sm:text-sm',
                    accountType === option.key
                      ? 'bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] text-white'
                      : 'text-white/72 hover:text-white',
                  ].join(' ')}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white/80">
                {accountType === 'comerciante' ? 'CNPJ opcional' : 'CPF opcional'}
              </span>
              <input
                value={documentNumber}
                onChange={(event) => setDocumentNumber(event.target.value.replace(/\D/g, '').slice(0, accountType === 'comerciante' ? 14 : 11))}
                inputMode="numeric"
                placeholder={accountType === 'comerciante' ? '00.000.000/0000-00' : '000.000.000-00'}
                className="w-full rounded-[8px] border border-white/10 bg-[#11172B] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25"
              />
            </label>
            {accountType === 'comerciante' ? (
              <p className="text-xs leading-5 text-amber-100/80">
                O acesso ao painel do comerciante fica aguardando aprovação do Admin VIP.
              </p>
            ) : null}
          </div>
        ) : null}

        {isSignup ? (
          <label className="relative block">
            <span className="mb-2 block text-sm font-medium text-white/80">Nome</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Seu nome"
              className="w-full rounded-[8px] border border-white/10 bg-[#11172B] px-4 py-3 text-sm uppercase text-white outline-none transition placeholder:text-white/30 focus:border-white/25"
            />
          </label>
        ) : null}

        {isSignup ? (
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-white/80">Senha de acesso</span>
            <div className="relative">
              <input
                value={signupPassword}
                onChange={(event) => setSignupPassword(event.target.value)}
                type={showSignupPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Crie sua senha de acesso"
                className="w-full rounded-[8px] border border-white/10 bg-[#11172B] px-4 py-3 pr-14 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25"
              />
              <button
                type="button"
                onClick={() => setShowSignupPassword((value) => !value)}
                className={passwordToggleClass}
                aria-label={showSignupPassword ? 'Ocultar senha' : 'Mostrar senha'}
                title={showSignupPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                <EyeIcon hidden={showSignupPassword} />
              </button>
            </div>
            <span className="mt-2 block text-xs leading-5 text-white/56">
              Essa senha fica na sua conta do Supabase Auth e serve como acesso alternativo.
            </span>
          </label>
        ) : null}

        <PhoneField
          label="Telefone"
          value={phone}
          onChange={setPhone}
          hint="Use esse número para entrar junto com sua senha."
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

        {!isSignup ? (
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
            <div className="relative">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Digite sua senha"
                className="w-full rounded-[8px] border border-white/10 bg-[#11172B] px-4 py-3 pr-14 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className={passwordToggleClass}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                <EyeIcon hidden={showPassword} />
              </button>
            </div>
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
