import { useState, KeyboardEvent } from 'react'
import { Plus, X } from 'lucide-react'

interface Props {
  value: string[]
  onChange: (next: string[]) => void
  suggestions?: readonly string[]
  placeholder?: string
}

export function ChipMultiSelect({
  value,
  onChange,
  suggestions = [],
  placeholder = 'Ajouter…',
}: Props) {
  const [draft, setDraft] = useState('')

  const add = (raw: string) => {
    const item = raw.trim()
    if (!item) return
    if (value.includes(item)) return
    onChange([...value, item])
    setDraft('')
  }

  const remove = (item: string) => {
    onChange(value.filter((v) => v !== item))
  }

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add(draft)
    } else if (e.key === 'Backspace' && !draft && value.length) {
      remove(value[value.length - 1])
    }
  }

  const available = suggestions.filter((s) => !value.includes(s))

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 rounded border border-ink-200 bg-cream-50 p-2 focus-within:border-accent-500 focus-within:ring-2 focus-within:ring-accent-500/20">
        {value.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 rounded-full bg-accent-500/10 px-3 py-1 text-xs font-medium text-accent-700"
          >
            {item}
            <button
              type="button"
              onClick={() => remove(item)}
              className="rounded-full p-0.5 hover:bg-accent-500/20"
              aria-label={`Retirer ${item}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          onBlur={() => add(draft)}
          placeholder={value.length === 0 ? placeholder : ''}
          className="min-w-[8rem] flex-1 border-0 bg-transparent px-1 py-1 text-sm text-ink-800 placeholder:text-ink-300 focus:outline-none"
        />
      </div>
      {available.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {available.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-cream-50 px-2.5 py-1 text-xs text-ink-500 transition hover:border-accent-500 hover:text-accent-700"
            >
              <Plus size={11} />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
