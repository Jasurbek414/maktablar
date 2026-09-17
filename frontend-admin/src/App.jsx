import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchMe } from './store/authSlice'
import { AppLayout } from './components/layout/AppLayout'
import { usePermissions } from './hooks/usePermissions'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/DashboardPage'
import StudentsPage from './pages/operator/StudentsPage'
import TeachersPage from './pages/operator/TeachersPage'
import ParentsPage from './pages/operator/ParentsPage'
import DevicesPage from './pages/operator/DevicesPage'
import AttendancePage from './pages/attendance/AttendancePage'
import ReportsPage from './pages/reports/ReportsPage'
import ProfilePage from './pages/common/ProfilePage'
import NotificationsPage from './pages/common/NotificationsPage'
import TelegramPage from './pages/common/TelegramPage'
import OrganizationsPage from './pages/admin/OrganizationsPage'
import UsersPage from './pages/admin/UsersPage'
import AuditPage from './pages/admin/AuditPage'
import MyChildrenPage from './pages/parent/MyChildrenPage'
import CamerasPage from './pages/cameras/CamerasPage'
import CameraAnalysisPage from './pages/cameras/CameraAnalysisPage'
import AIAnalysisPage from './pages/cameras/AIAnalysisPage'

function PrivateRoute({ children }) {
  const { isAuthenticated } = useSelector(state => state.auth)
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useSelector(state => state.auth)
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children
}

/* Rol-asosli himoya: ruxsatli rollar ro'yxati */
function RoleRoute({ children, roles }) {
  const { primaryRole, isSuperAdmin } = usePermissions()
  if (isSuperAdmin || roles.includes(primaryRole)) return children
  return <Navigate to="/dashboard" replace />
}

export default function App() {
  const dispatch = useDispatch()
  const { isAuthenticated } = useSelector(state => state.auth)

  useEffect(() => {
    if (isAuthenticated) dispatch(fetchMe())
  }, [dispatch, isAuthenticated])

  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />

        {/* ─── Superadmin only ─── */}
        <Route path="users" element={
          <RoleRoute roles={['superadmin', 'admin']}>
            <UsersPage />
          </RoleRoute>
        } />
        <Route path="audit" element={
          <RoleRoute roles={['superadmin']}>
            <AuditPage />
          </RoleRoute>
        } />

        {/* ─── Tashkilotlar: superadmin + region/district director ─── */}
        <Route path="regions" element={
          <RoleRoute roles={['superadmin', 'admin', 'region_director', 'district_director']}>
            <OrganizationsPage />
          </RoleRoute>
        } />
        <Route path="districts" element={
          <RoleRoute roles={['superadmin', 'admin', 'region_director', 'district_director']}>
            <OrganizationsPage />
          </RoleRoute>
        } />
        <Route path="schools" element={
          <RoleRoute roles={['superadmin', 'admin', 'region_director', 'district_director']}>
            <OrganizationsPage />
          </RoleRoute>
        } />

        {/* ─── Sinflar: superadmin, director va operator ─── */}
        <Route path="classes" element={
          <RoleRoute roles={['superadmin', 'admin', 'region_director', 'district_director', 'school_director', 'operator', 'mudir']}>
            <OrganizationsPage />
          </RoleRoute>
        } />

        {/* ─── O'quvchilar: superadmin, directorlar, operator, o'qituvchi ─── */}
        <Route path="students" element={
          <RoleRoute roles={['superadmin', 'admin', 'region_director', 'district_director', 'school_director', 'operator', 'mudir', 'teacher']}>
            <StudentsPage />
          </RoleRoute>
        } />

        {/* ─── O'qituvchilar: superadmin, directorlar, operator ─── */}
        <Route path="teachers" element={
          <RoleRoute roles={['superadmin', 'admin', 'region_director', 'district_director', 'school_director', 'operator', 'mudir']}>
            <TeachersPage />
          </RoleRoute>
        } />

        {/* ─── Ota-onalar: superadmin, school_director, operator ─── */}
        <Route path="parents" element={
          <RoleRoute roles={['superadmin', 'admin', 'school_director', 'operator', 'mudir']}>
            <ParentsPage />
          </RoleRoute>
        } />

        {/* ─── Qurilmalar: superadmin, directorlar, operator ─── */}
        <Route path="devices" element={
          <RoleRoute roles={['superadmin', 'admin', 'region_director', 'district_director', 'school_director', 'operator', 'mudir']}>
            <DevicesPage />
          </RoleRoute>
        } />

        {/* ─── Kameralar: barcha rollar ─── */}
        <Route path="cameras" element={<CamerasPage />} />
        <Route path="camera-analysis" element={<CameraAnalysisPage />} />
        <Route path="ai-analysis" element={<AIAnalysisPage />} />

        {/* ─── Davomad: barcha autentifikatsiyalangan ─── */}
        <Route path="attendance" element={<AttendancePage />} />

        {/* ─── Hisobotlar: superadmin, directorlar, operator, o'qituvchi ─── */}
        <Route path="reports" element={
          <RoleRoute roles={['superadmin', 'admin', 'region_director', 'district_director', 'school_director', 'operator', 'mudir', 'teacher']}>
            <ReportsPage />
          </RoleRoute>
        } />

        {/* ─── Ota-ona sahifasi ─── */}
        <Route path="my-children" element={
          <RoleRoute roles={['parent']}>
            <MyChildrenPage />
          </RoleRoute>
        } />

        {/* ─── Umumiy ─── */}
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="telegram" element={<TelegramPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
