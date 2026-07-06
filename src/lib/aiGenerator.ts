import { supabase } from '@/lib/supabase'
import type { LucideIcon } from 'lucide-react'
import { Briefcase, Linkedin, Mail, MessageCircle, Zap } from 'lucide-react'

export interface AiPreset {
  value: string
  label: string
  description: string
  icon: LucideIcon
  placeholder: string
  helper: string
  minRows: number
}

export const AI_PRESETS: AiPreset[] = [
  {
    value: 'service_description',
    label: 'Description de service',
    description:
      'Une description commerciale prête à coller dans ton portfolio.',
    icon: Briefcase,
    placeholder:
      'Ex : Refonte de site vitrine avec SEO local, livrée en 3 semaines.',
    helper: 'Décris le service en une ou deux lignes.',
    minRows: 3,
  },
  {
    value: 'linkedin_post',
    label: 'Post LinkedIn',
    description: 'Un post court, engageant, formaté pour mobile.',
    icon: Linkedin,
    placeholder:
      'Ex : Ce que j’ai appris à refaire 5 sites de restaurants en 2025.',
    helper: 'Sujet, angle, insight à partager.',
    minRows: 3,
  },
  {
    value: 'follow_up_email',
    label: 'Email de relance',
    description: 'Un email court avec objet + corps.',
    icon: Mail,
    placeholder:
      'Ex : Prospect vu au dernier meetup Dev en Août, jamais recontacté.',
    helper: 'Contexte : à qui, depuis combien de temps, pourquoi relancer.',
    minRows: 3,
  },
  {
    value: 'pitch_elevator',
    label: 'Pitch elevator',
    description: 'Un pitch de 30 secondes basé sur ton onboarding.',
    icon: Zap,
    placeholder:
      'Ex : Pour un événement networking, rendre le pitch plus concret.',
    helper: 'Contexte d’usage ou ajustement demandé.',
    minRows: 2,
  },
  {
    value: 'whatsapp_prospection',
    label: 'Message WhatsApp',
    description: 'Un premier contact chaleureux, pas commercial.',
    icon: MessageCircle,
    placeholder:
      'Ex : Fondatrice d’une agence de com, rencontrée sur LinkedIn.',
    helper: 'Qui est la personne, comment tu la connais, quel angle.',
    minRows: 3,
  },
]

export const getPreset = (value: string) =>
  AI_PRESETS.find((p) => p.value === value)

export interface AiGeneration {
  id: string
  user_id: string
  type: string
  input_prompt: string
  generated_content: string
  used_in_portfolio: boolean
  created_at: string
}

export async function generateContent(type: string, input: string) {
  const { data, error } = await supabase.functions.invoke<{
    content: string
    generation: AiGeneration
  }>('generate-content', {
    body: { type, input },
  })
  if (error) {
    let message = error.message
    const ctx = (error as { context?: Response }).context
    if (ctx && typeof (ctx as Response).json === 'function') {
      try {
        const body = (await (ctx as Response).clone().json()) as {
          error?: string
        }
        if (body?.error) message = body.error
      } catch {
        // fall back to generic message
      }
    }
    return { data: null, error: message }
  }
  return { data, error: null }
}

export async function fetchGenerationHistory(userId: string, limit = 20) {
  const { data } = await supabase
    .from('ai_generations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data as AiGeneration[]) ?? []
}

export async function markGenerationUsedInPortfolio(id: string, used = true) {
  await supabase
    .from('ai_generations')
    .update({ used_in_portfolio: used })
    .eq('id', id)
}

export async function deleteGeneration(id: string) {
  await supabase.from('ai_generations').delete().eq('id', id)
}
