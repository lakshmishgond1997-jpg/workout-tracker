import { createSlice } from '@reduxjs/toolkit'

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState: {
    dateRange: '30',
  },
  reducers: {
    setDateRange: (state, action) => {
      state.dateRange = action.payload
    },
  },
})

export const { setDateRange } = analyticsSlice.actions
export default analyticsSlice.reducer
