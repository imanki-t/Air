import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist', // Specifies the output directory for the build
  },
  define: {
    'import.meta.env.VITE_BACKEND_URL': JSON.stringify(process.env.VITE_BACKEND_URL || ''),
  },
  optimizeDeps: {
    include: ['qrcode.react'], // Ensures qrcode.react is included in the dependency optimization
  },
});
