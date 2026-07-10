import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import api from '../api/axios'

function daysLeft(deadline) {
  const d = new Date(`${deadline}T00:00:00`)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.max(0, Math.ceil((d - now) / (1000 * 60 * 60 * 24)))
}

function ChallengeTrackerCard() {
  const currentUserId = useSelector((state) => state.auth.user?.id)
  const [challenge, setChallenge] = useState(undefined)

  useEffect(() => {
    api
      .get('/challenges/active-summary')
      .then(({ data }) => setChallenge(data.challenge))
      .catch(() => setChallenge(null))
  }, [])

  if (!challenge) return null

  const youAreChallenger = challenge.challengerId === currentUserId
  const yourValue = youAreChallenger ? challenge.challengerValue : challenge.challengedValue
  const theirValue = youAreChallenger ? challenge.challengedValue : challenge.challengerValue
  const theirName = youAreChallenger ? challenge.challengedName : challenge.challengerName
  const target = challenge.targetValue
  const yourProgress = Math.min(100, Math.round((yourValue / target) * 100))
  const theirProgress = Math.min(100, Math.round((theirValue / target) * 100))
  const remaining = daysLeft(challenge.deadline)

  return (
    <div className="shrink-0 rounded-2xl bg-(--color-card) border border-(--color-accent) p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-(--color-text)">
          ⚔️ Challenge vs {theirName}
        </p>
        <span className="text-xs text-(--color-text-muted)">{remaining}d left</span>
      </div>
      <p className="text-xs text-(--color-text-muted) mt-1">
        {challenge.type === 'pr_exercise' ? `Beat ${challenge.exerciseName} PR` : 'Beat weekly volume'} · target {target}kg
      </p>

      <div className="mt-3 flex flex-col gap-2">
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-(--color-text)">You</span>
            <span className="text-(--color-text-muted)">{yourValue}</span>
          </div>
          <div className="h-2 rounded-full bg-(--color-card-alt) overflow-hidden">
            <div className="h-full bg-(--color-accent)" style={{ width: `${yourProgress}%` }} />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-(--color-text)">{theirName}</span>
            <span className="text-(--color-text-muted)">{theirValue}</span>
          </div>
          <div className="h-2 rounded-full bg-(--color-card-alt) overflow-hidden">
            <div className="h-full bg-(--color-accent2)" style={{ width: `${theirProgress}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChallengeTrackerCard
