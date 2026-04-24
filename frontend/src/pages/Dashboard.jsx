// src/pages/Dashboard.jsx
import React from 'react';

const StatCard = ({ title, value, icon, color }) => (
  <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 hover:shadow-lg hover:shadow-${color}-500/10 group`}>
    <div className="flex items-center justify-between mb-4">
      <span className="text-3xl">{icon}</span>
      <span className={`text-xs font-semibold px-3 py-1 rounded-full bg-${color}-500/20 text-${color}-400`}>
        Bugun
      </span>
    </div>
    <p className="text-3xl font-bold text-white mb-1">{value}</p>
    <p className="text-sm text-gray-400">{title}</p>
  </div>
);

const Dashboard = ({ user }) => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          Xush kelibsiz, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">{user?.fullName}</span>
        </h1>
        <p className="text-gray-400 mt-2">
          {user?.role === 'SUPERADMIN' && 'Barcha viloyatlar bo\'yicha umumiy statistika'}
          {user?.role === 'ADMIN' && 'Viloyat bo\'yicha statistika'}
          {user?.role === 'DIRECTOR' && 'Maktab bo\'yicha statistika'}
          {user?.role === 'MUDIR' && 'Bo\'lim statistikasi'}
          {user?.role === 'TEACHER' && 'Sinf davomati'}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Jami o'quvchilar" value="0" icon="👨‍🎓" color="blue" />
        <StatCard title="Bugun kelgan" value="0" icon="✅" color="green" />
        <StatCard title="Bugun kelmagan" value="0" icon="❌" color="red" />
        <StatCard title="Foiz (%)" value="0%" icon="📈" color="cyan" />
      </div>

      {/* SUPERADMIN uchun qo'shimcha */}
      {user?.role === 'SUPERADMIN' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Viloyatlar" value="14" icon="🏛️" color="purple" />
          <StatCard title="Maktablar" value="0" icon="🏫" color="orange" />
          <StatCard title="Qurilmalar" value="0" icon="📱" color="pink" />
        </div>
      )}

      {/* Oxirgi voqealar */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Oxirgi voqealar</h2>
        <div className="text-gray-400 text-sm text-center py-8">
          Hozircha voqealar yo'q. Face ID qurilma ulangandan so'ng bu yerda real-time ma'lumotlar ko'rinadi.
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
