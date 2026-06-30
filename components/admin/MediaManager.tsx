'use client'

import { useRef, useState } from 'react'
import { addMediaVideo, deleteMedia, uploadMediaImage } from '@/actions/admin'
import Button from '@/components/ui/Button'
import type { EstablishmentMedia } from '@/database.types'

const inputClass =
  'w-full rounded-[8px] border border-white/10 bg-[#11172B] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/25'

async function resizeImage(file: File, width = 1200, height = 900): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível preparar a imagem.')

  const scale = Math.max(width / image.width, height / image.height)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  const x = (width - drawWidth) / 2
  const y = (height - drawHeight) / 2
  ctx.drawImage(image, x, y, drawWidth, drawHeight)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Não foi possível otimizar a imagem.'))
    }, 'image/jpeg', 0.86)
  })
}

export default function MediaManager({ media }: { media: EstablishmentMedia[] }) {
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const fileRef = useRef<HTMLInputElement>(null)
  const images = media.filter((item) => item.media_type === 'image')
  const videos = media.filter((item) => item.media_type === 'video')

  const handleImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setMessage(null)
    setErrors({})
    try {
      const blob = await resizeImage(file)
      const formData = new FormData()
      formData.set('file', new File([blob], 'gallery.jpg', { type: 'image/jpeg' }))
      const result = await uploadMediaImage(formData)
      if (result.error) setMessage(result.error)
      else setMessage('Foto enviada.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível enviar a foto.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleVideo = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    setErrors({})
    const result = await addMediaVideo(new FormData(event.currentTarget))
    if (result.error) {
      setErrors(result.error)
    } else {
      setMessage('Vídeo anexado.')
      event.currentTarget.reset()
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[8px] border border-white/10 bg-white/5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Fotos da loja</p>
            <p className="mt-1 text-xs text-white/55">{images.length}/6 fotos, todas salvas em 1200x900.</p>
          </div>
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-[linear-gradient(135deg,#6A00FF_0%,#FF007F_52%,#FF66B2_100%)] px-5 text-sm font-semibold text-white transition hover:opacity-90">
            {uploading ? 'Enviando...' : 'Enviar foto'}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploading || images.length >= 6}
              onChange={handleImage}
            />
          </label>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-[8px] bg-[#11172B] ring-1 ring-white/10">
              <img src={item.url} alt={item.title ?? ''} className="aspect-[4/3] w-full object-cover" />
              <div className="flex items-center justify-between gap-2 p-3">
                <p className="truncate text-xs text-white/60">{item.title || 'Foto da loja'}</p>
                <button
                  type="button"
                  onClick={() => deleteMedia(item.id)}
                  className="rounded-[8px] bg-[#ff8ea8]/12 px-3 py-1.5 text-xs font-medium text-[#ff8ea8]"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleVideo} className="grid gap-3 rounded-[8px] border border-white/10 bg-white/5 p-4 md:grid-cols-[1fr_1fr_auto]">
        <input name="url" placeholder="Link YouTube, TikTok ou Vimeo" className={inputClass} />
        <input name="title" placeholder="Título opcional" className={inputClass} />
        <Button type="submit">Anexar vídeo</Button>
        {errors.url ? <p className="text-xs text-[#ff8ea8] md:col-span-3">{errors.url.join(', ')}</p> : null}
        {errors._form ? <p className="text-xs text-[#ff8ea8] md:col-span-3">{errors._form.join(', ')}</p> : null}
      </form>

      {videos.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {videos.map((item) => (
            <div key={item.id} className="rounded-[8px] bg-[#11172B] p-3 ring-1 ring-white/10">
              <p className="text-sm font-semibold text-white">{item.title || item.provider}</p>
              <a href={item.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-white/55">
                {item.url}
              </a>
            </div>
          ))}
        </div>
      ) : null}

      {message ? <p className="text-sm text-white/70">{message}</p> : null}
    </div>
  )
}
