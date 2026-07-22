const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

function loadEnv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const [key, ...rest] = trimmed.split('=')
    process.env[key] = rest.join('=').trim()
  }
}

loadEnv(path.resolve(__dirname, '.env.local'))

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Env vars missing', { url: Boolean(url), key: Boolean(key) })
  process.exit(1)
}
const supabase = createClient(url, key)
;(async () => {
  const { data, error, count } = await supabase
    .from('agendamentos')
    .select('id', { count: 'exact', head: true })
  console.log('error', error)
  console.log('count', count)
  console.log('data', data)
})()
