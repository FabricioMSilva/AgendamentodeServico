import { NextResponse, type NextRequest } from 'next/server'
import { normalizeCep } from '@/lib/address'

type CorreiosCepResponse = {
  cep?: string
  logradouro?: string
  bairro?: string
  localidade?: string
  uf?: string
  itens?: Array<{
    cep?: string
    logradouro?: string
    bairro?: string
    localidade?: string
    uf?: string
  }>
}

type PublicCepResponse = {
  zip_code: string
  street: string
  neighborhood: string
  city: string
  state: string
}

function toPublicAddress(data: CorreiosCepResponse): PublicCepResponse | null {
  const item = data.itens?.[0] ?? data
  const street = item.logradouro?.trim() ?? ''
  const neighborhood = item.bairro?.trim() ?? ''
  const city = item.localidade?.trim() ?? ''
  const state = item.uf?.trim() ?? ''
  const zipCode = normalizeCep(item.cep ?? '')

  if (!zipCode || (!street && !neighborhood && !city && !state)) {
    return null
  }

  return {
    zip_code: zipCode,
    street,
    neighborhood,
    city,
    state,
  }
}

async function lookupWithCorreios(cep: string): Promise<PublicCepResponse | null> {
  const token = process.env.CORREIOS_API_TOKEN?.trim()
  if (!token) return null

  const response = await fetch(`https://api.correios.com.br/cep/v2/enderecos/${cep}`, {
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as CorreiosCepResponse
  return toPublicAddress(data)
}

async function lookupWithViaCep(cep: string): Promise<PublicCepResponse | null> {
  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as {
    cep?: string
    logradouro?: string
    bairro?: string
    localidade?: string
    uf?: string
    erro?: boolean
  }

  if (data.erro) {
    return null
  }

  return {
    zip_code: normalizeCep(data.cep ?? cep),
    street: data.logradouro?.trim() ?? '',
    neighborhood: data.bairro?.trim() ?? '',
    city: data.localidade?.trim() ?? '',
    state: data.uf?.trim() ?? '',
  }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ cep: string }> }) {
  const { cep: rawCep } = await params
  const cep = normalizeCep(rawCep)

  if (cep.length !== 8) {
    return NextResponse.json({ error: 'CEP inválido.' }, { status: 400 })
  }

  const correiosAddress = await lookupWithCorreios(cep)
  if (correiosAddress) {
    return NextResponse.json(correiosAddress)
  }

  const fallbackAddress = await lookupWithViaCep(cep)
  if (fallbackAddress) {
    return NextResponse.json(fallbackAddress)
  }

  return NextResponse.json({ error: 'CEP não encontrado.' }, { status: 404 })
}
