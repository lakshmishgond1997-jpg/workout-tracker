import { createSlice } from '@reduxjs/toolkit'

const buddiesSlice = createSlice({
  name: 'buddies',
  initialState: {
    unreadNotificationCount: 0,
  },
  reducers: {
    setUnreadCount: (state, action) => {
      state.unreadNotificationCount = action.payload
    },
  },
})

export const { setUnreadCount } = buddiesSlice.actions
export default buddiesSlice.reducer
