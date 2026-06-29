'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { createOwnerEstablishment } from '@/actions/owner'
import AddressFields from '@/components/forms/AddressFields'

export default function OwnerSetupForm() {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [busy, setBusy] = useState(false)
  const [slugPreview, setSlugPreview] = useState('')

  const helper = useMemo(
    () => (slugPreview ? `URL sugerida: /${slugPreview}` : 'A URL pode ser editada por você.'),
    [slugPreview],
  )

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setErrors({})

    const result = (await createOwnerEstablishment(new FormData(event.currentTarget))) as {
      success?: boolean
      id?: string
      error?: Record<string, string[]>
    }

    if (result?.error) {
      setErrors(result.error)
      setBusy(false)
      return
    }

    router.refresh()
    router.push('/admin/dashboard')
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-[8px] bg-white p-5 text-[#22201d] shadow-[0_18px_45px_rgba(0,0,0,0.12)] sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8b5f49]">
          Novo estabelecimento
        </p>
        <h2 className="mt-2 text-2xl font-semibold">
          Vamos abrir o seu painel do dono
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#6d625b]">
          O cadastro já cria seu vínculo com o painel de gestão. Depois você ajusta agenda, serviços e horários.
        </p>
      </div>

      {errors._form && (
        <p className="sm:col-span-2 rounded-[8px] bg-red-50 p-3 text-sm text-red-700">
          {errors._form.join(', ')}
        </p>
      )}

      <Field label="Nome do negócio" name="name" required errors={errors.name} />
      <Field
        label="Slug"
        name="slug"
        placeholder="studio-bella-rosa"
        helper={helper}
        onValueChange={setSlugPreview}
        errors={errors.slug}
      />
      <Field label="Contato" name="contact" placeholder="(11) 99999-0000" errors={errors.contact} />

      <div className="sm:col-span-2">
        <AddressFields
          title="Endereço do negócio"
          description="CEP para preencher rua, bairro, cidade e estado automaticamente."
          required
        />
      </div>

      <div className="sm:col-span-2">
        <Button type="submit" loading={busy} disabled={busy} className="w-full rounded-[8px]">
          {busy ? 'Criando painel…' : 'Criar e entrar no painel'}
        </Button>
      </div>
    </form>
  )
}

function Field({
  label,
  name,
  placeholder,
  required,
  helper,
  errors,
  onValueChange,
}: {
  label: string
  name: string
  placeholder?: string
  required?: boolean
  helper?: string
  errors?: string[]
  onValueChange?: (value: string) => void
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[#4a433d]">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </label>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        onChange={(event) => {
          if (name === 'slug') {
            const value = event.currentTarget.value
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '')
            onValueChange?.(value)
          }
        }}
        className="w-full rounded-[8px] border border-[#eadfd5] px-3 py-2 text-sm outline-none focus:border-[#22201d]"
      />
      {helper ? <p className="mt-1 text-xs text-[#8b5f49]">{helper}</p> : null}
      {errors ? <p className="mt-1 text-xs text-red-600">{errors.join(', ')}</p> : null}
    </div>
  )
}
