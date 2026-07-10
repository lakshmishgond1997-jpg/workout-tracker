import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import api from '../../../api/axios'
import EmptyState from '../components/EmptyState'
import { downloadCsv, buildPrBoardCsv } from '../../../utils/csvExport'

function PrHistory({ exerciseId }) {
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(true)
  const dateRange = useSelector((state) => state.analytics.dateRange)

  useEffect(() => {
    setLoading(true)
    api
      .get(`/analytics/pr-history/${exerciseId}`, { params: { range: dateRange } })
      .then(({ data }) => setHistory(data.history))
      .finally(() => setLoading(false))
  }, [exerciseId, dateRange])

  if (loading) return <p className="text-xs text-(--color-text-muted) mt-2">Loading…</p>
  if (!history?.length) return <EmptyState message="No PRs in this period." />

  return (
    <div className="mt-2 flex flex-col divide-y divide-(--color-border)">
      {history.map((h, i) => (
        <div key={i} className="flex items-center justify-between py-1.5 text-sm">
          <span className="text-(--color-text)">
            {h.weightKg}kg × {h.reps}
          </span>
          <span className="text-(--color-text-muted) text-xs">{h.date}</span>
        </div>
      ))}
    </div>
  )
}

function PrCard({ pr }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="rounded-xl bg-(--color-card-alt) border border-(--color-border) p-3">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <div>
          <p className="font-semibold text-(--color-text)">{pr.exerciseName}</p>
          <p className="text-xs text-(--color-text-muted) mt-0.5">
            {pr.weightKg}kg × {pr.reps} reps · e1RM {pr.e1rm}kg
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {pr.isRecentPr && (
            <span className="text-xs font-medium text-(--color-success) bg-(--color-success-soft) rounded-full px-2 py-0.5">
              New
            </span>
          )}
          <span className="text-(--color-text-muted) text-xs">{expanded ? '▾' : '▸'}</span>
        </div>
      </button>
      {expanded && <PrHistory exerciseId={pr.exerciseId} />}
    </div>
  )
}

function PrBoardSection() {
  const [prs, setPrs] = useState(null)
  const [loading, setLoading] = useState(true)
  const user = useSelector((state) => state.auth.user)
  const dateRange = useSelector((state) => state.analytics.dateRange)

  useEffect(() => {
    setLoading(true)
    api
      .get('/analytics/pr-board', { params: { range: dateRange } })
      .then(({ data }) => setPrs(data.prs))
      .finally(() => setLoading(false))
  }, [dateRange])

  const handleExport = () => {
    if (!prs?.length) return
    downloadCsv(`pr-export-${new Date().toISOString().slice(0, 10)}.csv`, buildPrBoardCsv(prs, user?.name || ''))
  }

  if (loading) return <p className="text-sm text-(--color-text-muted)">Loading…</p>
  if (!prs?.length) {
    return (
      <EmptyState
        message={
          dateRange === 'all'
            ? 'No PRs logged yet — log a set to get started.'
            : 'No sets logged in this period — try a wider date range.'
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={handleExport}
          className="print-hidden shrink-0 text-xs font-medium text-(--color-accent) px-2 py-1"
        >
          ⬇ Export CSV
        </button>
      </div>
      {prs.map((pr) => (
        <PrCard key={pr.exerciseId} pr={pr} />
      ))}
    </div>
  )
}

export default PrBoardSection
