import { ChangeEvent, useRef, useState } from 'react'
import { ImageIcon, Loader2, Trash2, Upload } from 'lucide-react'
import { deletePortfolioAsset, uploadPortfolioAsset } from '@/lib/storageUpload'

interface Props {
  userId: string
  folder: 'projects' | 'services'
  currentUrl: string | null
  onChange: (nextUrl: string | null) => void
  label?: string
  hint?: string
  aspectRatio?: string // ex : '16 / 9', '4 / 3'
}

/**
 * Uploader d'image rectangulaire (projets, services) — même helpers Storage
 * que PhotoUploader, UI adaptée à un thumbnail paysage.
 */
export function ImageUploader({
  userId,
  folder,
  currentUrl,
  onChange,
  label = 'Image',
  hint = 'JPG, PNG ou WEBP — max 5 Mo. Format paysage recommandé.',
  aspectRatio = '16 / 9',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pickFile = () => inputRef.current?.click()

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    setUploading(true)
    const prev = currentUrl
    const { url, error } = await uploadPortfolioAsset(userId, folder, file)
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

  const removeImage = async () => {
    if (!currentUrl) return
    const prev = currentUrl
    onChange(null)
    deletePortfolioAsset(prev).catch(() => {})
  }

  return (
    <div>
      <label className="label">{label}</label>
      <button
        type="button"
        onClick={pickFile}
        style={{ aspectRatio }}
        className="group relative flex w-full items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-ink-200 bg-cream-100 transition hover:border-accent-500 hover:bg-accent-50"
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-accent-500">
            <Loader2 className="animate-spin" size={22} />
            <span className="text-xs font-medium">Téléversement…</span>
          </div>
        ) : currentUrl ? (
          <>
            <img
              src={currentUrl}
              alt=""
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center gap-2 bg-ink-900/50 text-sm font-medium text-white opacity-0 transition group-hover:opacity-100">
              <Upload size={16} />
              Remplacer
            </span>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-ink-400">
            <ImageIcon size={24} />
            <span className="text-xs font-medium">Cliquer pour téléverser</span>
          </div>
        )}
      </button>

      <div className="mt-2 flex items-start justify-between gap-3">
        <p className="text-xs text-ink-400">{hint}</p>
        {currentUrl && !uploading && (
          <button
            type="button"
            onClick={removeImage}
            className="flex shrink-0 items-center gap-1 text-xs font-medium text-danger-600 hover:underline"
          >
            <Trash2 size={11} />
            Retirer
          </button>
        )}
      </div>

      {error && (
        <p className="mt-2 rounded border border-danger-500/30 bg-danger-500/5 px-3 py-2 text-xs text-danger-600">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  )
}
