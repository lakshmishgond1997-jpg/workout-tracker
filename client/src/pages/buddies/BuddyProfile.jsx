import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import api from '../../api/axios'
import EmptyState from '../analytics/components/EmptyState'
import CollapsibleSection from '../analytics/components/CollapsibleSection'
import OverloadLineChart from '../../components/charts/OverloadLineChart'

const HIDDEN = 'hidden'

function OverloadCard({ buddyId, prBoard }) {
  const [exerciseId, setExerciseId] = useState('')
  const [chartData, setChartData] = useState(null)

  const exercises = prBoard === HIDDEN ? [] : (prBoard || []).map((p) => ({ id: p.exerciseId, name: p.exerciseName }))

  useEffect(() => {
    if (!exerciseId && exercises.length) setExerciseId(String(exercises[0].id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prBoard])

  useEffect(() => {
    if (!exerciseId) return
    api.get(`/buddies/${buddyId}/overload/${exerciseId}`).then(({ data }) => setChartData(data))
  }, [buddyId, exerciseId])

  if (prBoard === HIDDEN) return <EmptyState message="This buddy has hidden their workout details." />
  if (!exercises.length) return <EmptyState message="No logged exercises yet." />

  return (
    <div className="flex flex-col gap-3">
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
      <OverloadLineChart series={chartData?.series || []} plateauDates={chartData?.plateauDates} target={chartData?.target} />
    </div>
  )
}

function BuddyProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([api.get(`/buddies/${id}/profile`), api.get('/challenges')])
      .then(([profileRes, challengesRes]) => {
        setProfile(profileRes.data)
        setChallenges(challengesRes.data.challenges.filter((c) => c.challenger_id === Number(id) || c.challenged_id === Number(id)))
      })
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="h-screen w-full bg-(--color-bg) flex justify-center overflow-hidden">
      <div className="w-full max-w-[430px] flex flex-col h-full">
        <header className="shrink-0 px-4 pt-6 pb-4 bg-(--color-bg-elevated) border-b border-(--color-border) flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/buddies')}
            aria-label="Back"
            className="w-9 h-9 rounded-lg bg-(--color-card) border border-(--color-border) flex items-center justify-center shrink-0"
          >
            ←
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-(--color-text) truncate">{profile?.buddy?.name || 'Buddy'}</h1>
            {profile && (
              <p className="text-xs text-(--color-text-muted)">
                Member since {new Date(profile.buddy.memberSince).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-4 flex flex-col gap-3 pb-24">
          {loading && <p className="text-sm text-(--color-text-muted)">Loading…</p>}

          {!loading && profile && (
            <>
              <button
                type="button"
                onClick={() => navigate(`/buddies?tab=compare&buddy=${id}`)}
                className="shrink-0 h-11 rounded-lg bg-(--color-accent) text-white font-semibold"
              >
                ⚖️ Compare with {profile.buddy.name}
              </button>

              <div className="shrink-0 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-(--color-card) border border-(--color-border) p-3">
                  <p className="text-xs text-(--color-text-muted)">Current Streak</p>
                  <p className="text-lg font-bold text-(--color-text) mt-1">
                    {profile.streak === HIDDEN ? '🔒 Hidden' : `${profile.streak.currentStreak}d`}
                  </p>
                  {profile.streak !== HIDDEN && (
                    <p className="text-xs text-(--color-text-muted)">Best: {profile.streak.longestStreak}d</p>
                  )}
                </div>
                <div className="rounded-2xl bg-(--color-card) border border-(--color-border) p-3">
                  <p className="text-xs text-(--color-text-muted)">This Week</p>
                  <p className="text-lg font-bold text-(--color-text) mt-1">
                    {profile.weeklyVolume === HIDDEN ? '🔒 Hidden' : `${profile.weeklyVolume.thisWeek}kg`}
                  </p>
                  {profile.weeklyVolume !== HIDDEN && (
                    <p className="text-xs text-(--color-text-muted)">Last wk: {profile.weeklyVolume.lastWeek}kg</p>
                  )}
                </div>
              </div>

              <CollapsibleSection title="PR Board" icon="🏆" defaultExpanded>
                {profile.prBoard === HIDDEN ? (
                  <EmptyState message="This buddy has hidden their PRs." />
                ) : profile.prBoard.length === 0 ? (
                  <EmptyState message="No PRs logged yet." />
                ) : (
                  <div className="flex flex-col divide-y divide-(--color-border)">
                    {profile.prBoard.map((pr) => (
                      <div key={pr.exerciseId} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-(--color-text)">{pr.exerciseName}</span>
                        <span className="text-(--color-text-muted) text-xs">
                          {pr.weightKg}kg × {pr.reps} · e1RM {pr.e1rm}kg
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleSection>

              <CollapsibleSection title="Progressive Overload" icon="📈">
                <OverloadCard buddyId={id} prBoard={profile.prBoard} />
              </CollapsibleSection>

              <CollapsibleSection title="Weekly Volume by Muscle Group" icon="💪">
                {profile.volumeByMuscleGroup === HIDDEN ? (
                  <EmptyState message="This buddy has hidden their volume." />
                ) : profile.volumeByMuscleGroup.length === 0 ? (
                  <EmptyState message="No sets logged in the last two weeks." />
                ) : (
                  <div className="h-56 -ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={profile.volumeByMuscleGroup} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                        <CartesianGrid stroke="var(--color-border)" vertical={false} />
                        <XAxis dataKey="muscleGroup" stroke="var(--color-text-muted)" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                        <YAxis stroke="var(--color-text-muted)" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} width={36} />
                        <Tooltip
                          contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: 'var(--color-text)' }}
                        />
                        <Bar dataKey="thisWeek" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CollapsibleSection>

              <CollapsibleSection title="Last 5 Sessions" icon="🗓️">
                {profile.lastSessions === HIDDEN ? (
                  <EmptyState message="This buddy has hidden their workout details." />
                ) : profile.lastSessions.length === 0 ? (
                  <EmptyState message="No sessions logged yet." />
                ) : (
                  <div className="flex flex-col divide-y divide-(--color-border)">
                    {profile.lastSessions.map((s) => (
                      <div key={s.id} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-(--color-text)">{s.exercise_name}</span>
                        <span className="text-(--color-text-muted) text-xs">
                          {s.weight_kg}kg × {s.reps} · {s.date}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleSection>

              <CollapsibleSection title="Challenge History" icon="⚔️">
                {challenges.length === 0 ? (
                  <EmptyState message="No challenges with this buddy yet." />
                ) : (
                  <div className="flex flex-col divide-y divide-(--color-border)">
                    {challenges.map((c) => (
                      <div key={c.id} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-(--color-text)">
                          {c.type === 'pr_exercise' ? c.exercise_name : 'Weekly volume'} · target {c.target_value}
                        </span>
                        <span className="text-xs text-(--color-text-muted) flex items-center gap-1">
                          {c.status === 'completed' && c.winner_id && '🏆 '}
                          {c.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleSection>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default BuddyProfile
