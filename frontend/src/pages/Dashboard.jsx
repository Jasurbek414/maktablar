// src/pages/Dashboard.jsx
import React from 'react';

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-primary">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Example stat cards */}
        <div className="bg-glass backdrop-blur-xs p-4 rounded-lg shadow-md">
          <p className="text-sm text-gray-300">Total Students</p>
          <p className="text-3xl font-bold text-white">0</p>
        </div>
        <div className="bg-glass backdrop-blur-xs p-4 rounded-lg shadow-md">
          <p className="text-sm text-gray-300">Today Attendance</p>
          <p className="text-3xl font-bold text-white">0</p>
        </div>
        <div className="bg-glass backdrop-blur-xs p-4 rounded-lg shadow-md">
          <p className="text-sm text-gray-300">Pending Alerts</p>
          <p className="text-3xl font-bold text-white">0</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
