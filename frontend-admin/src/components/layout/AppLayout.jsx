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
            // MUHIM: fill-mode "both"/"forwards" ISHLATILMAYDI — animatsiya tugagach
            // "to" holatidagi transform:translateY(0) shu elementda QOLIB KETSA (vizual
            // jihatdan harakatsiz ko'rinsa ham), u ICHIDAGI barcha position:fixed
            // elementlar (masalan Modal.jsx) uchun YANGI containing block yaratadi —
            // natijada modal butun ekran o'rniga shu <main> qutisiga nisbatan
            // joylashadi va pastki qismi (masalan footer tugmalari) kesilib qoladi
            // (bu xato avval savdo-pos loyihasida ham xuddi shu sabab bilan chiqqan edi).
            // Fill-mode'siz (standart "none") animatsiya tugagach element o'zining
            // asl (transformsiz) holatiga qaytadi — vizual farq yo'q, faqat xato tuzatiladi.
            animation: 'fadeInUp 0.3s cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
