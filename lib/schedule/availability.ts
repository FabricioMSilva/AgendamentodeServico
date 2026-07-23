import dayjs from 'dayjs'

export type BusinessHourRange = {
  open: string
  close: string
}

export type BusinessHours = Record<string, BusinessHourRange[] | BusinessHourRange | null>

export type ScheduleException = {
  id?: string
  date: string
  type: 'bloqueio' | 'extra' | 'fechado'
  start_time: string | null
  end_time: string | null
  reason: string | null
}

export type ReservedSlot = {
  scheduled_at: string
  total_duration_minutes: number
  customer_name?: string | null
}

export type DaySlotState = {
  time: string
  status: 'available' | 'booked' | 'past'
  customerName?: string | null
}

function isTime(value: unknown): value is string {
  return typeof value === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(value)
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function toTime(value: number) {
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function cleanRange(range: unknown): BusinessHourRange | null {
  if (!range || typeof range !== 'object') return null
  const data = range as Record<string, unknown>
  const open = data.open ?? data.abre
  const close = data.close ?? data.fecha

  if (!isTime(open) || !isTime(close)) return null
  if (toMinutes(open) >= toMinutes(close)) return null

  return { open, close }
}

export function normalizeBusinessHours(value: unknown): Record<string, BusinessHourRange[]> {
  const source = value && typeof value === 'object' ? value as BusinessHours : {}

  return ['0', '1', '2', '3', '4', '5', '6'].reduce<Record<string, BusinessHourRange[]>>((hours, day) => {
    const rawDay = source[day]
    const ranges = Array.isArray(rawDay)
      ? rawDay.map(cleanRange).filter((range): range is BusinessHourRange => Boolean(range))
      : [cleanRange(rawDay)].filter((range): range is BusinessHourRange => Boolean(range))

    hours[day] = ranges.sort((a, b) => toMinutes(a.open) - toMinutes(b.open))
    return hours
  }, {})
}

function subtractRange(
  ranges: BusinessHourRange[],
  blockedStart: string,
  blockedEnd: string,
) {
  const blockStart = toMinutes(blockedStart)
  const blockEnd = toMinutes(blockedEnd)

  return ranges.flatMap((range) => {
    const start = toMinutes(range.open)
    const end = toMinutes(range.close)

    if (blockEnd <= start || blockStart >= end) return [range]

    const next: BusinessHourRange[] = []
    if (blockStart > start) next.push({ open: range.open, close: toTime(blockStart) })
    if (blockEnd < end) next.push({ open: toTime(blockEnd), close: range.close })
    return next
  })
}

function mergeRanges(ranges: BusinessHourRange[]) {
  const sorted = ranges
    .filter((range) => toMinutes(range.open) < toMinutes(range.close))
    .sort((a, b) => toMinutes(a.open) - toMinutes(b.open))

  return sorted.reduce<BusinessHourRange[]>((merged, range) => {
    const last = merged[merged.length - 1]
    if (!last || toMinutes(range.open) > toMinutes(last.close)) return [...merged, range]
    last.close = toTime(Math.max(toMinutes(last.close), toMinutes(range.close)))
    return merged
  }, [])
}

export function getWorkingIntervalsForDate(
  date: Date,
  businessHours: BusinessHours,
  exceptions: ScheduleException[] = [],
) {
  const dateKey = dayjs(date).format('YYYY-MM-DD')
  const day = dayjs(date).day().toString()
  let intervals = [...(normalizeBusinessHours(businessHours)[day] ?? [])]
  const dayExceptions = exceptions.filter((exception) => exception.date === dateKey)

  if (dayExceptions.some((exception) => exception.type === 'fechado')) return []

  for (const exception of dayExceptions) {
    if (!exception.start_time || !exception.end_time) continue
    if (!isTime(exception.start_time) || !isTime(exception.end_time)) continue
    if (toMinutes(exception.start_time) >= toMinutes(exception.end_time)) continue

    if (exception.type === 'extra') {
      intervals.push({ open: exception.start_time, close: exception.end_time })
    }

    if (exception.type === 'bloqueio') {
      intervals = subtractRange(intervals, exception.start_time, exception.end_time)
    }
  }

  return mergeRanges(intervals)
}

export function findOverlappingSlot(
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

export function generateAvailableSlots(
  date: Date,
  businessHours: BusinessHours,
  exceptions: ScheduleException[],
  reservedSlots: ReservedSlot[],
  totalDurationMinutes: number,
  slotDurationMinutes = 30,
) {
  if (totalDurationMinutes <= 0) return []

  const slots: string[] = []
  const base = dayjs(date).format('YYYY-MM-DD')
  const now = dayjs()

  for (const interval of getWorkingIntervalsForDate(date, businessHours, exceptions)) {
    let current = dayjs(`${base}T${interval.open}`)
    const close = dayjs(`${base}T${interval.close}`)

    while (!current.add(totalDurationMinutes, 'minute').isAfter(close)) {
      if (current.isAfter(now) && !findOverlappingSlot(current, totalDurationMinutes, reservedSlots)) {
        slots.push(current.format('HH:mm'))
      }
      current = current.add(slotDurationMinutes, 'minute')
    }
  }

  return slots
}

export function generateDaySlotStates(
  date: Date,
  businessHours: BusinessHours,
  exceptions: ScheduleException[],
  reservedSlots: ReservedSlot[],
  totalDurationMinutes: number,
  slotDurationMinutes = 30,
): DaySlotState[] {
  if (totalDurationMinutes <= 0) return []

  const slots: DaySlotState[] = []
  const base = dayjs(date).format('YYYY-MM-DD')
  const now = dayjs()

  for (const interval of getWorkingIntervalsForDate(date, businessHours, exceptions)) {
    let current = dayjs(`${base}T${interval.open}`)
    const close = dayjs(`${base}T${interval.close}`)

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
  }

  return slots
}

export function getNextOpenDay(
  businessHours: BusinessHours,
  exceptions: ScheduleException[] = [],
) {
  for (let offset = 0; offset < 30; offset += 1) {
    const day = dayjs().add(offset, 'day')
    if (getWorkingIntervalsForDate(day.toDate(), businessHours, exceptions).length > 0) {
      return day.toDate()
    }
  }

  return undefined
}
