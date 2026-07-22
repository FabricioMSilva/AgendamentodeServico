import { updateUserAccount } from '@/actions/consultant'

type Props = {
  user: {
    id: string
    nivel_acesso: string
    tipo_cadastro: string
    comerciante_status: string
    conta_bloqueada: boolean
  }
}

export default function UserAccountControlForm({ user }: Props) {
  return (
    <form action={updateUserAccount} className="grid gap-2 rounded-[8px] bg-white/5 p-3 ring-1 ring-white/10 sm:grid-cols-[120px_130px_140px_auto]">
      <input type="hidden" name="user_id" value={user.id} />

      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/42">
          Acesso
        </span>
        <select
          name="nivel_acesso"
          defaultValue={user.nivel_acesso}
          className="h-10 w-full rounded-[8px] border border-white/10 bg-[#11172B] px-2 text-xs font-semibold text-white outline-none focus:border-[#8FF0F4]/55"
        >
          <option value="cliente">Cliente</option>
          <option value="profissional">Profissional</option>
          <option value="administrador">Admin VIP</option>
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/42">
          Cadastro
        </span>
        <select
          name="tipo_cadastro"
          defaultValue={user.tipo_cadastro}
          className="h-10 w-full rounded-[8px] border border-white/10 bg-[#11172B] px-2 text-xs font-semibold text-white outline-none focus:border-[#8FF0F4]/55"
        >
          <option value="usuario">Usuário</option>
          <option value="comerciante">Comerciante</option>
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/42">
          Comerciante
        </span>
        <select
          name="comerciante_status"
          defaultValue={user.comerciante_status}
          className="h-10 w-full rounded-[8px] border border-white/10 bg-[#11172B] px-2 text-xs font-semibold text-white outline-none focus:border-[#8FF0F4]/55"
        >
          <option value="nao_solicitado">Não solicitado</option>
          <option value="pendente">Pendente</option>
          <option value="aprovado">Aprovado</option>
          <option value="reprovado">Reprovado</option>
        </select>
      </label>

      <div className="flex items-end gap-2">
        <label className="flex h-10 items-center gap-2 rounded-[8px] bg-[#11172B] px-3 text-xs font-semibold text-white/76 ring-1 ring-white/10">
          <input
            type="checkbox"
            name="conta_bloqueada"
            defaultChecked={user.conta_bloqueada}
            className="h-4 w-4 accent-[#FF007F]"
          />
          Bloquear
        </label>
        <button
          type="submit"
          className="h-10 rounded-[8px] bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] px-4 text-xs font-semibold text-white transition hover:opacity-90"
        >
          Salvar
        </button>
      </div>
    </form>
  )
}
