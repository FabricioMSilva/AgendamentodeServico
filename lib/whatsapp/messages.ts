import dayjs from 'dayjs'

type ReminderMessageInput = {
  establishmentName: string
  customerName: string | null
  scheduledAt: string
  services: string[]
  customMessage: string | null
}

export function normalizeWhatsappPhone(input: string | null | undefined) {
  const digits = (input ?? '').replace(/\D/g, '')
  if (digits.length < 10) return ''
  if (digits.startsWith('55')) return digits
  return `55${digits}`
}

export function buildReminderMessage({
  establishmentName,
  customerName,
  scheduledAt,
  services,
  customMessage,
}: ReminderMessageInput) {
  const serviceText = services.length > 0 ? services.join(' + ') : 'seu atendimento'
  const defaultMessage =
    customMessage?.trim() ||
    'Olá! Passando para lembrar do seu agendamento. Você confirma sua presença?'

  return [
    defaultMessage,
    '',
    `Cliente: ${customerName || 'cliente'}`,
    `Local: ${establishmentName}`,
    `Serviço: ${serviceText}`,
    `Data: ${dayjs(scheduledAt).format('DD/MM/YYYY [às] HH:mm')}`,
    '',
    'Responda SIM para confirmar ou NAO para cancelar.',
  ].join('\n')
}

export function parseConfirmationIntent(text: string | null | undefined) {
  const normalized = (text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

  if (!normalized) return 'unknown' as const

  if (
    ['sim', 's', 'confirmo', 'confirmar', 'confirmado', 'ok', 'vou', 'presenca confirmada'].some(
      (token) => normalized === token || normalized.includes(token),
    )
  ) {
    return 'confirmed' as const
  }

  if (
    ['nao', 'n', 'cancelar', 'cancela', 'cancelado', 'nao vou', 'remarcar'].some(
      (token) => normalized === token || normalized.includes(token),
    )
  ) {
    return 'declined' as const
  }

  return 'unknown' as const
}
