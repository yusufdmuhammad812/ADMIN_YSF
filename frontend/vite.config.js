import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Membuka akses jaringan lokal agar bisa dibuka dari HP
    port: 5173,
  },
  define: {
    'process.env': {},
  },
})
