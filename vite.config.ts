import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@contracts': path.resolve(__dirname, './contracts'),
      '@db': path.resolve(__dirname, './db'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
})
