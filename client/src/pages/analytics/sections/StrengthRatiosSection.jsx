import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import api from '../../../api/axios'
import EmptyState from '../components/EmptyState'

const IMBALANCE_MESSAGES = {
  'push-exceeds-pull': 'Push exceeds pull by 20%+ — back lag risk',
  'pull-exceeds-push': 'Pull exceeds push by 20%+ — chest and shoulder lag risk',
}

function StrengthRatiosSection() {
  const [ratios, setRatios] = useState(null)
  const [pushPull, setPushPull] = useState(null)
  const [loading, setLoading] = useState(true)
  const dateRange = useSelector((state) => state.analytics.dateRange)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/analytics/ratios', { params: { range: dateRange } }),
      api.get('/analytics/push-pull-balance'),
    ])
      .then(([r, pp]) => {
        setRatios(r.data)
        setPushPull(pp.data)
      })
      .finally(() => setLoading(false))
  }, [dateRange])

  if (loading) return <p className="text-sm text-(--color-text-muted)">Loading…</p>
  if (!ratios || (ratios.benchMax == null && ratios.compoundVolume === 0 && ratios.isolationVolume === 0)) {
    return <EmptyState message="Not enough logged data yet to calculate ratios." />
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl bg-(--color-card-alt) border border-(--color-border) p-3">
        <p className="text-sm font-semibold text-(--color-text)">Bench vs Squat</p>
        {ratios.benchVsSquat != null ? (
          <p className="text-xs text-(--color-text-muted) mt-1">
            {ratios.benchMax}kg / {ratios.squatMax}kg = {ratios.benchVsSquat}
          </p>
        ) : (
          <p className="text-xs text-(--color-text-muted) mt-1">Log both bench and squat to compare.</p>
        )}
      </div>

      <div className="rounded-xl bg-(--color-card-alt) border border-(--color-border) p-3">
        <p className="text-sm font-semibold text-(--color-text)">Compound vs Isolation volume</p>
        <p className="text-xs text-(--color-text-muted) mt-1">
          {ratios.compoundVolume}kg compound · {ratios.isolationVolume}kg isolation
        </p>
      </div>

      <div
        className={`rounded-xl border p-3 ${
          pushPull?.imbalance
            ? 'bg-(--color-warning-soft) border-(--color-warning)'
            : 'bg-(--color-success-soft) border-(--color-success)'
        }`}
      >
        <p className="text-sm font-semibold text-(--color-text)">Push vs Pull</p>
        <p className="text-[11px] text-(--color-text-muted)">Always shows the last 8 weeks</p>
        {pushPull?.currentRatio != null ? (
          <>
            <p className="text-xs text-(--color-text-muted) mt-1">Current ratio: {pushPull.currentRatio}</p>
            <p className="text-xs mt-1 text-(--color-text)">
              {pushPull.imbalance ? `⚠ ${IMBALANCE_MESSAGES[pushPull.imbalance]}` : '✓ Balanced'}
            </p>
          </>
        ) : (
          <p className="text-xs text-(--color-text-muted) mt-1">Not enough push/pull data yet.</p>
        )}
      </div>
    </div>
  )
}

export default StrengthRatiosSection
