'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatAddress, normalizeCep } from '@/lib/address'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const MAX_OWNER_ESTABLISHMENTS = 3

const OwnerEstablishmentSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
  contact: z.string().max(100).optional(),
  business_type: z.string().min(2).max(60).default('outros'),
  zip_code: z.string().max(9).optional(),
  street: z.string().max(120).optional(),
  number: z.string().max(20).optional(),
  complement: z.string().max(60).optional(),
  neighborhood: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(2).optional(),
})

const InitialServiceSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().min(2).max(80),
  duration_minutes: z.coerce.number().int().min(10).max(480),
  price: z.coerce.number().min(0).optional(),
})

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

function friendlyEstablishmentError(message: string) {
  if (
    message.includes("'city' column") ||
    message.includes("'zip_code' column") ||
    message.includes("'street' column") ||
    message.includes("'neighborhood' column") ||
    message.includes("schema cache")
  ) {
    return 'Seu banco ainda não tem os campos de endereço. Rode o arquivo supabase/reset_portugues_login.sql no Supabase.'
  }

  return message
}

function getFileExtension(file: File) {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }

  return extensions[file.type] ?? 'bin'
}

function getOptionalImage(formData: FormData, name: string) {
  const file = formData.get(name)
  return file instanceof File && file.size > 0 ? file : null
}

function getInitialServices(formData: FormData) {
  const names = formData.getAll('service_name').map((item) => String(item ?? '').trim())
  const categories = formData.getAll('service_category').map((item) => String(item ?? '').trim())
  const durations = formData.getAll('service_duration')
  const prices = formData.getAll('service_price')

  const services = names
    .map((name, index) => ({
      name,
      category: categories[index] || 'Cabelo',
      duration_minutes: durations[index] || 30,
      price: prices[index] || undefined,
    }))
    .filter((service) => service.name)

  const parsed = z.array(InitialServiceSchema).safeParse(services)
  if (!parsed.success) {
    return { services: [], error: { services: ['Revise nome, categoria, duração e preço dos serviços.'] } }
  }

  return { services: parsed.data, error: null }
}

export async function createOwnerEstablishment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?mode=signup&next=/dono')
  }

  const parsed = OwnerEstablishmentSchema.safeParse({
    name: formData.get('name'),
    slug: (formData.get('slug') || '').toString().trim(),
    description: formData.get('description') || undefined,
    contact: formData.get('contact') || undefined,
    business_type: formData.get('business_type') || 'outros',
    zip_code: formData.get('zip_code') || undefined,
    street: formData.get('street') || undefined,
    number: formData.get('number') || undefined,
    complement: formData.get('complement') || undefined,
    neighborhood: formData.get('neighborhood') || undefined,
    city: formData.get('city') || undefined,
    state: formData.get('state') || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const initialServices = getInitialServices(formData)
  if (initialServices.error) {
    return { error: initialServices.error }
  }

  const db = createAdminClient()
  const { data: profile } = await db
    .from('usuarios')
    .select('nivel_acesso, tipo_cadastro, comerciante_status, comerciante_ativo, telefone, email')
    .eq('id', user.id)
    .maybeSingle()

  if (
    profile?.tipo_cadastro !== 'comerciante' ||
    profile?.comerciante_status !== 'aprovado' ||
    !profile?.comerciante_ativo
  ) {
    return { error: { _form: ['Seu cadastro de comerciante ainda precisa ser aprovado pelo Admin VIP.'] } }
  }

  const { count: establishmentCount, error: lookupError } = await db
    .from('estabelecimentos')
    .select('id', { count: 'exact', head: true })
    .eq('usuario_admin_id', user.id)

  if (lookupError) {
    return { error: { _form: [lookupError.message] } }
  }

  if ((establishmentCount ?? 0) >= MAX_OWNER_ESTABLISHMENTS) {
    return { error: { _form: [`Você já atingiu o limite de ${MAX_OWNER_ESTABLISHMENTS} estabelecimentos.`] } }
  }

  const finalSlug = slugify(parsed.data.slug ?? parsed.data.name)

  if (finalSlug.length < 2) {
    return { error: { slug: ['Informe um nome ou slug mais claro.'] } }
  }

  const zipCode = normalizeCep(parsed.data.zip_code ?? '')
  const address = formatAddress({
    zip_code: zipCode || null,
    street: parsed.data.street ?? null,
    number: parsed.data.number ?? null,
    complement: parsed.data.complement ?? null,
    neighborhood: parsed.data.neighborhood ?? null,
    city: parsed.data.city ?? null,
    state: parsed.data.state ?? null,
  })

  const { data: establishment, error } = await db
    .from('estabelecimentos')
    .insert({
      usuario_admin_id: user.id,
      nome: parsed.data.name,
      slug: finalSlug,
      descricao: parsed.data.description?.trim() || null,
      tipo_negocio: parsed.data.business_type,
      endereco: address || null,
      telefone: parsed.data.contact ?? profile?.telefone ?? null,
      whatsapp: parsed.data.contact ?? profile?.telefone ?? null,
      email: profile?.email ?? user.email ?? null,
      cep: zipCode || null,
      rua: parsed.data.street ?? null,
      numero: parsed.data.number ?? null,
      complemento: parsed.data.complement ?? null,
      bairro: parsed.data.neighborhood ?? null,
      cidade: parsed.data.city ?? null,
      estado: parsed.data.state ?? null,
      horarios_funcionamento: {
        1: { open: '09:00', close: '19:00' },
        2: { open: '09:00', close: '19:00' },
        3: { open: '09:00', close: '19:00' },
        4: { open: '09:00', close: '19:00' },
        5: { open: '09:00', close: '19:00' },
        6: { open: '09:00', close: '16:00' },
      },
      vagas_por_horario: 10,
      status_aprovacao: 'pendente',
      bloqueado: true,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      if (error.message.toLowerCase().includes('slug')) {
        return { error: { slug: ['Esse endereço já está em uso.'] } }
      }
      return { error: { _form: ['Já existe um cadastro com esses dados.'] } }
    }

    return { error: { _form: [friendlyEstablishmentError(error.message)] } }
  }

  if (initialServices.services.length > 0) {
    const { error: servicesError } = await db.from('servicos').insert(
      initialServices.services.map((service) => ({
        estabelecimento_id: establishment.id,
        nome: service.name,
        categoria: service.category,
        descricao: null,
        tipo_preco: service.price == null ? 'variavel' as const : 'fixo' as const,
        preco: service.price ?? null,
        duracao_minutos: service.duration_minutes,
        imagem_url: null,
        ativo: true,
      })),
    )

    if (servicesError) {
      return { error: { _form: [`Estabelecimento criado, mas não consegui salvar os serviços: ${servicesError.message}`] } }
    }
  }

  const logo = getOptionalImage(formData, 'logo')
  if (logo) {
    if (logo.size > 2 * 1024 * 1024) {
      return { error: { logo: ['O logo deve ter até 2MB.'] } }
    }

    const logoPath = `${establishment.id}/logo.${getFileExtension(logo)}`
    const { error: logoUploadError } = await db.storage.from('logos').upload(logoPath, logo, {
      upsert: true,
      contentType: logo.type || undefined,
    })

    if (logoUploadError) {
      return { error: { _form: [`Estabelecimento criado, mas não consegui enviar o logo: ${logoUploadError.message}`] } }
    }

    const { data: logoPublic } = db.storage.from('logos').getPublicUrl(logoPath)
    await db
      .from('estabelecimentos')
      .update({ logo_url: logoPublic.publicUrl })
      .eq('id', establishment.id)
  }

  const galleryFiles = formData
    .getAll('gallery')
    .filter((file): file is File => file instanceof File && file.size > 0)
    .slice(0, 6)

  for (const [index, file] of galleryFiles.entries()) {
    if (file.size > 5 * 1024 * 1024) {
      return { error: { gallery: ['Cada foto deve ter até 5MB.'] } }
    }

    const mediaPath = `${establishment.id}/gallery-${Date.now()}-${index}.${getFileExtension(file)}`
    const { error: mediaUploadError } = await db.storage.from('establishment-media').upload(mediaPath, file, {
      upsert: false,
      contentType: file.type || undefined,
    })

    if (mediaUploadError) {
      return { error: { _form: [`Estabelecimento criado, mas não consegui enviar uma foto: ${mediaUploadError.message}`] } }
    }

    const { data: mediaPublic } = db.storage.from('establishment-media').getPublicUrl(mediaPath)
    const { error: mediaError } = await db.from('midias_estabelecimento').insert({
      estabelecimento_id: establishment.id,
      tipo: 'imagem',
      url: mediaPublic.publicUrl,
      ordem: index,
    })

    if (mediaError) {
      return { error: { _form: [`Estabelecimento criado, mas não consegui salvar uma foto: ${mediaError.message}`] } }
    }
  }

  const { error: profileError } = await db
    .from('usuarios')
    .update({ nivel_acesso: 'profissional', comerciante_ativo: true })
    .eq('id', user.id)

  if (profileError) {
    return { error: { _form: [`Cadastro criado, mas não consegui liberar seu painel: ${profileError.message}`] } }
  }

  revalidatePath('/')
  revalidatePath('/dono')
  revalidatePath('/admin/dashboard')
  revalidatePath('/sales/dashboard')

  return { success: true, id: establishment.id, pendingApproval: true }
}
