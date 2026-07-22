import { approveEstablishment } from '@/actions/consultant'

export default function PendingEstablishmentApprovalForm({ establishmentId }: { establishmentId: string }) {
  const approveAction = async () => {
    'use server'
    await approveEstablishment(establishmentId)
  }

  return (
    <form action={approveAction}>
      <button
        type="submit"
        className="rounded-[8px] bg-emerald-400/10 px-3 py-1.5 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/15"
      >
        Aprovar estabelecimento
      </button>
    </form>
  )
}
