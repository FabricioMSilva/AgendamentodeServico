import Card from '@/components/ui/Card'

type Props = {
  title: string
  value: string | number
  detail: string
  className?: string
}

// Cartão simples para métricas do painel.
// Mantém a mesma aparência em telas diferentes e evita repetir markup.
export default function DashboardStatCard({ title, value, detail, className = '' }: Props) {
  return (
    <Card title={title} className={className}>
      <p className="text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-white/60">{detail}</p>
    </Card>
  )
}
