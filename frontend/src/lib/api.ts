import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  signup: (email: string, password: string, name: string) =>
    api.post('/auth/signup', { email, password, name }),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
};

export const usersApi = {
  me: () => api.get('/users/me'),
  search: (q: string) => api.get('/users/search', { params: { q } }),
  list: () => api.get('/users'),
};

export const convApi = {
  list: () => api.get('/conversations'),
  get: (id: string) => api.get(`/conversations/${id}`),
  direct: (userId: string) => api.post('/conversations/direct', { userId }),
  group: (name: string, memberIds: string[]) => api.post('/conversations/group', { name, memberIds }),
  messages: (id: string, params?: any) => api.get(`/conversations/${id}/messages`, { params }),
  read: (id: string, upToSeq: number) => api.post(`/conversations/${id}/read`, { upToSeq }),
};

export const mediaApi = {
  upload: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/media', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};