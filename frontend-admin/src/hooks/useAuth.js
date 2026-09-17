import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { login, logout, fetchMe } from '../store/authSlice'

export function useAuth() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoading, error } = useSelector(state => state.auth)

  const handleLogin = async (phone, password) => {
    const result = await dispatch(login({ phone, password }))
    if (login.fulfilled.match(result)) {
      navigate('/dashboard')
    }
    return result
  }

  const handleLogout = async () => {
    await dispatch(logout())
    navigate('/login')
  }

  const loadUser = () => dispatch(fetchMe())

  return { user, isAuthenticated, isLoading, error, login: handleLogin, logout: handleLogout, loadUser }
}
