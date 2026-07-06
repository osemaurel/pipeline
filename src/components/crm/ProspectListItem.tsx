import { Star } from 'lucide-react'
import type { Prospect } from '@/lib/crmData'
import { stageInfo } from '@/lib/pipelineStatus'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Props {
  prospect: Prospect
  onClick: () => void
  active?: boolean
}

export function ProspectListItem({ prospect, onClick, active }: Props) {
  const stage = stageInfo(prospect.status)
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-lg border border-ink-100 p-3 text-left transition ${
        active ? 'bg-accent-500/5 border-accent-500/40' : 'bg-cream-50 hover:bg-cream-100'
      }`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream-200 text-sm font-semibold text-ink-500">
        {prospect.first_name.slice(0, 1).toUpperCase()}
        {prospect.last_name.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-ink-800">
            {prospect.first_name} {prospect.last_name}
          </p>
          {prospect.is_favorite && (
            <Star size={12} className="shrink-0 text-accent-500" fill="currentColor" strokeWidth={0} />
          )}
        </div>
        <p className="truncate text-xs text-ink-500">
          {prospect.company_name}
          {prospect.position && ` · ${prospect.position}`}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${stage.color}`}
          >
            {stage.label}
          </span>
          {prospect.last_interaction_at && (
            <span className="text-[10px] text-ink-400">
              Dernière interaction{' '}
              {formatDistanceToNow(new Date(prospect.last_interaction_at), {
                locale: fr,
                addSuffix: true,
              })}
            </span>
          )}
        </div>
      </div>
      {prospect.estimated_deal_value != null && (
        <div className="shrink-0 text-right">
          <p className="font-mono text-xs text-accent-700">
            {prospect.estimated_deal_value.toLocaleString('fr-FR')}
          </p>
          <p className="text-[10px] text-ink-400">FCFA</p>
        </div>
      )}
    </button>
  )
}
