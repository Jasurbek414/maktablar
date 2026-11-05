import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authAPI } from '../api/auth'

export const login = createAsyncThunk('auth/login', async ({ phone, password }, { rejectWithValue }) => {
  try {
    const { data } = await authAPI.login(phone, password)
    localStorage.setItem('access_token', data.access)
    localStorage.setItem('refresh_token', data.refresh)
    return data
  } catch (error) {
    return rejectWithValue(error.response?.data || { detail: 'Xatolik yuz berdi' })
  }
})

export const logout = createAsyncThunk('auth/logout', async (_, { getState }) => {
  const refresh = localStorage.getItem('refresh_token')
  try {
    await authAPI.logout(refresh)
  } catch {}
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
})

export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    const { data } = await authAPI.getMe()
    return data
  } catch (error) {
    return rejectWithValue(error.response?.data)
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: !!localStorage.getItem('access_token'),
    isLoading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.isLoading = true; state.error = null })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = true
        state.user = action.payload.user
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.isAuthenticated = false
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload
        state.isAuthenticated = true
      })
      .addCase(fetchMe.rejected, (state) => {
        state.isAuthenticated = false
        state.user = null
      })
  },
})

export const { clearError } = authSlice.actions
export default authSlice.reducer
