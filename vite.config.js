import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function paginasPublicas() {
  const rutas = { '/privacidad': '/privacidad.html', '/condiciones': '/condiciones.html' };
  return {
    name: 'paginas-publicas',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const path = (req.url || '').split('?')[0].replace(/\/$/, '') || '/';
        if (rutas[path]) req.url = rutas[path];
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [paginasPublicas(), react()],
  resolve: {
    alias: { '@tienda': fileURLToPath(new URL('../vidriera-ui', import.meta.url)) },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8081' },
  },
});
