'use client'

import { useState } from 'react'
import { updateBusinessHours } from '@/actions/admin'
import Button from '@/components/ui/Button'
import type { Establishment } from '@/database.types'

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

const inputClass =
  'rounded-[8px] border border-white/10 bg-[#11172B] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25'

export default function BusinessHoursForm({ establishment }: { establishment: Establishment }) {
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const hours = (establishment.business_hours as BusinessHours) ?? {}

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setMessage(null)
    setErrors({})
    const result = await updateBusinessHours(new FormData(event.currentTarget))
    if (result.error) {
      setErrors(result.error)
    } else {
      setMessage('Funcionamento salvo.')
    }
    setPending(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errors._form ? (
        <p className="rounded-[8px] bg-[#ff8ea8]/12 p-3 text-sm text-[#ff8ea8] ring-1 ring-[#ff8ea8]/20">
          {errors._form.join(', ')}
        </p>
      ) : null}

      <div className="grid gap-3">
        {DAYS.map(([key, label]) => {
          const day = hours[key]
          const defaultEnabled = key !== '0' && day !== null
          return (
            <div
              key={key}
              className="grid gap-3 rounded-[8px] border border-white/10 bg-white/5 p-3 sm:grid-cols-[140px_1fr_1fr]"
            >
              <label className="flex items-center gap-2 text-sm font-medium text-white/80">
                <input
                  name={`day_${key}_enabled`}
                  type="checkbox"
                  defaultChecked={Boolean(day ?? defaultEnabled)}
                  className="h-4 w-4 accent-[#FF007F]"
                />
                {label}
              </label>
              <input
                name={`day_${key}_open`}
                type="time"
                defaultValue={day?.open ?? '08:00'}
                className={inputClass}
              />
              <input
                name={`day_${key}_close`}
                type="time"
                defaultValue={day?.close ?? '18:00'}
                className={inputClass}
              />
            </div>
          )
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-white/80">Lembrete antes</span>
          <input
            name="reminder_hours_before"
            type="number"
            min={1}
            max={72}
            defaultValue={establishment.reminder_hours_before ?? 24}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-white/80">Cancelar se não confirmar até</span>
          <input
            name="auto_cancel_hours_before"
            type="number"
            min={1}
            max={72}
            defaultValue={establishment.auto_cancel_hours_before ?? 4}
            className={inputClass}
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-white/80">Mensagem padrão do lembrete</span>
        <textarea
          name="reminder_message"
          rows={4}
          defaultValue={establishment.reminder_message ?? 'Olá! Passando para lembrar do seu agendamento. Você confirma sua presença?'}
          className={`${inputClass} w-full`}
        />
      </label>

      <div className="flex items-center justify-between gap-3">
        {message ? <p className="text-sm text-emerald-100">{message}</p> : <p className="text-xs text-white/55">Domingos começam como folga. Ative quando quiser abrir.</p>}
        <Button type="submit" loading={pending} disabled={pending}>
          Salvar funcionamento
        </Button>
      </div>
    </form>
  )
}
