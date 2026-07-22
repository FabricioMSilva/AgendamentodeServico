import { createAdminClient } from '@/lib/supabase/admin'
import {
  getFallbackServiceCatalog,
  type ServiceCatalogCategory,
} from '@/lib/services/categories'

type CatalogRow = {
  nome: string
  ordem: number
  catalogo_servicos:
    | {
        nome: string
        duracao_minutos_padrao: number
        preco_padrao: number | null
      }[]
    | null
}

export async function getServiceCatalog(): Promise<ServiceCatalogCategory[]> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('categorias_servico')
    .select('nome, ordem, catalogo_servicos(nome, duracao_minutos_padrao, preco_padrao)')
    .eq('ativo', true)
    .eq('catalogo_servicos.ativo', true)
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true })
    .order('nome', { referencedTable: 'catalogo_servicos', ascending: true })

  if (error || !data || data.length === 0) return getFallbackServiceCatalog()

  const catalog = (data as CatalogRow[])
    .map((category) => ({
      category: category.nome,
      services: (category.catalogo_servicos ?? []).map((service) => ({
        name: service.nome,
        durationMinutes: service.duracao_minutos_padrao,
        price: service.preco_padrao,
      })),
    }))
    .filter((category) => category.services.length > 0)

  return catalog.length > 0 ? catalog : getFallbackServiceCatalog()
}
