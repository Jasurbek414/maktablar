import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import Classes from './pages/Classes';

const api = { baseURL: '/api' };
const apiFetch = async (url) => {
  const token = localStorage.getItem('token');
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return res.json();
};
const apiPut = async (url) => {
  const token = localStorage.getItem('token');
  return fetch(url, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
};

/* ── Vaqt formatlash ── */
function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'hozirgina';
  if (diff < 3600) return Math.floor(diff / 60) + ' daqiqa oldin';
  if (diff < 86400) return Math.floor(diff / 3600) + ' soat oldin';
  if (diff < 604800) return Math.floor(diff / 86400) + ' kun oldin';
  return date.toLocaleDateString('uz-UZ');
}

/* ── Notification icon ── */
const typeIcons = {
  ATTENDANCE: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
    </svg>
  ),
  DEVICE_STATUS: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
    </svg>
  ),
  SYSTEM: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  ALERT: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  USER_ACTION: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

const levelColors = {
  INFO: 'text-blue-400 bg-blue-500/10',
  SUCCESS: 'text-emerald-400 bg-emerald-500/10',
  WARNING: 'text-amber-400 bg-amber-500/10',
  ERROR: 'text-red-400 bg-red-500/10',
};

const levelDot = {
  INFO: 'bg-blue-400',
  SUCCESS: 'bg-emerald-400',
  WARNING: 'bg-amber-400',
  ERROR: 'bg-red-400',
};

/* ── Ruxsat tekshiruvchi ── */
function Gate({ user, allowed, children }) {
  if (!allowed.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
}

/* ── Notification Panel ── */
function NotificationPanel({ user }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await apiFetch(`/api/notifications?userId=${user.id}&role=${user.role}&limit=30`);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (e) { console.error('Notification fetch error:', e); }
  }, [user?.id, user?.role]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markRead = async (id) => {
    await apiPut(`/api/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await apiPut(`/api/notifications/read-all?userId=${user.id}&role=${user.role}`);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  return (
    <div ref={ref} className="relative">
      {/* Bell Button */}
      <button
        onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
        className="relative p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-all duration-200"
      >
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-12 w-[400px] max-h-[520px] bg-[#111916] border border-emerald-500/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.04]">
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-semibold text-slate-200">Bildirishnomalar</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 rounded-full">
                  {unreadCount} yangi
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[11px] text-emerald-500 hover:text-emerald-400 transition-colors font-medium">
                Barchasini o'qish
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto max-h-[440px] divide-y divide-white/[0.02]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-3">
                  <svg className="w-7 h-7 text-slate-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                </div>
                <p className="text-sm text-slate-500">Bildirishnomalar yo'q</p>
                <p className="text-[11px] text-slate-700 mt-1">Yangi xabarlar bu yerda ko'rinadi</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && markRead(n.id)}
                  className={`flex gap-3 px-5 py-3.5 cursor-pointer transition-all duration-150 hover:bg-white/[0.02] ${!n.isRead ? 'bg-emerald-500/[0.03]' : ''}`}
                >
                  {/* Icon */}
                  <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${levelColors[n.level] || levelColors.INFO}`}>
                    {typeIcons[n.type] || typeIcons.SYSTEM}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-[13px] leading-tight truncate ${!n.isRead ? 'text-slate-200 font-medium' : 'text-slate-400'}`}>
                        {n.title}
                      </p>
                      {!n.isRead && <span className={`shrink-0 w-2 h-2 rounded-full mt-1 ${levelDot[n.level] || levelDot.INFO}`} />}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-slate-700 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
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
            <NotificationPanel user={user} />
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
              <Route path="/classes" element={
                <Gate user={user} allowed={['SUPERADMIN', 'ADMIN', 'DIRECTOR']}><Classes /></Gate>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

