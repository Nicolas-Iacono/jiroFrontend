import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, sesion, token, urlApi, urlFoto, urlVidriera } from '../api.js';
import { Alerta, Barras, Caja, Calendario, Carrito, Chevron, Compartir, Copiar, Monedas, Paquete, Tienda } from './Iconos.jsx';

const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function pesos(valor) {
  const texto = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(Number(valor) || 0));
  return `$ ${texto}`;
}

function fechaCorta(iso) {
  const fecha = new Date(`${iso}T00:00:00`);
  return `${fecha.getDate()} ${meses[fecha.getMonth()]}`;
}

function fechaLarga(iso) {
  const fecha = new Date(`${iso}T00:00:00`);
  return `${fecha.getDate()} de ${meses[fecha.getMonth()]}`;
}

function curva(puntos) {
  if (!puntos.length) return '';
  let d = `M ${puntos[0].x} ${puntos[0].y}`;
  for (let i = 0; i < puntos.length - 1; i += 1) {
    const p0 = puntos[i - 1] || puntos[i];
    const p1 = puntos[i];
    const p2 = puntos[i + 1];
    const p3 = puntos[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function tope(valor) {
  if (valor <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(valor));
  return Math.ceil(valor / exp) * exp;
}

export function Grafico({ serie, alRegistrar }) {
  const id = useId().replace(/:/g, '');
  const puntos = (serie || []).map((item) => ({ dia: item.dia, total: Number(item.total) || 0 }));
  const picoValor = Math.max(0, ...puntos.map((p) => p.total));
  const maximo = picoValor <= 0 ? 1200 : tope(picoValor);
  const ancho = 1100;
  const alto = 150;
  const izq = 78;
  const der = 12;
  const arriba = 18;
  const abajo = 28;
  const x = (indice) => izq + (indice / Math.max(puntos.length - 1, 1)) * (ancho - izq - der);
  const y = (valor) => arriba + (1 - valor / maximo) * (alto - arriba - abajo);
  const marca = puntos.map((p, indice) => ({ x: x(indice), y: y(p.total), ...p }));
  const trazo = curva(marca);
  const base = y(0);
  const area = marca.length ? `${trazo} L ${marca.at(-1).x} ${base} L ${marca[0].x} ${base} Z` : '';
  const pico = marca.reduce((mejor, punto) => (punto.total >= mejor.total ? punto : mejor), marca[0] || { total: 0, x: 0, y: 0, dia: '' });
  const pasos = [0, 1, 2, 3, 4, 5, 6];
  const etiquetasX = marca.filter((_, indice) => indice % 2 === 0);

  if (picoValor <= 0) {
    return (
      <div className="flex h-[180px] flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-muted">Todavía no hay ventas en este período.</p>
        {alRegistrar ? (
          <button type="button" className="text-sm font-semibold text-accent" onClick={alRegistrar}>Registrar la primera venta</button>
        ) : (
          <Link to="/vender" className="text-sm font-semibold text-accent">Registrar la primera venta</Link>
        )}
      </div>
    );
  }

  return (
    <div className="relative h-[220px] w-full">
      <svg viewBox={`0 0 ${ancho} ${alto}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-c)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--accent-c)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {pasos.map((paso) => {
          const valor = (maximo / 6) * (6 - paso);
          const yy = y(valor);
          return (
            <g key={paso}>
              <line x1={izq} x2={ancho - der} y1={yy} y2={yy} stroke="var(--line-c)" />
            </g>
          );
        })}
        {area && <path d={area} fill={`url(#${id})`} />}
        {trazo && <path d={trazo} fill="none" stroke="var(--accent-c)" strokeWidth="2.4" />}
        {marca.map((punto) => <circle key={punto.dia} cx={punto.x} cy={punto.y} r="3" fill="var(--card-c)" stroke="var(--accent-c)" strokeWidth="1.6" />)}
      </svg>
      {pasos.map((paso) => {
        const valor = (maximo / 6) * (6 - paso);
        const yy = y(valor);
        return (
          <span key={paso} className="absolute -translate-x-full -translate-y-1/2 text-[10px] leading-none text-faint" style={{ left: `${(izq / ancho) * 100}%`, top: `${(yy / alto) * 100}%` }}>{pesos(valor)}</span>
        );
      })}
      {etiquetasX.map((punto) => (
        <span key={punto.dia} className="absolute -translate-x-1/2 text-[10px] leading-none text-faint" style={{ left: `${(punto.x / ancho) * 100}%`, top: `${((alto - 8) / alto) * 100}%` }}>{fechaCorta(punto.dia)}</span>
      ))}
      {pico?.total > 0 && (
        <div
          className="absolute -translate-x-1/2 -translate-y-full rounded-lg bg-inverse px-3 py-1 text-xs font-semibold text-oninverse shadow-md"
          style={{ left: `${(pico.x / ancho) * 100}%`, top: `${(pico.y / alto) * 100}%` }}
        >
          {pesos(pico.total)} / {fechaLarga(pico.dia)}
        </div>
      )}
    </div>
  );
}

function variacion(serie) {
  const valores = (serie || []).map((item) => Number(item.total) || 0);
  const hoy = valores.at(-1) || 0;
  const ayer = valores.at(-2) || 0;
  if (ayer <= 0) return null;
  return Math.round(((hoy - ayer) / ayer) * 100);
}

const prendas = ['M 4 16 V9l4-3 4 3v7', 'M5 8h10v9H5z M7 8c0-2 2-3 3-3s3 1 3 3', 'M4 11c2-3 10-3 12 0 M6 11v3h8v-3', 'M7 8h6v8H7z M8 8V6h4v2'];

function FotoProducto({ producto }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const directa = urlFoto(producto, producto.imagenes?.[0]);
    if (directa) {
      setUrl(directa);
      return undefined;
    }
    const imagen = producto.imagenes?.[0];
    if (!imagen) return undefined;
    let vivo = true;
    let objeto = '';
    fetch(urlApi(`/api/productos/${producto.id}/imagenes/${imagen}`), { headers: token() ? { Authorization: `Bearer ${token()}` } : {} })
      .then((respuesta) => (respuesta.ok ? respuesta.blob() : null))
      .then((blob) => {
        if (!vivo || !blob) return;
        objeto = URL.createObjectURL(blob);
        setUrl(objeto);
      })
      .catch(() => {});
    return () => {
      vivo = false;
      if (objeto) URL.revokeObjectURL(objeto);
    };
  }, [producto]);
  if (!url) return null;
  return <img src={url} alt="" className="h-full w-full object-cover" />;
}

function PedidoFila({ pedido, claro }) {
  const nombre = pedido.items?.[0]?.producto || 'Pedido';
  const extra = (pedido.items?.length || 0) > 1 ? ` y ${pedido.items.length - 1} más` : '';
  const listo = pedido.estado === 'ENTREGADO';
  const cancelado = pedido.estado === 'CANCELADO';
  return (
    <div className="flex items-center gap-3 border-t border-line py-3 first:border-t-0">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${claro ? 'bg-sunken text-ink' : 'bg-inverse text-oninverse'}`}>
        <svg viewBox="0 0 16 16" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.4"><path d={prendas[pedido.id % prendas.length]} /></svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{nombre}{extra}</span>
        <span className="block text-[11px] text-faint">Pedido {pedido.id}</span>
      </span>
      <span className="text-sm font-bold text-ink">{pesos(pedido.total)}</span>
      <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${listo ? 'bg-emerald-50 text-emerald-600' : cancelado ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-700'}`}>
        {listo ? '✓ Listo' : cancelado ? 'Cancelado' : '⏱ Preparando'}
      </span>
    </div>
  );
}

export default function Inicio() {
  const usuario = sesion();
  const [tablero, setTablero] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [vidriera, setVidriera] = useState(null);
  const [productos, setProductos] = useState([]);
  const [error, setError] = useState('');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      api('/api/dashboard'),
      api('/api/pedidos').catch(() => []),
      api('/api/vidriera').catch(() => null),
      api('/api/productos').catch(() => []),
    ]).then(([resumen, lista, vitrina, catalogo]) => {
      if (!vivo) return;
      setTablero(resumen);
      setPedidos(lista);
      setVidriera(vitrina);
      setProductos(catalogo.filter((item) => item.publicado));
    }).catch((err) => vivo && setError(err.message));
    return () => { vivo = false; };
  }, []);

  if (error) return <p className="text-sm font-semibold text-rose-600">{error}</p>;
  if (!tablero) return <p className="text-sm text-muted">Cargando el resumen…</p>;

  const slug = vidriera?.slug || usuario?.slug || '';
  const enlace = urlVidriera(slug);
  const publicados = productos.slice(0, 4);
  const delta = variacion(tablero.evolucion);
  const titulo = vidriera?.titulo || usuario?.comercio;

  async function copiar() {
    await navigator.clipboard.writeText(enlace);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1600);
  }

  async function compartir() {
    if (navigator.share) {
      try {
        await navigator.share({ title: titulo, url: enlace });
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return;
      }
    }
    await copiar();
  }

  return (
    <div className="flex flex-col items-stretch gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">¡Hola, {usuario?.comercio}! <span aria-hidden="true">👋</span></h1>
          <p className="mt-0.5 text-sm text-muted">Acá tenés el resumen de tu negocio.</p>
        </div>
        <button type="button" className="flex items-center gap-2 rounded-xl border border-line bg-card px-3.5 py-1.5 text-xs font-semibold text-ink" title="El resumen corresponde al mes en curso">
          <Calendario className="h-3.5 w-3.5" />
          Este mes
          <Chevron abajo className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
        <article className="flex h-[96px] items-center gap-3 rounded-2xl border border-line bg-card px-4 shadow-sm">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><Carrito className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">Ventas de hoy</p>
            <p className="text-2xl font-bold tracking-tight text-ink">{pesos(tablero.ventasDelDia)}</p>
            {delta != null && <p className={`flex items-center gap-1 text-[11px] font-bold ${delta >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{delta >= 0 ? '↗' : '↘'} {delta >= 0 ? '+' : ''}{delta}% vs. ayer</p>}
          </div>
        </article>
        <article className="flex h-[96px] items-center gap-3 rounded-2xl border border-line bg-card px-4 shadow-sm">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><Monedas className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">Ingresos del mes</p>
            <p className="text-2xl font-bold tracking-tight text-ink">{pesos(tablero.cobrosDelMes)}</p>
            <p className="text-[11px] font-bold text-rose-600">Salió {pesos(tablero.gastosDelMes)}</p>
          </div>
        </article>
        <article className="flex h-[96px] items-center gap-3 rounded-2xl border border-line bg-card px-4 shadow-sm">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600"><Caja className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">Pedidos pendientes</p>
            <p className="text-2xl font-bold tracking-tight text-ink">{tablero.pedidosPendientes}</p>
            <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">Por preparar</span>
          </div>
        </article>
        <article className="flex h-[96px] items-center gap-3 rounded-2xl border border-line bg-card px-4 shadow-sm">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-500"><Alerta className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">Stock bajo</p>
            <p className="text-2xl font-bold tracking-tight text-ink">{tablero.stockBajo.length}</p>
            <p className="flex items-center gap-1.5 text-[11px] text-muted"><span className="h-2 w-2 rounded-full bg-rose-500" /> Productos por reponer</p>
          </div>
        </article>
      </div>

      <EgresosDelMes items={tablero.egresosDelMes} total={tablero.gastosDelMes} />

      <section className="rounded-2xl border border-line bg-card p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-accent"><Barras className="h-4 w-4" /></span>
          <div>
            <h2 className="text-base font-bold text-ink">Ventas</h2>
            <p className="text-xs text-faint">Evolución de ventas</p>
          </div>
        </div>
        <Grafico serie={tablero.evolucion} />
      </section>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-card p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-ink"><Paquete className="h-4 w-4 text-accent" /> Pedidos recientes</h2>
            <Link to="/pedidos" className="text-xs font-semibold text-accent">Ver todos →</Link>
          </div>
          {pedidos.length === 0 && (
            <div className="rounded-xl bg-sunken px-3 py-4 text-center">
              <p className="text-sm text-muted">No hay pedidos recientes.</p>
              <Link to="/vender" className="mt-1 inline-block text-sm font-semibold text-accent">Registrar una venta</Link>
            </div>
          )}
          {pedidos.slice(0, 3).map((pedido, indice) => <PedidoFila key={pedido.id} pedido={pedido} claro={indice === 1} />)}
        </section>

        <section className="rounded-2xl border border-line bg-card p-4 shadow-sm">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-ink"><Tienda className="h-4 w-4 text-accent" /> Mi vidriera</h2>
            <a href={enlace} target="_blank" rel="noreferrer" className="text-xs font-semibold text-accent">Ver mi vidriera →</a>
          </div>
          <p className="mb-2 text-xs text-faint">Así se ve tu tienda pública</p>
          <div className="overflow-hidden rounded-xl bg-[#1D0C38] text-white">
            <div className="border-b border-white/10 px-3 py-1.5 text-[10px] text-white/50">{enlace.replace(/^https?:\/\//, '')}</div>
            <div className="px-3 py-3">
              <p className="text-sm font-bold">{titulo}</p>
              <p className="text-[11px] text-white/70">{vidriera?.descripcion || 'Publicá productos para completar la vidriera.'}</p>
              {publicados.length === 0 ? (
                <p className="mt-3 rounded-lg bg-white/10 px-3 py-3 text-center text-[11px] text-white/70">Todavía no hay productos publicados.</p>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {publicados.map((producto) => (
                    <div key={producto.id} className="overflow-hidden rounded-lg bg-white/10">
                      <div className="grid h-14 place-items-center bg-white/5">
                        <FotoProducto producto={producto} />
                        {!producto.imagenes?.length && <span className="px-1 text-center text-[10px] font-semibold text-white/80">{producto.nombre}</span>}
                      </div>
                      <p className="truncate px-1.5 py-1 text-[10px] text-white/80">{pesos(producto.precioVigente ?? producto.precio)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-sunken/70 px-3 py-1.5 text-xs text-muted">
            <span className="truncate">{enlace.replace(/^https?:\/\//, '')}</span>
            <button type="button" className="text-muted" aria-label="Copiar enlace" onClick={copiar}><Copiar className="h-4 w-4" /></button>
          </div>
          {copiado && <p className="mt-1 text-[11px] font-semibold text-emerald-600">Enlace copiado</p>}
          <button type="button" className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-fill py-2 text-sm font-medium text-onfill shadow-md hover:bg-fill-hover" onClick={compartir}>
            <Compartir className="h-4 w-4" /> Compartir vidriera
          </button>
        </section>
      </div>
    </div>
  );
}

export function EgresosDelMes({ items, total, detalle = 'Salidas de efectivo del mes en curso.' }) {
  const lista = Array.isArray(items) ? items : [];
  return (
    <section className="rounded-2xl border border-line bg-card p-4 shadow-sm">
      <h2 className="text-base font-bold text-ink">Egresos de dinero</h2>
      <p className="text-xs text-faint">{detalle}</p>
      {lista.length === 0 ? (
        <p className="mt-3 rounded-xl bg-sunken px-3 py-4 text-center text-sm text-muted">No hay egresos este mes.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {lista.map((item, indice) => (
            <li key={`${item.fecha}-${indice}`} className="flex items-start justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{item.concepto}</p>
                <p className="text-[11px] text-faint">{cuando(item.fecha)}</p>
              </div>
              <span className="shrink-0 text-sm font-black text-rose-600">− {pesos(item.monto)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 border-t border-line pt-3 text-sm text-muted">
        Salió <span className="font-black text-rose-600">{pesos(total)}</span>
      </p>
    </section>
  );
}

function cuando(iso) {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
