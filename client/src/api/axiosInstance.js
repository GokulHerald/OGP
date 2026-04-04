import axios from 'axios';

/**
 * Express mounts routes under `/api/v1`. If VITE_API_URL is set to only the
 * origin (e.g. `http://localhost:5001`), requests would hit `/auth/login` and
 * return 404 — they must go to `/api/v1/auth/login`.
 */
function resolveApiBaseURL() {
  const fallback = 'http://localhost:5001/api/v1';
  const raw = import.meta.env.VITE_API_URL?.trim();
  if (!raw) return fallback;
  try {
    const u = new URL(raw);
    const path = u.pathname.replace(/\/+$/, '');
    if (path === '' || path === '/') {
      return `${u.origin}/api/v1`;
    }
    return `${u.origin}${path}`;
  } catch {
    return fallback;
  }
}

const api = axios.create({
  baseURL: resolveApiBaseURL(),
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ogp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const reqUrl = String(error.config?.url || '');
    const isLoginRequest = reqUrl.includes('/auth/login');

    // Failed login returns 401 — do not redirect (reload wipes UI / toasts).
    if (status === 401 && !isLoginRequest) {
      localStorage.removeItem('ogp_token');
      localStorage.removeItem('ogp_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
