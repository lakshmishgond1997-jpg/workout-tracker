import { createSlice } from '@reduxjs/toolkit'
import { todayKey } from '../../utils/date'

const workoutSlice = createSlice({
  name: 'workout',
  initialState: {
    workouts: [],
    exercisesByWorkout: {},
    logs: [],
    selectedWorkout: null,
    selectedDate: todayKey(),
    loading: false,
  },
  reducers: {
    setWorkouts: (state, action) => {
      state.workouts = action.payload
    },
    addWorkout: (state, action) => {
      state.workouts.push(action.payload)
    },
    setExercises: (state, action) => {
      const { workoutId, exercises } = action.payload
      state.exercisesByWorkout[workoutId] = exercises
    },
    addExercise: (state, action) => {
      const { workoutId, exercise } = action.payload
      if (!state.exercisesByWorkout[workoutId]) {
        state.exercisesByWorkout[workoutId] = []
      }
      state.exercisesByWorkout[workoutId].push(exercise)
    },
    updateWorkout: (state, action) => {
      const { id, name, description } = action.payload
      const workout = state.workouts.find((w) => w.id === id)
      if (workout) {
        workout.name = name
        workout.description = description
      }
    },
    removeWorkout: (state, action) => {
      const id = action.payload
      state.workouts = state.workouts.filter((w) => w.id !== id)
      delete state.exercisesByWorkout[id]
      if (state.selectedWorkout === id) {
        state.selectedWorkout = state.workouts[0]?.id ?? null
      }
    },
    updateExercise: (state, action) => {
      const { workoutId, exercise } = action.payload
      const list = state.exercisesByWorkout[workoutId]
      const idx = list?.findIndex((e) => e.id === exercise.id)
      if (idx > -1) {
        list[idx] = exercise
      }
    },
    removeExercise: (state, action) => {
      const { workoutId, exerciseId } = action.payload
      state.exercisesByWorkout[workoutId] = (state.exercisesByWorkout[workoutId] || []).filter(
        (e) => e.id !== exerciseId
      )
      state.logs = state.logs.filter((l) => l.exercise_id !== exerciseId)
    },
    setLogs: (state, action) => {
      state.logs = action.payload
    },
    addLog: (state, action) => {
      state.logs.push(action.payload)
    },
    updateLog: (state, action) => {
      const { id, weight_kg, reps } = action.payload
      const log = state.logs.find((l) => l.id === id)
      if (log) {
        log.weight_kg = weight_kg
        log.reps = reps
      }
    },
    removeLog: (state, action) => {
      state.logs = state.logs.filter((l) => l.id !== action.payload)
    },
    setSelectedWorkout: (state, action) => {
      state.selectedWorkout = action.payload
    },
    setSelectedDate: (state, action) => {
      state.selectedDate = action.payload
    },
    setLoading: (state, action) => {
      state.loading = action.payload
    },
  },
})

export const {
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
} = workoutSlice.actions

export default workoutSlice.reducer
