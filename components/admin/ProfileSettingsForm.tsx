'use client'

import { useState } from 'react'
import { updateProfileSettings } from '@/actions/admin'
import AddressFields from '@/components/forms/AddressFields'
import Button from '@/components/ui/Button'
import type { Establishment } from '@/database.types'

const inputClass =
  'w-full rounded-[8px] border border-white/10 bg-[#11172B] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25'
const labelClass = 'mb-1 block text-sm font-medium text-white/80'

export default function ProfileSettingsForm({ establishment }: { establishment: Establishment }) {
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setMessage(null)
    setErrors({})
    const result = await updateProfileSettings(new FormData(event.currentTarget))
    if (result.error) {
      setErrors(result.error)
    } else {
      setMessage('Perfil salvo.')
    }
    setPending(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="establishment_id" value={establishment.id} />
      {errors._form ? (
        <p className="rounded-[8px] bg-[#ff8ea8]/12 p-3 text-sm text-[#ff8ea8] ring-1 ring-[#ff8ea8]/20">
          {errors._form.join(', ')}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Nome do negócio" name="name" defaultValue={establishment.name} required errors={errors.name} />
        <Field label="WhatsApp" name="whatsapp_phone" defaultValue={establishment.whatsapp_phone ?? ''} errors={errors.whatsapp_phone} />
        <Field label="Telefone" name="phone" defaultValue={establishment.phone ?? establishment.contact ?? ''} errors={errors.phone} />
        <Field label="E-mail" name="email" type="email" defaultValue={establishment.email ?? ''} errors={errors.email} />
        <label className="block">
          <span className={labelClass}>Tipo de negócio</span>
          <select name="business_type" defaultValue={establishment.business_type ?? 'salao_feminino'} className={inputClass}>
            <option value="salao_feminino">Salão feminino</option>
            <option value="barbearia">Barbearia</option>
            <option value="estudio">Estúdio / Clínica</option>
          </select>
        </label>
        <Field label="Contato público" name="contact" defaultValue={establishment.contact ?? ''} errors={errors.contact} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Instagram" name="instagram_url" placeholder="https://instagram.com/seuusuario" defaultValue={establishment.instagram_url ?? ''} errors={errors.instagram_url} />
        <Field label="Facebook" name="facebook_url" placeholder="https://facebook.com/suapagina" defaultValue={establishment.facebook_url ?? ''} errors={errors.facebook_url} />
        <Field label="YouTube" name="youtube_url" placeholder="https://youtube.com/@canal" defaultValue={establishment.youtube_url ?? ''} errors={errors.youtube_url} />
        <Field label="TikTok" name="tiktok_url" placeholder="https://tiktok.com/@usuario" defaultValue={establishment.tiktok_url ?? ''} errors={errors.tiktok_url} />
      </div>

      <AddressFields
        title="Endereço"
        description="Use o CEP para preencher rua, bairro, cidade e estado automaticamente."
        initialValues={{
          zip_code: establishment.zip_code ?? null,
          street: establishment.street ?? null,
          number: establishment.number ?? null,
          complement: establishment.complement ?? null,
          neighborhood: establishment.neighborhood ?? null,
          city: establishment.city ?? null,
          state: establishment.state ?? null,
        }}
        tone="dark"
      />

      <div className="flex items-center justify-between gap-3">
        {message ? <p className="text-sm text-emerald-100">{message}</p> : <span />}
        <Button type="submit" loading={pending} disabled={pending}>
          Salvar perfil
        </Button>
      </div>
    </form>
  )
}

function Field({
  label,
  name,
  type = 'text',
  placeholder,
  defaultValue,
  required,
  errors,
}: {
  label: string
  name: string
  type?: string
  placeholder?: string
  defaultValue?: string
  required?: boolean
  errors?: string[]
}) {
  return (
    <label className="block">
      <span className={labelClass}>
        {label}
        {required ? <span className="ml-0.5 text-[#FF66B2]">*</span> : null}
      </span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required={required}
        className={inputClass}
      />
      {errors ? <p className="mt-1 text-xs text-[#ff8ea8]">{errors.join(', ')}</p> : null}
    </label>
  )
}
