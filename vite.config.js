import { defineConfig, loadEnv } from "vite";
import process from "node:process";
import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBaseURL = "http://192.168.125.203:5000";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5000,
      open: true,
      proxy: {
        // ...existing code...
        "/auth": {
          target: apiBaseURL,
          changeOrigin: true,
          secure: false,
        },
        "/user": {
          target: apiBaseURL,
          changeOrigin: true,
          secure: false,
        },
        "/tracker": {
          target: apiBaseURL,
          changeOrigin: true,
          secure: false,
        },
        "/dropdown": {
          target: apiBaseURL,
          changeOrigin: true,
          secure: false,
        },
        "/project": {
          target: apiBaseURL,
          changeOrigin: true,
          secure: false,
        },
        "/task": {
          target: apiBaseURL,
          changeOrigin: true,
          secure: false,
        },
        "/dashboard": {
          target: apiBaseURL,
          changeOrigin: true,
          secure: false,
        },
        "/permission": {
          target: apiBaseURL,
          changeOrigin: true,
          secure: false,
        },
        "/password_reset": {
          target: apiBaseURL,
          changeOrigin: true,
          secure: false,
        },
        "/user_monthly_tracker": {
          target: apiBaseURL,
          changeOrigin: true,
          secure: false,
        },
        "/qc": {
          target: apiBaseURL,
          changeOrigin: true,
          secure: false,
        },
      },
      historyApiFallback: true,
    },
  };
});