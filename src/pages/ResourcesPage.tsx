import { useEffect, useState } from 'react'
import { BookOpen, HelpCircle, MessageSquareWarning } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import {
  fetchDiscoveryQuestions,
  fetchObjectionResponses,
  fetchTemplates,
  type DiscoveryQuestion,
  type ObjectionResponse,
  type Template,
} from '@/lib/resourcesData'
import { TemplatesTab } from '@/components/resources/TemplatesTab'
import { QuestionsTab } from '@/components/resources/QuestionsTab'
import { ObjectionsTab } from '@/components/resources/ObjectionsTab'

type Tab = 'templates' | 'questions' | 'objections'

export function ResourcesPage() {
  const user = useAuthStore((s) => s.user)
  const [tab, setTab] = useState<Tab>('templates')
  const [templates, setTemplates] = useState<Template[]>([])
  const [questions, setQuestions] = useState<DiscoveryQuestion[]>([])
  const [objections, setObjections] = useState<ObjectionResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([
      fetchTemplates(user.id),
      fetchDiscoveryQuestions(user.id),
      fetchObjectionResponses(user.id),
    ]).then(([t, q, o]) => {
      setTemplates(t)
      setQuestions(q)
      setObjections(o)
      setLoading(false)
    })
  }, [user])

  const tabs: {
    value: Tab
    label: string
    count: number
    icon: typeof BookOpen
    description: string
  }[] = [
    {
      value: 'templates',
      label: 'Templates',
      count: templates.length,
      icon: BookOpen,
      description: 'Emails et messages prêts à copier',
    },
    {
      value: 'questions',
      label: 'Questions',
      count: questions.length,
      icon: HelpCircle,
      description: 'Ce que tu poses en découverte',
    },
    {
      value: 'objections',
      label: 'Objections',
      count: objections.length,
      icon: MessageSquareWarning,
      description: 'Tes réponses aux blocages classiques',
    },
  ]

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-ink-900">Ressources</h1>
        <p className="mt-1 text-sm text-ink-500">
          Ta bibliothèque personnelle pour aller plus vite, sans réfléchir deux fois.
        </p>
      </header>

      <div className="mb-6 grid gap-2 sm:grid-cols-3">
        {tabs.map((t) => {
          const Icon = t.icon
          const active = tab === t.value
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`flex items-start gap-3 rounded-lg border p-3 text-left transition ${
                active
                  ? 'border-accent-500 bg-accent-500/5'
                  : 'border-ink-100 bg-cream-50 hover:bg-cream-100'
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  active
                    ? 'bg-accent-500 text-white'
                    : 'bg-cream-200 text-ink-500'
                }`}
              >
                <Icon size={16} />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <p
                    className={`text-sm font-medium ${
                      active ? 'text-accent-700' : 'text-ink-800'
                    }`}
                  >
                    {t.label}
                  </p>
                  <span className="font-mono text-xs text-ink-400">{t.count}</span>
                </div>
                <p className="mt-0.5 text-xs text-ink-500">{t.description}</p>
              </div>
            </button>
          )
        })}
      </div>

      <section className="card">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded bg-cream-100" />
            ))}
          </div>
        ) : user ? (
          tab === 'templates' ? (
            <TemplatesTab
              userId={user.id}
              templates={templates}
              onChange={setTemplates}
            />
          ) : tab === 'questions' ? (
            <QuestionsTab
              userId={user.id}
              questions={questions}
              onChange={setQuestions}
            />
          ) : (
            <ObjectionsTab
              userId={user.id}
              items={objections}
              onChange={setObjections}
            />
          )
        ) : null}
      </section>
    </div>
  )
}
