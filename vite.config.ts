import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: process.env.ELECTRON_BUILD ? './' : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  build: {
    sourcemap: true,
    target: 'esnext',
    minify: process.env.ELECTRON_BUILD ? false : 'esbuild',
    cssCodeSplit: false,
  },
});