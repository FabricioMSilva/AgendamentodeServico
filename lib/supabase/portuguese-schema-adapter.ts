import type {
  Database,
  Establishment,
  EstablishmentMedia,
  PriceType,
  Service,
  StatusAgendamentoPortugues,
  TipoPreco,
} from '@/database.types'

type Estabelecimento = Database['public']['Tables']['estabelecimentos']['Row']
type Servico = Database['public']['Tables']['servicos']['Row']

type MidiaEstabelecimento = {
  id: string
  estabelecimento_id: string
  url: string
  tipo: string
  titulo: string | null
  ordem: number
  criado_em: string
}

export type AgendamentoPortugues = {
  id: string
  estabelecimento_id: string
  cliente_id: string | null
  nome_cliente: string | null
  telefone_cliente: string | null
  horario: string
  status: StatusAgendamentoPortugues
  preco_total: number | null
  duracao_total_minutos: number
  observacoes: string | null
  criado_em: string
  atualizado_em: string
  itens_agendamento?: {
    nome_servico: string
    preco: number | null
    duracao_minutos: number
  }[]
  usuarios?: { nome: string | null; email: string | null } | null
}

export function toLegacyPriceType(tipo: TipoPreco): PriceType {
  return tipo === 'variavel' ? 'variable' : 'fixed'
}

export function toLegacyAppointmentStatus(status: StatusAgendamentoPortugues) {
  const map = {
    pendente: 'pending',
    confirmado: 'confirmed',
    em_atendimento: 'checked_in',
    concluido: 'completed',
    cancelado: 'cancelled',
    nao_compareceu: 'no_show',
  } as const

  return map[status]
}

export function toPortugueseAppointmentStatus(
  status: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show',
): StatusAgendamentoPortugues {
  const map = {
    pending: 'pendente',
    confirmed: 'confirmado',
    checked_in: 'em_atendimento',
    completed: 'concluido',
    cancelled: 'cancelado',
    no_show: 'nao_compareceu',
  } as const

  return map[status]
}

export function mapServico(service: Servico): Service {
  return {
    id: service.id,
    establishment_id: service.estabelecimento_id,
    name: service.nome,
    category: service.categoria,
    description: service.descricao,
    price_type: toLegacyPriceType(service.tipo_preco),
    price: service.preco,
    duration_minutes: service.duracao_minutos,
    image_url: service.imagem_url,
    is_active: service.ativo,
    created_at: service.criado_em,
  } as Service
}

export function mapEstabelecimento(
  establishment: Estabelecimento & { servicos?: Servico[] },
): Establishment & { services: Service[] } {
  return {
    id: establishment.id,
    admin_id: establishment.usuario_admin_id,
    owner_email: establishment.email ?? '',
    slug: establishment.slug,
    name: establishment.nome,
    address: establishment.endereco,
    contact: establishment.telefone ?? establishment.whatsapp,
    phone: establishment.telefone,
    email: establishment.email,
    zip_code: establishment.cep,
    street: establishment.rua,
    number: establishment.numero,
    complement: establishment.complemento,
    neighborhood: establishment.bairro,
    city: establishment.cidade,
    state: establishment.estado,
    latitude: establishment.latitude,
    longitude: establishment.longitude,
    whatsapp_phone: establishment.whatsapp,
    instagram_url: establishment.instagram_url,
    facebook_url: establishment.facebook_url,
    youtube_url: establishment.youtube_url,
    tiktok_url: establishment.tiktok_url,
    business_type: establishment.tipo_negocio,
    reminder_message: null,
    auto_cancel_hours_before: 4,
    logo_url: establishment.logo_url,
    business_hours: establishment.horarios_funcionamento,
    slots_per_schedule: establishment.vagas_por_horario,
    reminder_hours_before: 24,
    is_blocked: establishment.bloqueado,
    created_at: establishment.criado_em,
    services: (establishment.servicos ?? []).map(mapServico),
  } as Establishment & { services: Service[] }
}

export function mapMidiaEstabelecimento(media: MidiaEstabelecimento): EstablishmentMedia {
  return {
    id: media.id,
    establishment_id: media.estabelecimento_id,
    media_type: media.tipo === 'video' ? 'video' : 'image',
    provider: media.tipo === 'video' ? 'link' : 'upload',
    url: media.url,
    title: media.titulo,
    sort_order: media.ordem,
    created_at: media.criado_em,
  } as EstablishmentMedia
}
