type SendSmsInput = {
  to: string
  message: string
}

type SendSmsResult =
  | { ok: true; provider: string; providerMessageId: string | null }
  | { ok: false; provider: string; error: string }

function normalizeTwilioPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  return digits.startsWith('55') ? `+${digits}` : `+55${digits}`
}

function getTwilioAuthHeader(accountSid: string, authToken: string) {
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`
}

async function sendWithTwilio({ to, message }: SendSmsInput): Promise<SendSmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim()
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim()
  const from = process.env.TWILIO_FROM_PHONE?.trim()

  if (!accountSid || !authToken || !from) {
    return {
      ok: false,
      provider: 'twilio',
      error: 'Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_FROM_PHONE.',
    }
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: getTwilioAuthHeader(accountSid, authToken),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: normalizeTwilioPhone(to),
        From: from,
        Body: message,
      }),
      cache: 'no-store',
    },
  )

  const payload = (await response.json().catch(() => null)) as { sid?: string; message?: string } | null
  if (!response.ok) {
    return {
      ok: false,
      provider: 'twilio',
      error: payload?.message ?? `Twilio retornou ${response.status}.`,
    }
  }

  return {
    ok: true,
    provider: 'twilio',
    providerMessageId: payload?.sid ?? null,
  }
}

export async function sendSmsText(input: SendSmsInput): Promise<SendSmsResult> {
  const provider = process.env.SMS_PROVIDER?.trim() || 'twilio'

  if (provider !== 'twilio') {
    return {
      ok: false,
      provider,
      error: `Provedor de SMS não suportado: ${provider}.`,
    }
  }

  return sendWithTwilio(input)
}
