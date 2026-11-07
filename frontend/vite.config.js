import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // Cho phép điện thoại cùng mạng Wi-Fi truy cập qua IP máy tính
  },
});
