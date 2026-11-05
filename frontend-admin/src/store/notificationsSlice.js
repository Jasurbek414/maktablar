import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { notificationsAPI } from '../api/notifications'

export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async () => {
    const { data } = await notificationsAPI.getNotifications()
    return data.results || data
  }
)

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [],
    unreadCount: 0,
    isLoading: false,
  },
  reducers: {
    addNotification: (state, action) => {
      state.items.unshift(action.payload)
      state.unreadCount += 1
    },
    markAsRead: (state, action) => {
      const item = state.items.find(n => n.id === action.payload)
      if (item && !item.is_read) {
        item.is_read = true
        state.unreadCount = Math.max(0, state.unreadCount - 1)
      }
    },
    markAllRead: (state) => {
      state.items.forEach(n => { n.is_read = true })
      state.unreadCount = 0
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => { state.isLoading = true })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false
        const payload = Array.isArray(action.payload) ? action.payload : []
        state.items = payload
        state.unreadCount = payload.filter(n => !n.is_read).length
      })
      .addCase(fetchNotifications.rejected, (state) => { state.isLoading = false })
  },
})

export const { addNotification, markAsRead, markAllRead } = notificationsSlice.actions
export default notificationsSlice.reducer
