type SendTextInput = {
  to: string
  message: string
}

type SendTextResult =
  | { ok: true; provider: string; providerMessageId: string | null }
  | { ok: false; provider: string; error: string }

function normalizeApiUrl(url: string) {
  return url.replace(/\/+$/, '')
}

function extractProviderMessageId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null

  const record = payload as Record<string, unknown>
  const key = record.key
  if (key && typeof key === 'object') {
    const id = (key as Record<string, unknown>).id
    if (typeof id === 'string') return id
  }

  for (const field of ['id', 'messageId', 'message_id']) {
    const value = record[field]
    if (typeof value === 'string') return value
  }

  return null
}

async function sendWithEvolution({ to, message }: SendTextInput): Promise<SendTextResult> {
  const apiUrl = process.env.EVOLUTION_API_URL?.trim()
  const apiKey = process.env.EVOLUTION_API_KEY?.trim()
  const instance = process.env.EVOLUTION_INSTANCE?.trim()

  if (!apiUrl || !apiKey || !instance) {
    return {
      ok: false,
      provider: 'evolution',
      error: 'Configure EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE.',
    }
  }

  const response = await fetch(`${normalizeApiUrl(apiUrl)}/message/sendText/${instance}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: apiKey,
    },
    body: JSON.stringify({
      number: to,
      text: message,
    }),
    cache: 'no-store',
  })

  const payload = (await response.json().catch(() => null)) as unknown
  if (!response.ok) {
    return {
      ok: false,
      provider: 'evolution',
      error: `Evolution API retornou ${response.status}.`,
    }
  }

  return {
    ok: true,
    provider: 'evolution',
    providerMessageId: extractProviderMessageId(payload),
  }
}

export async function sendWhatsappText(input: SendTextInput): Promise<SendTextResult> {
  const provider = process.env.WHATSAPP_PROVIDER?.trim() || 'evolution'

  if (provider !== 'evolution') {
    return {
      ok: false,
      provider,
      error: `Provedor de WhatsApp não suportado: ${provider}.`,
    }
  }

  return sendWithEvolution(input)
}
