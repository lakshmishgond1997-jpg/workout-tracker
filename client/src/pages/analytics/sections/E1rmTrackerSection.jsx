import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import api from '../../../api/axios'
import EmptyState from '../components/EmptyState'

const KEY_LIFT_LABELS = {
  bench: 'Bench',
  squat: 'Squat',
  deadlift: 'Deadlift',
  shoulderPress: 'Shoulder Press',
}

function E1rmTrackerSection() {
  const [exercises, setExercises] = useState([])
  const [exerciseId, setExerciseId] = useState('')
  const [trend, setTrend] = useState([])
  const [topMovers, setTopMovers] = useState([])
  const [keyLifts, setKeyLifts] = useState({})
  const [loading, setLoading] = useState(true)
  const dateRange = useSelector((state) => state.analytics.dateRange)

  useEffect(() => {
    api.get('/analytics/e1rm').then(({ data }) => {
      setTopMovers(data.topMovers)
      setKeyLifts(data.keyLifts)
      setLoading(false)
    })
    api.get('/analytics/pr-board').then(({ data }) => {
      setExercises(data.prs.map((p) => ({ id: p.exerciseId, name: p.exerciseName })))
      if (data.prs.length) setExerciseId(String(data.prs[0].exerciseId))
    })
  }, [])

  useEffect(() => {
    if (!exerciseId) return
    api
      .get('/analytics/e1rm', { params: { exerciseId, range: dateRange } })
      .then(({ data }) => setTrend(data.trend))
  }, [exerciseId, dateRange])

  if (loading) return <p className="text-sm text-(--color-text-muted)">Loading…</p>
  if (!exercises.length) return <EmptyState message="No logged exercises yet." />

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] text-(--color-text-muted)">Key lifts are all-time bests · trend chart below follows the date filter</p>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(KEY_LIFT_LABELS).map(([key, label]) => (
          <div key={key} className="rounded-xl bg-(--color-card-alt) border border-(--color-border) p-2.5">
            <p className="text-xs text-(--color-text-muted)">{label}</p>
            <p className="text-base font-bold text-(--color-text)">
              {keyLifts[key] != null ? `${keyLifts[key]}kg` : '—'}
            </p>
          </div>
        ))}
      </div>

      <select
        value={exerciseId}
        onChange={(e) => setExerciseId(e.target.value)}
        className="w-full h-11 rounded-lg bg-(--color-card-alt) border border-(--color-border) px-3 text-(--color-text) text-sm focus:outline-none focus:border-(--color-accent)"
      >
        {exercises.map((ex) => (
          <option key={ex.id} value={ex.id}>
            {ex.name}
          </option>
        ))}
      </select>

      {trend.length === 0 ? (
        <EmptyState message="Not enough data yet for this exercise." />
      ) : (
        <div className="h-48 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="var(--color-text-muted)"
                tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                tickFormatter={(d) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              />
              <YAxis stroke="var(--color-text-muted)" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} width={32} />
              <Tooltip
                contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'var(--color-text)' }}
              />
              <Line type="monotone" dataKey="e1rm" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {topMovers.length > 0 && (
        <div>
          <p className="text-xs text-(--color-text-muted) mb-1.5">Top movers this month</p>
          <div className="flex flex-col divide-y divide-(--color-border)">
            {topMovers.map((m) => (
              <div key={m.exerciseId} className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-(--color-text)">{m.exerciseName}</span>
                <span className="text-(--color-success) text-xs font-medium">+{m.percentIncrease}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default E1rmTrackerSection
