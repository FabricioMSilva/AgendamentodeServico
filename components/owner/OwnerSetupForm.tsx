'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { createOwnerEstablishment } from '@/actions/owner'
import AddressFields from '@/components/forms/AddressFields'
import {
  getFallbackServiceCatalog,
  type ServiceCatalogCategory,
} from '@/lib/services/categories'

type ServiceDraft = {
  id: string
  category: string
  name: string
  duration: number
  price: string
}

const MAX_LOGO_SOURCE_BYTES = 12 * 1024 * 1024
const MAX_GALLERY_SOURCE_BYTES = 12 * 1024 * 1024
const MAX_INITIAL_GALLERY_FILES = 6

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Não foi possível otimizar a imagem.'))
      },
      type,
      quality,
    )
  })
}

async function loadImage(file: File) {
  const url = URL.createObjectURL(file)

  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
      image.src = url
    })
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

async function optimizeImage(
  file: File,
  options: {
    width: number
    height: number
    maxBytes: number
    mimeType: 'image/jpeg' | 'image/webp'
    fileName: string
  },
) {
  const image = await loadImage(file)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) throw new Error('Não foi possível preparar a imagem.')

  const qualities = [0.78, 0.68, 0.58, 0.48, 0.38]
  const scales = [1, 0.85, 0.7, 0.58]
  let bestBlob: Blob | null = null

  for (const scale of scales) {
    const width = Math.round(options.width * scale)
    const height = Math.round(options.height * scale)
    canvas.width = width
    canvas.height = height

    const drawScale = Math.max(width / image.width, height / image.height)
    const drawWidth = image.width * drawScale
    const drawHeight = image.height * drawScale
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight)

    for (const quality of qualities) {
      const blob = await canvasToBlob(canvas, options.mimeType, quality)
      bestBlob = blob
      if (blob.size <= options.maxBytes) {
        return new File([blob], options.fileName, { type: options.mimeType })
      }
    }
  }

  if (!bestBlob) throw new Error('Não foi possível otimizar a imagem.')
  return new File([bestBlob], options.fileName, { type: options.mimeType })
}

function filesFromInput(form: HTMLFormElement, name: string) {
  const field = form.elements.namedItem(name)
  if (!(field instanceof HTMLInputElement)) return []
  return Array.from(field.files ?? [])
}

function serviceOptions(catalog: ServiceCatalogCategory[], category: string) {
  return catalog.find((item) => item.category === category)?.services ?? []
}

function createServiceDraft(catalog: ServiceCatalogCategory[], index: number): ServiceDraft {
  const category = catalog[0]?.category ?? 'Cabelo'
  const service = serviceOptions(catalog, category)[0]

  return {
    id: `${Date.now()}-${index}`,
    category,
    name: service?.name ?? '',
    duration: service?.durationMinutes ?? 30,
    price: service?.price == null ? '' : String(service.price),
  }
}

export default function OwnerSetupForm({
  currentCount = 0,
  maxEstablishments = 3,
  catalog = getFallbackServiceCatalog(),
}: {
  currentCount?: number
  maxEstablishments?: number
  catalog?: ServiceCatalogCategory[]
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [busy, setBusy] = useState(false)
  const [slugPreview, setSlugPreview] = useState('')
  const [logoLabel, setLogoLabel] = useState('Nenhum arquivo selecionado')
  const [galleryLabel, setGalleryLabel] = useState('Nenhuma foto selecionada')
  const [services, setServices] = useState<ServiceDraft[]>([
    createServiceDraft(catalog, 0),
    createServiceDraft(catalog, 1),
  ])

  const helper = useMemo(
    () => (slugPreview ? `URL sugerida: /${slugPreview}` : 'A URL pode ser editada por você.'),
    [slugPreview],
  )

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setErrors({})

    try {
      const form = event.currentTarget
      const formData = new FormData(form)
      const logo = filesFromInput(form, 'logo')[0]
      const gallery = filesFromInput(form, 'gallery').slice(0, MAX_INITIAL_GALLERY_FILES)

      formData.delete('logo')
      formData.delete('gallery')

      if (logo) {
        if (logo.size > MAX_LOGO_SOURCE_BYTES) {
          setErrors({ logo: ['Escolha um logo de até 12MB.'] })
          setBusy(false)
          return
        }

        const optimizedLogo = await optimizeImage(logo, {
          width: 256,
          height: 256,
          maxBytes: 40 * 1024,
          mimeType: 'image/webp',
          fileName: 'logo.webp',
        })
        formData.set('logo', optimizedLogo)
      }

      for (const [index, file] of gallery.entries()) {
        if (file.size > MAX_GALLERY_SOURCE_BYTES) {
          setErrors({ gallery: ['Cada foto deve ter até 12MB antes da otimização.'] })
          setBusy(false)
          return
        }

        const optimizedPhoto = await optimizeImage(file, {
          width: 720,
          height: 540,
          maxBytes: 80 * 1024,
          mimeType: 'image/jpeg',
          fileName: `foto-${index + 1}.jpg`,
        })
        formData.append('gallery', optimizedPhoto)
      }

      const result = (await createOwnerEstablishment(formData)) as {
        success?: boolean
        id?: string
        pendingApproval?: boolean
        error?: Record<string, string[]>
      }

      if (result?.error) {
        setErrors(result.error)
        setBusy(false)
        return
      }

      router.refresh()
      router.push('/aguardando-aprovacao?tipo=estabelecimento')
    } catch (error) {
      setErrors({
        _form: [error instanceof Error ? error.message : 'Não foi possível otimizar as imagens.'],
      })
      setBusy(false)
    }
  }

  const updateService = (id: string, patch: Partial<ServiceDraft>) => {
    setServices((current) =>
      current.map((service) => {
        if (service.id !== id) return service
        const next = { ...service, ...patch }

        if (patch.category) {
          const option = serviceOptions(catalog, patch.category)[0]
          next.name = option?.name ?? ''
          next.duration = option?.durationMinutes ?? 30
          next.price = option?.price == null ? '' : String(option.price)
        }

        if (patch.name) {
          const option = serviceOptions(catalog, next.category).find((item) => item.name === patch.name)
          if (option) {
            next.duration = option.durationMinutes
            next.price = option.price == null ? '' : String(option.price)
          }
        }

        return next
      }),
    )
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-[8px] bg-white/6 p-5 text-white shadow-[0_18px_50px_rgba(0,0,0,0.18)] ring-1 ring-white/10 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
          Novo estabelecimento
        </p>
        <h2 className="mt-2 text-2xl font-semibold">
          Vamos abrir o seu painel do dono
        </h2>
        <p className="mt-2 text-sm leading-6 text-white/68">
          Você pode cadastrar até {maxEstablishments} estabelecimentos. Depois ajuste agenda, serviços e horários no painel.
        </p>
        <p className="mt-2 text-xs font-semibold text-[#8FF0F4]">
          {currentCount} de {maxEstablishments} estabelecimentos cadastrados.
        </p>
      </div>

      {errors._form && (
        <p className="sm:col-span-2 rounded-[8px] bg-[#ff8ea8]/12 p-3 text-sm text-[#ff8ea8] ring-1 ring-[#ff8ea8]/20">
          {errors._form.join(', ')}
        </p>
      )}

      <Field label="Nome do negócio" name="name" required errors={errors.name} />
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-white/80">Tipo de negócio</span>
        <select
          name="business_type"
          defaultValue="outros"
          className="w-full rounded-[8px] border border-white/10 bg-[#11172B] px-4 py-3 text-sm text-white outline-none transition focus:border-white/25"
        >
          <option value="salao_feminino">Salão feminino</option>
          <option value="barbearia">Barbearia</option>
          <option value="estetica">Estética</option>
          <option value="clinica">Clínica</option>
          <option value="tattoo">Tattoo e piercing</option>
          <option value="outros">Outro</option>
        </select>
      </label>
      <Field
        label="Slug"
        name="slug"
        placeholder="studio-bella-rosa"
        helper={helper}
        onValueChange={setSlugPreview}
        errors={errors.slug}
      />
      <Field label="Contato" name="contact" placeholder="(11) 99999-0000" errors={errors.contact} />
      <label className="block sm:col-span-2">
        <span className="mb-1 block text-sm font-medium text-white/80">Descrição curta</span>
        <textarea
          name="description"
          rows={3}
          maxLength={500}
          placeholder="Conte rapidamente o que seu estabelecimento faz de melhor."
          className="w-full rounded-[8px] border border-white/10 bg-[#11172B] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25"
        />
        {errors.description ? <p className="mt-1 text-xs text-[#ff8ea8]">{errors.description.join(', ')}</p> : null}
      </label>

      <div className="sm:col-span-2">
        <AddressFields
          title="Endereço do negócio"
          description="CEP para preencher rua, bairro, cidade e estado automaticamente."
          required
          tone="dark"
        />
      </div>

      <div className="grid gap-4 rounded-[8px] border border-white/10 bg-white/5 p-4 sm:col-span-2 sm:grid-cols-[180px_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8FF0F4]">
            Mídia
          </p>
          <p className="mt-2 text-sm leading-6 text-white/62">
            Adicione logo e fotos para a página pública já nascer pronta.
          </p>
        </div>
        <div className="grid gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-white/80">Logo</span>
            <div className="flex flex-col gap-2">
              <label className="inline-flex min-h-[3rem] w-full cursor-pointer items-center justify-between rounded-[8px] border border-white/10 bg-[#11172B] px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20">
                <span>{logoLabel}</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase text-white/70">Selecionar</span>
                <input
                  name="logo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0]
                    setLogoLabel(file ? file.name : 'Nenhum arquivo selecionado')
                  }}
                  className="sr-only"
                />
              </label>
              <p className="text-xs text-white/50">O arquivo será reduzido para WebP antes de salvar.</p>
            </div>
            {errors.logo ? <p className="mt-1 text-xs text-[#ff8ea8]">{errors.logo.join(', ')}</p> : null}
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-white/80">Fotos do estabelecimento</span>
            <div className="flex flex-col gap-2">
              <label className="inline-flex min-h-[3rem] w-full cursor-pointer items-center justify-between rounded-[8px] border border-white/10 bg-[#11172B] px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20">
                <span>{galleryLabel}</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase text-white/70">Selecionar</span>
                <input
                  name="gallery"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(event) => {
                    const count = event.currentTarget.files?.length ?? 0
                    setGalleryLabel(count > 0 ? `${count} arquivo${count === 1 ? '' : 's'} selecionado${count === 1 ? '' : 's'}` : 'Nenhuma foto selecionada')
                  }}
                  className="sr-only"
                />
              </label>
              <p className="text-xs text-white/50">Até 6 fotos; o cadastro reduz cada uma antes de enviar.</p>
            </div>
            {errors.gallery ? <p className="mt-1 text-xs text-[#ff8ea8]">{errors.gallery.join(', ')}</p> : null}
          </label>
        </div>
      </div>

      <div className="rounded-[8px] border border-white/10 bg-white/5 p-4 sm:col-span-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8FF0F4]">
              Serviços iniciais
            </p>
            <p className="mt-2 text-sm leading-6 text-white/62">
              Escolha os serviços que já devem aparecer para o cliente.
            </p>
          </div>
           <button
             type="button"
             onClick={() => setServices((current) => [...current, createServiceDraft(catalog, current.length)])}
             className="w-full sm:w-fit rounded-[8px] bg-white/8 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/12"
           >
             Adicionar serviço
           </button>
        </div>

        <div className="mt-4 space-y-3">
          {services.map((service) => (
            <div key={service.id} className="grid gap-3 rounded-[8px] bg-[#11172B]/75 p-3 md:grid-cols-[1fr_1fr_90px_100px_auto]">
              <select
                name="service_category"
                value={service.category}
                onChange={(event) => updateService(service.id, { category: event.target.value })}
                className="rounded-[8px] border border-white/10 bg-[#11172B] px-3 py-2 text-sm text-white outline-none focus:border-white/25"
              >
                {catalog.map((item) => (
                  <option key={item.category} value={item.category}>
                    {item.category}
                  </option>
                ))}
              </select>
              <select
                name="service_name"
                value={service.name}
                onChange={(event) => updateService(service.id, { name: event.target.value })}
                className="rounded-[8px] border border-white/10 bg-[#11172B] px-3 py-2 text-sm text-white outline-none focus:border-white/25"
              >
                {serviceOptions(catalog, service.category).map((option) => (
                  <option key={option.name} value={option.name}>
                    {option.name}
                  </option>
                ))}
              </select>
              <input
                name="service_duration"
                type="number"
                min="10"
                max="480"
                value={service.duration}
                onChange={(event) => updateService(service.id, { duration: Number(event.target.value) })}
                className="rounded-[8px] border border-white/10 bg-[#11172B] px-3 py-2 text-sm text-white outline-none focus:border-white/25"
              />
              <input
                name="service_price"
                type="number"
                min="0"
                step="0.01"
                value={service.price}
                onChange={(event) => updateService(service.id, { price: event.target.value })}
                placeholder="Preço"
                className="rounded-[8px] border border-white/10 bg-[#11172B] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25"
              />
              <button
                type="button"
                onClick={() => setServices((current) => current.filter((item) => item.id !== service.id))}
                className="rounded-[8px] bg-[#ff8ea8]/12 px-3 py-2 text-xs font-semibold text-[#ff8ea8] transition hover:bg-[#ff8ea8]/18"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
        {errors.services ? <p className="mt-2 text-xs text-[#ff8ea8]">{errors.services.join(', ')}</p> : null}
      </div>

      <div className="sm:col-span-2">
        <Button type="submit" loading={busy} disabled={busy} className="w-full rounded-[8px]">
          {busy ? 'Otimizando e enviando...' : 'Enviar cadastro para aprovação'}
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
      <label className="mb-1 block text-sm font-medium text-white/80">
        {label}
        {required ? <span className="ml-0.5 text-[#FF66B2]">*</span> : null}
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
        className="w-full rounded-[8px] border border-white/10 bg-[#11172B] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25"
      />
      {helper ? <p className="mt-1 text-xs text-white/55">{helper}</p> : null}
      {errors ? <p className="mt-1 text-xs text-[#ff8ea8]">{errors.join(', ')}</p> : null}
    </div>
  )
}
