import { useEffect, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import api from '../../../api/axios'
import EmptyState from '../../analytics/components/EmptyState'
import ChallengeModal from '../components/ChallengeModal'

const HIDDEN = 'hidden'
const KEY_LIFT_LABELS = { bench: 'Bench', squat: 'Squat', deadlift: 'Deadlift', shoulderPress: 'Shoulder Press' }

function CompareSection({ initialBuddyId }) {
  const [buddies, setBuddies] = useState(null)
  const [selectedId, setSelectedId] = useState(initialBuddyId ? String(initialBuddyId) : '')
  const [compare, setCompare] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showChallenge, setShowChallenge] = useState(false)
  const [challengeSent, setChallengeSent] = useState(false)

  useEffect(() => {
    api.get('/buddies').then(({ data }) => {
      setBuddies(data.buddies)
      if (!selectedId && data.buddies.length) setSelectedId(String(data.buddies[0].buddyId))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    setChallengeSent(false)
    api
      .get(`/buddies/${selectedId}/compare`)
      .then(({ data }) => setCompare(data))
      .finally(() => setLoading(false))
  }, [selectedId])

  if (buddies === null) return <p className="text-sm text-(--color-text-muted)">Loading…</p>

  if (buddies.length === 0) {
    return (
      <div className="shrink-0 rounded-2xl bg-(--color-card) border border-(--color-border) p-6 text-center">
        <p className="text-3xl mb-2">⚖️</p>
        <p className="text-sm font-semibold text-(--color-text)">No buddies to compare with</p>
        <p className="text-xs text-(--color-text-muted) mt-1">Add a buddy first from the My Buddies tab.</p>
      </div>
    )
  }

  const volumeChartData = (compare?.volumeComparison === HIDDEN ? [] : compare?.volumeComparison) || []
  const selfKeyLifts = compare?.keyLiftComparison?.self || {}
  const buddyKeyLifts = compare?.keyLiftComparison?.buddy
  const bestMonth = compare?.bestMonthComparison

  return (
    <div className="flex flex-col gap-3">
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="shrink-0 w-full h-11 rounded-lg bg-(--color-card-alt) border border-(--color-border) px-3 text-(--color-text) text-sm focus:outline-none focus:border-(--color-accent)"
      >
        {buddies.map((b) => (
          <option key={b.buddyId} value={b.buddyId}>
            {b.name}
          </option>
        ))}
      </select>

      {loading && <p className="text-sm text-(--color-text-muted)">Loading…</p>}

      {!loading && compare && (
        <>
          <div className="shrink-0 rounded-2xl bg-(--color-card) border border-(--color-border) p-4 text-center">
            <p className="text-xs text-(--color-text-muted)">Overall</p>
            <p className={`text-2xl font-bold mt-1 ${compare.summary.leadPercent >= 0 ? 'text-(--color-success)' : 'text-(--color-danger)'}`}>
              {compare.summary.leadPercent >= 0 ? '+' : ''}
              {compare.summary.leadPercent}%
            </p>
            <p className="text-xs text-(--color-text-muted) mt-1">
              {compare.summary.leadPercent >= 0 ? `You're ahead of ${compare.buddy.name}` : `${compare.buddy.name} is ahead of you`}
            </p>
            <button
              type="button"
              onClick={() => setShowChallenge(true)}
              className="mt-3 h-10 px-4 rounded-lg bg-(--color-accent) text-white text-sm font-semibold"
            >
              🏆 Challenge {compare.buddy.name}
            </button>
            {challengeSent && <p className="text-xs text-(--color-success) mt-2">Challenge sent!</p>}
          </div>

          <div className="shrink-0 rounded-2xl bg-(--color-card) border border-(--color-border) p-4">
            <p className="text-sm font-bold text-(--color-text) mb-2">Weekly Volume by Muscle Group</p>
            {volumeChartData.length === 0 ? (
              <EmptyState message={compare.volumeComparison === HIDDEN ? `${compare.buddy.name} has hidden their volume.` : 'No volume logged in the last two weeks.'} />
            ) : (
              <div className="h-56 -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volumeChartData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="muscleGroup" stroke="var(--color-text-muted)" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                    <YAxis stroke="var(--color-text-muted)" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} width={36} />
                    <Tooltip
                      contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: 'var(--color-text)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="self" name="You" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="buddy" name={compare.buddy.name} fill="var(--color-accent2)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="shrink-0 rounded-2xl bg-(--color-card) border border-(--color-border) p-4">
            <p className="text-sm font-bold text-(--color-text) mb-2">PR Comparison</p>
            {compare.prComparison.length === 0 ? (
              <EmptyState message="No shared exercises logged yet." />
            ) : (
              <div className="flex flex-col divide-y divide-(--color-border)">
                {compare.prComparison.map((pr) => (
                  <div key={pr.exerciseName} className="flex items-center justify-between py-2 text-xs">
                    <span className="text-(--color-text) font-medium flex-1 truncate">{pr.exerciseName}</span>
                    <span className={`w-20 text-right ${pr.leader === 'self' ? 'text-(--color-success) font-bold' : 'text-(--color-text-muted)'}`}>
                      {pr.selfBest ? `${pr.selfBest.weightKg}kg` : '—'}
                    </span>
                    <span className={`w-20 text-right ${pr.leader === 'buddy' ? 'text-(--color-success) font-bold' : 'text-(--color-text-muted)'}`}>
                      {pr.buddyBest ? `${pr.buddyBest.weightKg}kg` : pr.buddyBest === null ? '🔒' : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="shrink-0 rounded-2xl bg-(--color-card) border border-(--color-border) p-4">
            <p className="text-sm font-bold text-(--color-text) mb-2">Streak</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-(--color-text)">You: {compare.streakComparison.self}d</span>
              <span className="text-(--color-text)">
                {compare.buddy.name}: {compare.streakComparison.buddy === HIDDEN ? '🔒 Hidden' : `${compare.streakComparison.buddy}d`}
              </span>
            </div>
          </div>

          <div className="shrink-0 rounded-2xl bg-(--color-card) border border-(--color-border) p-4">
            <p className="text-sm font-bold text-(--color-text) mb-2">Key Lift e1RM</p>
            {buddyKeyLifts === HIDDEN ? (
              <EmptyState message={`${compare.buddy.name} has hidden their PRs.`} />
            ) : (
              <div className="flex flex-col divide-y divide-(--color-border)">
                {Object.entries(KEY_LIFT_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between py-1.5 text-xs">
                    <span className="text-(--color-text-muted)">{label}</span>
                    <span className="text-(--color-text)">
                      You {selfKeyLifts[key] ?? '—'} · {compare.buddy.name} {buddyKeyLifts?.[key] ?? '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="shrink-0 rounded-2xl bg-(--color-card) border border-(--color-border) p-4">
            <p className="text-sm font-bold text-(--color-text) mb-2">Best Month Ever</p>
            {bestMonth?.buddy === HIDDEN ? (
              <EmptyState message={`${compare.buddy.name} has hidden their volume.`} />
            ) : (
              <div className="flex items-center justify-between text-sm text-(--color-text)">
                <span>You: {bestMonth?.self?.month || '—'} ({bestMonth?.self?.volume || 0}kg)</span>
                <span>
                  {compare.buddy.name}: {bestMonth?.buddy?.month || '—'} ({bestMonth?.buddy?.volume || 0}kg)
                </span>
              </div>
            )}
          </div>
        </>
      )}

      {showChallenge && compare && (
        <ChallengeModal
          buddyId={compare.buddy.id}
          buddyName={compare.buddy.name}
          onClose={() => setShowChallenge(false)}
          onSent={() => setChallengeSent(true)}
        />
      )}
    </div>
  )
}

export default CompareSection
