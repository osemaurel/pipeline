import { supabase } from '@/lib/supabase'
import type { PipelineStage } from '@/lib/pipelineStatus'

export interface Prospect {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  linkedin_url: string | null
  company_name: string
  company_website: string | null
  company_size: string | null
  sector: string | null
  position: string | null
  country: string
  city: string | null
  status: PipelineStage | string
  channel: string
  priority: number
  is_favorite: boolean
  is_reachable: string
  source: string | null
  notes: string | null
  estimated_deal_value: number | null
  tags: string[]
  engagement_score: number
  last_interaction_at: string | null
  next_action_at: string | null
  created_at: string
  updated_at: string
}

export interface Interaction {
  id: string
  user_id: string
  prospect_id: string
  type: string
  title: string
  content: string | null
  sentiment: string
  occurred_at: string
  created_at: string
}

export interface Action {
  id: string
  user_id: string
  prospect_id: string | null
  type: string
  title: string
  description: string | null
  scheduled_at: string
  is_completed: boolean
  completed_at: string | null
  created_at: string
}

export interface Meeting {
  id: string
  user_id: string
  prospect_id: string
  scheduled_at: string
  duration_minutes: number
  platform: string
  meeting_link: string | null
  preparation_notes: string | null
  preparation_questions: string[]
  notes_rapport: string | null
  notes_problems: string | null
  notes_solution: string | null
  notes_closing: string | null
  outcome: string | null
  price_announced: number | null
  objections: string | null
  follow_up_date: string | null
  status: string
  created_at: string
}

export interface ProspectActivity {
  interactions: Interaction[]
  actions: Action[]
  meetings: Meeting[]
}

export const INTERACTION_TYPES = [
  { value: 'email', label: 'Email' },
  { value: 'linkedin', label: 'Message LinkedIn' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'call', label: 'Appel' },
  { value: 'meeting', label: 'Rencontre' },
  { value: 'note', label: 'Note' },
] as const

export const INTERACTION_SENTIMENTS = [
  { value: 'positive', label: 'Positif' },
  { value: 'neutral', label: 'Neutre' },
  { value: 'negative', label: 'Négatif' },
] as const

export const ACTION_TYPES = [
  { value: 'follow_up', label: 'Relance' },
  { value: 'call', label: 'Appel' },
  { value: 'email', label: 'Email' },
  { value: 'send_proposal', label: 'Envoyer devis' },
  { value: 'other', label: 'Autre' },
] as const

export const CHANNELS = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'phone', label: 'Téléphone' },
  { value: 'referral', label: 'Recommandation' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'other', label: 'Autre' },
] as const

export const PRIORITY_LABELS = ['—', 'Bas', 'Moyen', 'Normal', 'Haut', 'Urgent']

export async function fetchProspects(userId: string): Promise<Prospect[]> {
  const { data } = await supabase
    .from('prospects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  return (data as Prospect[]) ?? []
}

export async function createProspect(input: Partial<Prospect> & { user_id: string }) {
  const { data, error } = await supabase
    .from('prospects')
    .insert(input)
    .select()
    .single()
  return {
    data: (data as Prospect | null) ?? null,
    error: error?.message ?? null,
  }
}

export async function updateProspect(id: string, patch: Partial<Prospect>) {
  const { data, error } = await supabase
    .from('prospects')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  return {
    data: (data as Prospect | null) ?? null,
    error: error?.message ?? null,
  }
}

export async function deleteProspect(id: string) {
  const { error } = await supabase.from('prospects').delete().eq('id', id)
  return { error: error?.message ?? null }
}

export async function fetchProspectActivity(
  prospectId: string,
): Promise<ProspectActivity> {
  const [iRes, aRes, mRes] = await Promise.all([
    supabase
      .from('interactions')
      .select('*')
      .eq('prospect_id', prospectId)
      .order('occurred_at', { ascending: false }),
    supabase
      .from('actions')
      .select('*')
      .eq('prospect_id', prospectId)
      .order('scheduled_at', { ascending: true }),
    supabase
      .from('meetings')
      .select('*')
      .eq('prospect_id', prospectId)
      .order('scheduled_at', { ascending: false }),
  ])
  return {
    interactions: (iRes.data as Interaction[]) ?? [],
    actions: (aRes.data as Action[]) ?? [],
    meetings: (mRes.data as Meeting[]) ?? [],
  }
}

export async function createInteraction(input: Partial<Interaction> & { user_id: string; prospect_id: string; type: string; title: string; occurred_at: string }) {
  const { data, error } = await supabase
    .from('interactions')
    .insert(input)
    .select()
    .single()
  if (!error && input.prospect_id) {
    await supabase
      .from('prospects')
      .update({ last_interaction_at: input.occurred_at })
      .eq('id', input.prospect_id)
  }
  return {
    data: (data as Interaction | null) ?? null,
    error: error?.message ?? null,
  }
}

export async function createAction(
  input: Partial<Action> & {
    user_id: string
    type: string
    title: string
    scheduled_at: string
  },
) {
  const { data, error } = await supabase
    .from('actions')
    .insert(input)
    .select()
    .single()
  return { data: (data as Action | null) ?? null, error: error?.message ?? null }
}

export async function updateAction(id: string, patch: Partial<Action>) {
  const { error } = await supabase.from('actions').update(patch).eq('id', id)
  return { error: error?.message ?? null }
}

export async function createMeeting(
  input: Partial<Meeting> & {
    user_id: string
    prospect_id: string
    scheduled_at: string
  },
) {
  const { data, error } = await supabase
    .from('meetings')
    .insert(input)
    .select()
    .single()
  return {
    data: (data as Meeting | null) ?? null,
    error: error?.message ?? null,
  }
}
