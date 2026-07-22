'use client'

import { useState } from 'react'
import { uploadLogo } from '@/actions/admin'

const MAX_SOURCE_SIZE_BYTES = 12 * 1024 * 1024 // 12MB
const MAX_OPTIMIZED_SIZE_BYTES = 2 * 1024 * 1024 // 2MB
const LOGO_SIZE = 512

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Não foi possível otimizar o logo'))
      },
      type,
      quality
    )
  })
}

async function resizeLogo(file: File, size = LOGO_SIZE): Promise<Blob> {
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
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível preparar o logo')

  const scale = Math.max(size / image.width, size / image.height)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  ctx.drawImage(image, (size - drawWidth) / 2, (size - drawHeight) / 2, drawWidth, drawHeight)

  try {
    return await canvasToBlob(canvas, 'image/webp', 0.86)
  } catch {
    return canvasToBlob(canvas, 'image/png')
  }
}

interface LogoUploadProps {
  establishmentId: string
  currentLogoUrl: string | null
}

export default function LogoUpload({
  establishmentId,
  currentLogoUrl,
}: LogoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl)

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_SOURCE_SIZE_BYTES) {
      setError('Envie uma imagem de até 12MB para otimizar como logo.')
      return
    }

    setError(null)
    setUploading(true)

    try {
      const resized = await resizeLogo(file)
      if (resized.size > MAX_OPTIMIZED_SIZE_BYTES) {
        setError('Não foi possível compactar o logo abaixo de 2MB. Tente outra imagem.')
        return
      }

      const formData = new FormData()
      const extension = resized.type === 'image/webp' ? 'webp' : 'png'
      formData.set('file', new File([resized], `logo.${extension}`, { type: resized.type }))
      formData.set('establishment_id', establishmentId)

      const result = await uploadLogo(formData)

      if (result.error) {
        setError(result.error)
      } else if (result.url) {
        setPreviewUrl(result.url)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o logo')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Logo do estabelecimento"
          className="h-16 w-16 rounded-[8px] border border-white/10 object-cover"
        />
      )}
      <label className="cursor-pointer text-sm text-white/68 transition-colors hover:text-white">
        {uploading ? 'Carregando...' : 'Enviar logo'}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleChange}
          className="sr-only"
          disabled={uploading}
        />
      </label>
      {error && <p className="text-xs text-[#ff8ea8]">{error}</p>}
    </div>
  )
}
