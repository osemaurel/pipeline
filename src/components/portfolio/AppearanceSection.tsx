import { useRef } from 'react'
import { Check, Palette, Pipette } from 'lucide-react'
import { SectionCard } from './SectionCard'

export const DEFAULT_ACCENT = '#7F56D9'

const PRESET_COLORS: { value: string; label: string }[] = [
  { value: '#7F56D9', label: 'Violet' },
  { value: '#2970FF', label: 'Bleu' },
  { value: '#06AED4', label: 'Cyan' },
  { value: '#17B26A', label: 'Vert' },
  { value: '#E87A34', label: 'Orange' },
  { value: '#F04438', label: 'Rouge' },
  { value: '#EE46BC', label: 'Rose' },
  { value: '#EAAA08', label: 'Jaune' },
  { value: '#181D27', label: 'Noir' },
]

interface Props {
  accentColor: string | null
  onChange: (color: string) => void
}

export function AppearanceSection({ accentColor, onChange }: Props) {
  const pickerRef = useRef<HTMLInputElement>(null)
  const current = (accentColor ?? DEFAULT_ACCENT).toUpperCase()
  const isCustom = !PRESET_COLORS.some(
    (c) => c.value.toUpperCase() === current,
  )

  return (
    <SectionCard
      title="Apparence"
      icon={Palette}
      description="La couleur qui s'applique aux boutons, liens et touches décoratives de ta page publique."
    >
      <div className="flex flex-wrap items-center gap-3">
        {PRESET_COLORS.map((c) => {
          const active = c.value.toUpperCase() === current
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => onChange(c.value)}
              title={c.label}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                active
                  ? 'ring-2 ring-offset-2 ring-offset-cream-50'
                  : 'hover:scale-110'
              }`}
              style={{
                backgroundColor: c.value,
                ...(active ? { ['--tw-ring-color' as string]: c.value } : {}),
              }}
            >
              {active && <Check size={16} className="text-white" strokeWidth={3} />}
            </button>
          )
        })}

        {/* Couleur libre */}
        <button
          type="button"
          onClick={() => pickerRef.current?.click()}
          title="Couleur personnalisée"
          className={`relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-dashed transition hover:scale-110 ${
            isCustom
              ? 'border-transparent ring-2 ring-offset-2 ring-offset-cream-50'
              : 'border-ink-200'
          }`}
          style={
            isCustom
              ? {
                  backgroundColor: current,
                  ['--tw-ring-color' as string]: current,
                }
              : {}
          }
        >
          {isCustom ? (
            <Check size={16} className="text-white" strokeWidth={3} />
          ) : (
            <Pipette size={15} className="text-ink-400" />
          )}
          <input
            ref={pickerRef}
            type="color"
            value={current}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute inset-0 cursor-pointer opacity-0"
            tabIndex={-1}
          />
        </button>

        <span className="ml-1 font-mono text-xs text-ink-400">{current}</span>
      </div>

      <div className="mt-5 rounded-lg border border-ink-100 bg-cream-100 p-4">
        <p className="mb-3 text-xs uppercase tracking-wide text-ink-400">
          Aperçu
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: current }}
          >
            Me contacter →
          </span>
          <span className="text-sm font-semibold" style={{ color: current }}>
            Voir le projet ↗
          </span>
          <span className="text-3xl font-semibold text-ink-900">
            Titre<span style={{ color: current }}>.</span>
          </span>
        </div>
      </div>
    </SectionCard>
  )
}
