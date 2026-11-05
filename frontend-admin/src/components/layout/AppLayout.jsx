import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useDispatch } from 'react-redux'
import { fetchNotifications } from '../../store/notificationsSlice'

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const dispatch = useDispatch()
  const location = useLocation()

  useEffect(() => {
    dispatch(fetchNotifications())
    const id = setInterval(() => dispatch(fetchNotifications()), 60000)
    return () => clearInterval(id)
  }, [dispatch])

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F1F5F9' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minWidth: 0 }}>
        <Header
          onToggleSidebar={() => setCollapsed(v => !v)}
          sidebarCollapsed={collapsed}
        />
        <main
          key={location.pathname}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            animation: 'fadeInUp 0.3s cubic-bezier(0.22,1,0.36,1) both',
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
