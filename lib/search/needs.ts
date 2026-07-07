export type NeedKey =
  | 'Cortar cabelo'
  | 'Fazer unha'
  | 'Depilação'
  | 'Estética'
  | 'Tatuagem'
  | 'Clínica'
  | 'Outro'

export type SearchMode = 'estabelecimento' | 'horario'

type NeedInfo = {
  title: string
  subtitle: string
  terms: string[]
}

const needMap: Record<NeedKey, NeedInfo> = {
  'Cortar cabelo': {
    title: 'Corte e acabamento',
    subtitle: 'Salões, barbearias e estúdios com corte, escova, coloração e finalização.',
    terms: ['corte', 'escova', 'pintura', 'coloração', 'barbearia', 'cabelo'],
  },
  'Fazer unha': {
    title: 'Unhas e manicure',
    subtitle: 'Manicure, pedicure, alongamento, esmaltação e cuidados rápidos.',
    terms: ['unha', 'manicure', 'pedicure', 'esmaltação', 'alongamento'],
  },
  'Depilação': {
    title: 'Depilação e pele',
    subtitle: 'Procedimentos para depilação, limpeza e cuidados com a pele.',
    terms: ['depilação', 'pele', 'limpeza', 'estética'],
  },
  Estética: {
    title: 'Estética e bem-estar',
    subtitle: 'Tratamentos estéticos, limpeza de pele, massagens e protocolos faciais.',
    terms: ['estética', 'facial', 'massagem', 'limpeza', 'tratamento'],
  },
  Tatuagem: {
    title: 'Tatuagem e body art',
    subtitle: 'Estúdios de tatuagem, piercing e arte corporal com profissionais experientes.',
    terms: ['tatuagem', 'tattoo', 'piercing', 'body art', 'arte corporal'],
  },
  Clínica: {
    title: 'Clínica e procedimento',
    subtitle: 'Clínicas com atendimento para saúde, estética avançada e procedimentos.',
    terms: ['clínica', 'procedimento', 'saúde', 'estético'],
  },
  Outro: {
    title: 'Outros atendimentos',
    subtitle: 'Outras opções de saúde e beleza para encontrar o serviço mais próximo.',
    terms: ['beleza', 'saúde', 'tratamento', 'atendimento', 'tatuagem', 'tattoo', 'piercing'],
  },
}

export function normalizeNeed(value?: string | null): NeedKey {
  if (!value) return 'Outro'
  if (value in needMap) return value as NeedKey
  return 'Outro'
}

export function getNeedInfo(value?: string | null): NeedInfo & { key: NeedKey } {
  const key = normalizeNeed(value)
  return { key, ...needMap[key] }
}

export function getNeedTerms(value?: string | null): string[] {
  return getNeedInfo(value).terms
}
