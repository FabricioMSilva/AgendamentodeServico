#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^"|"$/g, '')
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const envFiles = ['.env.local', '.env.evolution', '.env']
for (const envFile of envFiles) {
  loadEnvFile(path.join(rootDir, envFile))
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const establishments = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    owner_email: 'ana@ibeleza.dev',
    slug: 'studio-bella-rosa',
    name: 'Studio Bella Rosa',
    address: 'Rua das Flores, 120 - Centro, Sao Paulo - SP',
    contact: '(11) 99999-0001',
    whatsapp_phone: '5511999990001',
    logo_url: null,
    business_hours: {
      1: { open: '09:00', close: '19:00' },
      2: { open: '09:00', close: '19:00' },
      3: { open: '09:00', close: '19:00' },
      4: { open: '09:00', close: '19:00' },
      5: { open: '09:00', close: '19:00' },
      6: { open: '09:00', close: '16:00' },
    },
    slots_per_schedule: 12,
    reminder_hours_before: 12,
    is_blocked: false,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    owner_email: 'marcos@ibeleza.dev',
    slug: 'clinica-vita',
    name: 'Clinica Vita',
    address: 'Av. Brasil, 840 - Jardim, Campinas - SP',
    contact: '(19) 98888-0002',
    whatsapp_phone: '5519988880002',
    logo_url: null,
    business_hours: {
      1: { open: '08:00', close: '18:00' },
      2: { open: '08:00', close: '18:00' },
      3: { open: '08:00', close: '18:00' },
      4: { open: '08:00', close: '18:00' },
      5: { open: '08:00', close: '18:00' },
      6: { open: '09:00', close: '14:00' },
    },
    slots_per_schedule: 10,
    reminder_hours_before: 12,
    is_blocked: false,
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    owner_email: 'juliana@ibeleza.dev',
    slug: 'espaco-lis',
    name: 'Espaco Lis',
    address: 'Rua Afonso Pena, 55 - Centro, Rio de Janeiro - RJ',
    contact: '(21) 97777-0003',
    whatsapp_phone: '5521977770003',
    logo_url: null,
    business_hours: {
      1: { open: '09:00', close: '20:00' },
      2: { open: '09:00', close: '20:00' },
      3: { open: '09:00', close: '20:00' },
      4: { open: '09:00', close: '20:00' },
      5: { open: '09:00', close: '20:00' },
      6: { open: '09:00', close: '17:00' },
    },
    slots_per_schedule: 14,
    reminder_hours_before: 12,
    is_blocked: false,
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    owner_email: 'vitor@ibeleza.dev',
    slug: 'barbearia-aurora',
    name: 'Barbearia Aurora',
    address: 'Rua Augusta, 910 - Consolacao, Sao Paulo - SP',
    contact: '(11) 97777-4444',
    whatsapp_phone: '5511977774444',
    logo_url: null,
    business_hours: {
      1: { open: '10:00', close: '21:00' },
      2: { open: '10:00', close: '21:00' },
      3: { open: '10:00', close: '21:00' },
      4: { open: '10:00', close: '21:00' },
      5: { open: '10:00', close: '21:00' },
      6: { open: '10:00', close: '18:00' },
    },
    slots_per_schedule: 16,
    reminder_hours_before: 12,
    is_blocked: false,
  },
  {
    id: '55555555-5555-4555-8555-555555555555',
    owner_email: 'luana@ibeleza.dev',
    slug: 'spa-viva',
    name: 'Spa Viva',
    address: 'Av. Atlantica, 1500 - Copacabana, Rio de Janeiro - RJ',
    contact: '(21) 96666-5555',
    whatsapp_phone: '5521966665555',
    logo_url: null,
    business_hours: {
      1: { open: '08:00', close: '19:00' },
      2: { open: '08:00', close: '19:00' },
      3: { open: '08:00', close: '19:00' },
      4: { open: '08:00', close: '19:00' },
      5: { open: '08:00', close: '19:00' },
      6: { open: '09:00', close: '17:00' },
    },
    slots_per_schedule: 10,
    reminder_hours_before: 12,
    is_blocked: false,
  },
  {
    id: '66666666-6666-4666-8666-666666666666',
    owner_email: 'dri@ibeleza.dev',
    slug: 'derma-center',
    name: 'Derma Center',
    address: 'Av. Paulista, 1200 - Bela Vista, Sao Paulo - SP',
    zip_code: '01310-100',
    neighborhood: 'Bela Vista',
    city: 'Sao Paulo',
    state: 'SP',
    latitude: -23.5575,
    longitude: -46.6557,
    contact: '(11) 98888-6666',
    whatsapp_phone: '5511988886666',
    logo_url: null,
    business_hours: {
      1: { open: '09:00', close: '18:00' },
      2: { open: '09:00', close: '18:00' },
      3: { open: '09:00', close: '18:00' },
      4: { open: '09:00', close: '18:00' },
      5: { open: '09:00', close: '18:00' },
      6: { open: '09:00', close: '13:00' },
    },
    slots_per_schedule: 8,
    reminder_hours_before: 12,
    is_blocked: false,
  },
  {
    id: '77777777-7777-4777-8777-777777777777',
    owner_email: 'helena@ibeleza.dev',
    slug: 'salao-beleza-vr',
    name: 'Salao Beleza VR',
    address: 'Av. Paulo de Frontin, 123 - Centro, Volta Redonda - RJ',
    zip_code: '27210-111',
    neighborhood: 'Centro',
    city: 'Volta Redonda',
    state: 'RJ',
    latitude: -22.5211,
    longitude: -44.1035,
    contact: '(24) 3322-0001',
    whatsapp_phone: '552433220001',
    logo_url: null,
    business_hours: {
      1: { open: '09:00', close: '19:00' },
      2: { open: '09:00', close: '19:00' },
      3: { open: '09:00', close: '19:00' },
      4: { open: '09:00', close: '19:00' },
      5: { open: '09:00', close: '19:00' },
      6: { open: '09:00', close: '16:00' },
    },
    slots_per_schedule: 12,
    reminder_hours_before: 12,
    is_blocked: false,
  },
  {
    id: '88888888-8888-4888-8888-888888888888',
    owner_email: 'marcia@ibeleza.dev',
    slug: 'pedicure-bella-bm',
    name: 'Pedicure Bella BM',
    address: 'Rua Barão do Rio Branco, 220 - Centro, Barra Mansa - RJ',
    zip_code: '27323-020',
    neighborhood: 'Centro',
    city: 'Barra Mansa',
    state: 'RJ',
    latitude: -22.5451,
    longitude: -44.1723,
    contact: '(24) 3355-0002',
    whatsapp_phone: '552433550002',
    logo_url: null,
    business_hours: {
      1: { open: '10:00', close: '18:00' },
      2: { open: '10:00', close: '18:00' },
      3: { open: '10:00', close: '18:00' },
      4: { open: '10:00', close: '18:00' },
      5: { open: '10:00', close: '18:00' },
      6: { open: '09:00', close: '15:00' },
    },
    slots_per_schedule: 10,
    reminder_hours_before: 12,
    is_blocked: false,
  },
  {
    id: '99999999-9999-4999-8999-999999999999',
    owner_email: 'rafaela@ibeleza.dev',
    slug: 'estudio-ink-nova-vr',
    name: 'Estudio Ink Nova VR',
    address: 'Rua 1, 50 - Aterrado, Volta Redonda - RJ',
    zip_code: '27255-260',
    neighborhood: 'Aterrado',
    city: 'Volta Redonda',
    state: 'RJ',
    latitude: -22.5330,
    longitude: -44.1085,
    contact: '(24) 3322-0003',
    whatsapp_phone: '552433220003',
    logo_url: null,
    business_hours: {
      1: { open: '11:00', close: '20:00' },
      2: { open: '11:00', close: '20:00' },
      3: { open: '11:00', close: '20:00' },
      4: { open: '11:00', close: '20:00' },
      5: { open: '11:00', close: '20:00' },
      6: { open: '10:00', close: '17:00' },
    },
    slots_per_schedule: 8,
    reminder_hours_before: 12,
    is_blocked: false,
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    owner_email: 'bruno@ibeleza.dev',
    slug: 'studio-tatuagem-barra',
    name: 'Studio Tatuagem Barra',
    address: 'Rua Tenente Coronel Cardoso, 82 - Centro, Barra Mansa - RJ',
    zip_code: '27323-230',
    neighborhood: 'Centro',
    city: 'Barra Mansa',
    state: 'RJ',
    latitude: -22.5459,
    longitude: -44.1718,
    contact: '(24) 3355-0004',
    whatsapp_phone: '552433550004',
    logo_url: null,
    business_hours: {
      1: { open: '11:00', close: '20:00' },
      2: { open: '11:00', close: '20:00' },
      3: { open: '11:00', close: '20:00' },
      4: { open: '11:00', close: '20:00' },
      5: { open: '11:00', close: '20:00' },
      6: { open: '10:00', close: '17:00' },
    },
    slots_per_schedule: 8,
    reminder_hours_before: 12,
    is_blocked: false,
  },
]

const users = [
  { key: 'ana', email: 'phone-11999990001@ibeleza.local', actualEmail: 'ana@ibeleza.dev', password: 'Demo123!', fullName: 'Ana Souza', phone: '11999990001', role: 'merchant' },
  { key: 'marcos', email: 'phone-11999990002@ibeleza.local', actualEmail: 'marcos@ibeleza.dev', password: 'Demo123!', fullName: 'Marcos Lima', phone: '11999990002', role: 'merchant' },
  { key: 'juliana', email: 'phone-11999990003@ibeleza.local', actualEmail: 'juliana@ibeleza.dev', password: 'Demo123!', fullName: 'Juliana Reis', phone: '11999990003', role: 'merchant' },
  { key: 'vitor', email: 'phone-11977774444@ibeleza.local', actualEmail: 'vitor@ibeleza.dev', password: 'Demo123!', fullName: 'Vitor Almeida', phone: '11977774444', role: 'merchant' },
  { key: 'luana', email: 'phone-21966665555@ibeleza.local', actualEmail: 'luana@ibeleza.dev', password: 'Demo123!', fullName: 'Luana Castro', phone: '21966665555', role: 'merchant' },
  { key: 'dri', email: 'phone-11988886666@ibeleza.local', actualEmail: 'dri@ibeleza.dev', password: 'Demo123!', fullName: 'Dri Martins', phone: '11988886666', role: 'merchant' },
  { key: 'helena', email: 'phone-12433220001@ibeleza.local', actualEmail: 'helena@ibeleza.dev', password: 'Demo123!', fullName: 'Helena Costa', phone: '12433220001', role: 'merchant' },
  { key: 'marcia', email: 'phone-12433550002@ibeleza.local', actualEmail: 'marcia@ibeleza.dev', password: 'Demo123!', fullName: 'Marcia Lima', phone: '12433550002', role: 'merchant' },
  { key: 'rafaela', email: 'phone-12433220003@ibeleza.local', actualEmail: 'rafaela@ibeleza.dev', password: 'Demo123!', fullName: 'Rafaela Novaes', phone: '12433220003', role: 'merchant' },
  { key: 'bruno', email: 'phone-12433550004@ibeleza.local', actualEmail: 'bruno@ibeleza.dev', password: 'Demo123!', fullName: 'Bruno Santos', phone: '12433550004', role: 'merchant' },
  { key: 'camila', email: 'phone-11988880001@ibeleza.local', actualEmail: 'camila@ibeleza.dev', password: 'Demo123!', fullName: 'Camila Alves', phone: '11988880001', role: 'customer' },
  { key: 'renato', email: 'phone-11988880002@ibeleza.local', actualEmail: 'renato@ibeleza.dev', password: 'Demo123!', fullName: 'Renato Costa', phone: '11988880002', role: 'customer' },
  { key: 'paula', email: 'phone-11988880003@ibeleza.local', actualEmail: 'paula@ibeleza.dev', password: 'Demo123!', fullName: 'Paula Mendes', phone: '11988880003', role: 'customer' },
  { key: 'carla', email: 'phone-11977770001@ibeleza.local', actualEmail: 'carla@ibeleza.dev', password: 'Demo123!', fullName: 'Carla Ribeiro', phone: '11977770001', role: 'customer' },
  { key: 'fernando', email: 'phone-11977770002@ibeleza.local', actualEmail: 'fernando@ibeleza.dev', password: 'Demo123!', fullName: 'Fernando Pereira', phone: '11977770002', role: 'customer' },
  { key: 'priscila', email: 'phone-11977770003@ibeleza.local', actualEmail: 'priscila@ibeleza.dev', password: 'Demo123!', fullName: 'Priscila Nunes', phone: '11977770003', role: 'customer' },
]

const services = [
  ['10111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'Corte feminino', 'fixed', 65.0, 'Corte personalizado com finalizacao simples.', null, 60, 'Cabelo', true],
  ['10111111-1111-4111-8111-111111111112', '11111111-1111-4111-8111-111111111111', 'Escova modeladora', 'fixed', 45.0, 'Escova com acabamento alinhado para rotina ou evento.', null, 45, 'Cabelo', true],
  ['10111111-1111-4111-8111-111111111113', '11111111-1111-4111-8111-111111111111', 'Coloracao total', 'fixed', 180.0, 'Coloracao completa com diagnostico de tom.', null, 90, 'Cabelo', true],
  ['10111111-1111-4111-8111-111111111114', '11111111-1111-4111-8111-111111111111', 'Barba alinhada', 'fixed', 35.0, 'Acabamento de barba com acabamento limpo.', null, 30, 'Barbearia', true],
  ['20222222-2222-4222-8222-222222222221', '22222222-2222-4222-8222-222222222222', 'Limpeza de pele', 'fixed', 140.0, 'Limpeza facial com etapas de higienizacao e extração.', null, 75, 'Estetica', true],
  ['20222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 'Drenagem facial', 'fixed', 120.0, 'Massagem leve para reducao de inchaço e relaxamento.', null, 60, 'Estetica', true],
  ['20222222-2222-4222-8222-222222222223', '22222222-2222-4222-8222-222222222222', 'Depilacao a laser', 'fixed', 220.0, 'Sessao individual por area com avaliacao previa.', null, 90, 'Clínica', true],
  ['20222222-2222-4222-8222-222222222224', '22222222-2222-4222-8222-222222222222', 'Peeling facial', 'fixed', 160.0, 'Protocolo para renovacao da pele e uniformizacao.', null, 50, 'Estetica', true],
  ['30333333-3333-4333-8333-333333333331', '33333333-3333-4333-8333-333333333333', 'Manicure simples', 'fixed', 45.0, 'Cuidado das unhas das maos com esmaltação simples.', null, 45, 'Unhas', true],
  ['30333333-3333-4333-8333-333333333332', '33333333-3333-4333-8333-333333333333', 'Pedicure', 'fixed', 55.0, 'Cuidado completo dos pes com acabamento limpo.', null, 50, 'Unhas', true],
  ['30333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333', 'Spa dos pes', 'fixed', 90.0, 'Tratamento relaxante para pes cansados.', null, 60, 'Spa', true],
  ['30333333-3333-4333-8333-333333333334', '33333333-3333-4333-8333-333333333333', 'Alongamento em gel', 'fixed', 160.0, 'Alongamento com acabamento duravel e estetico.', null, 120, 'Unhas', true],
  ['40444444-4444-4444-8444-444444444441', '44444444-4444-4444-8444-444444444444', 'Corte degradê', 'fixed', 50.0, 'Corte masculino com degrade e acabamento limpo.', null, 45, 'Barbearia', true],
  ['40444444-4444-4444-8444-444444444442', '44444444-4444-4444-8444-444444444444', 'Barba com navalha', 'fixed', 40.0, 'Barba desenhada com toalha quente.', null, 35, 'Barbearia', true],
  ['40444444-4444-4444-8444-444444444443', '44444444-4444-4444-8444-444444444444', 'Sobrancelha masculina', 'fixed', 25.0, 'Acabamento discreto de sobrancelha.', null, 20, 'Barbearia', true],
  ['50555555-5555-4555-8555-555555555551', '55555555-5555-4555-8555-555555555555', 'Massagem relaxante', 'fixed', 160.0, 'Sessao para aliviar tensao e reduzir estresse.', null, 60, 'Spa', true],
  ['50555555-5555-4555-8555-555555555552', '55555555-5555-4555-8555-555555555555', 'Drenagem linfatica', 'fixed', 180.0, 'Drenagem com foco em bem-estar e leveza.', null, 75, 'Spa', true],
  ['50555555-5555-4555-8555-555555555553', '55555555-5555-4555-8555-555555555555', 'Banho de lua', 'fixed', 95.0, 'Tratamento estetico para pele mais uniforme.', null, 50, 'Estetica', true],
  ['60666666-6666-4666-8666-666666666661', '66666666-6666-4666-8666-666666666666', 'Consulta dermatologica', 'fixed', 240.0, 'Avaliação e conduta com foco em pele saudável.', null, 40, 'Clínica', true],
  ['60666666-6666-4666-8666-666666666662', '66666666-6666-4666-8666-666666666666', 'Microagulhamento', 'fixed', 320.0, 'Protocolo de renovacao da pele com avaliação prévia.', null, 60, 'Clínica', true],
  ['60666666-6666-4666-8666-666666666663', '66666666-6666-4666-8666-666666666666', 'Peeling corporal', 'fixed', 180.0, 'Tratamento para renovar a pele do corpo.', null, 50, 'Estetica', true],
  ['70777777-7777-4777-8777-777777777777', '77777777-7777-4777-8777-777777777777', 'Corte feminino', 'fixed', 70.0, 'Corte feminino com acabamento e lavagem.', null, 65, 'Cabelo', true],
  ['70777777-7777-4777-8777-777777777778', '77777777-7777-4777-8777-777777777777', 'Corte masculino', 'fixed', 50.0, 'Corte masculino com finalizacao moderna.', null, 45, 'Cabelo', true],
  ['70777777-7777-4777-8777-777777777779', '77777777-7777-4777-8777-777777777777', 'Escova natural', 'fixed', 55.0, 'Escova leve para o dia a dia.', null, 40, 'Cabelo', true],
  ['80888888-8888-4888-8888-888888888881', '88888888-8888-4888-8888-888888888888', 'Pedicure simples', 'fixed', 65.0, 'Pedicure completo com esmaltação simples.', null, 50, 'Unhas', true],
  ['80888888-8888-4888-8888-888888888882', '88888888-8888-4888-8888-888888888888', 'Pedicure spa', 'fixed', 95.0, 'Pedicure relaxante com hidratação dos pés.', null, 70, 'Unhas', true],
  ['80888888-8888-4888-8888-888888888883', '88888888-8888-4888-8888-888888888888', 'Manicure express', 'fixed', 45.0, 'Manicure rápida com esmaltação.', null, 40, 'Unhas', true],
  ['90999999-9999-4999-8999-999999999991', '99999999-9999-4999-8999-999999999999', 'Tatuagem pequena', 'fixed', 120.0, 'Tatuagem pequena com traço delicado.', null, 30, 'Tatuagem', true],
  ['90999999-9999-4999-8999-999999999992', '99999999-9999-4999-8999-999999999999', 'Tatuagem personalizada', 'fixed', 220.0, 'Tatuagem personalizada por estilo unico.', null, 90, 'Tatuagem', true],
  ['90999999-9999-4999-8999-999999999993', '99999999-9999-4999-8999-999999999999', 'Piercing básico', 'fixed', 80.0, 'Colocação de piercing com higiene profissional.', null, 30, 'Tatuagem', true],
  ['aaaa0000-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Tatuagem feminina', 'fixed', 130.0, 'Tatuagem delicada com estilo feminino.', null, 35, 'Tatuagem', true],
  ['aaaa0000-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Tatuagem tribal', 'fixed', 210.0, 'Tatuagem tribal com acabamento em preto.', null, 80, 'Tatuagem', true],
  ['aaaa0000-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Cover up', 'fixed', 280.0, 'Sessao de cover up para tatuagem antiga.', null, 120, 'Tatuagem', true],
].map(([id, establishment_id, name, price_type, price, description, image_url, duration_minutes, category, is_active]) => ({
  id,
  establishment_id,
  name,
  price_type,
  price,
  description,
  image_url,
  duration_minutes,
  category,
  is_active,
}))

async function ensureAuthUser(user) {
  const { data: existingProfile, error: profileLookupError } = await supabase
    .from('profiles')
    .select('id')
    .or(`email.eq.${user.actualEmail},phone.eq.${user.phone}`)
    .maybeSingle()

  if (profileLookupError) throw profileLookupError
  if (existingProfile?.id) {
    return existingProfile.id
  }

  const payload = {
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: {
      full_name: user.fullName,
      phone: user.phone,
      actual_email: user.actualEmail,
    },
  }

  const { data, error } = await supabase.auth.admin.createUser(payload)
  if (!error && data.user?.id) {
    return data.user.id
  }

  const message = `${error?.message ?? ''}`.toLowerCase()
  if (message.includes('already') || message.includes('exists') || message.includes('registered')) {
    const { data: fallbackProfile, error: fallbackLookupError } = await supabase
      .from('profiles')
      .select('id')
      .or(`email.eq.${user.actualEmail},phone.eq.${user.phone}`)
      .maybeSingle()

    if (fallbackLookupError) throw fallbackLookupError
    if (fallbackProfile?.id) return fallbackProfile.id
  }

  throw error ?? new Error(`Unable to seed auth user ${user.email}`)
}

async function main() {
  console.log('Seeding demo users...')
  const userIdByKey = {}

  for (const user of users) {
    const id = await ensureAuthUser(user)
    userIdByKey[user.key] = id
  }

  console.log('Seeding establishments...')
  const establishmentRows = establishments.map((item) => ({
    ...item,
    admin_id: null,
  }))
  const { error: estError } = await supabase.from('establishments').upsert(establishmentRows, { onConflict: 'id' })
  if (estError) throw estError

  console.log('Seeding profiles...')
  const profileRows = users.map((user) => ({
    id: userIdByKey[user.key],
    role: user.role,
    name: user.fullName,
    phone: user.phone,
    email: user.actualEmail,
    avatar_url: null,
  }))
  const { error: profileError } = await supabase.from('profiles').upsert(profileRows, { onConflict: 'id' })
  if (profileError) throw profileError

  console.log('Linking providers...')
  for (const establishment of establishments) {
    const provider = users.find((user) => user.actualEmail === establishment.owner_email)
    if (!provider) continue
    const { error } = await supabase
      .from('establishments')
      .update({ admin_id: userIdByKey[provider.key] })
      .eq('id', establishment.id)
    if (error) throw error
  }

  console.log('Seeding services...')
  const { error: servicesError } = await supabase.from('services').upsert(services, { onConflict: 'id' })
  if (servicesError) throw servicesError

  console.log('Seeding appointments...')
  const scheduleAt = (daysAhead, hour, minute = 0) => {
    const date = new Date()
    date.setDate(date.getDate() + daysAhead)
    date.setHours(hour, minute, 0, 0)
    return date.toISOString()
  }

  const appointments = [
    {
      id: '40111111-1111-4111-8111-111111111111',
      customer_key: 'camila',
      establishment_id: '11111111-1111-4111-8111-111111111111',
      service_id: '10111111-1111-4111-8111-111111111111',
      scheduled_at: scheduleAt(1, 9, 0),
      status: 'confirmed',
      customer_name: 'Camila Alves',
      customer_phone: '11988880001',
      notes: 'Quer corte e escova no mesmo atendimento.',
      total_price: 110.0,
      total_duration_minutes: 105,
      reminder_sent_at: null,
      confirmed_by_customer_at: new Date().toISOString(),
    },
    {
      id: '40111111-1111-4111-8111-111111111112',
      customer_key: 'renato',
      establishment_id: '11111111-1111-4111-8111-111111111111',
      service_id: '10111111-1111-4111-8111-111111111114',
      scheduled_at: scheduleAt(1, 11, 30),
      status: 'pending',
      customer_name: 'Renato Costa',
      customer_phone: '11988880002',
      notes: 'Barba antes de um compromisso.',
      total_price: 35.0,
      total_duration_minutes: 30,
      reminder_sent_at: null,
      confirmed_by_customer_at: null,
    },
    {
      id: '40222222-2222-4222-8222-222222222221',
      customer_key: 'camila',
      establishment_id: '22222222-2222-4222-8222-222222222222',
      service_id: '20222222-2222-4222-8222-222222222221',
      scheduled_at: scheduleAt(1, 10, 0),
      status: 'confirmed',
      customer_name: 'Camila Alves',
      customer_phone: '11988880001',
      notes: 'Limpeza de pele e drenagem facial.',
      total_price: 260.0,
      total_duration_minutes: 135,
      reminder_sent_at: null,
      confirmed_by_customer_at: new Date().toISOString(),
    },
    {
      id: '40333333-3333-4333-8333-333333333331',
      customer_key: 'camila',
      establishment_id: '33333333-3333-4333-8333-333333333333',
      service_id: '30333333-3333-4333-8333-333333333331',
      scheduled_at: scheduleAt(1, 9, 30),
      status: 'confirmed',
      customer_name: 'Camila Alves',
      customer_phone: '11988880001',
      notes: 'Manicure e pedicure no mesmo horario.',
      total_price: 100.0,
      total_duration_minutes: 95,
      reminder_sent_at: null,
      confirmed_by_customer_at: new Date().toISOString(),
    },
    {
      id: '40444444-4444-4444-8444-444444444444',
      customer_key: 'fernando',
      establishment_id: '44444444-4444-4444-8444-444444444444',
      service_id: '40444444-4444-4444-8444-444444444441',
      scheduled_at: scheduleAt(1, 10, 0),
      status: 'confirmed',
      customer_name: 'Fernando Pereira',
      customer_phone: '11977770002',
      notes: 'Corte e barba antes de viagem.',
      total_price: 90.0,
      total_duration_minutes: 80,
      reminder_sent_at: null,
      confirmed_by_customer_at: new Date().toISOString(),
    },
    {
      id: '40444444-4444-4444-8444-444444444445',
      customer_key: 'carla',
      establishment_id: '44444444-4444-4444-8444-444444444444',
      service_id: '40444444-4444-4444-8444-444444444442',
      scheduled_at: scheduleAt(2, 15, 0),
      status: 'pending',
      customer_name: 'Carla Ribeiro',
      customer_phone: '11977770001',
      notes: 'Barba com acabamento fino.',
      total_price: 40.0,
      total_duration_minutes: 35,
      reminder_sent_at: null,
      confirmed_by_customer_at: null,
    },
    {
      id: '50555555-5555-4555-8555-555555555551',
      customer_key: 'priscila',
      establishment_id: '55555555-5555-4555-8555-555555555555',
      service_id: '50555555-5555-4555-8555-555555555551',
      scheduled_at: scheduleAt(1, 8, 30),
      status: 'confirmed',
      customer_name: 'Priscila Nunes',
      customer_phone: '11977770003',
      notes: 'Sessao para relaxar e reduzir tensao.',
      total_price: 160.0,
      total_duration_minutes: 60,
      reminder_sent_at: null,
      confirmed_by_customer_at: new Date().toISOString(),
    },
    {
      id: '50555555-5555-4555-8555-555555555552',
      customer_key: 'camila',
      establishment_id: '55555555-5555-4555-8555-555555555555',
      service_id: '50555555-5555-4555-8555-555555555552',
      scheduled_at: scheduleAt(3, 14, 0),
      status: 'pending',
      customer_name: 'Camila Alves',
      customer_phone: '11988880001',
      notes: 'Drenagem para fim de semana.',
      total_price: 180.0,
      total_duration_minutes: 75,
      reminder_sent_at: null,
      confirmed_by_customer_at: null,
    },
    {
      id: '60666666-6666-4666-8666-666666666661',
      customer_key: 'renato',
      establishment_id: '66666666-6666-4666-8666-666666666666',
      service_id: '60666666-6666-4666-8666-666666666661',
      scheduled_at: scheduleAt(2, 9, 0),
      status: 'confirmed',
      customer_name: 'Renato Costa',
      customer_phone: '11988880002',
      notes: 'Consulta dermatologica de rotina.',
      total_price: 240.0,
      total_duration_minutes: 40,
      reminder_sent_at: null,
      confirmed_by_customer_at: new Date().toISOString(),
    },
    {
      id: '60666666-6666-4666-8666-666666666662',
      customer_key: 'paula',
      establishment_id: '66666666-6666-4666-8666-666666666666',
      service_id: '60666666-6666-4666-8666-666666666662',
      scheduled_at: scheduleAt(4, 11, 0),
      status: 'pending',
      customer_name: 'Paula Mendes',
      customer_phone: '11988880003',
      notes: 'Tratamento para renovacao da pele.',
      total_price: 320.0,
      total_duration_minutes: 60,
      reminder_sent_at: null,
      confirmed_by_customer_at: null,
    },
  ].map(({ customer_key, ...item }) => ({
    ...item,
    customer_id: userIdByKey[customer_key],
  }))

  const { error: appointmentsError } = await supabase.from('appointments').upsert(appointments, { onConflict: 'id' })
  if (appointmentsError) throw appointmentsError

  console.log('Seeding appointment items...')
  const appointmentItems = [
    {
      id: '50111111-1111-4111-8111-111111111111',
      appointment_id: '40111111-1111-4111-8111-111111111111',
      service_id: '10111111-1111-4111-8111-111111111111',
      service_name: 'Corte feminino',
      price_type: 'fixed',
      price: 65.0,
      duration_minutes: 60,
    },
    {
      id: '50111111-1111-4111-8111-111111111112',
      appointment_id: '40111111-1111-4111-8111-111111111111',
      service_id: '10111111-1111-4111-8111-111111111112',
      service_name: 'Escova modeladora',
      price_type: 'fixed',
      price: 45.0,
      duration_minutes: 45,
    },
    {
      id: '50222222-2222-4222-8222-222222222221',
      appointment_id: '40222222-2222-4222-8222-222222222221',
      service_id: '20222222-2222-4222-8222-222222222221',
      service_name: 'Limpeza de pele',
      price_type: 'fixed',
      price: 140.0,
      duration_minutes: 75,
    },
    {
      id: '50222222-2222-4222-8222-222222222222',
      appointment_id: '40222222-2222-4222-8222-222222222221',
      service_id: '20222222-2222-4222-8222-222222222222',
      service_name: 'Drenagem facial',
      price_type: 'fixed',
      price: 120.0,
      duration_minutes: 60,
    },
    {
      id: '50333333-3333-4333-8333-333333333331',
      appointment_id: '40333333-3333-4333-8333-333333333331',
      service_id: '30333333-3333-4333-8333-333333333331',
      service_name: 'Manicure simples',
      price_type: 'fixed',
      price: 45.0,
      duration_minutes: 45,
    },
    {
      id: '50333333-3333-4333-8333-333333333332',
      appointment_id: '40333333-3333-4333-8333-333333333331',
      service_id: '30333333-3333-4333-8333-333333333332',
      service_name: 'Pedicure',
      price_type: 'fixed',
      price: 55.0,
      duration_minutes: 50,
    },
    {
      id: '50444444-4444-4444-8444-444444444441',
      appointment_id: '40444444-4444-4444-8444-444444444444',
      service_id: '40444444-4444-4444-8444-444444444441',
      service_name: 'Corte degradê',
      price_type: 'fixed',
      price: 50.0,
      duration_minutes: 45,
    },
    {
      id: '50444444-4444-4444-8444-444444444442',
      appointment_id: '40444444-4444-4444-8444-444444444444',
      service_id: '40444444-4444-4444-8444-444444444442',
      service_name: 'Barba com navalha',
      price_type: 'fixed',
      price: 40.0,
      duration_minutes: 35,
    },
    {
      id: '50455555-5555-4555-8555-555555555551',
      appointment_id: '50555555-5555-4555-8555-555555555551',
      service_id: '50555555-5555-4555-8555-555555555551',
      service_name: 'Massagem relaxante',
      price_type: 'fixed',
      price: 160.0,
      duration_minutes: 60,
    },
    {
      id: '50455555-5555-4555-8555-555555555552',
      appointment_id: '50555555-5555-4555-8555-555555555552',
      service_id: '50555555-5555-4555-8555-555555555552',
      service_name: 'Drenagem linfatica',
      price_type: 'fixed',
      price: 180.0,
      duration_minutes: 75,
    },
    {
      id: '50466666-6666-4666-8666-666666666661',
      appointment_id: '60666666-6666-4666-8666-666666666661',
      service_id: '60666666-6666-4666-8666-666666666661',
      service_name: 'Consulta dermatologica',
      price_type: 'fixed',
      price: 240.0,
      duration_minutes: 40,
    },
    {
      id: '50466666-6666-4666-8666-666666666662',
      appointment_id: '60666666-6666-4666-8666-666666666662',
      service_id: '60666666-6666-4666-8666-666666666662',
      service_name: 'Microagulhamento',
      price_type: 'fixed',
      price: 320.0,
      duration_minutes: 60,
    },
  ]

  const { error: appointmentItemsError } = await supabase.from('appointment_items').upsert(appointmentItems, { onConflict: 'id' })
  if (appointmentItemsError) throw appointmentItemsError

  console.log('Demo seed completed successfully.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
