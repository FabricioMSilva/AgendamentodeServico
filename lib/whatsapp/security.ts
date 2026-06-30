import { NextResponse } from 'next/server'

export function isAuthorizedAutomationRequest(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false

  const authorization = request.headers.get('authorization') ?? ''
  const bearer = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  const headerSecret = request.headers.get('x-cron-secret')?.trim() ?? ''

  return bearer === secret || headerSecret === secret
}

export function isAuthorizedWebhookRequest(request: Request) {
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET?.trim() || process.env.CRON_SECRET?.trim()
  if (!secret) return false

  const authorization = request.headers.get('authorization') ?? ''
  const bearer = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  const headerSecret = request.headers.get('x-webhook-secret')?.trim() ?? ''

  return bearer === secret || headerSecret === secret
}

export function unauthorizedJson() {
  return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
}
