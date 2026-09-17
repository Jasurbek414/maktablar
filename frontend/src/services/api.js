// src/services/api.js
// Same domain – nginx proxies /api/* to backend
const API_BASE = '';

// Joriy til — backend bilan kelishilgan uchta qiymatdan biri: "uz" | "ru" | "en".
// Har bir so'rovga Accept-Language header sifatida qo'shiladi, shunda backend
// javob xabarlarini shu tilga lokalizatsiya qiladi.
let currentLang = localStorage.getItem('lang') || 'uz';

function langHeaders(extra) {
  return { 'Accept-Language': currentLang, ...extra };
}

// Backend xato javoblari doim {"error": "..."} shaklida keladi (I18nService orqali
// lokalizatsiya qilingan) — buni ko'rsatish o'rniga hammaga bir xil "API xatosi"
// deyish foydalanuvchiga hech narsa aytmaydi (masalan AI chat uchun "API kalit
// sozlanmagan" kabi aniq sabablar yashiringan bo'lardi).
async function extractErrorMessage(res, fallback) {
  try {
    const data = await res.clone().json();
    // "error" — /api/** (I18nService), "detail" — /api/v1/** (DRF-uslubdagi kontrakt)
    if (data && typeof data.error === 'string') return data.error;
    if (data && typeof data.detail === 'string') return data.detail;
  } catch {}
  return fallback;
}

// 401 — token yo'q/yaroqsiz, doim sessiya tugagani. 403 esa ikki xil holatni
// anglatishi mumkin: (a) JWT yaroqsiz/muddati o'tgan bo'lsa Spring Security uni
// anonim so'rov deb hisoblab BO'SH tanali 403 qaytaradi (haqiqatda sessiya
// tugagani), (b) foydalanuvchi haqiqiy autentifikatsiyalangan, lekin o'z
// ko'lamidan tashqari amalga urinmoqda — bunda backend {"error": "..."} tanasi
// bilan javob beradi va bu holatda logout qilish NOTO'G'RI (masalan DIRECTOR
// boshqa maktabga kirishga urinsa). Shuning uchun 403'da tana bo'sh/JSON emasligi
// tekshiriladi.
async function checkAuthFailure(res) {
  if (res.status === 401) {
    api.logout();
    return true;
  }
  if (res.status === 403) {
    let hasErrorBody = false;
    try {
      const data = await res.clone().json();
      hasErrorBody = !!(data && typeof data.error === 'string');
    } catch {}
    if (!hasErrorBody) {
      api.logout();
      return true;
    }
  }
  return false;
}

export const api = {
  setLanguage(lang) {
    currentLang = ['uz', 'ru', 'en'].includes(lang) ? lang : 'uz';
  },
  getLanguage() {
    return currentLang;
  },

  async login(username, password) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: langHeaders({ 'Content-Type': 'application/json' }),
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
      headers: langHeaders({ Authorization: `Bearer ${token}` }),
    });
    if (!res.ok) return null;
    return res.json();
  },

  async get(path) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}${path}`, {
      headers: langHeaders({
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }),
    });
    if (!res.ok) {
      if (await checkAuthFailure(res)) throw new Error('Sessiya muddati tugagan, qayta kiring');
      throw new Error(await extractErrorMessage(res, 'API xatosi'));
    }
    return res.json();
  },

  async post(path, body) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: langHeaders({
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      if (await checkAuthFailure(res)) throw new Error('Sessiya muddati tugagan, qayta kiring');
      throw new Error(await extractErrorMessage(res, 'API xatosi'));
    }
    return res.json();
  },

  async patch(path, body) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PATCH',
      headers: langHeaders({
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      if (await checkAuthFailure(res)) throw new Error('Sessiya muddati tugagan, qayta kiring');
      throw new Error(await extractErrorMessage(res, 'API xatosi'));
    }
    return res.json();
  },

  async put(path, body) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: langHeaders({
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      if (await checkAuthFailure(res)) throw new Error('Sessiya muddati tugagan, qayta kiring');
      throw new Error(await extractErrorMessage(res, 'API xatosi'));
    }
    return res.json();
  },

  async del(path) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'DELETE',
      headers: langHeaders({ Authorization: `Bearer ${token}` }),
    });
    if (!res.ok) {
      if (await checkAuthFailure(res)) throw new Error('Sessiya muddati tugagan, qayta kiring');
      throw new Error(await extractErrorMessage(res, 'API xatosi'));
    }
    const text = await res.text();
    return text ? JSON.parse(text) : { success: true };
  },

  // Binary javob (masalan kamera snapshot'i) — <img src> Authorization header yubora olmagani
  // uchun rasm shu yerda token bilan olinib, chaqiruvchi URL.createObjectURL bilan ko'rsatadi.
  async getBlob(path) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}${path}`, {
      headers: langHeaders({ Authorization: `Bearer ${token}` }),
    });
    if (!res.ok) {
      if (await checkAuthFailure(res)) throw new Error('Sessiya muddati tugagan, qayta kiring');
      throw new Error(await extractErrorMessage(res, 'API xatosi'));
    }
    return res.blob();
  },

  async upload(file) {
    const token = localStorage.getItem('token');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API_BASE}/api/files/upload`, {
      method: 'POST',
      headers: langHeaders({ Authorization: `Bearer ${token}` }),
      body: fd,
    });
    if (!res.ok) {
      if (await checkAuthFailure(res)) throw new Error('Sessiya muddati tugagan, qayta kiring');
      throw new Error(await extractErrorMessage(res, 'Yuklash xatosi'));
    }
    return res.json();
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },
};
