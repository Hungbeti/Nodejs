import axios from 'axios';

const api = axios.create({
  // Đổi localhost thành 127.0.0.1 để tránh lỗi trên Windows
  baseURL: 'http://127.0.0.1:5000/api', 
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;