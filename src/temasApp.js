export const CLAVE_TEMA = 'giro-app-theme';

export const TEMAS_APP = [
  {
    id: 'clasico',
    nombre: 'Clásico',
    detalle: 'Violeta GIRO',
    modo: 'claro',
    barra: '#6B1CD4',
    preview: { fondo: '#F6F5FA', tarjeta: '#FFFFFF', acento: '#7424E8', tinta: '#17141F', header: '#6B1CD4' },
  },
  {
    id: 'dia',
    nombre: 'Día',
    detalle: 'Azul y pizarra',
    modo: 'claro',
    barra: '#1D4ED8',
    preview: { fondo: '#F4F7FB', tarjeta: '#FFFFFF', acento: '#1D4ED8', tinta: '#0F172A', header: '#1E3A8A' },
  },
  {
    id: 'arena',
    nombre: 'Arena',
    detalle: 'Crema y terracota',
    modo: 'claro',
    barra: '#C2410C',
    preview: { fondo: '#FAF6F1', tarjeta: '#FFFCF8', acento: '#C2410C', tinta: '#432012', header: '#9A3412' },
  },
  {
    id: 'noche',
    nombre: 'Noche',
    detalle: 'Violeta profundo',
    modo: 'oscuro',
    barra: '#2E1064',
    preview: { fondo: '#100C18', tarjeta: '#1C162A', acento: '#C4B5FD', tinta: '#F5F1FF', header: '#5B21B6' },
  },
  {
    id: 'grafito',
    nombre: 'Grafito',
    detalle: 'Gris y cian',
    modo: 'oscuro',
    barra: '#0F172A',
    preview: { fondo: '#0E1116', tarjeta: '#181C24', acento: '#7DD3FC', tinta: '#EEF2F6', header: '#0E7490' },
  },
  {
    id: 'bosque',
    nombre: 'Bosque',
    detalle: 'Verde nocturno',
    modo: 'oscuro',
    barra: '#022C22',
    preview: { fondo: '#0B1210', tarjeta: '#14201B', acento: '#6EE7B7', tinta: '#E8F6EE', header: '#065F46' },
  },
];

export function temaValido(id) {
  return TEMAS_APP.some((tema) => tema.id === id);
}

export function aplicarTemaApp(id) {
  const tema = TEMAS_APP.find((item) => item.id === id) || TEMAS_APP[0];
  document.documentElement.dataset.giroTheme = tema.id;
  localStorage.setItem(CLAVE_TEMA, tema.id);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', tema.barra);
  return tema.id;
}

export function temaAppActual() {
  const marcado = document.documentElement.dataset.giroTheme;
  if (temaValido(marcado)) return marcado;
  const guardado = localStorage.getItem(CLAVE_TEMA);
  return temaValido(guardado) ? guardado : 'clasico';
}
