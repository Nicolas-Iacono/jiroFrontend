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
    alias: { '@tienda': fileURLToPath(new URL('./src/tienda', import.meta.url)) },
    dedupe: ['react', 'react-dom'],
  },
  build: {
    rollupOptions: {
      input: {
        panel: fileURLToPath(new URL('./index.html', import.meta.url)),
        vistaTienda: fileURLToPath(new URL('./vista-tienda.html', import.meta.url)),
      },
    },
  },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8081' },
  },
});
