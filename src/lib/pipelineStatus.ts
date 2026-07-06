export const PIPELINE_STAGES = [
  { value: 'new', label: 'Nouveau', color: 'bg-ink-100 text-ink-700' },
  { value: 'contacted', label: 'Contacté', color: 'bg-cream-200 text-ink-700' },
  { value: 'replied', label: 'A répondu', color: 'bg-warn-500/10 text-warn-600' },
  {
    value: 'meeting_scheduled',
    label: 'RDV planifié',
    color: 'bg-accent-500/10 text-accent-700',
  },
  {
    value: 'meeting_done',
    label: 'RDV effectué',
    color: 'bg-accent-500/20 text-accent-700',
  },
  {
    value: 'proposal_sent',
    label: 'Devis envoyé',
    color: 'bg-accent-500/30 text-accent-800',
  },
  { value: 'won', label: 'Gagné', color: 'bg-success-500/15 text-success-600' },
  { value: 'lost', label: 'Perdu', color: 'bg-danger-500/10 text-danger-600' },
] as const

export type PipelineStage = (typeof PIPELINE_STAGES)[number]['value']

export const stageInfo = (value: string) =>
  PIPELINE_STAGES.find((s) => s.value === value) ?? {
    value,
    label: value,
    color: 'bg-ink-100 text-ink-700',
  }

export const ACTIVE_STAGES: PipelineStage[] = [
  'new',
  'contacted',
  'replied',
  'meeting_scheduled',
  'meeting_done',
  'proposal_sent',
]
