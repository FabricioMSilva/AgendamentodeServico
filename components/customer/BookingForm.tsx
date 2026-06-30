'use client'

import { useMemo, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import dayjs from 'dayjs'
import { bookAppointment } from '@/actions/appointments'
import Button from '@/components/ui/Button'
import type { Service } from '@/database.types'

type BusinessHours = Record<string, { open: string; close: string } | null>

type ReservedSlot = {
  scheduled_at: string
  total_duration_minutes: number
}

function money(value: number | null) {
  return value == null ? 'Sob consulta' : `R$ ${Number(value).toFixed(2)}`
}

function hasOverlap(
  start: dayjs.Dayjs,
  durationMinutes: number,
  reservedSlots: ReservedSlot[],
) {
  const end = start.add(durationMinutes, 'minute')
  return reservedSlots.some((slot) => {
    const reservedStart = dayjs(slot.scheduled_at)
    const reservedEnd = reservedStart.add(slot.total_duration_minutes ?? 30, 'minute')
    return start.isBefore(reservedEnd) && end.isAfter(reservedStart)
  })
}

function generateTimeSlots(
  date: Date,
  businessHours: BusinessHours,
  reservedSlots: ReservedSlot[],
  totalDurationMinutes: number,
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

  while (!current.add(totalDurationMinutes, 'minute').isAfter(close)) {
    if (current.isAfter(now) && !hasOverlap(current, totalDurationMinutes, reservedSlots)) {
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
  reservedSlots,
}: {
  establishmentId: string
  services: Service[]
  businessHours: BusinessHours
  slotsPerSchedule: number
  reservedSlots: ReservedSlot[]
}) {
  const activeServices = useMemo(
    () => services.filter((service) => service.is_active),
    [services],
  )
  const categories = useMemo(
    () => Array.from(new Set(activeServices.map((service) => service.category))).sort(),
    [activeServices],
  )
  const [category, setCategory] = useState(categories[0] ?? 'Todos')
  const [cart, setCart] = useState<string[]>([])
  const [selectedDay, setSelectedDay] = useState<Date | undefined>()
  const [selectedTime, setSelectedTime] = useState<string | undefined>()
  const [pending, setPending] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [success, setSuccess] = useState(false)

  const selectedServices = cart
    .map((id) => activeServices.find((service) => service.id === id))
    .filter((service): service is Service => Boolean(service))

  const totalDuration = selectedServices.reduce(
    (sum, service) => sum + service.duration_minutes,
    0,
  )
  const fixedTotal = selectedServices.every(
    (service) => service.price_type === 'fixed' && service.price != null,
  )
    ? selectedServices.reduce((sum, service) => sum + Number(service.price), 0)
    : null

  const slotMinutes = Math.max(15, Math.round(480 / Math.max(slotsPerSchedule, 1)))
  const timeSlots =
    selectedDay && totalDuration > 0
      ? generateTimeSlots(
          selectedDay,
          businessHours,
          reservedSlots,
          totalDuration,
          slotMinutes,
        )
      : []

  const visibleServices =
    category === 'Todos'
      ? activeServices
      : activeServices.filter((service) => service.category === category)

  const isDayDisabled = (date: Date): boolean => {
    const dow = dayjs(date).day().toString()
    return !businessHours[dow] || dayjs(date).isBefore(dayjs(), 'day')
  }

  const toggleService = (serviceId: string) => {
    setCart((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    )
    setSelectedTime(undefined)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedDay || !selectedTime || cart.length === 0) return

    const [hourStr, minuteStr] = selectedTime.split(':')
    const scheduledAt = dayjs(selectedDay)
      .hour(Number(hourStr))
      .minute(Number(minuteStr))
      .second(0)
      .toISOString()

    const fd = new FormData(e.currentTarget)
    fd.set('establishment_id', establishmentId)
    fd.set('service_ids', JSON.stringify(cart))
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
      setCart([])
      ;(e.target as HTMLFormElement).reset()
    }
    setPending(false)
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="space-y-5">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">
              Procedimentos
            </p>
            <p className="mt-1 text-sm text-white/64">
              Toque em um item para montar seu atendimento.
            </p>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setCategory('Todos')}
              className={`inline-flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm font-medium transition ${
                category === 'Todos'
                  ? 'bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] text-white shadow-[0_12px_28px_rgba(106,0,255,0.16)]'
                  : 'bg-white/8 text-white/78 ring-1 ring-white/10 hover:bg-white/12'
              }`}
            >
              Todos
            </button>
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`inline-flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm font-medium transition ${
                  category === item
                    ? 'bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] text-white shadow-[0_12px_28px_rgba(106,0,255,0.16)]'
                    : 'bg-white/8 text-white/78 ring-1 ring-white/10 hover:bg-white/12'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          {visibleServices.map((service) => {
            const selected = cart.includes(service.id)
            return (
              <button
                key={service.id}
                type="button"
                onClick={() => toggleService(service.id)}
                className={`grid gap-4 rounded-[8px] border p-4 text-left transition sm:grid-cols-[96px_1fr_auto] ${
                  selected
                    ? 'border-[#FF66B2]/55 bg-white/10 shadow-[0_14px_34px_rgba(255,0,127,0.14)]'
                    : 'border-white/10 bg-[#11172B] hover:border-white/20 hover:bg-white/8'
                }`}
              >
                <div className="h-24 overflow-hidden rounded-[6px] bg-white/8">
                  {service.image_url ? (
                    <img
                      src={service.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs font-semibold uppercase tracking-[0.16em] text-white/48">
                      {service.category}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-base font-semibold text-white">{service.name}</p>
                  <p className="mt-1 text-sm leading-6 text-white/64">
                    {service.description || 'Serviço profissional com horário reservado.'}
                  </p>
                  <p className="mt-2 text-xs font-medium text-white/55">
                    {service.duration_minutes} min
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
                  <p className="text-sm font-semibold text-white">
                    {money(service.price)}
                  </p>
                  <span
                    className={`mt-2 inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold ${
                      selected
                        ? 'bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] text-white'
                        : 'bg-white/8 text-white/72 ring-1 ring-white/10'
                    }`}
                  >
                    {selected ? 'No carrinho' : 'Adicionar'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <aside className="h-fit rounded-[8px] border border-white/10 bg-[#11172B] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)] lg:sticky lg:top-6">
        <h2 className="text-lg font-semibold text-white">Seu horário</h2>

        {success && (
          <div className="mt-4 rounded-[8px] border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm text-emerald-100">
            Agendamento enviado. O estabelecimento vai confirmar seu horário.
          </div>
        )}

        {errors._form && (
          <div className="mt-4 rounded-[8px] border border-[#ff8ea8]/20 bg-[#ff8ea8]/12 p-3 text-sm text-[#ff8ea8]">
            {errors._form.join(', ')}
          </div>
        )}

        <div className="mt-4 space-y-3">
          {selectedServices.length === 0 ? (
            <p className="text-sm text-white/60">Escolha um ou mais procedimentos.</p>
          ) : (
            selectedServices.map((service) => (
              <div key={service.id} className="flex justify-between gap-3 text-sm">
                <span className="text-white/68">{service.name}</span>
                <span className="font-medium text-white">{money(service.price)}</span>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 rounded-[8px] bg-white/7 p-3 text-sm text-white/70 ring-1 ring-white/10">
          <div className="flex justify-between">
            <span>Duração</span>
            <strong className="text-white">{totalDuration || 0} min</strong>
          </div>
          <div className="mt-1 flex justify-between">
            <span>Total</span>
            <strong className="text-white">{fixedTotal == null ? 'Sob consulta' : money(fixedTotal)}</strong>
          </div>
        </div>

        <div className="mt-5">
          <label className="text-sm font-semibold text-white/80">Data</label>
          <DayPicker
            mode="single"
            selected={selectedDay}
            onSelect={(day) => {
              setSelectedDay(day)
              setSelectedTime(undefined)
            }}
            disabled={isDayDisabled}
            fromDate={dayjs().toDate()}
            classNames={{ root: 'mt-2 rounded-[8px] border border-white/10 bg-white/5 p-3 text-sm text-white' }}
          />
        </div>

        {selectedDay && (
          <div className="mt-5">
            <label className="text-sm font-semibold text-white/80">Horário</label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {timeSlots.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setSelectedTime(time)}
                  className={`rounded-full border py-2 text-sm font-medium transition ${
                    selectedTime === time
                      ? 'border-[#6A00FF] bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] text-white shadow-[0_12px_24px_rgba(106,0,255,0.18)]'
                      : 'border-white/10 bg-white/8 text-white/78 hover:bg-white/12'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
            {timeSlots.length === 0 && (
              <p className="mt-2 text-sm text-white/60">
                Nenhum horário livre para a duração escolhida.
              </p>
            )}
          </div>
        )}

        <div className="mt-5 grid gap-3">
          <input
            name="customer_name"
            placeholder="Seu nome"
            required
            className="rounded-[8px] border border-white/10 bg-[#0f1527] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25"
          />
          <input
            name="customer_phone"
            placeholder="WhatsApp"
            required
            className="rounded-[8px] border border-white/10 bg-[#0f1527] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25"
          />
          <textarea
            name="notes"
            placeholder="Observação para o estabelecimento"
            rows={3}
            className="rounded-[8px] border border-white/10 bg-[#0f1527] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          disabled={pending || !selectedDay || !selectedTime || cart.length === 0}
          loading={pending}
          className="mt-5 w-full rounded-[8px] py-3"
        >
          Solicitar agendamento
        </Button>
      </aside>
    </form>
  )
}
