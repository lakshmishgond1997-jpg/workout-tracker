import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import api from '../../api/axios'

function AnalyticsSummaryCard() {
  const [summary, setSummary] = useState(null)
  const dateRange = useSelector((state) => state.analytics.dateRange)

  useEffect(() => {
    api.get('/analytics/summary', { params: { range: dateRange } }).then(({ data }) => setSummary(data))
  }, [dateRange])

  if (!summary) return null

  const stats = [
    { label: 'PRs this month', value: summary.prsThisMonth },
    { label: 'Streak', value: summary.currentStreak },
    { label: 'Bench e1RM', value: summary.benchE1rm != null ? `${summary.benchE1rm}kg` : '—' },
    { label: 'Push/Pull', value: summary.pushPullRatio != null ? summary.pushPullRatio : '—' },
  ]

  return (
    <div className="shrink-0 grid grid-cols-4 gap-2">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl bg-(--color-card) border border-(--color-border) p-2 text-center">
          <p className="text-sm font-bold text-(--color-text)">{s.value}</p>
          <p className="text-[10px] text-(--color-text-muted) leading-tight mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  )
}

export default AnalyticsSummaryCard
