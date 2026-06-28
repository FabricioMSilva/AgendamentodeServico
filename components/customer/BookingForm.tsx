'use client'

import { useState } from 'react'
import { DayPicker } from 'react-day-picker'
import dayjs from 'dayjs'
import { bookAppointment } from '@/actions/appointments'
import Button from '@/components/ui/Button'
import type { Service } from '@/database.types'

// business_hours shape: { "1": { open: "09:00", close: "18:00" }, ... }
// Keys are JS day-of-week numbers (0=Sun … 6=Sat). Missing key or null = closed.
type BusinessHours = Record<string, { open: string; close: string } | null>

function generateTimeSlots(
  date: Date,
  businessHours: BusinessHours,
  slotDurationMinutes = 30,
): string[] {
  const dow = dayjs(date).day().toString()
  const hours = businessHours[dow]
  if (!hours) return []

  const slots: string[] = []
  const base = dayjs(date).format('YYYY-MM-DD')
  let current = dayjs(`${base}T${hours.open}`)
  const close = dayjs(`${base}T${hours.close}`)
  const now = dayjs()

  while (current.isBefore(close)) {
    if (current.isAfter(now)) {
      slots.push(current.format('HH:mm'))
    }
    current = current.add(slotDurationMinutes, 'minute')
  }
  return slots
}

export default function BookingForm({
  establishmentId,
  services,
  businessHours,
  slotsPerSchedule,
}: {
  establishmentId: string
  services: Service[]
  businessHours: BusinessHours
  slotsPerSchedule: number
}) {
  const [selectedDay, setSelectedDay] = useState<Date | undefined>()
  const [selectedTime, setSelectedTime] = useState<string | undefined>()
  const [serviceId, setServiceId] = useState('')
  const [pending, setPending] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [success, setSuccess] = useState(false)

  const slotMinutes = Math.max(30, Math.round(480 / slotsPerSchedule))

  const timeSlots = selectedDay
    ? generateTimeSlots(selectedDay, businessHours, slotMinutes)
    : []

  const isDayDisabled = (date: Date): boolean => {
    const dow = dayjs(date).day().toString()
    return !businessHours[dow] || dayjs(date).isBefore(dayjs(), 'day')
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedDay || !selectedTime || !serviceId) return

    const [hourStr, minuteStr] = selectedTime.split(':')
    const scheduledAt = dayjs(selectedDay)
      .hour(Number(hourStr))
      .minute(Number(minuteStr))
      .second(0)
      .toISOString()

    const fd = new FormData()
    fd.set('establishment_id', establishmentId)
    fd.set('service_id', serviceId)
    fd.set('scheduled_at', scheduledAt)

    setPending(true)
    setErrors({})
    setSuccess(false)

    const result = await bookAppointment(fd)

    if (result.error) {
      setErrors(result.error)
    } else {
      setSuccess(true)
      setSelectedDay(undefined)
      setSelectedTime(undefined)
      setServiceId('')
    }
    setPending(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-lg font-semibold">Agendar Serviço</h2>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
          Agendamento realizado! O salão confirmará em breve.
        </div>
      )}

      {errors._form && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {errors._form.join(', ')}
        </div>
      )}

      {/* Service selection */}
      <div>
        <label className="block text-sm font-medium mb-1">Serviço</label>
        <select
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          required
          className="w-full border rounded-xl px-3 py-2.5 text-sm"
        >
          <option value="">Selecione um serviço...</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.price_type === 'fixed' && s.price != null
                ? ` — R$ ${Number(s.price).toFixed(2)}`
                : ' — preço sob consulta'}
            </option>
          ))}
        </select>
      </div>

      {/* Calendar */}
      <div>
        <label className="block text-sm font-medium mb-2">Selecione uma data</label>
        <DayPicker
          mode="single"
          selected={selectedDay}
          onSelect={(day) => {
            setSelectedDay(day)
            setSelectedTime(undefined)
          }}
          disabled={isDayDisabled}
          fromDate={dayjs().toDate()}
          classNames={{ root: 'border rounded-xl p-3' }}
        />
      </div>

      {/* Time slots */}
      {selectedDay && (
        <div>
          <label className="block text-sm font-medium mb-2">Horários disponíveis</label>
          {timeSlots.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum horário disponível neste dia.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {timeSlots.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTime(t)}
                  style={
                    selectedTime === t
                      ? { backgroundColor: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
                      : undefined
                  }
                  className={`py-2 text-sm rounded-lg border font-medium transition-colors ${
                    selectedTime === t
                      ? ''
                      : 'bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        disabled={pending || !selectedDay || !selectedTime || !serviceId}
        loading={pending}
        className="w-full py-2.5"
      >
        {pending ? 'Agendando...' : 'Confirmar Agendamento'}
      </Button>
    </form>
  )
}
