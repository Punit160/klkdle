import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API_TARGET || 'http://localhost:5001',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.VITE_DEV_API_TARGET || 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true,
        logger: {
          warn(message, options) {
            if (options?.deprecation) return
            console.warn(message)
          },
        },
      },
    },
  },
  resolve: {
    alias: {
      '@/components': '/src/components',
      '@/utils': '/src/utils',
      '@/hooks': '/src/hooks',
    },
  },
})
