import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll('\\\\', '/')
          const marker = '/node_modules/'
          const markerIndex = normalizedId.lastIndexOf(marker)

          if (markerIndex === -1) {
            return
          }

          const packagePath = normalizedId.slice(markerIndex + marker.length)

          if (packagePath.startsWith('@tanstack/')) {
            return 'vendor-query'
          }

          if (
            packagePath.startsWith('react-router-dom/')
            || packagePath.startsWith('react-router/')
            || packagePath.startsWith('@remix-run/router/')
          ) {
            return 'vendor-router'
          }

          if (packagePath.startsWith('@radix-ui/') || packagePath.startsWith('sonner/')) {
            return 'vendor-ui'
          }

          if (packagePath.startsWith('@mdi/') || packagePath.startsWith('lucide-react/')) {
            return 'vendor-icons'
          }

          if (packagePath.startsWith('jspdf/')) {
            return 'vendor-pdf'
          }

          return 'vendor-core'
        }
      }
    }
  },
  server: {
    host: true,
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
})
