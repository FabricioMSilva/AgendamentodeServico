'use client'

import type { FormEvent } from 'react'
import { useMemo, useRef, useState } from 'react'
import { createEstablishment } from '@/actions/consultant'
import type { CreateEstablishmentResult } from '@/actions/consultant'
import AddressFields from '@/components/forms/AddressFields'
import {
  DEFAULT_SERVICE_CATEGORY,
  getFallbackServiceCatalog,
  getDefaultServiceForCategory,
  type ServiceCatalogCategory,
  type ServiceCatalogOption,
} from '@/lib/services/categories'

type ServiceDraft = {
  id: string
  name: string
  duration: number
  price: string
  category: string
}

const businessTypes = [
  { value: 'salao_feminino', label: 'Salão feminino' },
  { value: 'barbearia', label: 'Barbearia' },
  { value: 'estetica', label: 'Estética' },
  { value: 'clinica', label: 'Clínica' },
  { value: 'tattoo', label: 'Tattoo e piercing' },
  { value: 'outros', label: 'Outro' },
]

const servicePresets: Record<string, ServiceDraft[]> = {
  salao_feminino: [
    { id: 'corte-feminino', name: 'Corte feminino', duration: 40, price: '45', category: 'Cabelo' },
    { id: 'escova', name: 'Escova', duration: 40, price: '50', category: 'Cabelo' },
    { id: 'manicure', name: 'Manicure', duration: 45, price: '30', category: 'Unhas' },
  ],
  barbearia: [
    { id: 'barba', name: 'Barba', duration: 15, price: '15', category: 'Cabelo' },
    { id: 'cabelo', name: 'Cabelo', duration: 20, price: '25', category: 'Cabelo' },
    { id: 'pezinho', name: 'Pezinho', duration: 10, price: '15', category: 'Cabelo' },
  ],
  estetica: [
    { id: 'limpeza-pele', name: 'Limpeza de pele', duration: 60, price: '120', category: 'Pele' },
    { id: 'massagem', name: 'Massagem relaxante', duration: 50, price: '90', category: 'Pele' },
    { id: 'sobrancelha', name: 'Design de sobrancelha', duration: 30, price: '35', category: 'Pele' },
  ],
  clinica: [
    { id: 'avaliacao', name: 'Avaliação', duration: 30, price: '0', category: 'Pele' },
    { id: 'procedimento', name: 'Procedimento', duration: 60, price: '150', category: 'Pele' },
  ],
  tattoo: [
    { id: 'orcamento-tattoo', name: 'Orçamento de tatuagem', duration: 30, price: '0', category: 'Tatuagem' },
    { id: 'tatuagem-pequena', name: 'Tatuagem pequena', duration: 90, price: '180', category: 'Tatuagem' },
    { id: 'piercing', name: 'Aplicação de piercing', duration: 30, price: '80', category: 'Piercing' },
  ],
  outros: [
    { id: 'atendimento', name: 'Atendimento', duration: 30, price: '50', category: 'Pele' },
  ],
}

function serviceOptions(catalog: ServiceCatalogCategory[], category: string) {
  return catalog.find((item) => item.category === category)?.services ?? []
}

function currentServiceOptions(
  catalog: ServiceCatalogCategory[],
  category: string,
  currentName: string,
) {
  const options = serviceOptions(catalog, category)
  if (!currentName || options.some((option) => option.name === currentName)) return options
  return [{ name: currentName, durationMinutes: 30, price: null }, ...options]
}

function firstService(catalog: ServiceCatalogCategory[], category: string): ServiceCatalogOption {
  return serviceOptions(catalog, category)[0] ?? {
    name: getDefaultServiceForCategory(DEFAULT_SERVICE_CATEGORY),
    durationMinutes: 30,
    price: null,
  }
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

export default function CreateEstablishmentForm({
  catalog = getFallbackServiceCatalog(),
}: {
  catalog?: ServiceCatalogCategory[]
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [success, setSuccess] = useState(false)
  const [pending, setPending] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [businessType, setBusinessType] = useState('salao_feminino')
  const [services, setServices] = useState<ServiceDraft[]>(servicePresets.salao_feminino)
  const categoryOptions = catalog.map((item) => item.category)
  const suggestedSlug = useMemo(() => slugify(name), [name])
  const inputClass =
    'w-full rounded-[8px] border border-white/10 bg-[#11172B] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25'

  const updateName = (value: string) => {
    setName(value)
    if (!slugTouched) setSlug(slugify(value))
  }

  const setService = (id: string, patch: Partial<ServiceDraft>) => {
    setServices((current) =>
      current.map((service) => (service.id === id ? { ...service, ...patch } : service)),
    )
  }

  const setServiceCategory = (id: string, category: string) => {
    const option = firstService(catalog, category)
    setServices((current) =>
      current.map((service) =>
        service.id === id
          ? {
              ...service,
              category,
              name: option.name,
              duration: option.durationMinutes,
              price: option.price == null ? '' : String(option.price),
            }
          : service,
      ),
    )
  }

  const setServiceName = (id: string, name: string) => {
    setServices((current) =>
      current.map((service) => {
        if (service.id !== id) return service
        const option = serviceOptions(catalog, service.category).find((item) => item.name === name)
        return {
          ...service,
          name,
          duration: option?.durationMinutes ?? service.duration,
          price: option?.price == null ? service.price : String(option.price),
        }
      }),
    )
  }

  const addService = () => {
    setServices((current) => [
      ...current,
      {
        id: `service-${Date.now()}`,
        name: getDefaultServiceForCategory(DEFAULT_SERVICE_CATEGORY),
        duration: 30,
        price: '',
        category: DEFAULT_SERVICE_CATEGORY,
      },
    ])
  }

  const removeService = (id: string) => {
    setServices((current) => current.filter((service) => service.id !== id))
  }

  const applyPreset = (value: string) => {
    setBusinessType(value)
    setServices(servicePresets[value] ?? servicePresets.outros)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPending(true)
    setErrors({})
    setSuccess(false)

    const result: CreateEstablishmentResult = await createEstablishment(new FormData(e.currentTarget))

    if ('error' in result) {
      setErrors(typeof result.error === 'string' ? { _form: [result.error] } : result.error)
    } else {
      setSuccess(true)
      formRef.current?.reset()
      setName('')
      setSlug('')
      setSlugTouched(false)
      setBusinessType('salao_feminino')
      setServices(servicePresets.salao_feminino)
    }
    setPending(false)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="max-w-3xl space-y-5 rounded-[8px] border border-white/10 bg-white/6 p-5">
      {errors._form && (
        <p className="rounded-[8px] bg-[#ff8ea8]/12 p-3 text-sm text-[#ff8ea8] ring-1 ring-[#ff8ea8]/20">
          {errors._form.join(', ')}
        </p>
      )}
      {success && (
        <p className="rounded-[8px] bg-emerald-400/10 p-3 text-sm text-emerald-100 ring-1 ring-emerald-300/20">
          Estabelecimento criado com sucesso.
        </p>
      )}

      <section className="space-y-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8FF0F4]">Negócio</p>
          <p className="mt-1 text-sm leading-6 text-white/58">Dados que aparecem na página pública e na agenda.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Nome do estabelecimento"
            name="name"
            value={name}
            onChange={updateName}
            required
            errors={errors.name}
          />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-white/80">Tipo de negócio</span>
            <select
              name="business_type"
              value={businessType}
              onChange={(event) => applyPreset(event.target.value)}
              className={inputClass}
            >
              {businessTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.business_type && <p className="mt-1 text-xs text-[#ff8ea8]">{errors.business_type.join(', ')}</p>}
          </label>
          <div className="sm:col-span-2">
            <Field
              label="Link da agenda"
              name="slug"
              value={slug || suggestedSlug}
              onChange={(value) => {
                setSlugTouched(true)
                setSlug(slugify(value))
              }}
              placeholder="meu-estabelecimento"
              required
              errors={errors.slug}
              hint={slug || suggestedSlug ? `Vai ficar: /${slug || suggestedSlug}` : 'Criado automaticamente pelo nome.'}
            />
          </div>
          <Field label="Telefone do negócio" name="phone" placeholder="(24) 99999-9999" errors={errors.phone} />
          <Field label="WhatsApp da agenda" name="whatsapp_phone" placeholder="(24) 99999-9999" errors={errors.whatsapp_phone} />
          <Field label="E-mail público" name="email" type="email" placeholder="contato@negocio.com" errors={errors.email} />
          <Field label="Contato livre" name="contact" placeholder="Telefone, WhatsApp ou observação" errors={errors.contact} />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8FF0F4]">Responsável</p>
          <p className="mt-1 text-sm leading-6 text-white/58">Pessoa que vai acessar o painel do estabelecimento.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome do responsável" name="owner_name" errors={errors.owner_name} />
          <Field label="E-mail de acesso" name="owner_email" type="email" required errors={errors.owner_email} />
          <Field label="WhatsApp do responsável" name="owner_phone" placeholder="(24) 99999-9999" errors={errors.owner_phone} />
        </div>
      </section>

      <AddressFields
        title="Endereço do estabelecimento"
        description="Use o CEP para preencher rua, bairro, cidade e estado."
        tone="dark"
        mode="compact"
        errors={errors}
      />

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8FF0F4]">Serviços iniciais</p>
            <p className="mt-1 text-sm leading-6 text-white/58">
              Cadastre os atendimentos que o cliente vai escolher na agenda. O comerciante pode editar tudo depois.
            </p>
          </div>
          <button
            type="button"
            onClick={addService}
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-white/8 px-4 text-sm font-semibold text-white ring-1 ring-white/12 transition hover:bg-white/12"
          >
            Adicionar serviço
          </button>
        </div>

        {errors.services ? (
          <p className="rounded-[8px] bg-[#ff8ea8]/12 p-3 text-sm text-[#ff8ea8] ring-1 ring-[#ff8ea8]/20">
            {errors.services.join(', ')}
          </p>
        ) : null}

        <div className="space-y-3">
          {services.map((service, index) => (
            <div key={service.id} className="grid gap-3 rounded-[8px] bg-[#11172B]/72 p-3 ring-1 ring-white/10 md:grid-cols-[130px_minmax(150px,1fr)_112px_112px_auto] md:items-end">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-white/68">Categoria</span>
                <select
                  name="service_category"
                  value={service.category}
                  onChange={(event) => setServiceCategory(service.id, event.target.value)}
                  className={inputClass}
                >
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-white/68">Serviço</span>
                <select
                  name="service_name"
                  value={service.name}
                  onChange={(event) => setServiceName(service.id, event.target.value)}
                  className={inputClass}
                >
                  {currentServiceOptions(catalog, service.category, service.name).map((option) => (
                    <option key={option.name} value={option.name}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-white/68">Duração</span>
                <input
                  name="service_duration"
                  type="number"
                  value={service.duration}
                  onChange={(event) => setService(service.id, { duration: Number(event.target.value) })}
                  min={10}
                  max={480}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-white/68">Preço</span>
                <input
                  name="service_price"
                  type="number"
                  value={service.price}
                  onChange={(event) => setService(service.id, { price: event.target.value })}
                  min={0}
                  step="0.01"
                  placeholder="25"
                  className={inputClass}
                />
              </label>
              <button
                type="button"
                onClick={() => removeService(service.id)}
                disabled={services.length === 1}
                aria-label={`Remover serviço ${index + 1}`}
                className="inline-flex min-h-11 items-center justify-center rounded-[8px] bg-white/8 px-3 text-sm font-semibold text-white/72 ring-1 ring-white/10 transition hover:bg-[#ff8ea8]/14 hover:text-[#ff8ea8] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8FF0F4]">Agenda</p>
          <p className="mt-1 text-sm leading-6 text-white/58">
            Esses campos controlam como os horários aparecem para o cliente. O tempo de cada serviço define quanto a agenda bloqueia.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField
            label="Horários por dia"
            name="slots_per_schedule"
            defaultValue={10}
            min={1}
            max={48}
            hint="Quantidade aproximada de opções exibidas em um dia de 8 horas. Ex: 10 gera intervalos perto de 48 min."
            errors={errors.slots_per_schedule}
          />
          <NumberField
            label="Lembrete antes"
            name="reminder_hours_before"
            defaultValue={24}
            min={1}
            max={72}
            suffix="h"
            hint="Quantas horas antes do atendimento o cliente recebe confirmação."
            errors={errors.reminder_hours_before}
          />
          <NumberField
            label="Cancelar antes"
            name="auto_cancel_hours_before"
            defaultValue={4}
            min={1}
            max={72}
            suffix="h"
            hint="Prazo mínimo para o cliente cancelar sem atrapalhar a agenda."
            errors={errors.auto_cancel_hours_before}
          />
        </div>
      </section>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-white/58">Depois do cadastro, o responsável entra pelo login e assume o painel.</p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? 'Criando...' : 'Criar estabelecimento'}
        </button>
      </div>
    </form>
  )
}

function Field({
  label, name, type = 'text', required, placeholder, className, errors, hint, value, onChange
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  placeholder?: string
  className?: string
  errors?: string[]
  hint?: string
  value?: string
  onChange?: (value: string) => void
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
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className={inputClass}
      />
      {hint && <p className="mt-1 text-xs text-white/48">{hint}</p>}
      {errors && <p className="mt-1 text-xs text-[#ff8ea8]">{errors.join(', ')}</p>}
    </div>
  )
}

function NumberField({
  label,
  name,
  defaultValue,
  min,
  max,
  suffix,
  hint,
  errors,
}: {
  label: string
  name: string
  defaultValue: number
  min: number
  max: number
  suffix?: string
  hint?: string
  errors?: string[]
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-white/80">{label}</label>
      <div className="relative">
        <input
          name={name}
          type="number"
          defaultValue={defaultValue}
          min={min}
          max={max}
          className="w-full rounded-[8px] border border-white/10 bg-[#11172B] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25"
        />
        {suffix ? <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-white/45">{suffix}</span> : null}
      </div>
      {hint ? <p className="mt-1 text-xs leading-5 text-white/48">{hint}</p> : null}
      {errors && <p className="mt-1 text-xs text-[#ff8ea8]">{errors.join(', ')}</p>}
    </div>
  )
}
