import { supabase } from '@/lib/supabase'

const BUCKET = 'portfolios'
const MAX_SIZE = 5 * 1024 * 1024 // 5 Mo

export interface UploadResult {
  url: string | null
  error: string | null
}

const extFromFile = (file: File) => {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName && fromName.length <= 5) return fromName
  const fromType = file.type.split('/')[1]
  return fromType || 'jpg'
}

/**
 * Téléverse un fichier dans le bucket `portfolios` sous le dossier de l'utilisateur.
 * @param folder Sous-dossier logique (ex: "photo", "projects", "services")
 * @param file Fichier à téléverser
 */
export async function uploadPortfolioAsset(
  userId: string,
  folder: string,
  file: File,
): Promise<UploadResult> {
  if (!file.type.startsWith('image/')) {
    return { url: null, error: 'Format non supporté — utilise JPG, PNG, WEBP ou GIF.' }
  }
  if (file.size > MAX_SIZE) {
    return { url: null, error: 'Image trop lourde — maximum 5 Mo.' }
  }

  const path = `${userId}/${folder}/${Date.now()}.${extFromFile(file)}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) return { url: null, error: error.message }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}

/**
 * Supprime un asset précédemment uploadé. Silencieux si l'URL vient
 * d'un autre bucket ou d'un domaine externe.
 */
export async function deletePortfolioAsset(publicUrl: string) {
  const marker = `/${BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return // pas un fichier du bucket
  const path = publicUrl.slice(idx + marker.length)
  await supabase.storage.from(BUCKET).remove([path])
}
