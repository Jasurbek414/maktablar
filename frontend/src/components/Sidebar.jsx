import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';

const ICONS = {
  dashboard: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  provinces: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  districts: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
  schools: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z',
  students: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  classes: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
  attendance: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  users: 'M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  teachers: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  devices: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  cameras: 'M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z',
  cameraAnalysis: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
  aiAnalysis: 'M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z',
  aiChat: 'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z',
  settings: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
};

const NAV = {
  SUPERADMIN: ['dashboard', 'provinces', 'districts', 'schools', 'students', 'teachers', 'classes', 'attendance', 'users', 'devices', 'cameras', 'cameraAnalysis', 'aiAnalysis', 'aiChat', 'settings'],
  // ADMIN — superadmindan 1 daraja past, lekin hamma viloyatlarni boshqaradi
  // (superadmin/boshqa admin'larni boshqarishdan tashqari — bu backend'da cheklangan).
  ADMIN: ['dashboard', 'provinces', 'districts', 'schools', 'students', 'teachers', 'classes', 'attendance', 'users', 'devices', 'cameras', 'cameraAnalysis', 'aiAnalysis', 'aiChat', 'settings'],
  // REGION_DIRECTOR — o'z viloyati doirasida boshqaruv (tumanlar/maktablar/sinflar/o'quvchilar/
  // davomat/foydalanuvchilar), lekin Viloyatlar sahifasi yo'q (faqat bitta viloyati bor).
  REGION_DIRECTOR: ['dashboard', 'districts', 'schools', 'classes', 'students', 'teachers', 'attendance', 'users', 'aiChat'],
  // DISTRICT_DIRECTOR — o'z tumani doirasida boshqaruv, Tumanlar/Viloyatlar sahifasi yo'q
  // (faqat bitta tumani bor).
  DISTRICT_DIRECTOR: ['dashboard', 'schools', 'classes', 'students', 'teachers', 'attendance', 'users', 'aiChat'],
  DIRECTOR: ['dashboard', 'students', 'teachers', 'classes', 'attendance', 'devices', 'cameras', 'cameraAnalysis', 'aiAnalysis', 'aiChat', 'settings'],
  // MUDIR — DIRECTOR bilan bir xil, o'z maktabidagi o'qituvchilarni boshqara oladi
  // (backend: CurrentUserService#assertCanManageTeacher DIRECTOR/MUDIR'ga ruxsat beradi).
  MUDIR: ['dashboard', 'teachers', 'attendance', 'cameras', 'cameraAnalysis', 'aiAnalysis', 'aiChat', 'settings'],
  TEACHER: ['dashboard', 'attendance', 'cameras', 'cameraAnalysis', 'aiAnalysis', 'aiChat', 'settings'],
};

const PATHS = {
  dashboard: '/', provinces: '/provinces', districts: '/districts', schools: '/schools',
  students: '/students', teachers: '/teachers', classes: '/classes', attendance: '/attendance', users: '/users',
  devices: '/devices', cameras: '/cameras', cameraAnalysis: '/camera-analysis',
  aiAnalysis: '/ai-analysis', aiChat: '/ai-chat', settings: '/settings',
};

const I = ({ d }) => (
  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

export default function Sidebar({ user }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const items = NAV[user?.role] || NAV.TEACHER;

  return (
    <aside className="w-[250px] flex flex-col bg-[#0a120e] border-r border-emerald-500/[0.08]">
      {/* Brand */}
      <div className="h-16 flex items-center gap-3 px-5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <svg className="w-[18px] h-[18px] text-white" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <div>
          <span className="text-[15px] font-bold text-white tracking-tight">{t('app.name')}</span>
          <span className="text-[15px] font-light text-emerald-400 ml-1">{t('app.tagline')}</span>
        </div>
      </div>

      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.15em] px-3 pt-2 pb-1.5">{t('sidebar.main')}</p>
        {items.map((key) => {
          const path = PATHS[key];
          const active = pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 relative ${
                active
                  ? 'bg-gradient-to-r from-emerald-500/15 to-teal-500/5 text-white shadow-sm shadow-emerald-500/5'
                  : 'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/[0.08]'
              }`}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-emerald-400 to-teal-400" />
              )}
              <span className={active ? 'text-emerald-400' : 'text-slate-600 group-hover:text-emerald-400 transition-colors'}>
                <I d={ICONS[key]} />
              </span>
              {t(`sidebar.${key}`)}
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 mb-3">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-500/[0.06] to-transparent border border-emerald-500/[0.08]">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/20 flex items-center justify-center text-[13px] font-bold text-emerald-300 shrink-0 ring-2 ring-emerald-500/10">
            {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-slate-200 truncate">{user?.fullName}</p>
            <p className="text-[10px] text-emerald-400/60 font-medium">{t(`roles.short.${user?.role}`, { defaultValue: user?.role })}</p>
          </div>
          <button
            onClick={() => api.logout()}
            className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
