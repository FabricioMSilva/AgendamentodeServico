'use client'

import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import AddressFields from '@/components/forms/AddressFields'
import { createClient } from '@/lib/supabase/client'

type Mode = 'login' | 'signup'

type Props = {
  initialMode?: Mode
  returnTo?: string
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, '')
}

function phoneToEmail(phone: string) {
  return `phone-${normalizePhone(phone)}@ibeleza.local`
}

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
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const isSignup = mode === 'signup'
  const title = useMemo(
    () => (isSignup ? 'Criar conta' : 'Entrar'),
    [isSignup],
  )

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
            name,
            phone,
            password,
            zip_code: String(form.get('zip_code') ?? ''),
            street: String(form.get('street') ?? ''),
            number: String(form.get('number') ?? ''),
            complement: String(form.get('complement') ?? ''),
            neighborhood: String(form.get('neighborhood') ?? ''),
            city: String(form.get('city') ?? ''),
            state: String(form.get('state') ?? ''),
          }),
        })

        const result = (await response.json()) as { error?: string }
        if (!response.ok) {
          setMessage(result.error ?? 'Não foi possível criar sua conta.')
          return
        }
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setMessage(friendlyAuthError(error.message))
        return
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
            ? 'Use nome, telefone, endereço e senha para criar sua conta.'
            : 'Use nome, telefone e senha para entrar ou criar sua conta.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-full bg-white/5 p-1">
        <button
          type="button"
          onClick={() => setMode('login')}
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
          onClick={() => setMode('signup')}
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
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-white/80">Nome</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Seu nome"
              className="w-full rounded-[8px] border border-white/10 bg-[#11172B] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25"
            />
          </label>
        ) : null}

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-white/80">Telefone</span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="(11) 99999-9999"
            inputMode="tel"
            className="w-full rounded-[8px] border border-white/10 bg-[#11172B] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25"
          />
          <span className="mt-2 block text-xs leading-5 text-white/56">
            Use o mesmo número do seu WhatsApp.
          </span>
        </label>

        {isSignup ? (
          <AddressFields
            title="Endereço de cadastro"
            description="CEP para preencher rua, bairro, cidade e estado automaticamente."
            tone="dark"
          />
        ) : null}

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-white/80">Senha</span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            placeholder="Digite sua senha"
            className="w-full rounded-[8px] border border-white/10 bg-[#11172B] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25"
          />
        </label>

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
