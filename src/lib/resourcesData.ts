import { supabase } from './supabase'

// ---------------------------------------------------------------------------
// Modèle : ressources gérées par l'administrateur, visibles par tous les
// utilisateurs authentifiés (RLS: is_published = true).
// ---------------------------------------------------------------------------

export type ResourceType = 'ebook' | 'tool' | 'prompt' | 'training'

export const RESOURCE_TYPES: { value: ResourceType; label: string; plural: string }[] = [
  { value: 'ebook', label: 'Ebook', plural: 'Ebooks' },
  { value: 'tool', label: 'Outil', plural: 'Outils' },
  { value: 'prompt', label: 'Prompt', plural: 'Prompts' },
  { value: 'training', label: 'Formation', plural: 'Formations' },
]

export interface Resource {
  id: string
  type: ResourceType
  title: string
  description: string | null
  cover_url: string | null
  content_url: string | null
  content_text: string | null
  duration_minutes: number | null
  category: string | null
  is_published: boolean
  display_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ResourceInput = Omit<
  Resource,
  'id' | 'created_by' | 'created_at' | 'updated_at'
>

// ---------------------------------------------------------------------------
// Lecture — utilisateur (voit uniquement les publiées) et admin (voit tout)
// ---------------------------------------------------------------------------

export async function fetchPublishedResources(type?: ResourceType): Promise<Resource[]> {
  let q = supabase
    .from('admin_resources')
    .select('*')
    .eq('is_published', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })
  if (type) q = q.eq('type', type)
  const { data } = await q
  return (data as Resource[] | null) ?? []
}

export async function fetchAllResources(): Promise<Resource[]> {
  const { data } = await supabase
    .from('admin_resources')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })
  return (data as Resource[] | null) ?? []
}

export async function fetchResource(id: string): Promise<Resource | null> {
  const { data } = await supabase.from('admin_resources').select('*').eq('id', id).maybeSingle()
  return (data as Resource | null) ?? null
}

// ---------------------------------------------------------------------------
// CRUD admin — protégés côté serveur par RLS (is_admin())
// ---------------------------------------------------------------------------

export async function createResource(
  input: ResourceInput,
): Promise<{ data: Resource | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('admin_resources')
    .insert({ ...input, created_by: user?.id ?? null })
    .select()
    .single()
  return { data: (data as Resource | null) ?? null, error: error?.message ?? null }
}

export async function updateResource(
  id: string,
  patch: Partial<ResourceInput>,
): Promise<{ data: Resource | null; error: string | null }> {
  const { data, error } = await supabase
    .from('admin_resources')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  return { data: (data as Resource | null) ?? null, error: error?.message ?? null }
}

export async function deleteResource(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('admin_resources').delete().eq('id', id)
  return { error: error?.message ?? null }
}

export async function toggleResourcePublished(
  id: string,
  next: boolean,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('admin_resources')
    .update({ is_published: next })
    .eq('id', id)
  return { error: error?.message ?? null }
}

// ---------------------------------------------------------------------------
// Upload fichier (cover image ou PDF ebook) vers le bucket `resources`
// ---------------------------------------------------------------------------

export async function uploadResourceFile(
  file: File,
  folder: 'covers' | 'ebooks',
): Promise<{ url: string | null; error: string | null }> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('resources').upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  })
  if (error) return { url: null, error: error.message }
  const { data: pub } = supabase.storage.from('resources').getPublicUrl(path)
  return { url: pub.publicUrl, error: null }
}

// ---------------------------------------------------------------------------
// Utilitaires côté UI
// ---------------------------------------------------------------------------

export function uniqueCategories(resources: Resource[]): string[] {
  const set = new Set<string>()
  for (const r of resources) if (r.category?.trim()) set.add(r.category.trim())
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'))
}
