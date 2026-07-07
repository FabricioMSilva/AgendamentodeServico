import dayjs from 'dayjs'

type ReminderMessageInput = {
  establishmentName: string
  customerName: string | null
  scheduledAt: string
  services: string[]
  customMessage: string | null
}

type AppointmentApprovalInput = {
  establishmentName: string
  customerName: string | null
  customerPhone: string | null
  scheduledAt: string
  services: string[]
  code: string
}

type CustomerDecisionInput = {
  establishmentName: string
  customerName: string | null
  scheduledAt: string
  services: string[]
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

export function buildOwnerApprovalRequestMessage({
  establishmentName,
  customerName,
  customerPhone,
  scheduledAt,
  services,
  code,
}: AppointmentApprovalInput) {
  const serviceText = services.length > 0 ? services.join(' + ') : 'atendimento'

  return [
    `Novo pedido de agendamento em ${establishmentName}.`,
    '',
    `Cliente: ${customerName || 'cliente'}`,
    customerPhone ? `Telefone: ${customerPhone}` : null,
    `Serviço: ${serviceText}`,
    `Data: ${dayjs(scheduledAt).format('DD/MM/YYYY [às] HH:mm')}`,
    '',
    `Código: ${code}`,
    `Responda APROVAR ${code} para confirmar.`,
    `Responda RECUSAR ${code} para cancelar.`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildCustomerApprovedMessage({
  establishmentName,
  customerName,
  scheduledAt,
  services,
}: CustomerDecisionInput) {
  const serviceText = services.length > 0 ? services.join(' + ') : 'seu atendimento'

  return [
    `Olá, ${customerName || 'tudo bem'}! Seu agendamento foi aprovado.`,
    '',
    `Local: ${establishmentName}`,
    `Serviço: ${serviceText}`,
    `Data: ${dayjs(scheduledAt).format('DD/MM/YYYY [às] HH:mm')}`,
    '',
    'Te esperamos no horário combinado.',
  ].join('\n')
}

export function buildCustomerRejectedMessage({
  establishmentName,
  customerName,
  scheduledAt,
  services,
}: CustomerDecisionInput) {
  const serviceText = services.length > 0 ? services.join(' + ') : 'seu atendimento'

  return [
    `Olá, ${customerName || 'tudo bem'}! O estabelecimento não conseguiu aprovar este horário.`,
    '',
    `Local: ${establishmentName}`,
    `Serviço: ${serviceText}`,
    `Data solicitada: ${dayjs(scheduledAt).format('DD/MM/YYYY [às] HH:mm')}`,
    '',
    'Escolha outro horário disponível pela agenda.',
  ].join('\n')
}

export function parseOwnerApprovalIntent(text: string | null | undefined) {
  const raw = text ?? ''
  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

  if (!normalized) return { intent: 'unknown' as const, code: null }

  const codeMatch = raw.match(/\b([0-9a-fA-F]{6,12})\b/)
  const code = codeMatch?.[1]?.toLowerCase() ?? null

  if (/\b(aprovar|aprovado|confirmar|confirmado|aceitar|aceito|sim|ok)\b/.test(normalized)) {
    return { intent: 'approved' as const, code }
  }

  if (/\b(recusar|recusado|rejeitar|rejeitado|cancelar|cancelado|nao)\b/.test(normalized)) {
    return { intent: 'rejected' as const, code }
  }

  return { intent: 'unknown' as const, code }
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
