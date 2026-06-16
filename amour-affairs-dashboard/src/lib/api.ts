/**
 * ============================================================
 * AMOUR AFFAIRS — API Client
 * ============================================================
 * Centralized API client with JWT token management,
 * automatic refresh, and type-safe request/response handling.
 * ============================================================
 */

// ── Types ──

export interface AuthResponse {
  user: { id: number; email: string; name: string; role: string };
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface APIError {
  error: string;
}

// ── Configuration ──

// API base URL — change this per environment
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

// ── Token Management ──

const TOKEN_KEY = 'aa_access_token';
const REFRESH_KEY = 'aa_refresh_token';
const USER_KEY = 'aa_user';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function getStoredUser(): AuthResponse['user'] | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function storeAuth(data: AuthResponse): void {
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(REFRESH_KEY, data.refresh_token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return !!getStoredToken();
}


// ── Core Fetch Wrapper ──

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/auth.php?action=refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      clearAuth();
      return false;
    }

    const data: AuthResponse = await res.json();
    storeAuth(data);
    return true;
  } catch {
    clearAuth();
    return false;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown> | FormData;
  auth?: boolean; // default true
  raw?: boolean;  // return raw Response
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, auth = true, raw = false } = options;

  const headers: Record<string, string> = {};

  // Add auth header
  if (auth) {
    const token = getStoredToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // Build request init
  const init: RequestInit = { method, headers };

  if (body) {
    if (body instanceof FormData) {
      // Let browser set Content-Type with boundary for multipart
      init.body = body;
    } else {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
  }

  let res = await fetch(`${API_BASE}/${endpoint}`, init);

  // Handle 401 — try refresh
  if (res.status === 401 && auth && !isRefreshing) {
    isRefreshing = true;
    refreshPromise = refreshAccessToken();
    const refreshed = await refreshPromise;
    isRefreshing = false;
    refreshPromise = null;

    if (refreshed) {
      // Retry with new token
      headers['Authorization'] = `Bearer ${getStoredToken()}`;
      res = await fetch(`${API_BASE}/${endpoint}`, { ...init, headers });
    } else {
      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Session expired');
    }
  } else if (res.status === 401 && auth && isRefreshing) {
    // Wait for ongoing refresh
    const refreshed = await refreshPromise;
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getStoredToken()}`;
      res = await fetch(`${API_BASE}/${endpoint}`, { ...init, headers });
    } else {
      throw new Error('Session expired');
    }
  }

  if (raw) return res as unknown as T;

  const data = await res.json();

  if (!res.ok) {
    throw new Error((data as APIError).error || `API Error: ${res.status}`);
  }

  return data as T;
}


// ── Convenience Methods ──

export const api = {
  get: <T = unknown>(endpoint: string, auth = true) =>
    apiRequest<T>(endpoint, { method: 'GET', auth }),

  post: <T = unknown>(endpoint: string, body: Record<string, unknown> | FormData, auth = true) =>
    apiRequest<T>(endpoint, { method: 'POST', body, auth }),

  put: <T = unknown>(endpoint: string, body: Record<string, unknown>, auth = true) =>
    apiRequest<T>(endpoint, { method: 'PUT', body, auth }),

  delete: <T = unknown>(endpoint: string, auth = true) =>
    apiRequest<T>(endpoint, { method: 'DELETE', auth }),
};


// ── Auth API ──

export const authAPI = {
  login: (email: string, password: string) =>
    apiRequest<AuthResponse>('auth.php?action=login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    }),

  logout: () =>
    apiRequest('auth.php?action=logout', { method: 'POST' }),

  me: () =>
    apiRequest<{ user: AuthResponse['user'] }>('auth.php?action=me'),

  refresh: () => refreshAccessToken(),
};


// ── Asset URL Helper ──

// /uploads/... paths returned by the API live on the API host,
// not on the dashboard origin — resolve them against the API base.
const ASSET_BASE = API_BASE.replace(/\/api\/?$/, '');

export function assetUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `${ASSET_BASE}${path}`;
}


// ── Resource APIs ──

export const galleryAPI = {
  list: (params?: { category?: string; featured?: number; all?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.featured !== undefined) qs.set('featured', String(params.featured));
    if (params?.all) qs.set('all', '1');
    return api.get<{ images: unknown[]; total: number }>(`gallery.php?${qs}`);
  },
  get: (id: number) => api.get(`gallery.php?id=${id}`),
  upload: (formData: FormData) => api.post('gallery.php', formData),
  update: (id: number, data: Record<string, unknown>) => api.put(`gallery.php?id=${id}`, data),
  delete: (id: number) => api.delete(`gallery.php?id=${id}`),
  reorder: (orders: { id: number; sort_order: number }[]) =>
    api.post('gallery.php?action=reorder', { orders } as unknown as Record<string, unknown>),
};

export const albumsAPI = {
  list: (params?: { type?: string; all?: boolean; withPhotos?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.all) qs.set('all', '1');
    if (params?.withPhotos) qs.set('with_photos', '1');
    return api.get<{ albums: unknown[]; total: number }>(`albums.php?${qs}`);
  },
  // all=1 so the dashboard can open hidden albums and see hidden photos
  get: (id: number) => api.get(`albums.php?id=${id}&all=1`),
  create: (formData: FormData) => api.post('albums.php', formData),
  update: (id: number, data: Record<string, unknown>) => api.put(`albums.php?id=${id}`, data),
  delete: (id: number) => api.delete(`albums.php?id=${id}`),
  addPhotos: (id: number, formData: FormData) => api.post(`albums.php?action=photos&id=${id}`, formData),
  setCover: (id: number, formData: FormData) => api.post(`albums.php?action=cover&id=${id}`, formData),
  reorder: (orders: { id: number; sort_order: number }[]) =>
    api.post('albums.php?action=reorder', { orders } as unknown as Record<string, unknown>),
};

export const filmsAPI = {
  list: (params?: { featured?: number; all?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.featured !== undefined) qs.set('featured', String(params.featured));
    if (params?.all) qs.set('all', '1');
    return api.get<{ films: unknown[]; total: number }>(`films.php?${qs}`);
  },
  get: (id: number) => api.get(`films.php?id=${id}`),
  create: (data: Record<string, unknown>) => api.post('films.php', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`films.php?id=${id}`, data),
  delete: (id: number) => api.delete(`films.php?id=${id}`),
  reorder: (orders: { id: number; sort_order: number }[]) =>
    api.post('films.php?action=reorder', { orders } as unknown as Record<string, unknown>),
};

export const packagesAPI = {
  list: (params?: { category?: string; all?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.all) qs.set('all', '1');
    return api.get<{ packages: unknown[]; total: number }>(`packages.php?${qs}`);
  },
  get: (id: number) => api.get(`packages.php?id=${id}`),
  create: (data: Record<string, unknown>) => api.post('packages.php', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`packages.php?id=${id}`, data),
  delete: (id: number) => api.delete(`packages.php?id=${id}`),
};

export const teamAPI = {
  list: (all = false) => {
    const qs = all ? '?all=1' : '';
    return api.get<{ team: unknown[]; total: number }>(`team.php${qs}`);
  },
  get: (id: number) => api.get(`team.php?id=${id}`),
  create: (formData: FormData) => api.post('team.php', formData),
  update: (id: number, data: Record<string, unknown>) => api.put(`team.php?id=${id}`, data),
  delete: (id: number) => api.delete(`team.php?id=${id}`),
};

export const testimonialsAPI = {
  list: (params?: { featured?: number; all?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.featured !== undefined) qs.set('featured', String(params.featured));
    if (params?.all) qs.set('all', '1');
    return api.get<{ testimonials: unknown[]; total: number }>(`testimonials.php?${qs}`);
  },
  get: (id: number) => api.get(`testimonials.php?id=${id}`),
  create: (formData: FormData) => api.post('testimonials.php', formData),
  update: (id: number, data: Record<string, unknown>) => api.put(`testimonials.php?id=${id}`, data),
  setPhoto: (id: number, formData: FormData) => api.post(`testimonials.php?action=photo&id=${id}`, formData),
  delete: (id: number) => api.delete(`testimonials.php?id=${id}`),
};

export const settingsAPI = {
  getAll: () => api.get<{ settings: Record<string, string> }>('settings.php', false),
  getGroup: (group: string) => api.get<{ settings: Record<string, string> }>(`settings.php?group=${group}`, false),
  update: (settings: Record<string, string>) => api.put('settings.php', { settings }),
  // Upload an image for settings-backed content (e.g. the About-page founder
  // photo). Returns the stored path to persist as a `site_*` setting value.
  uploadImage: (formData: FormData) =>
    api.post<{ file_path: string; thumbnail_path: string | null }>('settings.php?action=upload', formData),
};

export const bookingsAPI = {
  list: (status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return api.get<{ bookings: unknown[]; total: number }>(`bookings.php${qs}`);
  },
  get: (id: number) => api.get(`bookings.php?id=${id}`),
  create: (data: Record<string, unknown>) => api.post('bookings.php', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`bookings.php?id=${id}`, data),
  delete: (id: number) => api.delete(`bookings.php?id=${id}`),
  stats: () => api.get<{ stats: Record<string, unknown> }>('bookings.php?action=stats'),
};

export const leadsAPI = {
  list: (params?: { stage?: string; source?: string }) => {
    const qs = new URLSearchParams();
    if (params?.stage) qs.set('stage', params.stage);
    if (params?.source) qs.set('source', params.source);
    return api.get<{ leads: unknown[]; total: number }>(`leads.php?${qs}`);
  },
  get: (id: number) => api.get(`leads.php?id=${id}`),
  create: (data: Record<string, unknown>) => api.post('leads.php', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`leads.php?id=${id}`, data),
  delete: (id: number) => api.delete(`leads.php?id=${id}`),
};

export const clientsAPI = {
  list: (params?: { type?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.search) qs.set('search', params.search);
    return api.get<{ clients: unknown[]; total: number }>(`clients.php?${qs}`);
  },
  get: (id: number) => api.get(`clients.php?id=${id}`),
  create: (data: Record<string, unknown>) => api.post('clients.php', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`clients.php?id=${id}`, data),
  delete: (id: number) => api.delete(`clients.php?id=${id}`),
};

export const paymentsAPI = {
  invoices: {
    list: (status?: string) => {
      const qs = status ? `&status=${status}` : '';
      return api.get<{ invoices: unknown[]; total: number }>(`payments.php?type=invoices${qs}`);
    },
    get: (id: number) => api.get(`payments.php?type=invoices&id=${id}`),
    create: (data: Record<string, unknown>) => api.post('payments.php?type=invoices', data),
    update: (id: number, data: Record<string, unknown>) => api.put(`payments.php?type=invoices&id=${id}`, data),
    delete: (id: number) => api.delete(`payments.php?type=invoices&id=${id}`),
  },
  transactions: {
    list: () => api.get<{ transactions: unknown[]; total: number }>('payments.php?type=transactions'),
    create: (data: Record<string, unknown>) => api.post('payments.php?type=transactions', data),
    delete: (id: number) => api.delete(`payments.php?type=transactions&id=${id}`),
  },
  stats: () => api.get<{ stats: Record<string, unknown> }>('payments.php?type=stats'),
};
