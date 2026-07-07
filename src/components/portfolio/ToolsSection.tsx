import { useState } from 'react'
import { Check, Wrench } from 'lucide-react'
import {
  TOOL_CATEGORIES,
  TOOLS_CATALOG,
  toolLogoUrl,
  type ToolCategory,
} from '@/lib/toolsCatalog'
import { SectionCard } from './SectionCard'

interface Props {
  selected: string[]
  onChange: (next: string[]) => void
}

export function ToolsSection({ selected, onChange }: Props) {
  const [category, setCategory] = useState<ToolCategory | 'all'>('all')

  const toggle = (slug: string) => {
    onChange(
      selected.includes(slug)
        ? selected.filter((s) => s !== slug)
        : [...selected, slug],
    )
  }

  const shown =
    category === 'all'
      ? TOOLS_CATALOG
      : TOOLS_CATALOG.filter((t) => t.category === category)

  return (
    <SectionCard
      title="Outils"
      icon={Wrench}
      description="Les outils que tu maîtrises — leurs logos s'affichent sur ta page publique, dans l'ordre de sélection."
    >
      <div className="mb-4 flex flex-wrap gap-1.5">
        <CategoryChip
          active={category === 'all'}
          onClick={() => setCategory('all')}
          label="Tous"
        />
        {TOOL_CATEGORIES.map((c) => (
          <CategoryChip
            key={c.value}
            active={category === c.value}
            onClick={() => setCategory(c.value)}
            label={c.label}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {shown.map((tool) => {
          const isSelected = selected.includes(tool.slug)
          return (
            <button
              key={tool.slug}
              type="button"
              onClick={() => toggle(tool.slug)}
              className={`relative flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition ${
                isSelected
                  ? 'border-accent-500 bg-accent-50 ring-1 ring-inset ring-accent-500'
                  : 'border-ink-100 bg-cream-50 hover:border-ink-200 hover:bg-cream-100'
              }`}
            >
              <img
                src={toolLogoUrl(tool.slug)}
                alt=""
                loading="lazy"
                className="h-6 w-6 shrink-0 object-contain"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.visibility = 'hidden'
                }}
              />
              <span
                className={`min-w-0 flex-1 truncate text-xs font-medium ${
                  isSelected ? 'text-accent-700' : 'text-ink-700'
                }`}
              >
                {tool.name}
              </span>
              {isSelected && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent-500 text-white">
                  <Check size={10} strokeWidth={3} />
                </span>
              )}
            </button>
          )
        })}
      </div>

      {selected.length > 0 && (
        <p className="mt-3 text-xs text-ink-400">
          {selected.length} outil{selected.length > 1 ? 's' : ''} sélectionné
          {selected.length > 1 ? 's' : ''}. Clique à nouveau pour retirer.
        </p>
      )}
    </SectionCard>
  )
}

function CategoryChip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
        active
          ? 'bg-ink-900 text-white'
          : 'bg-cream-200 text-ink-600 hover:bg-ink-100'
      }`}
    >
      {label}
    </button>
  )
}
