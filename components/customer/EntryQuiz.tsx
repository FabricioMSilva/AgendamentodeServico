'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { getNeedInfo } from '@/lib/search/needs'

type Role = 'cliente' | 'negocio' | null
type Access = 'visitante' | 'autenticado' | null
type ClientNeed = 'Cortar cabelo' | 'Fazer unha' | 'Depilação' | 'Estética' | 'Clínica' | 'Outro' | null
type SearchMode = 'estabelecimento' | 'horario' | null
type BusinessType = 'Salão' | 'Clínica' | 'Estética' | 'Barbearia' | 'Spa' | 'Outro' | null

type InitialIdentity = {
  name: string | null
  email: string | null
} | null

const clientNeedOptions: Exclude<ClientNeed, null>[] = [
  'Cortar cabelo',
  'Fazer unha',
  'Depilação',
  'Estética',
  'Clínica',
  'Outro',
]

const searchModeOptions: Array<{ label: string; value: Exclude<SearchMode, null>; helper: string }> = [
  {
    label: 'Ver estabelecimentos',
    value: 'estabelecimento',
    helper: 'Primeiro escolher o lugar, depois a agenda.',
  },
  {
    label: 'Ver por horário',
    value: 'horario',
    helper: 'Ir direto para a vaga livre do dia.',
  },
]

const businessTypeOptions: Exclude<BusinessType, null>[] = [
  'Salão',
  'Clínica',
  'Estética',
  'Barbearia',
  'Spa',
  'Outro',
]

function getGreetingLabel(referenceDate = new Date()) {
  const hour = referenceDate.getHours()

  if (hour >= 6 && hour < 12) return 'Bom dia'
  if (hour >= 12 && hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function getDisplayName(identity: InitialIdentity) {
  if (!identity?.name) return null
  const trimmed = identity.name.trim()
  return trimmed.length > 0 ? trimmed : null
}

export default function EntryQuiz({ initialIdentity = null }: { initialIdentity?: InitialIdentity }) {
  const [role, setRole] = useState<Role>(null)
  const [access, setAccess] = useState<Access>(initialIdentity ? 'autenticado' : null)
  const [displayName, setDisplayName] = useState<string | null>(getDisplayName(initialIdentity))
  const [clientNeed, setClientNeed] = useState<ClientNeed>(null)
  const [searchMode, setSearchMode] = useState<SearchMode>(null)
  const [businessType, setBusinessType] = useState<BusinessType>(null)
  const [animateIn, setAnimateIn] = useState(true)

  useEffect(() => {
    if (!initialIdentity) return
    setAccess('autenticado')
    setDisplayName(getDisplayName(initialIdentity))
  }, [initialIdentity])

  const viewKey = useMemo(
    () =>
      `${access ?? 'none'}:${role ?? 'none'}:${clientNeed ?? 'none'}:${searchMode ?? 'none'}:${businessType ?? 'none'}`,
    [access, businessType, clientNeed, role, searchMode],
  )

  useEffect(() => {
    setAnimateIn(false)
    const timer = window.setTimeout(() => setAnimateIn(true), 25)
    return () => window.clearTimeout(timer)
  }, [viewKey])

  const greetingLabel = getGreetingLabel()
  const greetingText = access === 'autenticado' && displayName ? `${greetingLabel}, ${displayName}` : greetingLabel
  const searchNeed = clientNeed ? getNeedInfo(clientNeed).key : null
  const resultsHref =
    role === 'cliente' && clientNeed && searchMode
      ? `/buscar?need=${encodeURIComponent(searchNeed ?? 'Outro')}&mode=${searchMode}`
      : '/buscar'

  const panelClass = [
    'w-full max-w-xl p-0',
    'transition-all duration-300 ease-out',
    animateIn ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
  ].join(' ')

  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-[#1A2033] text-white">
      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-3xl flex-col items-center justify-center px-5 py-6 md:px-8">
        <img
          src="/imagens/ibeleza.png"
          alt="IBeleza"
          className="h-auto w-[120px] max-w-full object-contain sm:w-[145px] md:w-[185px]"
        />

        <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.24em] text-white/70 sm:text-xs">
          {access === 'autenticado' ? greetingText : 'Olá'}
        </p>

        <div className={[panelClass, 'mt-8'].join(' ')}>
          {access === null ? (
            <div className="text-center">
              <p className="text-2xl font-semibold leading-tight text-white sm:text-3xl md:text-4xl">
                Como você quer continuar?
              </p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/72 sm:text-base">
                Entre ou crie sua conta com telefone e senha. Se preferir, siga como convidado.
              </p>

              <div className="mx-auto mt-7 grid w-full max-w-[360px] gap-3">
                <Link
                  href="/login?mode=signup"
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] px-5 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  Criar conta
                </Link>

                <Link
                  href="/login?mode=login"
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-white/8 px-5 text-sm font-semibold text-white transition hover:bg-white/12"
                >
                  Entrar
                </Link>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full rounded-full"
                  onClick={() => setAccess('visitante')}
                >
                  Convidado
                </Button>
              </div>
            </div>
          ) : role === null ? (
            <div className="text-center">
              <p className="mt-3 text-2xl font-semibold leading-tight text-white sm:text-3xl md:text-4xl">
                Quem vai usar o IBeleza?
              </p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/72 sm:text-base">
                Escolha uma opção e eu te levo para a pergunta certa.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {[
                  {
                    key: 'cliente' as const,
                    label: 'Sou Cliente',
                    helper: 'Quero ver preço, procedimento e horário.',
                  },
                  {
                    key: 'negocio' as const,
                    label: 'Sou Dono',
                    helper: 'Quero cadastrar meu negócio e organizar a agenda.',
                  },
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setRole(option.key)}
                    className="min-h-20 rounded-full bg-white/8 px-5 py-4 text-center text-white transition hover:bg-white/12 sm:min-h-24"
                  >
                    <span className="block text-sm font-semibold sm:text-base">{option.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-white/70 sm:text-sm">
                      {option.helper}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : role === 'cliente' ? (
            clientNeed === null ? (
              <div className="text-center">
                <p className="text-xl font-semibold text-white sm:text-2xl md:text-[2rem]">O que você procura?</p>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/72 sm:text-base">
                  Toque no serviço e eu sigo com a próxima pergunta.
                </p>

                <div className="mt-7 flex flex-wrap justify-center gap-2 sm:gap-3">
                  {clientNeedOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setClientNeed(option)}
                      className="rounded-full bg-white/8 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/12 sm:px-5 sm:py-3"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ) : searchMode === null ? (
              <div className="text-center">
                <p className="text-xl font-semibold text-white sm:text-2xl md:text-[2rem]">Como você quer buscar?</p>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/72 sm:text-base">
                  Você escolheu <span className="font-semibold text-white">{clientNeed.toLowerCase()}</span>.
                </p>

                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  {searchModeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSearchMode(option.value)}
                      className="rounded-full bg-white/8 px-5 py-4 text-center transition hover:bg-white/12 sm:py-5"
                    >
                      <span className="block text-sm font-semibold text-white sm:text-base">{option.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-white/68 sm:text-sm">{option.helper}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-xl font-semibold text-white sm:text-2xl md:text-[2rem]">Pronto</p>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/72 sm:text-base">
                  Vamos mostrar os melhores resultados para <span className="font-semibold text-white">{clientNeed.toLowerCase()}</span>.
                </p>

                <div className="mt-7 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="p-0 text-xs leading-5 text-white/70 sm:text-sm">
                    {searchMode === 'horario'
                      ? 'Você vai direto para os horários livres do dia.'
                      : 'Você vai primeiro escolher o estabelecimento e depois ver a agenda.'}
                  </div>
                  <Link
                    href={resultsHref}
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] px-5 text-sm font-semibold text-white transition hover:opacity-90 sm:w-auto"
                  >
                    Ver agora
                  </Link>
                </div>
              </div>
            )
          ) : businessType === null ? (
            <div className="text-center">
              <p className="text-xl font-semibold text-white sm:text-2xl md:text-[2rem]">
                Que tipo de negócio você quer cadastrar?
              </p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/72 sm:text-base">
                Escolha uma categoria e eu sigo com o cadastro guiado.
              </p>

              <div className="mt-7 flex flex-wrap justify-center gap-2 sm:gap-3">
                {businessTypeOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setBusinessType(option)}
                    className="rounded-full bg-white/8 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/12 sm:px-5 sm:py-3"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-xl font-semibold text-white sm:text-2xl md:text-[2rem]">Cadastro guiado do negócio</p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/72 sm:text-base">
                Você escolheu <span className="font-semibold text-white">{businessType.toLowerCase()}</span>.
                Agora basta entrar ou criar sua conta para continuar.
              </p>

              <div className="mx-auto mt-7 w-full max-w-[360px]">
                <Link
                  href="/login?mode=signup"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] px-5 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  Criar conta e continuar
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
