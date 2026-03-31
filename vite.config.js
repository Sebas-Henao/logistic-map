import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/logistic-map/',
  server: {
    proxy: {
      '/nominatim': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/nominatim/, '')
      }
    }
  }
});
