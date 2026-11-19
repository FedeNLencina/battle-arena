import { defineConfig } from 'vite';

// Vercel sirve el sitio desde la raíz, así que no hace falta cambiar `base`.
export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
});
