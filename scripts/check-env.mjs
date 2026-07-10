import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const envPath = resolve(process.cwd(), '.env.local')

// Mantem este parser propositalmente pequeno: ele so precisa de linhas KEY=value
// do .env.local e evita carregar segredos em process.env ou imprimi-los sem querer.
function parseEnvFile(path) {
  const entries = new Map()
  const content = readFileSync(path, 'utf8')

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim()
    entries.set(key, value)
  }

  return entries
}

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_JWT_SECRET',
  'SUPER_ADMIN_EMAILS',
  'CRON_SECRET',
  'WHATSAPP_WEBHOOK_SECRET',
  'WHATSAPP_PROVIDER',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_FROM',
]

const optional = ['CORREIOS_API_TOKEN', 'SMS_PROVIDER', 'TWILIO_FROM_PHONE']

// Valores de exemplo sao tratados como invalidos para evitar que a automacao local
// rode com credenciais que parecem preenchidas, mas falham em tempo de execucao.
function isPlaceholder(value) {
  return (
    !value ||
    value.startsWith('your-') ||
    value.startsWith('replace-with-') ||
    value.startsWith('change-this')
  )
}

let env
try {
  env = parseEnvFile(envPath)
} catch (error) {
  console.error(`Unable to read ${envPath}: ${error.message}`)
  process.exit(1)
}

const missing = []
const placeholders = []

// Mostra apenas nomes das chaves. Os valores podem conter chaves de servico do Supabase
// ou segredos de webhook.
for (const key of required) {
  const value = env.get(key)
  if (value === undefined) {
    missing.push(key)
  } else if (isPlaceholder(value)) {
    placeholders.push(key)
  }
}

const optionalMissing = optional.filter((key) => !env.get(key))

if (missing.length || placeholders.length) {
  console.error('Environment check failed.')
  if (missing.length) console.error(`Missing: ${missing.join(', ')}`)
  if (placeholders.length) console.error(`Needs real value: ${placeholders.join(', ')}`)
  if (optionalMissing.length) console.error(`Optional missing: ${optionalMissing.join(', ')}`)
  process.exit(1)
}

console.log('Environment check passed.')
if (optionalMissing.length) {
  console.log(`Optional missing: ${optionalMissing.join(', ')}`)
}
