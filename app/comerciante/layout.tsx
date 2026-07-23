import MerchantShell from '@/components/merchant/MerchantShell'
import { getMerchantContext } from '@/lib/merchant/panel-data'

export const dynamic = 'force-dynamic'

export default async function MerchantLayout({ children }: { children: React.ReactNode }) {
  const { navEstablishments } = await getMerchantContext()

  return (
    <MerchantShell establishments={navEstablishments}>
      {children}
    </MerchantShell>
  )
}
