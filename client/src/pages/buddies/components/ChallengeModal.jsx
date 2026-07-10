import { useState } from 'react'
import api from '../../../api/axios'

function ChallengeModal({ buddyId, buddyName, onClose, onSent }) {
  const [type, setType] = useState('weekly_volume')
  const [exerciseName, setExerciseName] = useState('')
  const [targetValue, setTargetValue] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!targetValue || (type === 'pr_exercise' && !exerciseName.trim())) {
      setError('Please fill in all fields')
      return
    }
    setBusy(true)
    setError('')
    try {
      await api.post('/challenges', {
        challengedId: buddyId,
        type,
        exerciseName: type === 'pr_exercise' ? exerciseName.trim() : undefined,
        targetValue: Number(targetValue),
      })
      onSent?.()
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send challenge')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-[380px] rounded-2xl bg-(--color-card) border border-(--color-border) p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-(--color-text)">Challenge {buddyName}</h2>
          <button type="button" onClick={onClose} className="text-(--color-text-muted) text-xl leading-none px-2">
            ×
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType('weekly_volume')}
              className={`flex-1 h-10 rounded-lg text-xs font-semibold ${
                type === 'weekly_volume'
                  ? 'bg-(--color-accent-soft) text-(--color-accent)'
                  : 'bg-(--color-card-alt) border border-(--color-border) text-(--color-text-muted)'
              }`}
            >
              Beat weekly volume
            </button>
            <button
              type="button"
              onClick={() => setType('pr_exercise')}
              className={`flex-1 h-10 rounded-lg text-xs font-semibold ${
                type === 'pr_exercise'
                  ? 'bg-(--color-accent-soft) text-(--color-accent)'
                  : 'bg-(--color-card-alt) border border-(--color-border) text-(--color-text-muted)'
              }`}
            >
              Beat a PR
            </button>
          </div>

          {type === 'pr_exercise' && (
            <input
              type="text"
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              placeholder="Exercise name (e.g. Bench Press)"
              className="h-11 rounded-lg bg-(--color-card-alt) border border-(--color-border) px-3 text-(--color-text) text-sm focus:outline-none focus:border-(--color-accent)"
            />
          )}

          <input
            type="number"
            step="0.5"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            placeholder={type === 'pr_exercise' ? 'Target weight (kg)' : 'Target weekly volume (kg)'}
            className="h-11 rounded-lg bg-(--color-card-alt) border border-(--color-border) px-3 text-(--color-text) text-sm focus:outline-none focus:border-(--color-accent)"
          />

          <p className="text-xs text-(--color-text-muted)">Whoever gets closer to (or exceeds) the target within 7 days wins.</p>

          {error && <p className="text-xs text-(--color-danger)">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="h-11 rounded-lg bg-(--color-accent) text-white font-semibold disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Send Challenge'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ChallengeModal
