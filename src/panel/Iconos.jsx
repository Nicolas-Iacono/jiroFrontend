export function Icono({ children, className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

export const Casa = (p) => <Icono {...p}><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" /></Icono>;
export const Bolsa = (p) => <Icono {...p}><path d="M6 8h12l-1 12H7L6 8z" /><path d="M9 8V7a3 3 0 0 1 6 0v1" /></Icono>;
export const Etiqueta = (p) => <Icono {...p}><path d="M20 13.5 12.5 21a2 2 0 0 1-2.8 0L3 14.3V4h10.3z" /><circle cx="7.5" cy="7.5" r="1" fill="currentColor" stroke="none" /></Icono>;
export const Personas = (p) => <Icono {...p}><path d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20" /><circle cx="10" cy="8" r="3" /><path d="M20 20v-1.5A3.5 3.5 0 0 0 17 15" /><circle cx="17" cy="8.5" r="2.4" /></Icono>;
export const Paquete = (p) => <Icono {...p}><path d="M3 8l9-4 9 4-9 4-9-4z" /><path d="M3 8v8l9 4 9-4V8" /><path d="M12 12v8" /></Icono>;
export const Billete = (p) => <Icono {...p}><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.2" /><path d="M6 9.5v.01M18 14.5v.01" /></Icono>;
export const Barras = (p) => <Icono {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></Icono>;
export const Tienda = (p) => <Icono {...p}><path d="M4 10 6 4h12l2 6" /><path d="M4 10h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" /><path d="M9 20v-5h6v5" /></Icono>;
export const Engranaje = (p) => <Icono {...p}><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M5.8 5.8l1.6 1.6M16.6 16.6l1.6 1.6M18.2 5.8l-1.6 1.6M7.4 16.6l-1.6 1.6" /></Icono>;
export const Whatsapp = (p) => <Icono {...p}><path d="M5 19.2 6.2 16A8 8 0 1 1 8.2 18z" /><path d="M9 10.2c.2 1.6 1.6 3 3.2 3.4" /></Icono>;
export const Campana = (p) => <Icono {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5L6 16z" /><path d="M10 19a2 2 0 0 0 4 0" /></Icono>;
export const Calendario = (p) => <Icono {...p}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></Icono>;
export const Carrito = (p) => <Icono {...p}><circle cx="9" cy="19" r="1.2" fill="currentColor" stroke="none" /><circle cx="17" cy="19" r="1.2" fill="currentColor" stroke="none" /><path d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8H17a1 1 0 0 0 1-.8L20 8H7" /></Icono>;
export const Monedas = (p) => <Icono {...p}><ellipse cx="12" cy="7" rx="7" ry="3" /><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7" /><path d="M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" /></Icono>;
export const Caja = (p) => <Icono {...p}><path d="M3 8h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><path d="M3 8l2.5-4h13L21 8" /><path d="M12 8v12" /></Icono>;
export const Alerta = (p) => <Icono {...p}><path d="M12 4 3 19h18L12 4z" /><path d="M12 10v4M12 16.5v.01" /></Icono>;
export const Copiar = (p) => <Icono {...p}><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h8" /></Icono>;
export const Compartir = (p) => <Icono {...p}><circle cx="6" cy="12" r="2" /><circle cx="17" cy="7" r="2" /><circle cx="17" cy="17" r="2" /><path d="M8 11.2 15 8.2M8 12.8l7 3" /></Icono>;
export const Chevron = ({ abajo, derecha, izquierda, className = 'w-4 h-4' }) => (
  <Icono className={className}>
    {abajo && <path d="M6 9l6 6 6-6" />}
    {derecha && <path d="M9 6l6 6-6 6" />}
    {izquierda && <path d="M15 6l-6 6 6 6" />}
  </Icono>
);
export const Lupa = (p) => <Icono {...p}><circle cx="11" cy="11" r="6" /><path d="M20 20l-3.5-3.5" /></Icono>;
export const Filtro = (p) => <Icono {...p}><path d="M4 5h16l-6 7v5l-4 2v-7z" /></Icono>;
export const Check = (p) => <Icono {...p}><circle cx="12" cy="12" r="8" /><path d="M8.5 12.5 11 15l4.5-5" /></Icono>;
export const Wifi = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M5 10.5a10 10 0 0 1 14 0" />
    <path d="M8 13.5a6 6 0 0 1 8 0" />
    <path d="M12 17.5h.01" />
  </svg>
);
export const Bateria = () => (
  <span className="inline-flex items-center gap-1">
    <span className="relative h-3 w-6 rounded-[3px] border border-white/80">
      <span className="absolute inset-[1.5px] rounded-[2px] bg-card" />
      <span className="absolute -right-[3px] top-1/2 h-1.5 w-[2px] -translate-y-1/2 rounded-r-sm bg-card/80" />
    </span>
  </span>
);
