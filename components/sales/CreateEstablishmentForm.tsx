'use client'

import { useRef, useState } from 'react'
import { createEstablishment } from '@/actions/consultant'

export default function CreateEstablishmentForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [success, setSuccess] = useState(false)
  const [pending, setPending] = useState(false)
  const inputClass =
    'w-full rounded-[8px] border border-white/10 bg-[#11172B] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25'

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPending(true)
    setErrors({})
    setSuccess(false)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await createEstablishment(new FormData(e.currentTarget)) as any

    if (result?.error) {
      setErrors(typeof result.error === 'string' ? { _form: [result.error] } : result.error)
    } else {
      setSuccess(true)
      formRef.current?.reset()
    }
    setPending(false)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid max-w-2xl grid-cols-1 gap-4 rounded-[8px] border border-white/10 bg-white/6 p-5 sm:grid-cols-2">
      {errors._form && (
        <p className="col-span-2 rounded-[8px] bg-[#ff8ea8]/12 p-3 text-sm text-[#ff8ea8] ring-1 ring-[#ff8ea8]/20">
          {errors._form.join(', ')}
        </p>
      )}
      {success && (
        <p className="col-span-2 rounded-[8px] bg-emerald-400/10 p-3 text-sm text-emerald-100 ring-1 ring-emerald-300/20">
          Estabelecimento criado com sucesso.
        </p>
      )}

      <Field label="Nome do estabelecimento" name="name" required errors={errors.name} />
      <Field label="Owner Email" name="owner_email" type="email" required errors={errors.owner_email} />
      <Field label="Slug (URL path)" name="slug" placeholder="meu-estabelecimento" required errors={errors.slug} />
      <Field label="Contato" name="contact" errors={errors.contact} />
      <Field label="Endereço" name="address" className="col-span-2" errors={errors.address} />
      <div>
        <label className="mb-1 block text-sm font-medium text-white/80">Vagas por grade</label>
        <input
          name="slots_per_schedule"
          type="number"
          defaultValue={10}
          min={1}
          max={200}
          className={inputClass}
        />
      </div>

      <div className="col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? 'Criando…' : 'Criar estabelecimento'}
        </button>
      </div>
    </form>
  )
}

function Field({
  label, name, type = 'text', required, placeholder, className, errors
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  placeholder?: string
  className?: string
  errors?: string[]
}) {
  const inputClass =
    'w-full rounded-[8px] border border-white/10 bg-[#11172B] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25'

  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium text-white/80">
        {label}{required && <span className="ml-0.5 text-[#FF66B2]">*</span>}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className={inputClass}
      />
      {errors && <p className="mt-1 text-xs text-[#ff8ea8]">{errors.join(', ')}</p>}
    </div>
  )
}
