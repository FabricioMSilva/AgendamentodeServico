import { createAdminClient } from '@/lib/supabase/admin'
import { setEstablishmentBlocked } from '@/actions/consultant'
import LogoutButton from '@/components/auth/LogoutButton'
import SalesDashboardInteractive, {
  type DashboardAppointment,
  type DashboardEstablishment,
  type DashboardProfile,
  type PendingEstablishment,
  type PendingMerchant,
} from '@/components/sales/SalesDashboardInteractive'
import PendingMerchantApprovalForm from '@/components/sales/PendingMerchantApprovalForm'
import PendingEstablishmentApprovalForm from '@/components/sales/PendingEstablishmentApprovalForm'
import UserAccountControlForm from '@/components/sales/UserAccountControlForm'

export default async function SalesDashboard() {
  const db = createAdminClient()
  const [
    { data: establishments },
    { count: profileCount },
    { data: profiles },
    { count: appointmentCount },
    { data: appointments },
    { data: pendingMerchants },
    { data: pendingEstablishments },
  ] = await Promise.all([
    db
      .from('estabelecimentos')
      .select('id, nome, slug, email, telefone, bloqueado, usuario_admin_id, usuarios!estabelecimentos_usuario_admin_id_fkey(nome, telefone, email)')
      .order('criado_em', { ascending: false }),
    db.from('usuarios').select('id', { count: 'exact', head: true }),
    db
      .from('usuarios')
      .select('id, nome, telefone, email, nivel_acesso, tipo_cadastro, comerciante_status, comerciante_ativo, conta_bloqueada, criado_em')
      .order('criado_em', { ascending: false })
      .limit(20),
    db.from('agendamentos').select('id', { count: 'exact', head: true }),
    db
      .from('agendamentos')
      .select('id, codigo, nome_cliente, telefone_cliente, horario, status, preco_total, estabelecimentos(nome, slug)')
      .order('horario', { ascending: false })
      .limit(15),
    db
      .from('usuarios')
      .select('id, nome, telefone, email, cnpj, criado_em')
      .eq('tipo_cadastro', 'comerciante')
      .eq('comerciante_status', 'pendente')
      .order('criado_em', { ascending: true }),
    db
      .from('estabelecimentos')
      .select('id, nome, slug, tipo_negocio, telefone, email, criado_em, usuarios!estabelecimentos_usuario_admin_id_fkey(nome, telefone, email)')
      .eq('status_aprovacao', 'pendente')
      .order('criado_em', { ascending: true }),
  ])

  const total = establishments?.length ?? 0
  const linked = establishments?.filter((establishment) => establishment.usuario_admin_id).length ?? 0
  const blocked = establishments?.filter((establishment) => establishment.bloqueado).length ?? 0
  const awaiting = Math.max(total - linked, 0)
  const dashboardEstablishments: DashboardEstablishment[] = (establishments ?? []).map((establishment) => {
    const owner = Array.isArray(establishment.usuarios) ? establishment.usuarios[0] : establishment.usuarios

    return {
      id: establishment.id,
      nome: establishment.nome,
      slug: establishment.slug,
      email: establishment.email,
      telefone: establishment.telefone,
      bloqueado: establishment.bloqueado,
      usuario_admin_id: establishment.usuario_admin_id,
      ownerName: owner?.nome ?? null,
      ownerEmail: owner?.email ?? null,
      ownerPhone: owner?.telefone ?? null,
    }
  })
  const dashboardAppointments: DashboardAppointment[] = (appointments ?? []).map((appointment) => {
    const establishment = Array.isArray(appointment.estabelecimentos)
      ? appointment.estabelecimentos[0]
      : appointment.estabelecimentos

    return {
      id: appointment.id,
      codigo: appointment.codigo,
      nome_cliente: appointment.nome_cliente,
      telefone_cliente: appointment.telefone_cliente,
      horario: appointment.horario,
      status: appointment.status,
      preco_total: appointment.preco_total,
      estabelecimentoNome: establishment?.nome ?? null,
      estabelecimentoSlug: establishment?.slug ?? null,
    }
  })
  const dashboardPendingEstablishments: PendingEstablishment[] = (pendingEstablishments ?? []).map((establishment) => {
    const owner = Array.isArray(establishment.usuarios) ? establishment.usuarios[0] : establishment.usuarios

    return {
      id: establishment.id,
      nome: establishment.nome,
      slug: establishment.slug,
      tipo_negocio: establishment.tipo_negocio,
      telefone: establishment.telefone,
      email: establishment.email,
      criado_em: establishment.criado_em,
      ownerName: owner?.nome ?? null,
      ownerPhone: owner?.telefone ?? null,
      ownerEmail: owner?.email ?? null,
    }
  })

  return (
    <main className="min-h-screen bg-[#1A2033] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/48">
              Painel VIP do site
            </p>
            <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Controle geral do negócio</h1>
            <p className="mt-1 text-sm text-white/60">
              Aqui você vê todos os estabelecimentos, vincula quem entra e acompanha o que está ativo ou pausado.
            </p>
          </div>
          <LogoutButton redirectTo="/login" />
        </header>

        <SalesDashboardInteractive
          stats={{
            total,
            profileCount: profileCount ?? 0,
            linked,
            appointmentCount: appointmentCount ?? 0,
            awaiting,
            blocked,
          }}
          establishments={dashboardEstablishments}
          profiles={(profiles ?? []) as DashboardProfile[]}
          appointments={dashboardAppointments}
          pendingMerchants={(pendingMerchants ?? []) as PendingMerchant[]}
          pendingEstablishments={dashboardPendingEstablishments}
          approvalActions={Object.fromEntries(
            (pendingMerchants ?? []).map((merchant) => [
              merchant.id,
              <PendingMerchantApprovalForm key={merchant.id} userId={merchant.id} />,
            ]),
          )}
          establishmentApprovalActions={Object.fromEntries(
            dashboardPendingEstablishments.map((establishment) => [
              establishment.id,
              <PendingEstablishmentApprovalForm key={establishment.id} establishmentId={establishment.id} />,
            ]),
          )}
          accountActions={Object.fromEntries(
            (profiles ?? []).map((profile) => [
              profile.id,
              <UserAccountControlForm
                key={profile.id}
                user={{
                  id: profile.id,
                  nivel_acesso: profile.nivel_acesso,
                  tipo_cadastro: profile.tipo_cadastro,
                  comerciante_status: profile.comerciante_status,
                  conta_bloqueada: profile.conta_bloqueada ?? false,
                }}
              />,
            ]),
          )}
        />
      </div>
    </main>
  )
}
