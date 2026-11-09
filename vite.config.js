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
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8081' },
  },
});
