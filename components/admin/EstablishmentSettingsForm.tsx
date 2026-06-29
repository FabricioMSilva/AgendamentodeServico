'use client'

import { useState } from 'react'
import { updateEstablishmentSettings } from '@/actions/admin'
import Button from '@/components/ui/Button'
import type { Establishment } from '@/database.types'
import AddressFields from '@/components/forms/AddressFields'

type BusinessHours = Record<string, { open: string; close: string } | null>

const DAYS = [
  ['0', 'Domingo'],
  ['1', 'Segunda'],
  ['2', 'Terça'],
  ['3', 'Quarta'],
  ['4', 'Quinta'],
  ['5', 'Sexta'],
  ['6', 'Sábado'],
] as const

export default function EstablishmentSettingsForm({
  establishment,
}: {
  establishment: Establishment
}) {
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const hours = (establishment.business_hours as BusinessHours) ?? {}

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setErrors({})
    setMessage(null)
    const result = await updateEstablishmentSettings(new FormData(event.currentTarget))
    if (result.error) {
      setErrors(result.error)
    } else {
      setMessage('Configurações salvas.')
    }
    setPending(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <input
          name="name"
          defaultValue={establishment.name}
          placeholder="Nome do estabelecimento"
          required
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          name="contact"
          defaultValue={establishment.contact ?? ''}
          placeholder="Telefone visível"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          name="whatsapp_phone"
          defaultValue={establishment.whatsapp_phone ?? ''}
          placeholder="WhatsApp para confirmações"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          name="slots_per_schedule"
          type="number"
          min="1"
          max="48"
          defaultValue={establishment.slots_per_schedule}
          placeholder="Encaixes por dia"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          name="reminder_hours_before"
          type="number"
          min="1"
          max="72"
          defaultValue={establishment.reminder_hours_before}
          placeholder="Lembrete antes em horas"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <AddressFields
        title="Endereço do negócio"
        description="Use o CEP para preencher rua, bairro, cidade e estado automaticamente."
        initialValues={{
          zip_code: establishment.zip_code ?? null,
          street: establishment.street ?? null,
          number: establishment.number ?? null,
          complement: establishment.complement ?? null,
          neighborhood: establishment.neighborhood ?? null,
          city: establishment.city ?? null,
          state: establishment.state ?? null,
        }}
      />

      <div className="grid gap-2">
        {DAYS.map(([key, label]) => {
          const day = hours[key]
          return (
            <div
              key={key}
              className="grid gap-3 rounded-lg border border-gray-200 p-3 sm:grid-cols-[120px_1fr_1fr]"
            >
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  name={`day_${key}_enabled`}
                  type="checkbox"
                  defaultChecked={Boolean(day)}
                />
                {label}
              </label>
              <input
                name={`day_${key}_open`}
                type="time"
                defaultValue={day?.open ?? '09:00'}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                name={`day_${key}_close`}
                type="time"
                defaultValue={day?.close ?? '18:00'}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          O lembrete 12h antes fica pronto para automação via WhatsApp.
        </p>
        <Button type="submit" loading={pending}>
          Salvar agenda
        </Button>
      </div>

      {message && <p className="text-sm text-green-700">{message}</p>}
      {errors._form && <p className="text-sm text-red-600">{errors._form.join(', ')}</p>}
    </form>
  )
}
