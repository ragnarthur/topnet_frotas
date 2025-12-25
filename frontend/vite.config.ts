import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom'],
          // Routing
          'router': ['@tanstack/react-router'],
          // Data fetching
          'query': ['@tanstack/react-query', 'axios'],
          // UI components
          'radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-slot',
            '@radix-ui/react-separator',
          ],
          // Charts
          'charts': ['recharts'],
          // Animations
          'motion': ['framer-motion'],
          // Utilities
          'utils': ['clsx', 'tailwind-merge', 'class-variance-authority', 'sonner'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
