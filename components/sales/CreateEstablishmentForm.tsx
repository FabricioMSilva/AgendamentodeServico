'use client'

import { useRef, useState } from 'react'
import { createEstablishment } from '@/actions/consultant'

export default function CreateEstablishmentForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [success, setSuccess] = useState(false)
  const [pending, setPending] = useState(false)

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
    <form ref={formRef} onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
      {errors._form && (
        <p className="col-span-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
          {errors._form.join(', ')}
        </p>
      )}
      {success && (
        <p className="col-span-2 text-sm text-green-700 bg-green-50 p-3 rounded-lg">
          Establishment created successfully.
        </p>
      )}

      <Field label="Salon Name" name="name" required errors={errors.name} />
      <Field label="Owner Email" name="owner_email" type="email" required errors={errors.owner_email} />
      <Field label="Slug (URL path)" name="slug" placeholder="my-salon" required errors={errors.slug} />
      <Field label="Contact" name="contact" errors={errors.contact} />
      <Field label="Address" name="address" className="col-span-2" errors={errors.address} />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Slots per Schedule</label>
        <input
          name="slots_per_schedule"
          type="number"
          defaultValue={10}
          min={1}
          max={200}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div className="col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Creating…' : 'Create Establishment'}
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
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
      />
      {errors && <p className="text-xs text-red-600 mt-1">{errors.join(', ')}</p>}
    </div>
  )
}
