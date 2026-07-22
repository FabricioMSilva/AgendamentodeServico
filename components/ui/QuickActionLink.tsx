import Link from 'next/link'

type Props = {
  href: string
  title: string
  description?: string
}

// Link em formato de cartão para atalhos de navegação.
// Deixa os paineis mais compactos e com menos blocos repetidos.
export default function QuickActionLink({ href, title, description }: Props) {
  return (
    <Link
      href={href}
      className="block rounded-[8px] bg-white/8 px-4 py-3 ring-1 ring-white/10 transition hover:bg-white/12"
    >
      <span className="block text-sm font-semibold text-white">{title}</span>
      {description ? <span className="mt-1 block text-xs leading-5 text-white/60">{description}</span> : null}
    </Link>
  )
}
