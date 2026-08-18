import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Когда появится бэкенд — все запросы к /api/* будут проксироваться туда.
      // Пока бэкенда нет, эти запросы будут падать с ошибкой соединения — это ожидаемо.
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
