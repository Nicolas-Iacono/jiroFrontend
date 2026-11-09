import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { api } from '../api.js';
import { aplicarTemaApp, temaAppActual, TEMAS_APP } from '../temasApp.js';
import {
  Barras, Billete, Campana, Carrito, Casa, Chevron, Engranaje, Etiqueta, Paquete, Personas, Tienda, Whatsapp,
} from './Iconos.jsx';

const nav = [
  ['/', 'Inicio', Casa],
  ['/vender', 'Ventas', Carrito],
  ['/productos', 'Productos', Etiqueta],
  ['/clientes', 'Clientes', Personas],
  ['/pedidos', 'Pedidos', Paquete],
  ['/whatsapp', 'WhatsApp', Whatsapp],
  ['/caja', 'Caja', Billete],
  ['/estadisticas', 'Estadísticas', Barras],
  ['/vidriera', 'Mi vidriera', Tienda],
  ['/ajustes', 'Ajustes', Engranaje],
];

function claseForma(forma, grande) {
  if (forma === 'cuadrado') return 'rounded-none';
  if (forma === 'curvo') return grande ? 'rounded-2xl' : 'rounded-lg';
  return 'rounded-full';
}

function iniciales(nombre) {
  const partes = String(nombre || 'GI').trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] || 'G') + (partes[1]?.[0] || '')).toUpperCase();
}

export default function Marco({ usuario, onSalir, children }) {
  const [ancho, setAncho] = useState(false);
  const [menu, setMenu] = useState(false);
  const [aviso, setAviso] = useState('');
  const [logo, setLogo] = useState('');
  const [forma, setForma] = useState('circular');
  const [apariencia, setApariencia] = useState(false);
  const [tema, setTema] = useState(temaAppActual);
  const [comercio, setComercio] = useState(usuario.comercio);
  const entradas = usuario.rol === 'DUENO' || usuario.rol === 'ADMINISTRADOR' ? nav : nav.filter(([to]) => to !== '/ajustes');

  useEffect(() => {
    let vivo = true;
    const aplicar = (detail) => {
      if (detail && typeof detail === 'object') {
        setLogo(detail.url || '');
        if (detail.forma) setForma(detail.forma);
        return;
      }
      setLogo(detail || '');
    };
    api('/api/vidriera').then((vidriera) => {
      if (!vivo) return;
      setLogo(vidriera.logoUrl || '');
      setForma(vidriera.logoForma || 'circular');
    }).catch(() => {});
    const alCambiar = (event) => aplicar(event.detail);
    const alRenombrar = (event) => setComercio(event.detail || usuario.comercio);
    window.addEventListener('giro-logo', alCambiar);
    window.addEventListener('giro-comercio', alRenombrar);
    return () => {
      vivo = false;
      window.removeEventListener('giro-logo', alCambiar);
      window.removeEventListener('giro-comercio', alRenombrar);
    };
  }, [usuario.comercio]);

  return (
    <div className="flex h-screen flex-col overflow-hidden font-sans" style={{ background: 'var(--header)' }}>
        <header className="relative z-20 h-16 shrink-0 text-white" style={{ background: 'var(--header)' }}>
          <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-25 mix-blend-overlay" viewBox="0 0 1200 64" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 40C180 18 320 52 560 34s380-24 640 8v22H0Z" fill="white" />
          </svg>

          <div className="relative flex h-full items-center justify-between px-5">
            <div className="flex items-center">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-fill">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M8 14a5 5 0 0 1 8-4" />
                  <path d="M16 10a5 5 0 0 1-8 4" />
                  <path d="M15.2 7.2 16.8 10l-2.6.4" />
                  <path d="M8.8 16.8 7.2 14l2.6-.4" />
                </svg>
              </span>
              <span className="ml-2 text-xl font-extrabold tracking-tight">GIRO</span>
              <span className="mx-3 hidden h-5 border-l border-white/20 sm:block" />
              <span className="hidden text-sm font-normal tracking-wide text-white/90 sm:inline">Tu negocio en el bolsillo</span>
            </div>

            <div className="flex items-center gap-3">
              <button type="button" className="relative text-white/90" aria-label="Avisos" onClick={() => setAviso(aviso === 'avisos' ? '' : 'avisos')}>
                <Campana className="h-5 w-5" />
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-rose-500" />
              </button>
              <button type="button" className="grid h-6 w-6 place-items-center rounded-full border border-white/70 text-xs text-white/90" aria-label="Ayuda" onClick={() => setAviso(aviso === 'ayuda' ? '' : 'ayuda')}>?</button>
              <button type="button" className="flex max-w-[240px] shrink-0 items-center gap-2 rounded-full bg-white/15 py-1 pl-1 pr-3 backdrop-blur-sm" onClick={() => setMenu(!menu)}>
                {logo ? <img src={logo} alt="" className={`h-7 w-7 shrink-0 object-cover ${claseForma(forma)}`} /> : <span className={`grid h-7 w-7 shrink-0 place-items-center bg-white/25 text-xs font-bold text-white ${claseForma(forma)}`}>{iniciales(comercio)}</span>}
                <span className="hidden truncate text-sm font-semibold sm:inline">{comercio}</span>
                <Chevron abajo className="h-4 w-4 shrink-0 text-white/90" />
              </button>
            </div>
          </div>
          {aviso === 'avisos' && <p className="absolute right-5 top-full z-30 mt-2 rounded-xl bg-card px-3 py-2 text-xs font-medium text-ink shadow-lg">No hay avisos nuevos.</p>}
          {aviso === 'ayuda' && <p className="absolute right-40 top-full z-30 mt-2 max-w-xs rounded-xl bg-card px-3 py-2 text-xs leading-5 text-muted shadow-lg">Las ventas suman lo vendido, aunque esté fiado. Los ingresos son la plata que entró.</p>}
          {menu && (
            <div className="absolute right-5 top-full z-30 mt-2 w-44 rounded-xl bg-card p-2 text-ink shadow-lg">
              <p className="px-2 py-1 text-xs text-muted">{usuario.nombre}</p>
              <button type="button" className="w-full rounded-lg px-2 py-1.5 text-left text-sm font-semibold hover:bg-sunken" onClick={() => { setMenu(false); setApariencia(true); }}>Apariencia</button>
              <button type="button" className="w-full rounded-lg px-2 py-1.5 text-left text-sm font-semibold hover:bg-sunken" onClick={onSalir}>Salir</button>
            </div>
          )}
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden rounded-t-[28px] bg-app">
          <aside className={`hidden shrink-0 flex-col border-r border-line bg-card py-3 md:flex ${ancho ? 'w-[210px] px-3' : 'w-[68px] items-center'}`}>
            {ancho && (
              <div className="mb-3 flex items-center gap-2 px-1">
                {logo ? <img src={logo} alt="" className={`h-9 w-9 shrink-0 object-cover ${claseForma(forma, true)}`} /> : <span className={`grid h-9 w-9 shrink-0 place-items-center bg-accent-soft text-accent ${claseForma(forma, true)}`}><Tienda className="h-4 w-4" /></span>}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-ink">{comercio}</span>
                  <span className="block truncate text-xs text-faint">Tu comercio</span>
                </span>
              </div>
            )}
            <nav className="flex flex-1 flex-col gap-1.5">
              {entradas.map(([to, label, Icon]) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  title={label}
                  className={({ isActive }) => `flex h-11 items-center gap-3 rounded-2xl ${ancho ? 'px-3' : 'w-11 justify-center'} ${isActive ? 'bg-accent-soft text-accent' : 'text-faint hover:text-ink'}`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {ancho && <span className="text-sm font-semibold">{label}</span>}
                </NavLink>
              ))}
            </nav>
            <button type="button" className={`mt-2 text-muted hover:text-ink ${ancho ? 'flex h-9 items-center gap-2 rounded-xl border border-line px-3 text-xs' : 'grid h-9 w-9 place-items-center rounded-full hover:bg-sunken'}`} aria-label={ancho ? 'Colapsar menú' : 'Expandir menú'} onClick={() => setAncho(!ancho)}>
              <Chevron derecha={!ancho} izquierda={ancho} />
              {ancho && 'Colapsar menú'}
            </button>
          </aside>
          <main className="min-h-0 min-w-0 flex-1 overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="mx-auto w-full max-w-[1400px] px-5 py-5 pb-24 md:px-7 md:pb-6">{children}</div>
          </main>
        </div>
        <nav className="fixed inset-x-0 bottom-0 z-20 flex gap-1 overflow-x-auto border-t border-line bg-card px-2 py-1 md:hidden">
          {entradas.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'} title={label} className={({ isActive }) => `flex min-w-[64px] flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] ${isActive ? 'bg-accent-soft text-accent' : 'text-faint'}`}>
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        {apariencia && (
          <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/60 p-4" onClick={() => setApariencia(false)}>
            <div className="w-full max-w-lg rounded-3xl border border-line bg-card p-5 text-ink shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black">Apariencia del panel</h2>
                  <p className="mt-1 text-xs text-muted">Tres temas claros y tres oscuros. Cambian el menú, las tarjetas y los formularios. La vidriera conserva sus propios temas.</p>
                </div>
                <button type="button" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sunken text-muted hover:text-ink" aria-label="Cerrar" onClick={() => setApariencia(false)}>×</button>
              </div>
              {['claro', 'oscuro'].map((modo) => (
                <section key={modo} className="mt-4">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-faint">{modo === 'claro' ? 'Claros' : 'Oscuros'}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {TEMAS_APP.filter((item) => item.modo === modo).map((item) => {
                      const activo = tema === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`overflow-hidden rounded-2xl border text-left ${activo ? 'border-accent ring-2 ring-accent/30' : 'border-line hover:border-accent/40'}`}
                          onClick={() => setTema(aplicarTemaApp(item.id))}
                        >
                          <span className="block h-[72px] p-2" style={{ background: item.preview.fondo }}>
                            <span className="block h-2 w-3/5 rounded-full" style={{ background: item.preview.header }} />
                            <span className="mt-1.5 flex gap-1">
                              <span className="h-6 flex-1 rounded-md border" style={{ background: item.preview.tarjeta, borderColor: item.preview.tinta + '14' }} />
                              <span className="h-6 flex-1 rounded-md border" style={{ background: item.preview.tarjeta, borderColor: item.preview.tinta + '14' }} />
                            </span>
                            <span className="mt-1.5 block h-1.5 w-2/5 rounded-full" style={{ background: item.preview.acento }} />
                          </span>
                          <span className="flex items-center justify-between gap-1 bg-card px-2 py-1.5">
                            <span>
                              <span className="block text-xs font-bold text-ink">{item.nombre}</span>
                              <span className="block text-[10px] text-muted">{item.detalle}</span>
                            </span>
                            {activo && <span className="grid h-4 w-4 place-items-center rounded-full bg-fill text-[9px] text-onfill">✓</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}
