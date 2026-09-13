import { ReactNode } from 'react'

// Renderer markdown léger et autonome (pas de dépendance externe).
// Gère : titres #/##/###, gras **, italique *, code `…`, listes - / 1.,
// tableaux GitHub, règles ---, paragraphes.

function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = []
  // Ordre : code > gras > italique
  const regex = /(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\*([^*]+)\*)|(_([^_]+)_)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    if (m[2]) nodes.push(<strong key={`${keyBase}-${i}`}>{m[2]}</strong>)
    else if (m[4]) nodes.push(<code key={`${keyBase}-${i}`} className="rounded bg-cream-200 px-1 py-0.5 font-mono text-[0.85em]">{m[4]}</code>)
    else if (m[6]) nodes.push(<em key={`${keyBase}-${i}`}>{m[6]}</em>)
    else if (m[8]) nodes.push(<em key={`${keyBase}-${i}`}>{m[8]}</em>)
    last = m.index + m[0].length
    i++
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

const splitRow = (line: string) =>
  line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim())

export function MarkdownView({ content }: { content: string }) {
  const cleaned = content
    .replace(/<br\s*\/?>/gi, ' • ')
    .replace(/<\/?(?:b|strong)>/gi, '**')
    .replace(/<\/?(?:i|em)>/gi, '*')
    .replace(/<\/?[a-zA-Z][^>]*>/g, '')
    .replace(/ • \s*(\||$)/g, '$1')
  const lines = cleaned.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Ligne vide
    if (!trimmed) { i++; continue }

    // Règle horizontale
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(trimmed)) {
      blocks.push(<hr key={key++} className="my-4 border-ink-100" />)
      i++; continue
    }

    // Titres
    const h = trimmed.match(/^(#{1,4})\s+(.*)$/)
    if (h) {
      const level = h[1].length
      const cls = level === 1 ? 'mt-5 mb-2 text-xl font-semibold text-ink-900'
        : level === 2 ? 'mt-5 mb-2 text-lg font-semibold text-ink-900'
        : 'mt-4 mb-1.5 text-base font-semibold text-ink-800'
      blocks.push(<p key={key++} className={cls}>{renderInline(h[2], `h${key}`)}</p>)
      i++; continue
    }

    // Tableau : ligne avec | suivie d'une ligne de séparation ---|---
    if (trimmed.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1])) {
      const header = splitRow(trimmed)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitRow(lines[i])); i++
      }
      blocks.push(
        <div key={key++} className="my-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>{header.map((c, j) => <th key={j} className="border border-ink-100 bg-cream-100 px-3 py-2 text-left font-semibold text-ink-700">{renderInline(c, `th${key}-${j}`)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>{r.map((c, ci) => <td key={ci} className="border border-ink-100 px-3 py-2 text-ink-700">{renderInline(c, `td${key}-${ri}-${ci}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }

    // Listes
    if (/^(\s*)([-*]|\d+\.)\s+/.test(line)) {
      const items: ReactNode[] = []
      const ordered = /^\s*\d+\.\s+/.test(line)
      while (i < lines.length && /^(\s*)([-*]|\d+\.)\s+/.test(lines[i])) {
        const content2 = lines[i].replace(/^(\s*)([-*]|\d+\.)\s+/, '')
        items.push(<li key={items.length} className="ml-1">{renderInline(content2, `li${key}-${items.length}`)}</li>)
        i++
      }
      blocks.push(
        ordered
          ? <ol key={key++} className="my-2 list-decimal space-y-1 pl-5 text-sm text-ink-700">{items}</ol>
          : <ul key={key++} className="my-2 list-disc space-y-1 pl-5 text-sm text-ink-700">{items}</ul>,
      )
      continue
    }

    // Paragraphe (regroupe les lignes consécutives non vides)
    const para: string[] = [trimmed]
    i++
    while (i < lines.length && lines[i].trim() && !/^(#{1,4})\s/.test(lines[i].trim()) && !/^(\s*)([-*]|\d+\.)\s+/.test(lines[i]) && !lines[i].includes('|') && !/^(-{3,}|_{3,}|\*{3,})$/.test(lines[i].trim())) {
      para.push(lines[i].trim()); i++
    }
    blocks.push(<p key={key++} className="my-2 text-sm leading-relaxed text-ink-700">{renderInline(para.join(' '), `p${key}`)}</p>)
  }

  return <div className="markdown-body">{blocks}</div>
}
