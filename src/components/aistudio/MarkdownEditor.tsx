import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Markdown } from 'tiptap-markdown'
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Redo2,
  Table as TableIcon,
  Undo2,
} from 'lucide-react'

interface Props {
  value: string
  onChange: (markdown: string) => void
  onBlur?: (markdown: string) => void
  placeholder?: string
}

// Nettoyage des artefacts HTML que l'IA glisse parfois dans le markdown
// (surtout <br> dans les cellules de tableau, qui ne sont pas du vrai markdown).
// - <br> → " • " (préserve la séparation dans les cellules de tableau)
// - <b>/<strong> → ** ; <i>/<em> → * ; le reste dégagé
function cleanMarkdown(md: string): string {
  return md
    .replace(/<br\s*\/?>/gi, ' • ')
    .replace(/<\/?(?:b|strong)>/gi, '**')
    .replace(/<\/?(?:i|em)>/gi, '*')
    .replace(/<\/?[a-zA-Z][^>]*>/g, '')
    .replace(/ • \s*(\||$)/g, '$1') // supprime les bullets orphelins en fin de cellule
}

// Éditeur WYSIWYG qui prend du markdown en entrée et sort du markdown propre.
// L'utilisateur édite comme dans Notion / Word (Ctrl+B, sélection + bouton, etc.),
// et la fonction copyAll récupère le markdown via getMarkdown().
export function MarkdownEditor({ value, onChange, onBlur, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-accent-600 underline' },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? 'Écris ta description ici…',
      }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Markdown.configure({
        html: false,
        tightLists: true,
        transformPastedText: true,
        transformCopiedText: false,
      }),
    ],
    content: cleanMarkdown(value),
    onUpdate: ({ editor }) => {
      const md = (editor.storage as any).markdown?.getMarkdown?.() ?? ''
      onChange(md)
    },
    onBlur: ({ editor }) => {
      if (onBlur) {
        const md = (editor.storage as any).markdown?.getMarkdown?.() ?? ''
        onBlur(md)
      }
    },
    editorProps: {
      attributes: {
        class: 'prose-md focus:outline-none min-h-[280px] px-4 py-3 text-sm text-ink-800 leading-relaxed',
      },
    },
  })

  // Synchronise le contenu si `value` change depuis l'extérieur (ex: régénération IA)
  useEffect(() => {
    if (!editor) return
    const cleaned = cleanMarkdown(value)
    const current = (editor.storage as any).markdown?.getMarkdown?.() ?? ''
    if (cleaned && current !== cleaned) {
      editor.commands.setContent(cleaned, { emitUpdate: false })
    }
  }, [value, editor])

  if (!editor) return null

  const btn = (active: boolean) =>
    `flex h-8 w-8 items-center justify-center rounded transition ${
      active ? 'bg-accent-500/10 text-accent-700' : 'text-ink-500 hover:bg-cream-100 hover:text-ink-800'
    }`

  return (
    <div className="rounded-lg border border-ink-100 bg-cream-50">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-ink-100 bg-cream-100 p-1.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={btn(editor.isActive('bold'))}
          title="Gras (Ctrl+B)"
        >
          <Bold size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={btn(editor.isActive('italic'))}
          title="Italique (Ctrl+I)"
        >
          <Italic size={15} />
        </button>
        <span className="mx-1 h-5 w-px bg-ink-200" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={btn(editor.isActive('heading', { level: 2 }))}
          title="Titre de section"
        >
          <Heading2 size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={btn(editor.isActive('heading', { level: 3 }))}
          title="Sous-titre"
        >
          <Heading3 size={15} />
        </button>
        <span className="mx-1 h-5 w-px bg-ink-200" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btn(editor.isActive('bulletList'))}
          title="Liste à puces"
        >
          <List size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={btn(editor.isActive('orderedList'))}
          title="Liste numérotée"
        >
          <ListOrdered size={15} />
        </button>
        <span className="mx-1 h-5 w-px bg-ink-200" />
        <button
          type="button"
          onClick={() => {
            const url = window.prompt('URL du lien :', editor.getAttributes('link').href ?? '')
            if (url === null) return
            if (!url) return editor.chain().focus().unsetLink().run()
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
          }}
          className={btn(editor.isActive('link'))}
          title="Lien"
        >
          <LinkIcon size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          className={btn(false)}
          title="Insérer un tableau"
        >
          <TableIcon size={15} />
        </button>
        <span className="mx-1 h-5 w-px bg-ink-200" />
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className={`${btn(false)} disabled:opacity-30`}
          title="Annuler (Ctrl+Z)"
        >
          <Undo2 size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className={`${btn(false)} disabled:opacity-30`}
          title="Refaire (Ctrl+Shift+Z)"
        >
          <Redo2 size={15} />
        </button>
      </div>
      <EditorContent editor={editor} className="markdown-editor-body" />
    </div>
  )
}

export function editorMarkdown(el: HTMLElement | null): string | null {
  return el?.getAttribute('data-markdown') ?? null
}
