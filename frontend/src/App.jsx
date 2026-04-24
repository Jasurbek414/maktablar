// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-gray-100 font-sans">
        <nav className="bg-gray-800 p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-primary">Maktab Platform</h1>
          <div>
            <Link to="/" className="mx-2 hover:text-primary transition-colors">Dashboard</Link>
            {/* future links */}
          </div>
        </nav>
        <main className="p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
