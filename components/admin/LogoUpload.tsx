'use client'

import { useState } from 'react'
import { uploadLogo } from '@/actions/admin'

const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2MB

interface LogoUploadProps {
  establishmentId: string
  currentLogoUrl: string | null
}

export default function LogoUpload({
  establishmentId: _establishmentId,
  currentLogoUrl,
}: LogoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl)

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_SIZE_BYTES) {
      setError('O logo deve ter menos de 2MB')
      return
    }

    setError(null)
    setUploading(true)

    const formData = new FormData()
    formData.set('file', file)

    const result = await uploadLogo(formData)

    if (result.error) {
      setError(result.error)
    } else if (result.url) {
      setPreviewUrl(result.url)
    }

    setUploading(false)
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Logo do salão"
          className="w-16 h-16 rounded-xl object-cover border border-gray-200"
        />
      )}
      <label className="cursor-pointer text-sm text-gray-600 hover:text-black transition-colors">
        {uploading ? 'Carregando...' : 'Enviar logo'}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleChange}
          className="sr-only"
          disabled={uploading}
        />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
