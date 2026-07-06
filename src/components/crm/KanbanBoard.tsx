import { Star } from 'lucide-react'
import type { DragEvent } from 'react'
import { useState } from 'react'
import { PIPELINE_STAGES } from '@/lib/pipelineStatus'
import type { Prospect } from '@/lib/crmData'

interface Props {
  prospects: Prospect[]
  onOpen: (prospect: Prospect) => void
  onMove: (prospect: Prospect, newStage: string) => void
}

export function KanbanBoard({ prospects, onOpen, onMove }: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<string | null>(null)

  const onDragStart = (e: DragEvent<HTMLDivElement>, id: string) => {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  const onDragEnd = () => {
    setDraggingId(null)
    setOverStage(null)
  }

  const onDrop = (e: DragEvent<HTMLDivElement>, stage: string) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain') || draggingId
    if (!id) return
    const p = prospects.find((x) => x.id === id)
    if (!p) return
    if (p.status !== stage) onMove(p, stage)
    onDragEnd()
  }

  const grouped = PIPELINE_STAGES.map((s) => ({
    ...s,
    items: prospects.filter((p) => p.status === s.value),
  }))

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {grouped.map((col) => (
        <div
          key={col.value}
          onDragOver={(e) => {
            e.preventDefault()
            setOverStage(col.value)
          }}
          onDragLeave={() => setOverStage(null)}
          onDrop={(e) => onDrop(e, col.value)}
          className={`flex w-72 shrink-0 flex-col rounded-lg border p-3 transition ${
            overStage === col.value
              ? 'border-accent-500 bg-accent-500/5'
              : 'border-ink-100 bg-cream-50'
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${col.color}`}
            >
              {col.label}
            </span>
            <span className="font-mono text-xs text-ink-400">
              {col.items.length}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
            {col.items.length === 0 ? (
              <p className="rounded border border-dashed border-ink-200 py-6 text-center text-xs text-ink-300">
                Aucun prospect
              </p>
            ) : (
              col.items.map((p) => (
                <div
                  key={p.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, p.id)}
                  onDragEnd={onDragEnd}
                  onClick={() => onOpen(p)}
                  className={`cursor-pointer rounded-lg border border-ink-100 bg-cream-50 p-3 shadow-sm transition hover:border-accent-500/40 hover:shadow-md ${
                    draggingId === p.id ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink-800">
                      {p.first_name} {p.last_name}
                    </p>
                    {p.is_favorite && (
                      <Star
                        size={12}
                        className="shrink-0 text-accent-500"
                        fill="currentColor"
                        strokeWidth={0}
                      />
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-ink-500">
                    {p.company_name}
                  </p>
                  {p.estimated_deal_value != null && (
                    <p className="mt-2 font-mono text-xs text-accent-700">
                      {p.estimated_deal_value.toLocaleString('fr-FR')} FCFA
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
