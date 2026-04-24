// src/services/api.js
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:8080'
  : 'https://api.maktab.ecos.uz';

export const api = {
  async login(username, password) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login xatosi');
    }
    return res.json();
  },

  async me() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  },

  async get(path) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error('API xatosi');
    return res.json();
  },

  async post(path, body) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('API xatosi');
    return res.json();
  },

  async put(path, body) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('API xatosi');
    return res.json();
  },

  async del(path) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('API xatosi');
    return res.json();
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },
};
