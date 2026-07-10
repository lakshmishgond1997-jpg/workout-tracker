import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import api from '../../../api/axios'
import EmptyState from '../components/EmptyState'
import { MUSCLE_GROUPS } from '../../../utils/muscleGroups'
import { todayKey } from '../../../utils/date'

function ratingTone(rating) {
  if (rating >= 7) return 'var(--color-danger)'
  if (rating >= 4) return 'var(--color-warning)'
  return 'var(--color-success)'
}

function SorenessInput({ onLogged }) {
  const [muscleGroup, setMuscleGroup] = useState(MUSCLE_GROUPS[0])
  const [rating, setRating] = useState(5)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.post('/soreness', { date: todayKey(), muscle_group: muscleGroup, rating: Number(rating) })
      onLogged()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl bg-(--color-card-alt) border border-(--color-border) p-3 flex flex-col gap-2">
      <p className="text-xs text-(--color-text-muted)">Rate today's soreness (optional)</p>
      <div className="flex gap-2">
        <select
          value={muscleGroup}
          onChange={(e) => setMuscleGroup(e.target.value)}
          className="flex-1 h-10 rounded-lg bg-(--color-card) border border-(--color-border) px-2 text-(--color-text) text-sm capitalize focus:outline-none focus:border-(--color-accent)"
        >
          {MUSCLE_GROUPS.map((g) => (
            <option key={g} value={g} className="capitalize">
              {g}
            </option>
          ))}
        </select>
        <select
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          className="w-20 h-10 rounded-lg bg-(--color-card) border border-(--color-border) px-2 text-(--color-text) text-sm focus:outline-none focus:border-(--color-accent)"
        >
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="h-10 px-3 rounded-lg bg-(--color-accent) text-white text-sm font-medium disabled:opacity-60"
        >
          {saving ? '…' : 'Log'}
        </button>
      </div>
    </div>
  )
}

function SorenessLogSection() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const dateRange = useSelector((state) => state.analytics.dateRange)

  const load = () => {
    setLoading(true)
    api
      .get('/analytics/soreness', { params: { range: dateRange } })
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false))
  }

  useEffect(load, [dateRange])

  if (loading) return <p className="text-sm text-(--color-text-muted)">Loading…</p>

  const dates = [...new Set((data?.heatmap || []).map((h) => h.date))].sort()

  return (
    <div className="flex flex-col gap-3">
      <SorenessInput onLogged={load} />

      {data?.overtrainingWarnings?.length > 0 && (
        <div className="rounded-xl bg-(--color-danger-soft) border border-(--color-danger) p-3">
          {data.overtrainingWarnings.map((w, i) => (
            <p key={i} className="text-xs text-(--color-danger)">
              ⚠ <span className="capitalize">{w.muscleGroup}</span> rated 7+ two sessions in a row — overtraining risk
            </p>
          ))}
        </div>
      )}

      {!data?.heatmap?.length ? (
        <EmptyState message="No soreness ratings logged yet." />
      ) : (
        <div className="overflow-x-auto no-scrollbar">
          <table className="text-xs border-collapse">
            <tbody>
              {MUSCLE_GROUPS.map((group) => {
                const rowRatings = new Map(
                  data.heatmap.filter((h) => h.muscleGroup === group).map((h) => [h.date, h.rating])
                )
                if (rowRatings.size === 0) return null
                return (
                  <tr key={group}>
                    <td className="pr-2 py-1 text-(--color-text-muted) capitalize whitespace-nowrap">{group}</td>
                    {dates.map((d) => (
                      <td key={d} className="p-0.5">
                        <div
                          className="w-5 h-5 rounded-sm"
                          style={{ background: rowRatings.has(d) ? ratingTone(rowRatings.get(d)) : 'var(--color-border)' }}
                          title={rowRatings.has(d) ? `${d}: ${rowRatings.get(d)}/10` : d}
                        />
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {data?.correlations?.some((c) => c.performanceDrop) && (
        <p className="text-xs text-(--color-warning)">
          ⚠ Sessions right after high soreness show a performance drop for some muscle groups.
        </p>
      )}
    </div>
  )
}

export default SorenessLogSection
