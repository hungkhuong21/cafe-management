import axios from "axios";

// Kết nối trực tiếp tới Render API
const rawUrl =
  import.meta.env.VITE_API_URL ||
  "https://cafe-management-api-un5y.onrender.com/api";

const api = axios.create({
  baseURL: rawUrl,
});

// Tự động gắn token nếu có
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
