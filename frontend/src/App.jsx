import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

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
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
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

  return (
    <Router>
      <div className="h-screen flex overflow-hidden bg-[#0a0e1a]">
        <Sidebar user={user} />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar */}
          <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-indigo-500/[0.06] bg-[#0a0e1a]/80 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">
                {user?.role === 'SUPERADMIN' ? 'Super Admin Panel' : 
                 user?.role === 'ADMIN' ? 'Viloyat Boshqaruvi' :
                 user?.role === 'DIRECTOR' ? 'Maktab Boshqaruvi' :
                 'Boshqaruv paneli'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Search */}
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-indigo-500/[0.08] text-slate-600 text-xs hover:border-indigo-500/20 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                Qidirish...
                <kbd className="hidden sm:inline text-[10px] text-slate-700 bg-white/[0.03] px-1 rounded">⌘K</kbd>
              </button>
              {/* Notification */}
              <button className="relative p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] transition-colors">
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              </button>
            </div>
          </header>
          {/* Content */}
          <main className="flex-1 overflow-y-auto p-6">
            <Routes>
              <Route path="/" element={<Dashboard user={user} />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}
