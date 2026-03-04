const API_BASE = import.meta.env.VITE_API_BASE;


class ApiClient {
  constructor() {
    this.token = localStorage.getItem('token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }

  getToken() {
    return this.token || localStorage.getItem('token');
  }

  async request(method, path, body = null) {
    console.log("888888888888888888888888888")
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body && method !== 'GET') opts.body = JSON.stringify(body);
    console.log('00000', `${API_BASE}${path}`)
    const res = await fetch(`${API_BASE}${path}`, opts);
    
    if (res.status === 204) return null;
    
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401) {
        this.setToken(null);
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      throw new Error(data.error || `Request failed (${res.status})`);
    }
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

    const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  }
}

const api = new ApiClient();
export default api;
