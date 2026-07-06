import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

interface Props {
  text: string
  label?: string
}

export function CopyButton({ text, label = 'Copier' }: Props) {
  const [ok, setOk] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setOk(true)
    setTimeout(() => setOk(false), 1500)
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 text-xs font-medium text-accent-600 hover:underline"
    >
      {ok ? <Check size={12} /> : <Copy size={12} />}
      {ok ? 'Copié' : label}
    </button>
  )
}
