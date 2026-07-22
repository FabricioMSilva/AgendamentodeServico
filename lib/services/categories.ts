export const SERVICE_CATEGORY_VALUES = ['Cabelo', 'Unhas', 'Pele', 'Tatuagem', 'Piercing'] as const

export type ServiceCategory = (typeof SERVICE_CATEGORY_VALUES)[number]

export const DEFAULT_SERVICE_CATEGORY: ServiceCategory = 'Cabelo'

export type ServiceCatalogOption = {
  name: string
  durationMinutes: number
  price: number | null
}

export type ServiceCatalogCategory = {
  category: string
  services: ServiceCatalogOption[]
}

export const SERVICE_OPTIONS_BY_CATEGORY: Record<ServiceCategory, string[]> = {
  Cabelo: [
    'Corte feminino',
    'Corte masculino',
    'Corte infantil',
    'Barba',
    'Barboterapia',
    'Pezinho',
    'Sobrancelha',
    'Escova',
    'Hidratação',
    'Coloração',
    'Mechas',
    'Luzes',
    'Progressiva',
    'Selagem',
    'Alisamento',
    'Penteado',
    'Tranças',
    'Pigmentação',
  ],
  Unhas: [
    'Manicure',
    'Pedicure',
    'Mão e pé',
    'Esmaltação',
    'Esmaltação em gel',
    'Alongamento de unhas',
    'Banho de gel',
    'Blindagem',
    'Spa dos pés',
    'Podologia',
    'Remoção de alongamento',
    'Nail art',
  ],
  Pele: [
    'Limpeza de pele',
    'Limpeza facial',
    'Hidratação facial',
    'Peeling superficial',
    'Microagulhamento',
    'Dermaplaning',
    'Design de sobrancelha',
    'Depilação com cera',
    'Depilação facial',
    'Depilação a laser',
    'Massagem relaxante',
    'Massagem modeladora',
    'Drenagem linfática',
    'Tratamento de acne',
    'Revitalização facial',
  ],
  Tatuagem: [
    'Orçamento de tatuagem',
    'Tatuagem pequena',
    'Tatuagem média',
    'Tatuagem grande',
    'Flash tattoo',
    'Cobertura de tatuagem',
    'Retoque de tatuagem',
    'Tatuagem fine line',
    'Tatuagem colorida',
    'Tatuagem realista',
    'Fechamento de braço',
  ],
  Piercing: [
    'Aplicação de piercing',
    'Body piercing',
    'Piercing na orelha',
    'Piercing no nariz',
    'Piercing no umbigo',
    'Piercing na sobrancelha',
    'Piercing labial',
    'Piercing na língua',
    'Troca de joia',
    'Remoção de piercing',
    'Avaliação de cicatrização',
  ],
}

export function getDefaultServiceForCategory(category: ServiceCategory) {
  return SERVICE_OPTIONS_BY_CATEGORY[category][0] ?? ''
}

export function getFallbackServiceCatalog(): ServiceCatalogCategory[] {
  return SERVICE_CATEGORY_VALUES.map((category) => ({
    category,
    services: SERVICE_OPTIONS_BY_CATEGORY[category].map((name) => ({
      name,
      durationMinutes: 30,
      price: null,
    })),
  }))
}
