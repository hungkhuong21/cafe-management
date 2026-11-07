import axios from "axios";

// Tự động nhận diện host (nếu điện thoại vào qua IP 192.168.x.x thì API tự động kết nối theo IP đó)
const rawUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const currentHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
const resolvedBaseUrl = rawUrl
  .replace("localhost", currentHost)
  .replace("127.0.0.1", currentHost);

const api = axios.create({
  baseURL: resolvedBaseUrl,
});

// Tự động gắn token nếu có
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
