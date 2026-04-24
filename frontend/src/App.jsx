import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Provinces from './pages/Provinces';
import Districts from './pages/Districts';
import Schools from './pages/Schools';
import Students from './pages/Students';
import Attendance from './pages/Attendance';
import Users from './pages/Users';

/* ── Ruxsat tekshiruvchi ── */
function Gate({ user, allowed, children }) {
  if (!allowed.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (stored && token) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f0d] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login onLogin={setUser} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    );
  }

  const roleLabel = {
    SUPERADMIN: 'Super Admin Panel',
    ADMIN: 'Viloyat Boshqaruvi',
    DIRECTOR: 'Maktab Boshqaruvi',
    MUDIR: "O'quv ishlari bo'yicha",
    TEACHER: "O'qituvchi paneli",
  };

  return (
    <Router>
      <div className="h-screen flex overflow-hidden bg-[#0a0f0d]">
        <Sidebar user={user} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-emerald-500/[0.06] bg-[#0a0f0d]/80 backdrop-blur-md">
            <span className="text-xs text-slate-600">{roleLabel[user?.role] || 'Panel'}</span>
            <button className="relative p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] transition-colors">
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </button>
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            <Routes>
              <Route path="/" element={<Dashboard user={user} />} />
              <Route path="/provinces" element={
                <Gate user={user} allowed={['SUPERADMIN']}><Provinces /></Gate>
              } />
              <Route path="/districts" element={
                <Gate user={user} allowed={['SUPERADMIN', 'ADMIN']}><Districts user={user} /></Gate>
              } />
              <Route path="/schools" element={
                <Gate user={user} allowed={['SUPERADMIN', 'ADMIN']}><Schools user={user} /></Gate>
              } />
              <Route path="/students" element={
                <Gate user={user} allowed={['SUPERADMIN', 'ADMIN', 'DIRECTOR']}><Students user={user} /></Gate>
              } />
              <Route path="/attendance" element={
                <Gate user={user} allowed={['SUPERADMIN', 'ADMIN', 'DIRECTOR', 'MUDIR', 'TEACHER']}><Attendance user={user} /></Gate>
              } />
              <Route path="/users" element={
                <Gate user={user} allowed={['SUPERADMIN']}><Users user={user} /></Gate>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}
