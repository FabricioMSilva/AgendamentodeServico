type SendTextInput = {
  to: string
  message: string
}

type CheckNumberInput = {
  numbers: string[]
}

type SendTextResult =
  | { ok: true; provider: string; providerMessageId: string | null }
  | { ok: false; provider: string; error: string }

type CheckNumberResult =
  | { ok: true; provider: string; numbers: Array<{ number: string; exists: boolean }> }
  | { ok: false; provider: string; error: string }

function normalizeApiUrl(url: string) {
  return url.replace(/\/+$/, '')
}

function normalizeTwilioWhatsAppAddress(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''

  const raw = trimmed.startsWith('whatsapp:') ? trimmed.slice('whatsapp:'.length) : trimmed
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''

  return `whatsapp:+${digits.startsWith('55') ? digits : `55${digits}`}`
}

function getWhatsappProvider() {
  return (process.env.WHATSAPP_PROVIDER?.trim() || 'twilio').toLowerCase()
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

function extractTwilioError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback

  const record = payload as Record<string, unknown>
  const message = record.message
  if (typeof message === 'string' && message.trim()) return message

  const detail = record.detail
  if (typeof detail === 'string' && detail.trim()) return detail

  const moreInfo = record.more_info
  if (typeof moreInfo === 'string' && moreInfo.trim()) return moreInfo

  return fallback
}

function extractCheckedNumbers(payload: unknown): Array<{ number: string; exists: boolean }> {
  if (!payload || typeof payload !== 'object') return [] 

  const record = payload as Record<string, unknown>
  const numbers = record.numbers
  if (!Array.isArray(numbers)) return []

  return numbers
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const entry = item as Record<string, unknown>
      const number =
        typeof entry.number === 'string'
          ? entry.number
          : typeof entry.phone === 'string'
            ? entry.phone
            : null
      const exists =
        typeof entry.exists === 'boolean'
          ? entry.exists
          : typeof entry.registered === 'boolean'
            ? entry.registered
            : null

      if (!number || exists == null) return null
      return { number, exists }
    })
    .filter((item): item is { number: string; exists: boolean } => Boolean(item))
}

function getTwilioCredentials() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim()
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim()
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim()

  if (!accountSid || !authToken || !from) {
    return null
  }

  return {
    accountSid,
    authToken,
    from: normalizeTwilioWhatsAppAddress(from),
  }
}

function getTwilioAuthHeader(accountSid: string, authToken: string) {
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`
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

async function sendWithTwilio({ to, message }: SendTextInput): Promise<SendTextResult> {
  const credentials = getTwilioCredentials()
  if (!credentials) {
    return {
      ok: false,
      provider: 'twilio',
      error: 'Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_WHATSAPP_FROM.',
    }
  }

  const toAddress = normalizeTwilioWhatsAppAddress(to)
  if (!toAddress || !credentials.from) {
    return {
      ok: false,
      provider: 'twilio',
      error: 'Informe números válidos para enviar WhatsApp via Twilio.',
    }
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: getTwilioAuthHeader(credentials.accountSid, credentials.authToken),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: toAddress,
        From: credentials.from,
        Body: message,
      }),
      cache: 'no-store',
    },
  )

  const payload = (await response.json().catch(() => null)) as unknown
  if (!response.ok) {
    return {
      ok: false,
      provider: 'twilio',
      error: extractTwilioError(payload, `Twilio retornou ${response.status}.`),
    }
  }

  return {
    ok: true,
    provider: 'twilio',
    providerMessageId: extractProviderMessageId(payload),
  }
}

async function checkWithEvolution({ numbers }: CheckNumberInput): Promise<CheckNumberResult> {
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

  const response = await fetch(`${normalizeApiUrl(apiUrl)}/chat/whatsappNumbers/${instance}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: apiKey,
    },
    body: JSON.stringify({ numbers }),
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
    numbers: extractCheckedNumbers(payload),
  }
}

async function checkWithTwilio(): Promise<CheckNumberResult> {
  return {
    ok: false,
    provider: 'twilio',
    error: 'A checagem de número não está disponível no Twilio.',
  }
}

export async function sendWhatsappText(input: SendTextInput): Promise<SendTextResult> {
  const provider = getWhatsappProvider()

  if (provider === 'twilio') {
    return sendWithTwilio(input)
  }

  if (provider === 'evolution') {
    return sendWithEvolution(input)
  }

  return {
    ok: false,
    provider,
    error: `Provedor de WhatsApp não suportado: ${provider}.`,
  }
}

export async function checkWhatsappNumbers(input: CheckNumberInput): Promise<CheckNumberResult> {
  const provider = getWhatsappProvider()

  if (provider === 'twilio') {
    return checkWithTwilio()
  }

  if (provider === 'evolution') {
    return checkWithEvolution(input)
  }

  return {
    ok: false,
    provider,
    error: `Provedor de WhatsApp não suportado: ${provider}.`,
  }
}
