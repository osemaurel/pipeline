import { supabase } from '@/lib/supabase'

export interface Template {
  id: string
  user_id: string
  category: string
  title: string
  subject: string | null
  content: string
  channel: string
  is_default: boolean
  created_at: string
}

export interface DiscoveryQuestion {
  id: string
  user_id: string
  question: string
  order_index: number
  is_active: boolean
}

export interface ObjectionResponse {
  id: string
  user_id: string
  objection: string
  response: string
}

export const TEMPLATE_CATEGORIES = [
  { value: 'prospection', label: 'Prospection' },
  { value: 'relance', label: 'Relance' },
  { value: 'decouverte', label: 'Découverte' },
  { value: 'proposition', label: 'Proposition' },
  { value: 'remerciement', label: 'Remerciement' },
  { value: 'autre', label: 'Autre' },
] as const

export const TEMPLATE_CHANNELS = [
  { value: 'email', label: 'Email' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'whatsapp', label: 'WhatsApp' },
] as const

// ----------------------------------------------------------------------------
// Templates
// ----------------------------------------------------------------------------

export async function fetchTemplates(userId: string): Promise<Template[]> {
  const { data } = await supabase
    .from('templates')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return (data as Template[]) ?? []
}

export async function saveTemplate(
  input: Partial<Template> & { user_id: string; category: string; title: string; content: string },
) {
  if (input.id) {
    const { id, ...patch } = input
    const { data, error } = await supabase
      .from('templates')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    return { data: (data as Template | null) ?? null, error: error?.message ?? null }
  }
  const { data, error } = await supabase
    .from('templates')
    .insert(input)
    .select()
    .single()
  return { data: (data as Template | null) ?? null, error: error?.message ?? null }
}

export async function deleteTemplate(id: string) {
  await supabase.from('templates').delete().eq('id', id)
}

// ----------------------------------------------------------------------------
// Discovery questions
// ----------------------------------------------------------------------------

export async function fetchDiscoveryQuestions(
  userId: string,
): Promise<DiscoveryQuestion[]> {
  const { data } = await supabase
    .from('discovery_questions')
    .select('*')
    .eq('user_id', userId)
    .order('order_index', { ascending: true })
  return (data as DiscoveryQuestion[]) ?? []
}

export async function saveDiscoveryQuestion(
  input: Partial<DiscoveryQuestion> & { user_id: string; question: string },
) {
  if (input.id) {
    const { id, ...patch } = input
    const { data, error } = await supabase
      .from('discovery_questions')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    return {
      data: (data as DiscoveryQuestion | null) ?? null,
      error: error?.message ?? null,
    }
  }
  const { data, error } = await supabase
    .from('discovery_questions')
    .insert(input)
    .select()
    .single()
  return {
    data: (data as DiscoveryQuestion | null) ?? null,
    error: error?.message ?? null,
  }
}

export async function deleteDiscoveryQuestion(id: string) {
  await supabase.from('discovery_questions').delete().eq('id', id)
}

export async function reorderDiscoveryQuestions(
  ids: string[],
): Promise<void> {
  await Promise.all(
    ids.map((id, index) =>
      supabase.from('discovery_questions').update({ order_index: index }).eq('id', id),
    ),
  )
}

// ----------------------------------------------------------------------------
// Objection responses
// ----------------------------------------------------------------------------

export async function fetchObjectionResponses(
  userId: string,
): Promise<ObjectionResponse[]> {
  const { data } = await supabase
    .from('objection_responses')
    .select('*')
    .eq('user_id', userId)
    .order('objection', { ascending: true })
  return (data as ObjectionResponse[]) ?? []
}

export async function saveObjectionResponse(
  input: Partial<ObjectionResponse> & {
    user_id: string
    objection: string
    response: string
  },
) {
  if (input.id) {
    const { id, ...patch } = input
    const { data, error } = await supabase
      .from('objection_responses')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    return {
      data: (data as ObjectionResponse | null) ?? null,
      error: error?.message ?? null,
    }
  }
  const { data, error } = await supabase
    .from('objection_responses')
    .insert(input)
    .select()
    .single()
  return {
    data: (data as ObjectionResponse | null) ?? null,
    error: error?.message ?? null,
  }
}

export async function deleteObjectionResponse(id: string) {
  await supabase.from('objection_responses').delete().eq('id', id)
}
