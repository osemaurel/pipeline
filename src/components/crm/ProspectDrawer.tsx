import { useEffect, useState } from 'react'
import {
  Calendar,
  CalendarPlus,
  ListChecks,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  Star,
  Users,
  X,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Prospect } from '@/lib/crmData'
import {
  ACTION_TYPES,
  INTERACTION_SENTIMENTS,
  INTERACTION_TYPES,
  createAction,
  createInteraction,
  createMeeting,
  fetchProspectActivity,
  updateAction,
  updateProspect,
  type Action,
  type Interaction,
  type Meeting,
  type ProspectActivity,
} from '@/lib/crmData'
import { PIPELINE_STAGES, stageInfo } from '@/lib/pipelineStatus'
import { ProspectForm } from './ProspectForm'

interface Props {
  userId: string
  prospect: Prospect
  onClose: () => void
  onUpdated: (p: Prospect) => void
  onDeleted: (id: string) => void
}

type Tab = 'overview' | 'edit'

export function ProspectDrawer({ userId, prospect, onClose, onUpdated, onDeleted }: Props) {
  const [tab, setTab] = useState<Tab>('overview')
  const [activity, setActivity] = useState<ProspectActivity | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchProspectActivity(prospect.id).then((a) => {
      setActivity(a)
      setLoading(false)
    })
  }, [prospect.id])

  const stage = stageInfo(prospect.status)

  const toggleFavorite = async () => {
    const { data } = await updateProspect(prospect.id, {
      is_favorite: !prospect.is_favorite,
    })
    if (data) onUpdated(data)
  }

  const changeStage = async (status: string) => {
    const { data } = await updateProspect(prospect.id, { status })
    if (data) onUpdated(data)
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="flex-1 bg-ink-900/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="flex w-full max-w-xl flex-col overflow-y-auto border-l border-ink-100 bg-cream-50 shadow-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-ink-100 bg-cream-50/95 p-6 backdrop-blur">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-xl font-semibold text-ink-900">
                {prospect.first_name} {prospect.last_name}
              </h2>
              <button
                onClick={toggleFavorite}
                className={`shrink-0 transition ${
                  prospect.is_favorite ? 'text-accent-500' : 'text-ink-300 hover:text-accent-500'
                }`}
                title="Favori"
              >
                <Star
                  size={18}
                  fill={prospect.is_favorite ? 'currentColor' : 'none'}
                  strokeWidth={prospect.is_favorite ? 0 : 2}
                />
              </button>
            </div>
            <p className="mt-0.5 truncate text-sm text-ink-500">
              {prospect.company_name}
              {prospect.position && ` · ${prospect.position}`}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={prospect.status}
                onChange={(e) => changeStage(e.target.value)}
                className={`rounded-full border-0 px-3 py-1 text-xs font-medium focus:ring-2 focus:ring-accent-500 ${stage.color}`}
              >
                {PIPELINE_STAGES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              {prospect.estimated_deal_value != null && (
                <span className="rounded-full bg-accent-500/10 px-3 py-1 font-mono text-xs text-accent-700">
                  {prospect.estimated_deal_value.toLocaleString('fr-FR')} FCFA
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-ink-800"
          >
            <X size={20} />
          </button>
        </header>

        <div className="border-b border-ink-100 px-6">
          <div className="flex gap-4">
            <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>
              Aperçu
            </TabButton>
            <TabButton active={tab === 'edit'} onClick={() => setTab('edit')}>
              Édition
            </TabButton>
          </div>
        </div>

        <div className="flex-1 space-y-6 p-6">
          {tab === 'edit' ? (
            <ProspectForm
              userId={userId}
              prospect={prospect}
              onSaved={(p) => {
                onUpdated(p)
                setTab('overview')
              }}
              onDeleted={onDeleted}
              onCancel={() => setTab('overview')}
            />
          ) : (
            <>
              <ContactBlock prospect={prospect} />
              {prospect.notes && (
                <div>
                  <SectionLabel>Notes</SectionLabel>
                  <p className="mt-2 whitespace-pre-wrap rounded-lg bg-cream-100 p-3 text-sm text-ink-700">
                    {prospect.notes}
                  </p>
                </div>
              )}
              <AddInteractionForm
                userId={userId}
                prospectId={prospect.id}
                onCreated={(i) =>
                  setActivity((a) =>
                    a ? { ...a, interactions: [i, ...a.interactions] } : a,
                  )
                }
              />
              <ScheduleBlock
                userId={userId}
                prospectId={prospect.id}
                activity={activity}
                loading={loading}
                onActionCreated={(x) =>
                  setActivity((a) =>
                    a ? { ...a, actions: [...a.actions, x] } : a,
                  )
                }
                onActionToggled={(id, done) =>
                  setActivity((a) =>
                    a
                      ? {
                          ...a,
                          actions: a.actions.map((x) =>
                            x.id === id ? { ...x, is_completed: done } : x,
                          ),
                        }
                      : a,
                  )
                }
                onMeetingCreated={(m) =>
                  setActivity((a) =>
                    a ? { ...a, meetings: [m, ...a.meetings] } : a,
                  )
                }
              />
              <ActivityTimeline activity={activity} loading={loading} />
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-1 py-3 text-sm font-medium transition ${
        active
          ? 'border-accent-500 text-ink-900'
          : 'border-transparent text-ink-400 hover:text-ink-700'
      }`}
    >
      {children}
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
      {children}
    </h3>
  )
}

function ContactBlock({ prospect }: { prospect: Prospect }) {
  const items = [
    prospect.email && { icon: Mail, label: prospect.email, href: `mailto:${prospect.email}` },
    prospect.phone && { icon: Phone, label: prospect.phone, href: `tel:${prospect.phone}` },
    prospect.sector && { icon: Users, label: prospect.sector, href: null },
  ].filter(Boolean) as { icon: typeof Mail; label: string; href: string | null }[]

  if (items.length === 0) return null

  return (
    <div>
      <SectionLabel>Contact</SectionLabel>
      <ul className="mt-2 space-y-1.5 text-sm">
        {items.map((it, i) => {
          const Icon = it.icon
          const inner = (
            <span className="flex items-center gap-2 text-ink-700">
              <Icon size={14} className="text-ink-400" />
              {it.label}
            </span>
          )
          return (
            <li key={i}>
              {it.href ? (
                <a href={it.href} className="hover:text-accent-600">
                  {inner}
                </a>
              ) : (
                inner
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function AddInteractionForm({
  userId,
  prospectId,
  onCreated,
}: {
  userId: string
  prospectId: string
  onCreated: (i: Interaction) => void
}) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<string>('email')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [sentiment, setSentiment] = useState('neutral')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    const { data } = await createInteraction({
      user_id: userId,
      prospect_id: prospectId,
      type,
      title: title.trim(),
      content: content.trim() || null,
      sentiment,
      occurred_at: new Date().toISOString(),
    })
    setSaving(false)
    if (data) {
      onCreated(data)
      setOpen(false)
      setTitle('')
      setContent('')
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn-secondary w-full"
      >
        <MessageSquare size={14} />
        Enregistrer une interaction
      </button>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="rounded-lg border border-accent-500/30 bg-accent-500/5 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-800">Nouvelle interaction</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-ink-400 hover:text-ink-800"
        >
          <X size={14} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Type</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            {INTERACTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Ressenti</label>
          <select
            className="input"
            value={sentiment}
            onChange={(e) => setSentiment(e.target.value)}
          >
            {INTERACTION_SENTIMENTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Résumé court</label>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Ex : Premier échange sur son besoin"
        />
      </div>
      <div>
        <label className="label">Détails (optionnel)</label>
        <textarea
          className="input min-h-[80px]"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Ce qui s'est dit, décisions, prochaines étapes…"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-secondary"
        >
          Annuler
        </button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  )
}

function ScheduleBlock({
  userId,
  prospectId,
  activity,
  loading,
  onActionCreated,
  onActionToggled,
  onMeetingCreated,
}: {
  userId: string
  prospectId: string
  activity: ProspectActivity | null
  loading: boolean
  onActionCreated: (a: Action) => void
  onActionToggled: (id: string, done: boolean) => void
  onMeetingCreated: (m: Meeting) => void
}) {
  const [openAction, setOpenAction] = useState(false)
  const [openMeeting, setOpenMeeting] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionLabel>À faire</SectionLabel>
        <div className="flex gap-2">
          <button
            onClick={() => setOpenAction(true)}
            className="flex items-center gap-1 text-xs font-medium text-accent-600 hover:underline"
          >
            <ListChecks size={12} />
            + Action
          </button>
          <button
            onClick={() => setOpenMeeting(true)}
            className="flex items-center gap-1 text-xs font-medium text-accent-600 hover:underline"
          >
            <CalendarPlus size={12} />
            + RDV
          </button>
        </div>
      </div>

      {openAction && (
        <NewActionForm
          userId={userId}
          prospectId={prospectId}
          onCancel={() => setOpenAction(false)}
          onCreated={(a) => {
            onActionCreated(a)
            setOpenAction(false)
          }}
        />
      )}

      {openMeeting && (
        <NewMeetingForm
          userId={userId}
          prospectId={prospectId}
          onCancel={() => setOpenMeeting(false)}
          onCreated={(m) => {
            onMeetingCreated(m)
            setOpenMeeting(false)
          }}
        />
      )}

      {loading ? (
        <div className="h-16 animate-pulse rounded bg-cream-100" />
      ) : (
        <>
          {activity && activity.actions.filter((a) => !a.is_completed).length > 0 && (
            <ul className="space-y-2">
              {activity.actions
                .filter((a) => !a.is_completed)
                .map((a) => (
                  <li
                    key={a.id}
                    className="flex items-start gap-2 rounded border border-ink-100 bg-cream-50 p-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-[#7F56D9]"
                      onChange={async () => {
                        await updateAction(a.id, {
                          is_completed: true,
                          completed_at: new Date().toISOString(),
                        })
                        onActionToggled(a.id, true)
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink-800">{a.title}</p>
                      <p className="text-xs text-ink-400">
                        {format(new Date(a.scheduled_at), "d MMM, HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </li>
                ))}
            </ul>
          )}
          {activity && activity.meetings.length > 0 && (
            <ul className="space-y-2">
              {activity.meetings.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-2 rounded border border-ink-100 bg-cream-50 p-2 text-sm"
                >
                  <Calendar size={14} className="text-accent-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink-800">
                      {format(new Date(m.scheduled_at), "EEEE d MMM, HH:mm", { locale: fr })}
                    </p>
                    <p className="text-xs text-ink-400">
                      {m.duration_minutes} min · {m.platform}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

function NewActionForm({
  userId,
  prospectId,
  onCancel,
  onCreated,
}: {
  userId: string
  prospectId: string
  onCancel: () => void
  onCreated: (a: Action) => void
}) {
  const [type, setType] = useState('follow_up')
  const [title, setTitle] = useState('')
  const [when, setWhen] = useState(defaultDateTime(3))
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    const { data } = await createAction({
      user_id: userId,
      prospect_id: prospectId,
      type,
      title: title.trim(),
      scheduled_at: new Date(when).toISOString(),
    })
    setSaving(false)
    if (data) onCreated(data)
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="rounded-lg border border-accent-500/30 bg-accent-500/5 p-3 space-y-2"
    >
      <input
        className="input"
        placeholder="Ex : Relancer pour signature"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <div className="grid grid-cols-2 gap-2">
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          {ACTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          type="datetime-local"
          className="input"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          required
        />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Annuler
        </button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Enregistrement…' : 'Créer l’action'}
        </button>
      </div>
    </form>
  )
}

function NewMeetingForm({
  userId,
  prospectId,
  onCancel,
  onCreated,
}: {
  userId: string
  prospectId: string
  onCancel: () => void
  onCreated: (m: Meeting) => void
}) {
  const [when, setWhen] = useState(defaultDateTime(1))
  const [duration, setDuration] = useState('30')
  const [platform, setPlatform] = useState('Google Meet')
  const [link, setLink] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    const { data } = await createMeeting({
      user_id: userId,
      prospect_id: prospectId,
      scheduled_at: new Date(when).toISOString(),
      duration_minutes: Number(duration),
      platform,
      meeting_link: link.trim() || null,
      preparation_notes: notes.trim() || null,
    })
    setSaving(false)
    if (data) onCreated(data)
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="rounded-lg border border-accent-500/30 bg-accent-500/5 p-3 space-y-2"
    >
      <div className="grid grid-cols-2 gap-2">
        <input
          type="datetime-local"
          className="input"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          required
        />
        <input
          type="number"
          className="input"
          min="15"
          step="15"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="Durée (min)"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          className="input"
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          placeholder="Plateforme"
        />
        <input
          className="input"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Lien du meeting (optionnel)"
        />
      </div>
      <textarea
        className="input min-h-[60px]"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes de préparation (points à aborder…)"
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Annuler
        </button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Enregistrement…' : 'Planifier le RDV'}
        </button>
      </div>
    </form>
  )
}

function ActivityTimeline({
  activity,
  loading,
}: {
  activity: ProspectActivity | null
  loading: boolean
}) {
  return (
    <div>
      <SectionLabel>Historique</SectionLabel>
      {loading ? (
        <div className="mt-3 h-16 animate-pulse rounded bg-cream-100" />
      ) : !activity || activity.interactions.length === 0 ? (
        <p className="mt-3 rounded border border-dashed border-ink-200 py-4 text-center text-xs text-ink-400">
          Aucune interaction pour le moment.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {activity.interactions.map((i) => {
            const t = INTERACTION_TYPES.find((x) => x.value === i.type)
            const Icon = iconForInteraction(i.type)
            return (
              <li key={i.id} className="flex gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream-200 text-ink-500">
                  <Icon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-ink-800">
                      {i.title}
                    </p>
                    <span className="shrink-0 text-xs text-ink-400">
                      {formatDistanceToNow(new Date(i.occurred_at), {
                        locale: fr,
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-ink-400">
                    {t?.label ?? i.type}
                    {i.sentiment !== 'neutral' && ` · ${sentimentLabel(i.sentiment)}`}
                  </p>
                  {i.content && (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-ink-600">
                      {i.content}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function iconForInteraction(type: string) {
  switch (type) {
    case 'email':
      return Mail
    case 'phone':
    case 'call':
      return Phone
    case 'whatsapp':
      return MessageCircle
    case 'meeting':
      return Calendar
    default:
      return MessageSquare
  }
}

function sentimentLabel(s: string) {
  if (s === 'positive') return 'Positif'
  if (s === 'negative') return 'Négatif'
  return 'Neutre'
}

function defaultDateTime(daysAhead: number) {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  d.setHours(10, 0, 0, 0)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
