// src/components/Sidebar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../services/api.js';

const MENU_BY_ROLE = {
  SUPERADMIN: [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/provinces', label: 'Viloyatlar', icon: '🏛️' },
    { path: '/districts', label: 'Tumanlar', icon: '🏘️' },
    { path: '/schools', label: 'Maktablar', icon: '🏫' },
    { path: '/students', label: "O'quvchilar", icon: '👨‍🎓' },
    { path: '/attendance', label: 'Davomat', icon: '📋' },
    { path: '/users', label: 'Foydalanuvchilar', icon: '👥' },
    { path: '/devices', label: 'Qurilmalar', icon: '📱' },
    { path: '/settings', label: 'Sozlamalar', icon: '⚙️' },
  ],
  ADMIN: [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/districts', label: 'Tumanlar', icon: '🏘️' },
    { path: '/schools', label: 'Maktablar', icon: '🏫' },
    { path: '/students', label: "O'quvchilar", icon: '👨‍🎓' },
    { path: '/attendance', label: 'Davomat', icon: '📋' },
    { path: '/devices', label: 'Qurilmalar', icon: '📱' },
  ],
  DIRECTOR: [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/students', label: "O'quvchilar", icon: '👨‍🎓' },
    { path: '/attendance', label: 'Davomat', icon: '📋' },
    { path: '/devices', label: 'Qurilmalar', icon: '📱' },
  ],
  MUDIR: [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/students', label: "O'quvchilar", icon: '👨‍🎓' },
    { path: '/attendance', label: 'Davomat', icon: '📋' },
  ],
  TEACHER: [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/attendance', label: 'Davomat', icon: '📋' },
  ],
};

const Sidebar = ({ user }) => {
  const location = useLocation();
  const menuItems = MENU_BY_ROLE[user?.role] || MENU_BY_ROLE.TEACHER;

  return (
    <aside className="w-64 min-h-screen bg-gray-800/50 backdrop-blur-xl border-r border-white/5 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/25">
            {user?.fullName?.charAt(0) || 'M'}
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm truncate">{user?.fullName || 'Foydalanuvchi'}</h3>
            <span className="text-xs text-cyan-400 font-medium">{user?.role}</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/10'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-white/5">
        <button
          onClick={() => api.logout()}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <span className="text-lg">🚪</span>
          Chiqish
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
