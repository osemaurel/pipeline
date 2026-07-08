import { ChangeEvent, useRef, useState } from 'react'
import { Loader2, Trash2, Upload, User } from 'lucide-react'
import { deletePortfolioAsset, uploadPortfolioAsset } from '@/lib/storageUpload'

interface Props {
  userId: string
  currentUrl: string | null
  onChange: (nextUrl: string | null) => void
  label?: string
  hint?: string
  size?: 'md' | 'lg'
}

export function PhotoUploader({
  userId,
  currentUrl,
  onChange,
  label = 'Photo',
  hint = 'JPG, PNG ou WEBP — max 5 Mo. Carrée de préférence.',
  size = 'lg',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dimensions =
    size === 'lg' ? 'h-28 w-28' : 'h-20 w-20'

  const pickFile = () => inputRef.current?.click()

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // permet de re-sélectionner le même fichier
    if (!file) return
    setError(null)
    setUploading(true)
    const prev = currentUrl
    const { url, error } = await uploadPortfolioAsset(userId, 'photo', file)
    setUploading(false)
    if (error) {
      setError(error)
      return
    }
    if (url) {
      onChange(url)
      if (prev) deletePortfolioAsset(prev).catch(() => {})
    }
  }

  const removePhoto = async () => {
    if (!currentUrl) return
    if (!confirm('Retirer ta photo ?')) return
    const prev = currentUrl
    onChange(null)
    deletePortfolioAsset(prev).catch(() => {})
  }

  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={pickFile}
          className={`group relative flex ${dimensions} shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-ink-200 bg-cream-100 transition hover:border-accent-500 hover:bg-accent-50`}
          title="Changer la photo"
        >
          {uploading ? (
            <Loader2 className="animate-spin text-accent-500" size={22} />
          ) : currentUrl ? (
            <>
              <img
                src={currentUrl}
                alt=""
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-ink-900/50 opacity-0 transition group-hover:opacity-100">
                <Upload size={20} className="text-white" />
              </span>
            </>
          ) : (
            <User size={28} className="text-ink-300" />
          )}
        </button>

        <div className="flex-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={pickFile}
              disabled={uploading}
              className="btn-secondary"
            >
              <Upload size={14} />
              {currentUrl ? 'Remplacer' : 'Téléverser une photo'}
            </button>
            {currentUrl && (
              <button
                type="button"
                onClick={removePhoto}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded border border-ink-200 bg-cream-50 px-3 py-2.5 text-sm font-semibold text-danger-600 shadow-xs transition hover:bg-danger-50"
              >
                <Trash2 size={14} />
                Retirer
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-ink-400">{hint}</p>
          {error && (
            <p className="mt-2 rounded border border-danger-500/30 bg-danger-500/5 px-3 py-2 text-xs text-danger-600">
              {error}
            </p>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFile}
          className="hidden"
        />
      </div>
    </div>
  )
}
