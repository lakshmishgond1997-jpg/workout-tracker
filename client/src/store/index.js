import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import workoutReducer from './slices/workoutSlice'
import analyticsReducer from './slices/analyticsSlice'
import buddiesReducer from './slices/buddiesSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    workout: workoutReducer,
    analytics: analyticsReducer,
    buddies: buddiesReducer,
  },
})
