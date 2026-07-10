import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import api from '../../../api/axios'

const CATEGORIES = [
  { value: 'weekly_volume', label: 'Volume', unit: 'kg' },
  { value: 'monthly_prs', label: 'PRs', unit: '' },
  { value: 'streak', label: 'Streak', unit: 'd' },
  { value: 'e1rm', label: 'e1RM', unit: 'kg' },
]

const MEDALS = ['🥇', '🥈', '🥉']

function RankDelta({ delta }) {
  if (!delta) return <span className="text-(--color-text-muted) text-xs">–</span>
  if (delta > 0) return <span className="text-(--color-success) text-xs">▲{delta}</span>
  return <span className="text-(--color-danger) text-xs">▼{Math.abs(delta)}</span>
}

function LeaderboardSection() {
  const currentUserId = useSelector((state) => state.auth.user?.id)
  const [category, setCategory] = useState('weekly_volume')
  const [leaderboard, setLeaderboard] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api
      .get('/buddies/leaderboard', { params: { category } })
      .then(({ data }) => setLeaderboard(data.leaderboard))
      .finally(() => setLoading(false))
  }

  useEffect(load, [category])

  const unit = CATEGORIES.find((c) => c.value === category)?.unit || ''

  return (
    <div className="flex flex-col gap-3">
      <div className="shrink-0 flex items-center gap-2">
        <div className="flex-1 flex gap-1 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`whitespace-nowrap px-3 h-9 rounded-lg text-xs font-semibold ${
                category === c.value
                  ? 'bg-(--color-accent-soft) text-(--color-accent)'
                  : 'bg-(--color-card) text-(--color-text-muted) border border-(--color-border)'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={load}
          aria-label="Refresh"
          className="shrink-0 w-9 h-9 rounded-lg bg-(--color-card) border border-(--color-border) flex items-center justify-center text-sm"
        >
          ⟳
        </button>
      </div>

      {loading && <p className="text-sm text-(--color-text-muted)">Loading…</p>}

      {!loading && leaderboard?.length === 1 && (
        <div className="shrink-0 rounded-2xl bg-(--color-card) border border-(--color-border) p-6 text-center">
          <p className="text-3xl mb-2">🏆</p>
          <p className="text-sm font-semibold text-(--color-text)">Just you so far</p>
          <p className="text-xs text-(--color-text-muted) mt-1">Add buddies to see how you stack up.</p>
        </div>
      )}

      {!loading &&
        leaderboard?.length > 1 &&
        leaderboard.map((row) => (
          <div
            key={row.userId}
            className={`shrink-0 rounded-2xl border p-3 flex items-center gap-3 ${
              row.userId === currentUserId
                ? 'bg-(--color-accent-soft) border-(--color-accent)'
                : 'bg-(--color-card) border-(--color-border)'
            }`}
          >
            <span className="w-7 text-center font-bold text-(--color-text) shrink-0">
              {MEDALS[row.rank - 1] || row.rank}
            </span>
            <span className="flex-1 text-sm font-semibold text-(--color-text) truncate">
              {row.name} {row.isSelf && <span className="text-(--color-text-muted) font-normal">(you)</span>}
            </span>
            <span className="text-sm font-bold text-(--color-text) shrink-0">
              {row.value}
              {unit}
            </span>
            <span className="shrink-0 w-10 text-right">
              <RankDelta delta={row.rankDelta} />
            </span>
          </div>
        ))}
    </div>
  )
}

export default LeaderboardSection
