'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateBusinessHours } from '@/actions/admin'
import Button from '@/components/ui/Button'
import type { Establishment } from '@/database.types'
import {
  normalizeBusinessHours,
  type BusinessHourRange,
  type ScheduleException,
} from '@/lib/schedule/availability'

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
  'rounded-[8px] border border-white/10 bg-[#11172B] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25'

function defaultRanges(day: string, ranges: BusinessHourRange[]) {
  if (ranges.length > 0) return ranges
  if (day === '0') return []
  return [{ open: '09:00', close: '12:00' }, { open: '13:00', close: '18:00' }]
}

function exceptionLabel(type: ScheduleException['type']) {
  if (type === 'extra') return 'Horário extra'
  if (type === 'fechado') return 'Folga'
  return 'Bloqueio'
}

export default function BusinessHoursForm({
  establishment,
  exceptions = [],
}: {
  establishment: Establishment
  exceptions?: ScheduleException[]
}) {
  const router = useRouter()
  const initialHours = normalizeBusinessHours(establishment.business_hours)
  const [weeklyHours, setWeeklyHours] = useState<Record<string, BusinessHourRange[]>>(() =>
    DAYS.reduce<Record<string, BusinessHourRange[]>>((acc, [day]) => {
      acc[day] = defaultRanges(day, initialHours[day] ?? [])
      return acc
    }, {}),
  )
  const [enabledDays, setEnabledDays] = useState<Record<string, boolean>>(() =>
    DAYS.reduce<Record<string, boolean>>((acc, [day]) => {
      acc[day] = (initialHours[day] ?? []).length > 0
      return acc
    }, {}),
  )
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const updateRange = (day: string, index: number, field: keyof BusinessHourRange, value: string) => {
    setWeeklyHours((current) => ({
      ...current,
      [day]: current[day].map((range, rangeIndex) =>
        rangeIndex === index ? { ...range, [field]: value } : range,
      ),
    }))
  }

  const addRange = (day: string) => {
    setEnabledDays((current) => ({ ...current, [day]: true }))
    setWeeklyHours((current) => ({
      ...current,
      [day]: [...(current[day] ?? []), { open: '09:00', close: '18:00' }],
    }))
  }

  const removeRange = (day: string, index: number) => {
    setWeeklyHours((current) => {
      const next = current[day].filter((_, rangeIndex) => rangeIndex !== index)
      return { ...current, [day]: next.length > 0 ? next : [{ open: '09:00', close: '18:00' }] }
    })
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setMessage(null)
    setErrors({})
    const result = await updateBusinessHours(new FormData(event.currentTarget))
    if (result.error) {
      setErrors(result.error)
    } else {
      setMessage('Agenda de trabalho salva.')
      event.currentTarget.reset()
      router.refresh()
    }
    setPending(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" name="establishment_id" value={establishment.id} />
      {errors._form ? (
        <p className="rounded-[8px] bg-[#ff8ea8]/12 p-3 text-sm text-[#ff8ea8] ring-1 ring-[#ff8ea8]/20">
          {errors._form.join(', ')}
        </p>
      ) : null}

      <section className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8FF0F4]">
            Semana padrão
          </p>
          <p className="mt-1 text-sm text-white/58">
            Defina os períodos que ficam disponíveis para clientes agendarem.
          </p>
        </div>

        <div className="grid gap-3">
          {DAYS.map(([key, label]) => (
            <div key={key} className="rounded-[8px] border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-white">
                  <input
                    name={`day_${key}_enabled`}
                    type="checkbox"
                    checked={enabledDays[key]}
                    onChange={(event) => setEnabledDays((current) => ({ ...current, [key]: event.target.checked }))}
                    className="h-4 w-4 accent-[#FF007F]"
                  />
                  {label}
                </label>
                <button
                  type="button"
                  onClick={() => addRange(key)}
                  className="rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold text-white/75 ring-1 ring-white/10 transition hover:bg-white/12"
                >
                  Adicionar período
                </button>
              </div>

              {enabledDays[key] ? (
                <div className="mt-3 grid gap-2">
                  {weeklyHours[key].map((range, index) => (
                    <div key={`${key}-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <input
                        name={`day_${key}_open`}
                        type="time"
                        value={range.open}
                        onChange={(event) => updateRange(key, index, 'open', event.target.value)}
                        className={inputClass}
                      />
                      <input
                        name={`day_${key}_close`}
                        type="time"
                        value={range.close}
                        onChange={(event) => updateRange(key, index, 'close', event.target.value)}
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={() => removeRange(key, index)}
                        className="rounded-[8px] bg-[#ff8ea8]/10 px-3 text-xs font-semibold text-[#ffadc0] ring-1 ring-[#ff8ea8]/15"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-[8px] bg-[#11172B] p-3 text-xs text-white/45">
                  Folga semanal. Nenhum horário aparece para clientes neste dia.
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8FF0F4]">
            Exceções por data
          </p>
          <p className="mt-1 text-sm text-white/58">
            Use para almoço especial, saída rápida, folga ou horário extra.
          </p>
        </div>

        {exceptions.length > 0 ? (
          <div className="grid gap-2">
            {exceptions.map((exception) => (
              <label
                key={exception.id}
                className="grid gap-2 rounded-[8px] border border-white/10 bg-[#11172B] p-3 text-sm text-white/70 sm:grid-cols-[auto_1fr_auto]"
              >
                <input
                  name="delete_exception_ids"
                  type="checkbox"
                  value={exception.id}
                  className="mt-1 h-4 w-4 accent-[#FF007F]"
                />
                <span>
                  <strong className="text-white">{exceptionLabel(exception.type)}</strong>
                  {' em '}
                  {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(`${exception.date}T00:00:00`))}
                  {exception.start_time && exception.end_time ? ` das ${exception.start_time.slice(0, 5)} às ${exception.end_time.slice(0, 5)}` : ''}
                  {exception.reason ? ` · ${exception.reason}` : ''}
                </span>
                <span className="text-xs text-[#ffadc0]">marcar para remover</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="rounded-[8px] bg-[#11172B] p-3 text-sm text-white/45">
            Nenhuma exceção cadastrada.
          </p>
        )}

        <div className="grid gap-3 rounded-[8px] border border-white/10 bg-white/5 p-3 md:grid-cols-[1fr_1fr_1fr]">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-white/48">Data</span>
            <input name="exception_date" type="date" className={`${inputClass} w-full`} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-white/48">Tipo</span>
            <select name="exception_type" defaultValue="bloqueio" className={`${inputClass} w-full`}>
              <option value="bloqueio">Bloquear período</option>
              <option value="extra">Adicionar horário extra</option>
              <option value="fechado">Fechar o dia inteiro</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-white/48">Motivo</span>
            <input name="exception_reason" placeholder="Almoço, saída, evento..." className={`${inputClass} w-full`} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-white/48">Início</span>
            <input name="exception_start" type="time" className={`${inputClass} w-full`} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-white/48">Fim</span>
            <input name="exception_end" type="time" className={`${inputClass} w-full`} />
          </label>
          <p className="self-end rounded-[8px] bg-[#11172B] p-3 text-xs leading-5 text-white/50">
            Para fechar o dia inteiro, a data basta. Para bloqueio ou extra, informe início e fim.
          </p>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        {message ? <p className="text-sm text-emerald-100">{message}</p> : <p className="text-xs text-white/55">Somente os períodos salvos aparecem para o cliente.</p>}
        <Button type="submit" loading={pending} disabled={pending}>
          Salvar agenda de trabalho
        </Button>
      </div>
    </form>
  )
}
