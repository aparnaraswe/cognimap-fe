const API_BASE = import.meta.env.VITE_API_BASE;

// ── Session lifetime (30 minutes — refresh resets the timer) ──
const SESSION_TTL_MS = 30 * 60 * 1000;
const TOKEN_KEY  = 'token';
const ISSUED_KEY = 'token_issued_at';

function isSessionExpired() {
  const issued = parseInt(localStorage.getItem(ISSUED_KEY) || '0', 10);
  if (!issued) return true;
  return (Date.now() - issued) > SESSION_TTL_MS;
}

class ApiClient {
  constructor() {
    // Only restore token if it's still inside the session window
    const tok = localStorage.getItem(TOKEN_KEY);
    if (tok && !isSessionExpired()) {
      this.token = tok;
    } else {
      this.token = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(ISSUED_KEY);
    }
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(ISSUED_KEY, String(Date.now()));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(ISSUED_KEY);
    }
  }

  /** Touch the session — extends the 30-min window. Called on any successful API call. */
  touchSession() {
    if (this.token) {
      localStorage.setItem(ISSUED_KEY, String(Date.now()));
    }
  }

  getToken() {
    if (isSessionExpired()) {
      this.token = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(ISSUED_KEY);
      return null;
    }
    return this.token || localStorage.getItem(TOKEN_KEY);
  }

  async request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // ── Send active source as X-Source-Id header (for super admin scoping) ──
    const activeSource = localStorage.getItem('cognimap_active_source');
    if (activeSource) headers['X-Source-Id'] = activeSource;

    const opts = { method, headers };
    if (body && method !== 'GET') opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${path}`, opts);

    if (res.status === 204) {
      this.touchSession();
      return null;
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401) {
        // Clear bad token but DO NOT force-redirect — let React Router handle it
        // via ProtectedRoute. Hard redirect mid-render breaks the SPA.
        this.setToken(null);
      }
      throw new Error(data.error || `Request failed (${res.status})`);
    }

    // Activity → extend the session window
    this.touchSession();
    return data;
  }

  get(path)        { return this.request('GET', path); }
  post(path, body) { return this.request('POST', path, body); }
  put(path, body)  { return this.request('PUT', path, body); }
  patch(path, body){ return this.request('PATCH', path, body); }
  del(path)        { return this.request('DELETE', path); }

  async upload(path, file, extraFields = {}) {
    const form = new FormData();
    form.append('file', file);
    Object.entries(extraFields).forEach(([k,v]) => form.append(k, String(v)));

    const headers = {};
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const activeSource = localStorage.getItem('cognimap_active_source');
    if (activeSource) headers['X-Source-Id'] = activeSource;

    const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: form });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) this.setToken(null);
      throw new Error(data.error || 'Upload failed');
    }
    this.touchSession();
    return data;
  }
}

const api = new ApiClient();
export default api;
