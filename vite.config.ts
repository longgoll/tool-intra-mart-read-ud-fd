import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3002,
    host: true,
    proxy: {
      // Proxy requests to IntraMart server to bypass CORS
      '/api/intramart': {
        target: 'http://158.101.91.74',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/intramart/, ''),
        // Handle cookies
        cookieDomainRewrite: 'localhost',
        secure: false,
      }
    }
  },
})
