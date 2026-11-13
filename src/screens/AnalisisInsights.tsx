import type { ReactNode } from 'react'
import { CalendarDays, ChevronRight, PiggyBank, Receipt, TrendingDown, TrendingUp, TriangleAlert, Equal, type LucideIcon } from 'lucide-react'
import { useMoney } from '../components/ui/Amount'
import { CategoryIcon } from '../components/ui/CategoryIcon'
import type { Category } from '../db/types'
import type { Insight } from '../lib/analysis'
import { currentMonth, monthName, shortDate, type MonthKey } from '../lib/dates'
import { cn } from '../lib/cn'
import { openMovimientos } from './Movimientos'

type Tone = 'pos' | 'warn' | 'info'

const TONE: Record<Tone, { box: string; icon: string }> = {
  pos: { box: 'bg-pos-soft text-pos-ink', icon: 'bg-pos-ink text-white' },
  warn: { box: 'bg-warn-soft text-warn-ink', icon: 'bg-warn text-ink' },
  info: { box: 'bg-info text-info-ink', icon: 'bg-accent text-white' },
}

interface View {
  key: string
  tone: Tone
  icon: LucideIcon | Category
  text: ReactNode
  onTap?: () => void
}

/** "Lo que notamos": frases cortas sobre el mes, la primera destacada. */
export function Insights({ insights, cats, month }: { insights: Insight[]; cats: Map<string, Category>; month: MonthKey }) {
  const money = useMoney()
  if (insights.length === 0) return null

  const pct = (n: number) => `${Math.round(Math.abs(n))}%`
  const views: View[] = insights.map((i): View => {
    switch (i.kind) {
      case 'pace': {
        const same = Math.abs(i.diffPct) < 5
        const when = i.partial ? `a estas alturas de ${monthName(i.prevMonth)}` : `en ${monthName(i.prevMonth)}`
        return {
          key: i.kind,
          tone: same ? 'info' : i.diffPct < 0 ? 'pos' : 'warn',
          icon: same ? Equal : i.diffPct < 0 ? TrendingDown : TrendingUp,
          text: (
            <>
              {i.partial ? 'Llevas' : 'Gastaste'} <strong>{money(i.spent)}</strong>
              {same ? `, casi lo mismo que ${when}.` : <>, <strong>{pct(i.diffPct)} {i.diffPct < 0 ? 'menos' : 'más'}</strong> que {when}.</>}
            </>
          ),
        }
      }
      case 'kept':
        return {
          key: i.kind,
          tone: i.pct >= 20 ? 'pos' : 'info',
          icon: PiggyBank,
          text: (
            <>
              Te quedó el <strong>{pct(i.pct)}</strong> de lo que entró.
            </>
          ),
        }
      case 'overspent':
        return {
          key: i.kind,
          tone: 'warn',
          icon: TriangleAlert,
          text: (
            <>
              Gastaste <strong>{money(i.amount)} más</strong> de lo que entró.
            </>
          ),
        }
      case 'category': {
        const cat = cats.get(i.categoryId)
        return {
          key: i.kind,
          tone: i.diffPct < 0 ? 'pos' : 'warn',
          icon: cat ?? TrendingUp,
          text: (
            <>
              <strong>
                {pct(i.diffPct)} {i.diffPct < 0 ? 'menos' : 'más'}
              </strong>{' '}
              en {i.name} que {month === currentMonth() ? 'a estas alturas de' : 'en'} {monthName(i.prevMonth)}.
            </>
          ),
          onTap: () => openMovimientos({ categoryIds: [i.categoryId], period: { kind: 'month', month } }),
        }
      }
      case 'top': {
        const cat = cats.get(i.categoryId)
        return {
          key: i.kind,
          tone: 'info',
          icon: cat ?? Receipt,
          text: (
            <>
              <strong>{i.name}</strong> se llevó el <strong>{pct(i.pct)}</strong> de tus gastos.
            </>
          ),
          onTap: () => openMovimientos({ categoryIds: [i.categoryId], period: { kind: 'month', month } }),
        }
      }
      case 'biggest':
        return {
          key: i.kind,
          tone: 'info',
          icon: Receipt,
          text: (
            <>
              Tu gasto más grande: <strong>{i.name}</strong>, {money(i.amount)} el {shortDate(i.date)}.
            </>
          ),
        }
      case 'daily':
        return {
          key: i.kind,
          tone: 'info',
          icon: CalendarDays,
          text: (
            <>
              Gastas en promedio <strong>{money(i.perDay)}</strong> al día.
            </>
          ),
        }
    }
  })

  const [first, ...rest] = views
  return (
    <section aria-label="Lo que notamos">
      <h2 className="mb-2 text-base font-extrabold tracking-tight">Lo que notamos</h2>
      <Row view={first} featured />
      {rest.length > 0 && (
        <ul className="card mt-3 divide-y divide-line p-0">
          {rest.map((v) => (
            <li key={v.key}>
              <Row view={v} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Row({ view: v, featured }: { view: View; featured?: boolean }) {
  const t = TONE[v.tone]
  const icon =
    'kind' in v.icon ? (
      <CategoryIcon icon={v.icon.icon} color={v.icon.color} size={featured ? 48 : 40} />
    ) : (
      <span className={cn('flex shrink-0 items-center justify-center rounded-full', featured ? 'size-12' : 'size-10', featured ? t.icon : t.box)}>
        <v.icon size={featured ? 24 : 19} strokeWidth={2.3} />
      </span>
    )
  const body = (
    <>
      {icon}
      <p className={cn('min-w-0 flex-1', featured ? 'text-base' : 'text-sm text-ink')}>{v.text}</p>
      {v.onTap && <ChevronRight size={18} className="shrink-0 opacity-60" />}
    </>
  )
  const cls = cn('flex w-full items-center gap-3 text-left', featured ? cn('rounded-card p-4', t.box) : 'min-h-16 px-4 py-3')
  return v.onTap ? (
    <button type="button" onClick={v.onTap} className={cn(cls, 'active:brightness-95')}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  )
}
