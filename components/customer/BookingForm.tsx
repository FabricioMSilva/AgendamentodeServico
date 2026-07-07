'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import { bookAppointment } from '@/actions/appointments'
import { createClient } from '@/lib/supabase/client'
import type { Service } from '@/database.types'

type BusinessHours = Record<string, { open: string; close: string } | null>

type ReservedSlot = {
  scheduled_at: string
  total_duration_minutes: number
  customer_name: string | null
}

type DaySlotState = {
  time: string
  status: 'available' | 'booked' | 'past'
  customerName?: string | null
}

function money(value: number | null) {
  return value == null ? 'Sob consulta' : `R$ ${Number(value).toFixed(2)}`
}

function findOverlappingSlot(
  start: dayjs.Dayjs,
  durationMinutes: number,
  reservedSlots: ReservedSlot[],
) {
  const end = start.add(durationMinutes, 'minute')
  return reservedSlots.find((slot) => {
    const reservedStart = dayjs(slot.scheduled_at)
    const reservedEnd = reservedStart.add(slot.total_duration_minutes ?? 30, 'minute')
    return start.isBefore(reservedEnd) && end.isAfter(reservedStart)
  })
}

function hasOverlap(
  start: dayjs.Dayjs,
  durationMinutes: number,
  reservedSlots: ReservedSlot[],
) {
  return Boolean(findOverlappingSlot(start, durationMinutes, reservedSlots))
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

function generateDaySlotStates(
  date: Date,
  businessHours: BusinessHours,
  reservedSlots: ReservedSlot[],
  totalDurationMinutes: number,
  slotDurationMinutes = 30,
): DaySlotState[] {
  const dow = dayjs(date).day().toString()
  const hours = businessHours[dow]
  if (!hours || totalDurationMinutes <= 0) return []

  const slots: DaySlotState[] = []
  const base = dayjs(date).format('YYYY-MM-DD')
  let current = dayjs(`${base}T${hours.open}`)
  const close = dayjs(`${base}T${hours.close}`)
  const now = dayjs()

  while (!current.add(totalDurationMinutes, 'minute').isAfter(close)) {
    const bookedSlot = findOverlappingSlot(current, totalDurationMinutes, reservedSlots)
    const past = !current.isAfter(now)
    slots.push({
      time: current.format('HH:mm'),
      status: bookedSlot ? 'booked' : past ? 'past' : 'available',
      customerName: bookedSlot?.customer_name ?? null,
    })
    current = current.add(slotDurationMinutes, 'minute')
  }

  return slots
}

function getNextOpenDay(businessHours: BusinessHours) {
  for (let offset = 0; offset < 30; offset += 1) {
    const day = dayjs().add(offset, 'day')
    if (businessHours[day.day().toString()]) return day.toDate()
  }

  return undefined
}

function getSlotPeriod(time: string) {
  const hour = Number(time.split(':')[0])
  if (hour < 12) return 'Manhã'
  if (hour < 18) return 'Tarde'
  return 'Noite'
}

function groupSlotsByPeriod(slots: DaySlotState[]) {
  return slots.reduce(
    (groups: Record<string, DaySlotState[]>, slot) => {
      const period = getSlotPeriod(slot.time)
      groups[period] = groups[period] ?? []
      groups[period].push(slot)
      return groups
    },
    {},
  )
}

function formatShortDay(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  })
    .format(date)
    .replace('.', '')
}

function formatLongDay(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  }).format(date)
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
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(() =>
    getNextOpenDay(businessHours),
  )
  const [selectedTime, setSelectedTime] = useState<string | undefined>()
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [success, setSuccess] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [userLoaded, setUserLoaded] = useState(false)
  const [daySlotsOpen, setDaySlotsOpen] = useState(false)

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

  const daySlotStates = useMemo(
    () =>
      selectedDay
        ? generateDaySlotStates(
            selectedDay,
            businessHours,
            reservedSlots,
            totalDuration,
            slotMinutes,
          )
        : [],
    [businessHours, reservedSlots, selectedDay, slotMinutes, totalDuration],
  )
  const availableSlotCount = daySlotStates.filter((slot) => slot.status === 'available').length
  const bookedSlotCount = daySlotStates.filter((slot) => slot.status === 'booked').length

  const isDayDisabled = (date: Date): boolean => {
    const dow = dayjs(date).day().toString()
    return !businessHours[dow] || dayjs(date).isBefore(dayjs(), 'day')
  }

  const nextAvailableDays = useMemo(() => {
    if (totalDuration === 0) return []

    const days: { date: Date; label: string; slots: number }[] = []
    for (let offset = 0; offset < 14; offset += 1) {
      const date = dayjs().add(offset, 'day').toDate()
      if (isDayDisabled(date)) continue

      const slots = generateTimeSlots(
        date,
        businessHours,
        reservedSlots,
        totalDuration,
        slotMinutes,
      )

      days.push({
        date,
        label: offset === 0 ? 'Hoje' : formatShortDay(date),
        slots: slots.length,
      })
    }

    return days
  }, [businessHours, reservedSlots, slotMinutes, totalDuration])

  const visibleServices =
    category === 'Todos'
      ? activeServices
      : activeServices.filter((service) => service.category === category)

  const toggleService = (serviceId: string) => {
    setCart((current) => {
      if (current.includes(serviceId)) {
        return current.filter((id) => id !== serviceId)
      }

      return [...current, serviceId]
    })
    setSelectedTime(undefined)
    setSuccess(false)
  }

  const selectDay = (day: Date | undefined) => {
    setSelectedDay(day)
    setSelectedTime(undefined)
    setSuccess(false)
    if (day && totalDuration > 0) {
      setDaySlotsOpen(true)
    }
  }

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const metadata = user.user_metadata as Record<string, unknown>
        let name = (metadata.full_name as string | undefined) ?? (metadata.name as string | undefined) ?? ''
        let phone = (metadata.phone as string | undefined) ?? ''

        if (!name || !phone) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, phone')
            .eq('id', user.id)
            .maybeSingle()

          name = name || profile?.name || ''
          phone = phone || profile?.phone || ''
        }

        setCustomerName(name)
        setCustomerPhone(phone)
      }

      setUserLoaded(true)
    }

    loadUser()
  }, [])

  const getScheduledAt = (time: string) => {
    const [hourStr, minuteStr] = time.split(':')
    return dayjs(selectedDay)
      .hour(Number(hourStr))
      .minute(Number(minuteStr))
      .second(0)
      .toISOString()
  }

  const buildBookingFormData = (scheduledAt: string) => {
    const fd = new FormData()
    fd.set('establishment_id', establishmentId)
    fd.set('service_ids', JSON.stringify(cart))
    fd.set('scheduled_at', scheduledAt)
    fd.set('customer_name', customerName)
    fd.set('customer_phone', customerPhone)
    return fd
  }

  const submitBooking = async (scheduledTime: string) => {
    if (cart.length === 0) {
      setErrors({ _form: ['Selecione ao menos um serviço.'] })
      return
    }

    if (!selectedDay) {
      setErrors({ _form: ['Selecione um dia.'] })
      return
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      setErrors({ _form: ['Seu cadastro precisa ter nome e telefone para agendar. Atualize seus dados e tente novamente.'] })
      return
    }

    const scheduledAt = getScheduledAt(scheduledTime)
    const fd = buildBookingFormData(scheduledAt)

    setPending(true)
    setErrors({})
    setSuccess(false)

    const result = await bookAppointment(fd)

    if (result.error) {
      setErrors(result.error)
    } else {
      setSuccess(true)
      setDaySlotsOpen(false)
      setSelectedDay(getNextOpenDay(businessHours))
      setSelectedTime(undefined)
      setCart([])
      router.refresh()
    }

    setPending(false)
  }


  return (
    <div className="relative grid h-full min-h-0 gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
        <div className="space-y-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
              Procedimentos
            </p>
            <p className="mt-0.5 text-xs text-white/64">
              Toque em um item para montar seu atendimento.
            </p>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setCategory('Todos')}
              className={`inline-flex min-h-9 shrink-0 items-center rounded-full px-4 text-sm font-medium transition ${
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
                className={`inline-flex min-h-9 shrink-0 items-center rounded-full px-4 text-sm font-medium transition ${
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

        <div className="min-h-0 overflow-y-auto pr-1">
          <div className="grid gap-2">
            {visibleServices.map((service) => {
              const selected = cart.includes(service.id)
              return (
                <div
                  key={service.id}
                  className={`grid gap-2 rounded-[8px] border p-2 text-left transition sm:grid-cols-[72px_1fr_auto] sm:gap-3 ${
                  selected
                    ? 'border-[#FF66B2]/55 bg-white/10 shadow-[0_14px_34px_rgba(255,0,127,0.14)]'
                    : 'border-white/10 bg-[#11172B] hover:border-white/20 hover:bg-white/8'
                }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleService(service.id)}
                    className="h-16 overflow-hidden rounded-[6px] bg-white/8 text-left"
                    aria-label={`Selecionar ${service.name}`}
                  >
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
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleService(service.id)}
                    className="min-w-0 text-left"
                  >
                  <p className="text-sm font-semibold leading-snug text-white">{service.name}</p>
                  <p className="mt-1 line-clamp-1 text-xs leading-5 text-white/64">
                    {service.description || 'Serviço profissional com horário reservado.'}
                  </p>
                  <p className="mt-1 text-xs font-medium text-white/55">
                    {service.duration_minutes} min
                  </p>
                  </button>
                <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
                  <p className="text-sm font-semibold text-white">
                    {money(service.price)}
                  </p>
                  <button
                    type="button"
                    onClick={() => toggleService(service.id)}
                    className={`mt-1 inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold ${
                      selected
                        ? 'bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] text-white'
                        : 'bg-white/8 text-white/72 ring-1 ring-white/10'
                    }`}
                  >
                    {selected ? 'Horários' : 'Agendar'}
                  </button>
                </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <aside className="min-h-0 overflow-y-auto pr-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
              Reserva
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-white">Data e horário</h2>
          </div>
        </div>

        {success && (
          <div className="mt-2 rounded-[8px] border border-emerald-300/20 bg-emerald-400/10 p-2 text-xs text-emerald-100">
            Agendamento solicitado com sucesso.
          </div>
        )}

        {errors._form && (
          <div className="mt-2 rounded-[8px] border border-[#ff8ea8]/20 bg-[#ff8ea8]/12 p-2 text-xs text-[#ff8ea8]">
            {errors._form.join(', ')}
          </div>
        )}

        <div className="mt-3 rounded-[8px] bg-[#0f1527] p-3 ring-1 ring-white/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8FF0F4]">Dias com agenda</p>
              <p className="mt-1 text-xs text-white/60">Escolha o dia.</p>
            </div>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80">
              {totalDuration > 0 ? `${nextAvailableDays.length} dias` : 'selecione serviço'}
            </span>
          </div>

          {nextAvailableDays.length > 0 ? (
            <div className="mt-3 flex snap-x gap-2 overflow-x-auto pb-1 pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              {nextAvailableDays.map((day) => {
                const selected = selectedDay && dayjs(selectedDay).isSame(day.date, 'day')
                return (
                  <button
                    key={day.date.toISOString()}
                    type="button"
                    onClick={() => selectDay(day.date)}
                    className={`min-w-[100px] snap-start rounded-[8px] border p-2 text-left transition duration-200 ${
                      selected
                        ? 'border-transparent bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] text-white shadow-[0_18px_40px_rgba(255,0,127,0.18)]'
                        : 'border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <span className="block text-xs font-semibold capitalize">{day.label}</span>
                    <span className="mt-1 block text-[11px] text-white/60">
                      {day.slots > 0 ? `${day.slots} horários` : 'sem vagas'}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="mt-3 rounded-[8px] bg-white/5 p-3 text-xs text-white/60 ring-1 ring-white/10">
              Selecione um procedimento para liberar o calendário.
            </p>
          )}
        </div>

        <div className="mt-3 space-y-2">
          {selectedServices.length === 0 ? (
            <p className="text-xs text-white/60">Escolha um procedimento para ver as vagas.</p>
          ) : (
            selectedServices.map((service) => (
              <div key={service.id} className="flex justify-between gap-3 text-xs">
                <span className="text-white/68">{service.name}</span>
                <span className="font-medium text-white">{money(service.price)}</span>
              </div>
            ))
          )}
        </div>

        <div className="mt-3 rounded-[8px] bg-white/7 p-2.5 text-xs text-white/70 ring-1 ring-white/10">
          <div className="flex justify-between">
            <span>Duração</span>
            <strong className="text-white">{totalDuration || 0} min</strong>
          </div>
          <div className="mt-1 flex justify-between">
            <span>Total</span>
            <strong className="text-white">{fixedTotal == null ? 'Sob consulta' : money(fixedTotal)}</strong>
          </div>
        </div>

        {!userLoaded ? (
          <p className="mt-3 rounded-[8px] bg-white/7 p-2.5 text-xs text-white/60 ring-1 ring-white/10">
            Carregando dados do seu cadastro...
          </p>
        ) : !customerName || !customerPhone ? (
          <p className="mt-3 rounded-[8px] border border-[#ff8ea8]/20 bg-[#ff8ea8]/10 p-2.5 text-xs text-[#ffd0dc]">
            Seu cadastro está sem nome ou telefone. Atualize seus dados para agendar com um toque.
          </p>
        ) : null}

      </aside>

      {daySlotsOpen && selectedDay && totalDuration > 0 ? (
        <div className="fixed inset-0 z-[70] flex items-end bg-[#070a13]/78 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
          <button
            type="button"
            aria-label="Fechar horários"
            onClick={() => setDaySlotsOpen(false)}
            className="absolute inset-0"
          />
          <section className="relative z-[71] max-h-[88svh] w-full max-w-2xl overflow-y-auto rounded-[8px] bg-[#12182b] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.42)] ring-1 ring-white/12 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8FF0F4]">
                  {formatLongDay(selectedDay)}
                </p>
                <h3 className="mt-1 text-2xl font-semibold text-white">Horários do dia</h3>
                <p className="mt-2 text-sm leading-6 text-white/62">
                  Veja vagas livres e horários já agendados para a duração escolhida.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDaySlotsOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/8 text-lg text-white ring-1 ring-white/10"
                aria-label="Fechar horários"
              >
                ×
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-[8px] bg-emerald-400/10 p-3 ring-1 ring-emerald-300/15">
                <p className="text-xl font-semibold text-emerald-100">{availableSlotCount}</p>
                <p className="mt-1 text-xs text-emerald-100/70">livres</p>
              </div>
              <div className="rounded-[8px] bg-[#ff8ea8]/10 p-3 ring-1 ring-[#ff8ea8]/15">
                <p className="text-xl font-semibold text-[#ffd0dc]">{bookedSlotCount}</p>
                <p className="mt-1 text-xs text-[#ffd0dc]/70">agendados</p>
              </div>
              <div className="rounded-[8px] bg-white/7 p-3 ring-1 ring-white/10">
                <p className="text-xl font-semibold text-white">{totalDuration}</p>
                <p className="mt-1 text-xs text-white/58">minutos</p>
              </div>
            </div>

            <div className="mt-4 space-y-6">
              {Object.entries(groupSlotsByPeriod(daySlotStates)).map(([period, periodSlots]) => (
                <div key={period} className="space-y-3">
                  <div className="rounded-[8px] bg-white/8 px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
                    {period}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {periodSlots.map((slot) => {
                      const available = slot.status === 'available'
                      const selected = selectedTime === slot.time
                      const isSubmittingSlot = pending && selected
                      return (
                        <div
                          key={slot.time}
                          className={`rounded-[10px] border p-4 transition ${
                            available
                              ? 'border-white/10 bg-white/5 hover:border-white/20'
                              : 'border-white/10 bg-white/5 opacity-80'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-lg font-semibold text-white">{slot.time}</p>
                              <p className="mt-1 text-sm text-white/60">
                                {available
                                  ? 'Livre para agendar'
                                  : slot.status === 'booked'
                                    ? `Agendado${slot.customerName ? ` por ${slot.customerName}` : ''}`
                                    : 'Horário passou'}
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={!available || pending}
                              onClick={async () => {
                                if (!available) return
                                setSelectedTime(slot.time)
                                await submitBooking(slot.time)
                              }}
                              className={`min-h-9 rounded-full px-4 text-xs font-semibold transition disabled:cursor-not-allowed ${
                                isSubmittingSlot
                                  ? 'bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] text-white'
                                  : available
                                    ? 'bg-white text-[#11172b] hover:bg-white/90'
                                    : 'bg-white/6 text-white/34 ring-1 ring-white/8'
                              }`}
                            >
                              {isSubmittingSlot ? 'Agendando...' : available ? 'Agendar' : 'Ocupado'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {daySlotStates.length === 0 ? (
              <p className="mt-4 rounded-[8px] bg-white/7 p-3 text-sm text-white/58 ring-1 ring-white/10">
                Este dia não tem horários configurados para a duração escolhida.
              </p>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  )
}
