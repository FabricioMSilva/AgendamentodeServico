'use client'

import { useMemo, useState } from 'react'
import Button from '@/components/ui/Button'
import { formatPostalCode, lookupCep, normalizeCep } from '@/lib/address'

const STATE_OPTIONS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO',
]

type Props = {
  title?: string
  description?: string
  required?: boolean
  tone?: 'light' | 'dark'
  mode?: 'full' | 'compact'
  showComplement?: boolean
  initialValues?: {
    zip_code?: string | null
    street?: string | null
    number?: string | null
    complement?: string | null
    neighborhood?: string | null
    city?: string | null
    state?: string | null
  }
  errors?: Record<string, string[] | undefined>
}

export default function AddressFields({
  title = 'Endereço',
  description = 'CEP para preencher automaticamente rua, bairro, cidade e estado.',
  required = false,
  tone = 'light',
  mode = 'full',
  showComplement = true,
  initialValues,
  errors,
}: Props) {
  const [zipCode, setZipCode] = useState(initialValues?.zip_code ?? '')
  const [street, setStreet] = useState(initialValues?.street ?? '')
  const [number, setNumber] = useState(initialValues?.number ?? '')
  const [complement, setComplement] = useState(initialValues?.complement ?? '')
  const [neighborhood, setNeighborhood] = useState(initialValues?.neighborhood ?? '')
  const [city, setCity] = useState(initialValues?.city ?? '')
  const [state, setState] = useState(initialValues?.state ?? '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [manualEdit, setManualEdit] = useState(mode === 'full')

  const filled = useMemo(
    () => Boolean(street || neighborhood || city || state),
    [street, neighborhood, city, state],
  )

  const handleLookup = async () => {
    const digits = normalizeCep(zipCode)
    if (digits.length !== 8) {
      setMessage('Digite um CEP com 8 números.')
      return
    }

    setLoading(true)
    setMessage(null)
    try {
      const result = await lookupCep(digits)
      if (!result) {
        setMessage('Não encontrei esse CEP. Confira e tente de novo.')
        return
      }

      setZipCode(formatPostalCode(result.zip_code))
      setStreet(result.street)
      setNeighborhood(result.neighborhood)
      setCity(result.city)
      setState(result.state)
      setMessage('Endereço encontrado e preenchido.')
      if (mode === 'compact') {
        setManualEdit(false)
      }
    } catch {
      setMessage('Não consegui buscar o CEP agora.')
    } finally {
      setLoading(false)
    }
  }

  const isDark = tone === 'dark'
  const inputClass = isDark
    ? 'w-full rounded-[8px] border border-white/10 bg-[#11172B] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25'
    : 'w-full rounded-[8px] border border-[#eadfd5] px-3 py-2 text-sm outline-none transition focus:border-[#22201d]'
  const fieldsetClass = isDark
    ? 'space-y-4 rounded-[8px] border border-white/10 bg-white/5 p-4'
    : 'space-y-4 rounded-[8px] border border-[#eadfd5] bg-white p-4'
  const titleClass = isDark
    ? 'text-sm font-semibold text-white'
    : 'text-sm font-semibold text-[#22201d]'
  const descriptionClass = isDark
    ? 'mt-1 text-xs leading-5 text-white/60'
    : 'mt-1 text-xs leading-5 text-[#75685f]'
  const labelClass = isDark
    ? 'mb-1 block text-xs font-medium text-white/72'
    : 'mb-1 block text-xs font-medium text-[#4a433d]'
  const helperClass = isDark ? 'text-xs text-white/55' : 'text-xs text-[#75685f]'
  const messageClass = isDark ? 'text-xs text-[#FF66B2]' : 'text-xs text-[#8b5f49]'
  const summaryClass = isDark
    ? 'rounded-[8px] border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/72'
    : 'rounded-[8px] border border-[#eadfd5] bg-[#faf7f4] px-3 py-2 text-sm text-[#3d342d]'

  const showFullFields = mode === 'full' || manualEdit
  const summaryText = [street, neighborhood, city, state].filter(Boolean).join(' - ')

  return (
    <fieldset className={fieldsetClass}>
      <div>
        <p className={titleClass}>{title}</p>
        <p className={descriptionClass}>{description}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <span className={labelClass}>
            CEP{required ? <span className="ml-0.5 text-red-500">*</span> : null}
          </span>
          <input
            name="zip_code"
            value={zipCode}
            onChange={(event) => setZipCode(formatPostalCode(event.target.value))}
            onBlur={handleLookup}
            inputMode="numeric"
            placeholder="00000-000"
            className={inputClass}
          />
          {errors?.zip_code ? <p className="mt-1 text-xs text-[#ff8ea8]">{errors.zip_code.join(', ')}</p> : null}
        </label>

        <div className="flex items-end">
          <Button
            type="button"
            variant={isDark ? 'ghost' : 'secondary'}
            loading={loading}
            onClick={handleLookup}
            className="w-full rounded-[8px]"
          >
            Buscar CEP
          </Button>
        </div>
      </div>

      {mode === 'compact' && !showFullFields ? (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <label className="block">
              <span className={labelClass}>Número</span>
              <input
                name="number"
                value={number}
                onChange={(event) => setNumber(event.target.value)}
                placeholder="123"
                className={inputClass}
              />
              {errors?.number ? <p className="mt-1 text-xs text-[#ff8ea8]">{errors.number.join(', ')}</p> : null}
            </label>

            {showComplement ? (
              <label className="block">
                <span className={labelClass}>Complemento</span>
                <input
                  name="complement"
                  value={complement}
                  onChange={(event) => setComplement(event.target.value)}
                  placeholder="Opcional"
                  className={inputClass}
                />
                {errors?.complement ? <p className="mt-1 text-xs text-[#ff8ea8]">{errors.complement.join(', ')}</p> : null}
              </label>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setManualEdit(true)}
            className="inline-flex text-sm font-semibold text-[#8FF0F4] transition hover:text-white"
          >
            Preencher endereço completo
          </button>

          <div className={summaryClass}>
            {summaryText || 'Vamos completar o restante depois do CEP.'}
          </div>
        </div>
      ) : null}

      {showFullFields ? (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className={labelClass}>
              Rua{required ? <span className="ml-0.5 text-red-500">*</span> : null}
            </span>
            <input
              name="street"
              value={street}
              onChange={(event) => setStreet(event.target.value)}
              placeholder="Rua, avenida, travessa"
              className={inputClass}
              required={required}
            />
            {errors?.street ? <p className="mt-1 text-xs text-[#ff8ea8]">{errors.street.join(', ')}</p> : null}
          </label>

          <label className="block">
            <span className={labelClass}>Número</span>
            <input
              name="number"
              value={number}
              onChange={(event) => setNumber(event.target.value)}
              placeholder="123"
              className={inputClass}
            />
            {errors?.number ? <p className="mt-1 text-xs text-[#ff8ea8]">{errors.number.join(', ')}</p> : null}
          </label>

          {showComplement ? (
            <label className="block">
              <span className={labelClass}>Complemento</span>
              <input
                name="complement"
                value={complement}
                onChange={(event) => setComplement(event.target.value)}
                placeholder="Apto, sala, bloco"
                className={inputClass}
              />
              {errors?.complement ? <p className="mt-1 text-xs text-[#ff8ea8]">{errors.complement.join(', ')}</p> : null}
            </label>
          ) : null}

          <label className="block">
            <span className={labelClass}>
              Bairro{required ? <span className="ml-0.5 text-red-500">*</span> : null}
            </span>
            <input
              name="neighborhood"
              value={neighborhood}
              onChange={(event) => setNeighborhood(event.target.value)}
              placeholder="Centro"
              className={inputClass}
              required={required}
            />
            {errors?.neighborhood ? <p className="mt-1 text-xs text-[#ff8ea8]">{errors.neighborhood.join(', ')}</p> : null}
          </label>

          <label className="block">
            <span className={labelClass}>
              Cidade{required ? <span className="ml-0.5 text-red-500">*</span> : null}
            </span>
            <input
              name="city"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="São Paulo"
              className={inputClass}
              required={required}
            />
            {errors?.city ? <p className="mt-1 text-xs text-[#ff8ea8]">{errors.city.join(', ')}</p> : null}
          </label>

          <label className="block md:col-span-2">
            <span className={labelClass}>
              Estado{required ? <span className="ml-0.5 text-red-500">*</span> : null}
            </span>
            <select
              name="state"
              value={state}
              onChange={(event) => setState(event.target.value)}
              className={inputClass}
              required={required}
            >
              <option value="">Selecione</option>
              {STATE_OPTIONS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
            {errors?.state ? <p className="mt-1 text-xs text-[#ff8ea8]">{errors.state.join(', ')}</p> : null}
          </label>

          {mode === 'compact' ? (
            <button
              type="button"
              onClick={() => setManualEdit(false)}
              className="inline-flex text-sm font-semibold text-[#8FF0F4] transition hover:text-white"
            >
              Voltar para o modo simples
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <p className={helperClass}>
          {filled ? 'Dá para ajustar qualquer campo antes de salvar.' : 'Digite o CEP para começar.'}
        </p>
        {message ? <p className={messageClass}>{message}</p> : null}
      </div>
    </fieldset>
  )
}
