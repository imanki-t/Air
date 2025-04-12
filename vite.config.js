import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
  },
  define: {
    'import.meta.env.VITE_BACKEND_URL': JSON.stringify(process.env.VITE_BACKEND_URL || '')
  }
})
