import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import api from '../api/axios'
import Navbar from '../components/Navbar'
import ChallengeTrackerCard from '../components/ChallengeTrackerCard'
import { shiftDateKey, todayKey } from '../utils/date'
import { applyTheme } from '../utils/theme'
import {
  setWorkouts,
  addWorkout,
  setExercises,
  addExercise,
  updateWorkout,
  removeWorkout,
  updateExercise,
  removeExercise,
  setLogs,
  addLog,
  updateLog,
  removeLog,
  setSelectedWorkout,
  setSelectedDate,
  setLoading,
} from '../store/slices/workoutSlice'

const formatDisplayDate = (dateStr) => {
  const d = new Date(`${dateStr}T00:00:00`)
  const isToday = dateStr === todayKey()
  const label = d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  return isToday ? `Today · ${label}` : label
}

const getEventCoords = (e) => {
  const touch = e.touches?.[0] || e.changedTouches?.[0]
  if (touch) return { x: touch.clientX, y: touch.clientY }
  return { x: e.clientX, y: e.clientY }
}

function useLongPress(onTrigger, ms = 500) {
  const timerRef = useRef(null)
  const firedRef = useRef(false)

  const clear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const start = (e) => {
    firedRef.current = false
    clear()
    const coords = getEventCoords(e)
    timerRef.current = setTimeout(() => {
      firedRef.current = true
      onTrigger(coords)
    }, ms)
  }

  const guardClick = (handler) => (e) => {
    if (firedRef.current) {
      firedRef.current = false
      return
    }
    handler(e)
  }

  const handlers = {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchMove: clear,
    onContextMenu: (e) => {
      e.preventDefault()
      clear()
      firedRef.current = true
      onTrigger(getEventCoords(e))
    },
  }

  return { handlers, guardClick }
}

function ActionMenu({ x, y, onEdit, onDelete, onClose }) {
  useEffect(() => {
    const handleOutside = () => onClose()
    const timer = setTimeout(() => {
      window.addEventListener('click', handleOutside)
      window.addEventListener('touchstart', handleOutside)
    }, 0)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('click', handleOutside)
      window.removeEventListener('touchstart', handleOutside)
    }
  }, [onClose])

  const clampedX = Math.min(x, window.innerWidth - 160)
  const clampedY = Math.min(y, window.innerHeight - 100)

  return (
    <div
      style={{ position: 'fixed', top: clampedY, left: clampedX }}
      className="z-50 w-36 bg-(--color-card) border border-(--color-border) rounded-xl shadow-lg overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onEdit}
        className="w-full text-left px-4 py-3 text-sm font-medium text-(--color-text) flex items-center gap-2"
      >
        ✏️ Edit
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="w-full text-left px-4 py-3 text-sm font-medium text-(--color-danger) flex items-center gap-2 border-t border-(--color-border)"
      >
        🗑️ Delete
      </button>
    </div>
  )
}

function LogSetModal({ onCancel, onSave, saving, defaultSetNumber, exerciseName, error }) {
  const [setNumber, setSetNumber] = useState(defaultSetNumber)
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [isWarmup, setIsWarmup] = useState(false)

  const handleSave = () => {
    if (weight === '' || reps === '') return
    onSave({
      setNumber: Number(setNumber),
      weight_kg: Number(weight),
      reps: Number(reps),
      is_warmup: isWarmup,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        className="w-[90%] max-w-[380px] bg-(--color-card) border border-(--color-border) rounded-2xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-(--color-text) mb-3">Log set — {exerciseName}</h3>

        <div className="mb-3">
          <label className="block text-xs text-(--color-text-muted) mb-1">Set number</label>
          <select
            value={setNumber}
            onChange={(e) => setSetNumber(e.target.value)}
            className="w-full h-12 rounded-lg bg-(--color-card-alt) border border-(--color-border) px-3 text-(--color-text) text-lg focus:outline-none focus:border-(--color-accent)"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Set {n}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs text-(--color-text-muted) mb-1">Weight (kg)</label>
            <input
              type="number"
              inputMode="numeric"
              autoFocus
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full h-12 rounded-lg bg-(--color-card-alt) border border-(--color-border) px-3 text-(--color-text) text-lg focus:outline-none focus:border-(--color-accent)"
              placeholder="0"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-(--color-text-muted) mb-1">Reps</label>
            <input
              type="number"
              inputMode="numeric"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="w-full h-12 rounded-lg bg-(--color-card-alt) border border-(--color-border) px-3 text-(--color-text) text-lg focus:outline-none focus:border-(--color-accent)"
              placeholder="0"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 mt-3 text-sm text-(--color-text-muted)">
          <input
            type="checkbox"
            checked={isWarmup}
            onChange={(e) => setIsWarmup(e.target.checked)}
            className="w-4 h-4 accent-(--color-accent)"
          />
          This is a warm-up set
        </label>

        {error && <p className="text-xs text-(--color-danger) mt-3">{error}</p>}

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-11 rounded-lg bg-transparent border border-(--color-border) text-(--color-text-muted) font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-11 rounded-lg bg-(--color-accent) text-white font-medium disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditLogForm({ log, onCancel, onSave, saving }) {
  const [weight, setWeight] = useState(log.weight_kg)
  const [reps, setReps] = useState(log.reps)

  return (
    <div className="flex items-center gap-2 py-1.5">
      <input
        type="number"
        inputMode="numeric"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        className="w-16 h-9 rounded-md bg-(--color-card-alt) border border-(--color-border) px-2 text-(--color-text) text-sm focus:outline-none focus:border-(--color-accent)"
      />
      <span className="text-(--color-text-muted) text-sm">kg ×</span>
      <input
        type="number"
        inputMode="numeric"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        className="w-14 h-9 rounded-md bg-(--color-card-alt) border border-(--color-border) px-2 text-(--color-text) text-sm focus:outline-none focus:border-(--color-accent)"
      />
      <span className="text-(--color-text-muted) text-sm">reps</span>
      <div className="flex-1" />
      <button
        type="button"
        onClick={onCancel}
        className="h-9 px-2 text-(--color-text-muted) text-sm font-medium"
      >
        Cancel
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={() => onSave({ weight_kg: Number(weight), reps: Number(reps) })}
        className="h-9 px-3 rounded-md bg-(--color-accent) text-white text-sm font-medium disabled:opacity-60"
      >
        {saving ? '…' : 'Save'}
      </button>
    </div>
  )
}

function EditExerciseForm({ exercise, onCancel, onSave, saving }) {
  const [name, setName] = useState(exercise.name)
  const [defaultSets, setDefaultSets] = useState(exercise.default_sets)
  const [defaultReps, setDefaultReps] = useState(exercise.default_reps)

  const handleSave = () => {
    if (!name.trim() || defaultSets === '' || !String(defaultReps).trim()) return
    onSave({
      name: name.trim(),
      default_sets: Number(defaultSets),
      default_reps: String(defaultReps).trim(),
    })
  }

  return (
    <div className="mb-3 p-3 rounded-xl bg-(--color-card-alt) border border-(--color-border)">
      <label className="block text-xs text-(--color-text-muted) mb-1">Exercise name</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={100}
        className="w-full h-12 rounded-lg bg-(--color-card) border border-(--color-border) px-3 text-(--color-text) text-base focus:outline-none focus:border-(--color-accent)"
      />
      <div className="flex gap-3 mt-3">
        <div className="flex-1">
          <label className="block text-xs text-(--color-text-muted) mb-1">Default sets</label>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={defaultSets}
            onChange={(e) => setDefaultSets(e.target.value)}
            className="w-full h-12 rounded-lg bg-(--color-card) border border-(--color-border) px-3 text-(--color-text) text-lg focus:outline-none focus:border-(--color-accent)"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-(--color-text-muted) mb-1">Default reps</label>
          <input
            value={defaultReps}
            onChange={(e) => setDefaultReps(e.target.value)}
            className="w-full h-12 rounded-lg bg-(--color-card) border border-(--color-border) px-3 text-(--color-text) text-lg focus:outline-none focus:border-(--color-accent)"
          />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-11 rounded-lg bg-transparent border border-(--color-border) text-(--color-text-muted) font-medium"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 h-11 rounded-lg bg-(--color-accent) text-white font-medium disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function ExerciseCard({ exercise, logs, selectedDate, isExpanded, onToggle }) {
  const dispatch = useDispatch()
  const [formOpen, setFormOpen] = useState(false)
  const [savingLog, setSavingLog] = useState(false)
  const [editingLogId, setEditingLogId] = useState(null)
  const [busyLogId, setBusyLogId] = useState(null)
  const [error, setError] = useState('')
  const [editExerciseOpen, setEditExerciseOpen] = useState(false)
  const [savingExerciseEdit, setSavingExerciseEdit] = useState(false)
  const [exerciseError, setExerciseError] = useState('')
  const [exerciseMenu, setExerciseMenu] = useState(null)
  const { handlers: longPressHandlers, guardClick } = useLongPress((coords) =>
    setExerciseMenu(coords)
  )

  const exerciseLogs = logs
    .filter((l) => l.exercise_id === exercise.id)
    .sort((a, b) => a.set_number - b.set_number)

  const handleSaveNewLog = async ({ setNumber, weight_kg, reps, is_warmup }) => {
    setError('')
    setSavingLog(true)
    try {
      const { data } = await api.post('/logs', {
        exerciseId: exercise.id,
        date: selectedDate,
        setNumber,
        weight_kg,
        reps,
        is_warmup,
      })
      dispatch(
        addLog({
          id: data.logId,
          exercise_id: exercise.id,
          exercise_name: exercise.name,
          workout_id: exercise.workout_id,
          date: selectedDate,
          set_number: setNumber,
          weight_kg,
          reps,
          is_warmup,
        })
      )
      setFormOpen(false)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save set')
    } finally {
      setSavingLog(false)
    }
  }

  const handleUpdateLog = async (logId, { weight_kg, reps }) => {
    setError('')
    setBusyLogId(logId)
    try {
      await api.put(`/logs/${logId}`, { weight_kg, reps })
      dispatch(updateLog({ id: logId, weight_kg, reps }))
      setEditingLogId(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update set')
    } finally {
      setBusyLogId(null)
    }
  }

  const handleDeleteLog = async (logId) => {
    setError('')
    setBusyLogId(logId)
    try {
      await api.delete(`/logs/${logId}`)
      dispatch(removeLog(logId))
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete set')
    } finally {
      setBusyLogId(null)
    }
  }

  const handleUpdateExercise = async ({ name, default_sets, default_reps }) => {
    setExerciseError('')
    setSavingExerciseEdit(true)
    try {
      const { data } = await api.put(
        `/workouts/${exercise.workout_id}/exercises/${exercise.id}`,
        { name, default_sets, default_reps }
      )
      dispatch(updateExercise({ workoutId: exercise.workout_id, exercise: data.exercise }))
      setEditExerciseOpen(false)
    } catch (err) {
      setExerciseError(err.response?.data?.message || 'Failed to update exercise')
    } finally {
      setSavingExerciseEdit(false)
    }
  }

  const handleDeleteExercise = async () => {
    if (!window.confirm('Delete this exercise and all its logged sets?')) return
    setExerciseError('')
    try {
      await api.delete(`/workouts/${exercise.workout_id}/exercises/${exercise.id}`)
      dispatch(removeExercise({ workoutId: exercise.workout_id, exerciseId: exercise.id }))
    } catch (err) {
      setExerciseError(err.response?.data?.message || 'Failed to delete exercise')
    }
  }

  return (
    <div
      className={`shrink-0 rounded-2xl bg-(--color-card) border overflow-hidden transition-colors ${
        isExpanded ? 'border-(--color-accent)' : 'border-(--color-border)'
      }`}
    >
      <button
        type="button"
        {...longPressHandlers}
        onClick={guardClick(onToggle)}
        className="w-full flex items-center justify-between gap-2 p-4 text-left min-h-[44px]"
      >
        <h3 className="font-bold text-(--color-text)">{exercise.name}</h3>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium text-(--color-accent2) bg-(--color-accent2-soft) rounded-full px-2.5 py-1">
            {exercise.default_sets} × {exercise.default_reps}
          </span>
          <span className="text-(--color-text-muted) text-xs">{isExpanded ? '▾' : '▸'}</span>
        </div>
      </button>

      {exerciseMenu && (
        <ActionMenu
          x={exerciseMenu.x}
          y={exerciseMenu.y}
          onEdit={() => {
            setEditExerciseOpen(true)
            setExerciseMenu(null)
          }}
          onDelete={() => {
            setExerciseMenu(null)
            handleDeleteExercise()
          }}
          onClose={() => setExerciseMenu(null)}
        />
      )}

      {isExpanded && (
        <div className="px-4 pb-6">
          {editExerciseOpen && (
            <EditExerciseForm
              exercise={exercise}
              saving={savingExerciseEdit}
              onCancel={() => {
                setEditExerciseOpen(false)
                setExerciseError('')
              }}
              onSave={handleUpdateExercise}
            />
          )}

          {exerciseError && <p className="text-xs text-(--color-danger) mb-2">{exerciseError}</p>}

          {exerciseLogs.length > 0 && (
            <div className="max-h-48 overflow-y-auto no-scrollbar flex flex-col divide-y divide-(--color-border)">
              {exerciseLogs.map((log) =>
                editingLogId === log.id ? (
                  <EditLogForm
                    key={log.id}
                    log={log}
                    saving={busyLogId === log.id}
                    onCancel={() => setEditingLogId(null)}
                    onSave={(vals) => handleUpdateLog(log.id, vals)}
                  />
                ) : (
                  <div key={log.id} className="flex items-center justify-between py-2">
                    <span className="text-sm text-(--color-text)">
                      Set {log.set_number}: {log.weight_kg}kg × {log.reps} reps
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingLogId(log.id)}
                        className="text-(--color-text-muted) w-8 h-8 flex items-center justify-center"
                        aria-label="Edit set"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        disabled={busyLogId === log.id}
                        onClick={() => handleDeleteLog(log.id)}
                        className="text-(--color-danger) w-8 h-8 flex items-center justify-center disabled:opacity-60"
                        aria-label="Delete set"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {!formOpen && error && (
            <p className="text-xs text-(--color-danger) mt-2">{error}</p>
          )}

          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="w-full h-11 mt-3 rounded-xl border border-dashed border-(--color-border) text-(--color-accent) font-medium"
          >
            + Log Set
          </button>
        </div>
      )}

      {formOpen && (
        <LogSetModal
          exerciseName={exercise.name}
          saving={savingLog}
          defaultSetNumber={exerciseLogs.length + 1}
          error={error}
          onCancel={() => {
            setFormOpen(false)
            setError('')
          }}
          onSave={handleSaveNewLog}
        />
      )}
    </div>
  )
}

function NewWorkoutForm({ onCancel, onSave, saving }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleSave = () => {
    if (!name.trim()) return
    onSave({ name: name.trim(), description: description.trim() || undefined })
  }

  return (
    <div className="mt-1 mb-2 p-3 rounded-xl bg-(--color-card-alt) border border-(--color-border) w-56 shrink-0">
      <label className="block text-xs text-(--color-text-muted) mb-1">Name</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={50}
        className="w-full h-12 rounded-lg bg-(--color-card) border border-(--color-border) px-3 text-(--color-text) text-base focus:outline-none focus:border-(--color-accent)"
        placeholder="e.g. Push Day"
      />
      <label className="block text-xs text-(--color-text-muted) mb-1 mt-3">Description (optional)</label>
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={100}
        className="w-full h-12 rounded-lg bg-(--color-card) border border-(--color-border) px-3 text-(--color-text) text-base focus:outline-none focus:border-(--color-accent)"
        placeholder="e.g. Chest, shoulders, triceps"
      />
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-11 rounded-lg bg-transparent border border-(--color-border) text-(--color-text-muted) font-medium"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 h-11 rounded-lg bg-(--color-accent) text-white font-medium disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function NewExerciseForm({ onCancel, onSave, saving }) {
  const [name, setName] = useState('')
  const [defaultSets, setDefaultSets] = useState('')
  const [defaultReps, setDefaultReps] = useState('')

  const handleSave = () => {
    if (!name.trim() || defaultSets === '' || !defaultReps.trim()) return
    onSave({
      name: name.trim(),
      default_sets: Number(defaultSets),
      default_reps: defaultReps.trim(),
    })
  }

  return (
    <div className="shrink-0 p-3 rounded-xl bg-(--color-card-alt) border border-(--color-border)">
      <label className="block text-xs text-(--color-text-muted) mb-1">Exercise name</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={100}
        className="w-full h-12 rounded-lg bg-(--color-card) border border-(--color-border) px-3 text-(--color-text) text-base focus:outline-none focus:border-(--color-accent)"
        placeholder="e.g. Bench Press"
      />
      <div className="flex gap-3 mt-3">
        <div className="flex-1">
          <label className="block text-xs text-(--color-text-muted) mb-1">Default sets</label>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={defaultSets}
            onChange={(e) => setDefaultSets(e.target.value)}
            className="w-full h-12 rounded-lg bg-(--color-card) border border-(--color-border) px-3 text-(--color-text) text-lg focus:outline-none focus:border-(--color-accent)"
            placeholder="4"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-(--color-text-muted) mb-1">Default reps</label>
          <input
            value={defaultReps}
            onChange={(e) => setDefaultReps(e.target.value)}
            className="w-full h-12 rounded-lg bg-(--color-card) border border-(--color-border) px-3 text-(--color-text) text-lg focus:outline-none focus:border-(--color-accent)"
            placeholder="8-10"
          />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-11 rounded-lg bg-transparent border border-(--color-border) text-(--color-text-muted) font-medium"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 h-11 rounded-lg bg-(--color-accent) text-white font-medium disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function EditWorkoutForm({ workout, onCancel, onSave, saving }) {
  const [name, setName] = useState(workout.name)
  const [description, setDescription] = useState(workout.description || '')

  const handleSave = () => {
    if (!name.trim()) return
    onSave({ name: name.trim(), description: description.trim() || undefined })
  }

  return (
    <div className="mt-1 mb-2 p-3 rounded-xl bg-(--color-card-alt) border border-(--color-border) w-56 shrink-0">
      <label className="block text-xs text-(--color-text-muted) mb-1">Name</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={50}
        className="w-full h-12 rounded-lg bg-(--color-card) border border-(--color-border) px-3 text-(--color-text) text-base focus:outline-none focus:border-(--color-accent)"
      />
      <label className="block text-xs text-(--color-text-muted) mb-1 mt-3">Description (optional)</label>
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={100}
        className="w-full h-12 rounded-lg bg-(--color-card) border border-(--color-border) px-3 text-(--color-text) text-base focus:outline-none focus:border-(--color-accent)"
      />
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-11 rounded-lg bg-transparent border border-(--color-border) text-(--color-text-muted) font-medium"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 h-11 rounded-lg bg-(--color-accent) text-white font-medium disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function WorkoutTab({ workout, isSelected, onSelect, onLongPress }) {
  const { handlers, guardClick } = useLongPress((coords) => onLongPress(workout, coords))

  return (
    <button
      type="button"
      {...handlers}
      onClick={guardClick(() => onSelect(workout.id))}
      className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-semibold shrink-0 ${
        isSelected
          ? 'bg-(--color-accent-soft) text-(--color-accent)'
          : 'text-(--color-text-muted)'
      }`}
    >
      {workout.name}
    </button>
  )
}

function Dashboard() {
  const dispatch = useDispatch()
  const user = useSelector((state) => state.auth.user)
  const { workouts, exercisesByWorkout, logs, selectedWorkout, selectedDate, loading } =
    useSelector((state) => state.workout)

  const [pageError, setPageError] = useState('')
  const [expandedExerciseId, setExpandedExerciseId] = useState(null)
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark')
  const dateInputRef = useRef(null)

  const [newWorkoutFormOpen, setNewWorkoutFormOpen] = useState(false)
  const [savingWorkout, setSavingWorkout] = useState(false)
  const [workoutFormError, setWorkoutFormError] = useState('')

  const [editingWorkout, setEditingWorkout] = useState(null)
  const [savingWorkoutEdit, setSavingWorkoutEdit] = useState(false)
  const [workoutMenu, setWorkoutMenu] = useState(null)

  const [newExerciseFormOpen, setNewExerciseFormOpen] = useState(false)
  const [savingExercise, setSavingExercise] = useState(false)
  const [exerciseFormError, setExerciseFormError] = useState('')

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }

  const openDatePicker = () => {
    if (dateInputRef.current?.showPicker) {
      dateInputRef.current.showPicker()
    } else {
      dateInputRef.current?.focus()
    }
  }

  const selectWorkout = (workoutId) => {
    dispatch(setSelectedWorkout(workoutId))
    setExpandedExerciseId(null)
  }

  const handleSaveNewWorkout = async ({ name, description }) => {
    setSavingWorkout(true)
    setWorkoutFormError('')
    try {
      const { data } = await api.post('/workouts', { name, description })
      dispatch(addWorkout(data.workout))
      selectWorkout(data.workout.id)
      setNewWorkoutFormOpen(false)
    } catch (err) {
      setWorkoutFormError(err.response?.data?.message || 'Failed to create workout')
    } finally {
      setSavingWorkout(false)
    }
  }

  const handleUpdateWorkout = async ({ name, description }) => {
    setSavingWorkoutEdit(true)
    setWorkoutFormError('')
    try {
      const { data } = await api.put(`/workouts/${editingWorkout.id}`, { name, description })
      dispatch(updateWorkout(data.workout))
      setEditingWorkout(null)
    } catch (err) {
      setWorkoutFormError(err.response?.data?.message || 'Failed to update workout')
    } finally {
      setSavingWorkoutEdit(false)
    }
  }

  const handleDeleteWorkout = async (workoutId) => {
    if (!window.confirm('Delete this workout and all its logged history?')) return
    try {
      await api.delete(`/workouts/${workoutId}`)
      dispatch(removeWorkout(workoutId))
    } catch (err) {
      setPageError(err.response?.data?.message || 'Failed to delete workout')
    }
  }

  const handleSaveNewExercise = async ({ name, default_sets, default_reps }) => {
    setSavingExercise(true)
    setExerciseFormError('')
    try {
      const { data } = await api.post(`/workouts/${selectedWorkout}/exercises`, {
        name,
        default_sets,
        default_reps,
      })
      dispatch(addExercise({ workoutId: selectedWorkout, exercise: data.exercise }))
      setNewExerciseFormOpen(false)
    } catch (err) {
      setExerciseFormError(err.response?.data?.message || 'Failed to create exercise')
    } finally {
      setSavingExercise(false)
    }
  }

  useEffect(() => {
    const loadWorkouts = async () => {
      dispatch(setLoading(true))
      try {
        const { data } = await api.get('/workouts')
        dispatch(setWorkouts(data.workouts))
        if (data.workouts.length > 0 && !selectedWorkout) {
          dispatch(setSelectedWorkout(data.workouts[0].id))
        }
      } catch (err) {
        setPageError(err.response?.data?.message || 'Failed to load workouts')
      } finally {
        dispatch(setLoading(false))
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }
    loadWorkouts()
  }, [])

  useEffect(() => {
    if (!selectedWorkout || exercisesByWorkout[selectedWorkout]) return
    const loadExercises = async () => {
      dispatch(setLoading(true))
      try {
        const { data } = await api.get(`/workouts/${selectedWorkout}/exercises`)
        dispatch(setExercises({ workoutId: selectedWorkout, exercises: data.exercises }))
      } catch (err) {
        setPageError(err.response?.data?.message || 'Failed to load exercises')
      } finally {
        dispatch(setLoading(false))
      }
    }
    loadExercises()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkout])

  useEffect(() => {
    const loadLogs = async () => {
      dispatch(setLoading(true))
      try {
        const { data } = await api.get(`/logs/session/${selectedDate}`)
        dispatch(setLogs(data.logs))
      } catch (err) {
        setPageError(err.response?.data?.message || 'Failed to load logs')
      } finally {
        dispatch(setLoading(false))
      }
    }
    loadLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedWorkout])

  const exercises = exercisesByWorkout[selectedWorkout] || []

  return (
    <div className="h-screen w-full bg-(--color-bg) flex justify-center overflow-hidden">
      <div className="w-full max-w-[430px] flex flex-col h-full">
        <header className="shrink-0 px-4 pt-6 pb-4 bg-(--color-bg-elevated) border-b border-(--color-border)">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-(--color-text)">WorkoutTracker</h1>
            <div className="flex items-center gap-2">
              {user?.name && (
                <span className="text-sm text-(--color-text-muted)">Hi, {user.name}</span>
              )}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="w-9 h-9 rounded-lg bg-(--color-card) border border-(--color-border) flex items-center justify-center"
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <button
              type="button"
              onClick={() => dispatch(setSelectedDate(shiftDateKey(selectedDate, -1)))}
              className="w-11 h-11 rounded-xl bg-(--color-card) border border-(--color-border) text-(--color-text) flex items-center justify-center"
              aria-label="Previous day"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={openDatePicker}
              className="text-sm font-medium text-(--color-text) px-2 py-1 relative"
            >
              {formatDisplayDate(selectedDate)}
              <input
                ref={dateInputRef}
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && dispatch(setSelectedDate(e.target.value))}
                className="sr-only"
                aria-label="Pick a date"
              />
            </button>
            <button
              type="button"
              onClick={() => dispatch(setSelectedDate(shiftDateKey(selectedDate, 1)))}
              className="w-11 h-11 rounded-xl bg-(--color-card) border border-(--color-border) text-(--color-text) flex items-center justify-center"
              aria-label="Next day"
            >
              ›
            </button>
          </div>

          <div className="flex items-center gap-2 mt-4 overflow-x-auto no-scrollbar">
            {workouts.map((w) => (
              <WorkoutTab
                key={w.id}
                workout={w}
                isSelected={selectedWorkout === w.id}
                onSelect={selectWorkout}
                onLongPress={(workout, coords) =>
                  setWorkoutMenu({ workout, x: coords.x, y: coords.y })
                }
              />
            ))}
            {!newWorkoutFormOpen && (
              <button
                type="button"
                onClick={() => {
                  setNewWorkoutFormOpen(true)
                  setEditingWorkout(null)
                }}
                className="whitespace-nowrap px-1 pb-2 text-sm font-semibold border-b-2 border-dashed border-(--color-border) text-(--color-accent) shrink-0"
              >
                + New Workout
              </button>
            )}
          </div>

          {workoutMenu && (
            <ActionMenu
              x={workoutMenu.x}
              y={workoutMenu.y}
              onEdit={() => {
                setEditingWorkout(workoutMenu.workout)
                setNewWorkoutFormOpen(false)
                setWorkoutFormError('')
                setWorkoutMenu(null)
              }}
              onDelete={() => {
                const workoutId = workoutMenu.workout.id
                setWorkoutMenu(null)
                handleDeleteWorkout(workoutId)
              }}
              onClose={() => setWorkoutMenu(null)}
            />
          )}

          {editingWorkout && (
            <EditWorkoutForm
              workout={editingWorkout}
              saving={savingWorkoutEdit}
              onCancel={() => {
                setEditingWorkout(null)
                setWorkoutFormError('')
              }}
              onSave={handleUpdateWorkout}
            />
          )}
          {editingWorkout && workoutFormError && (
            <p className="text-xs text-(--color-danger) -mt-1 mb-1">{workoutFormError}</p>
          )}

          {newWorkoutFormOpen && (
            <NewWorkoutForm
              saving={savingWorkout}
              onCancel={() => {
                setNewWorkoutFormOpen(false)
                setWorkoutFormError('')
              }}
              onSave={handleSaveNewWorkout}
            />
          )}
          {newWorkoutFormOpen && workoutFormError && (
            <p className="text-xs text-(--color-danger) -mt-1 mb-1">{workoutFormError}</p>
          )}
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-4 flex flex-col gap-4 pb-24">
          <ChallengeTrackerCard />
          {pageError && <p className="text-sm text-(--color-danger)">{pageError}</p>}
          {loading && exercises.length === 0 && (
            <p className="text-sm text-(--color-text-muted)">Loading…</p>
          )}
          {!loading && exercises.length === 0 && !pageError && (
            <p className="text-sm text-(--color-text-muted)">No exercises for this workout yet.</p>
          )}
          {exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              logs={logs}
              selectedDate={selectedDate}
              isExpanded={expandedExerciseId === exercise.id}
              onToggle={() =>
                setExpandedExerciseId((prev) => (prev === exercise.id ? null : exercise.id))
              }
            />
          ))}

          {selectedWorkout && (
            <>
              {exerciseFormError && (
                <p className="text-xs text-(--color-danger)">{exerciseFormError}</p>
              )}
              {newExerciseFormOpen ? (
                <NewExerciseForm
                  saving={savingExercise}
                  onCancel={() => {
                    setNewExerciseFormOpen(false)
                    setExerciseFormError('')
                  }}
                  onSave={handleSaveNewExercise}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setNewExerciseFormOpen(true)}
                  className="shrink-0 w-full h-11 rounded-xl border border-dashed border-(--color-border) text-(--color-accent) font-medium"
                >
                  + New Exercise
                </button>
              )}
            </>
          )}
        </main>
      </div>
      <Navbar />
    </div>
  )
}

export default Dashboard
