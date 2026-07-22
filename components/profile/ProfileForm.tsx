'use client'

import { useActionState } from 'react'
import { updateUserProfile, type ProfileFormState } from '@/actions/profile'
import AddressFields from '@/components/forms/AddressFields'
import Button from '@/components/ui/Button'

type Props = {
  initialValues: {
    name: string
    phone: string
    zip_code: string | null
    street: string | null
    number: string | null
    complement: string | null
    neighborhood: string | null
    city: string | null
    state: string | null
  }
}

const initialState: ProfileFormState = {}

export default function ProfileForm({ initialValues }: Props) {
  const [state, formAction, pending] = useActionState(updateUserProfile, initialState)

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-white/80">Nome</span>
          <input
            name="name"
            defaultValue={initialValues.name}
            placeholder="Seu nome"
            className="w-full rounded-[8px] border border-white/10 bg-[#11172B] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25"
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-white/80">Telefone</span>
          <input
            name="phone"
            defaultValue={initialValues.phone}
            inputMode="tel"
            placeholder="(24) 99999-9999"
            className="w-full rounded-[8px] border border-white/10 bg-[#11172B] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25"
            required
          />
        </label>
      </div>

      <AddressFields
        title="Dados de endereço"
        description="Esse endereço ajuda a ordenar atendimentos próximos de você."
        tone="dark"
        mode="full"
        initialValues={initialValues}
      />

      {state.message ? (
        <p className={state.ok ? 'text-sm font-semibold text-[#8FF0F4]' : 'text-sm font-semibold text-[#ff8ea8]'}>
          {state.message}
        </p>
      ) : null}

      <Button type="submit" loading={pending} className="w-full rounded-full sm:w-auto">
        Salvar perfil
      </Button>
    </form>
  )
}
