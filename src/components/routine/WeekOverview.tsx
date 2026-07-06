import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { DailyRoutine } from '@/lib/routineData'

interface Props {
  routines: DailyRoutine[]
}

// Total d'activités d'une journée pour dimensionner l'intensité
const activityScore = (r: DailyRoutine) =>
  r.linkedin_connections_count +
  r.emails_sent_count +
  r.conversations_count +
  r.calls_made_count +
  (r.linkedin_post_done ? 3 : 0)

const intensityClass = (score: number) => {
  if (score === 0) return 'bg-cream-200'
  if (score < 3) return 'bg-accent-500/20'
  if (score < 7) return 'bg-accent-500/45'
  if (score < 15) return 'bg-accent-500/70'
  return 'bg-accent-500'
}

export function WeekOverview({ routines }: Props) {
  const days: { date: Date; routine: DailyRoutine | undefined }[] = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const iso = d.toISOString().slice(0, 10)
    days.push({
      date: d,
      routine: routines.find((r) => r.date === iso),
    })
  }

  return (
    <div className="flex items-end gap-2">
      {days.map(({ date, routine }) => {
        const score = routine ? activityScore(routine) : 0
        return (
          <div key={date.toISOString()} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className={`h-14 w-full rounded ${intensityClass(score)}`}
              title={
                routine
                  ? `${score} activité${score > 1 ? 's' : ''} le ${format(
                      date,
                      'EEEE d MMM',
                      { locale: fr },
                    )}`
                  : 'Aucune activité'
              }
            />
            <p className="text-[10px] uppercase text-ink-400">
              {format(date, 'EEE', { locale: fr })}
            </p>
            <p className="font-mono text-xs text-ink-500">{format(date, 'd')}</p>
          </div>
        )
      })}
    </div>
  )
}
