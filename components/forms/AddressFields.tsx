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
  initialValues?: {
    zip_code?: string | null
    street?: string | null
    number?: string | null
    complement?: string | null
    neighborhood?: string | null
    city?: string | null
    state?: string | null
  }
}

export default function AddressFields({
  title = 'Endereço',
  description = 'CEP para preencher automaticamente rua, bairro, cidade e estado.',
  required = false,
  initialValues,
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
    } catch {
      setMessage('Não consegui buscar o CEP agora.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-[8px] border border-[#eadfd5] px-3 py-2 text-sm outline-none transition focus:border-[#22201d]'

  return (
    <fieldset className="space-y-4 rounded-[8px] border border-[#eadfd5] bg-white p-4">
      <div>
        <p className="text-sm font-semibold text-[#22201d]">{title}</p>
        <p className="mt-1 text-xs leading-5 text-[#75685f]">{description}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[#4a433d]">
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
        </label>

        <div className="flex items-end">
          <Button
            type="button"
            variant="secondary"
            loading={loading}
            onClick={handleLookup}
            className="w-full rounded-[8px]"
          >
            Buscar CEP
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className="mb-1 block text-xs font-medium text-[#4a433d]">
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
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[#4a433d]">Número</span>
          <input
            name="number"
            value={number}
            onChange={(event) => setNumber(event.target.value)}
            placeholder="123"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[#4a433d]">Complemento</span>
          <input
            name="complement"
            value={complement}
            onChange={(event) => setComplement(event.target.value)}
            placeholder="Apto, sala, bloco"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[#4a433d]">
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
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[#4a433d]">
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
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1 block text-xs font-medium text-[#4a433d]">
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
        </label>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[#75685f]">
          {filled ? 'Dá para ajustar qualquer campo antes de salvar.' : 'Digite o CEP para começar.'}
        </p>
        {message ? <p className="text-xs text-[#8b5f49]">{message}</p> : null}
      </div>
    </fieldset>
  )
}
