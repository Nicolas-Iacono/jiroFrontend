import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import RegistrarVenta from './RegistrarVenta.jsx';
import { EgresosDelMes, Grafico } from './Inicio.jsx';
import { Billete, Bolsa, Calendario, Check, Chevron, Filtro, Lupa } from './Iconos.jsx';

const medios = {
  EFECTIVO: { label: 'Efectivo en caja', punto: 'bg-emerald-500', barra: 'bg-emerald-500' },
  TRANSFERENCIA: { label: 'Transferencia', punto: 'bg-sky-500', barra: 'bg-sky-500' },
  TARJETA: { label: 'Tarjeta', punto: 'bg-violet-500', barra: 'bg-violet-500' },
  CUENTA_CORRIENTE: { label: 'Cuenta corriente', punto: 'bg-amber-400', barra: 'bg-amber-400' },
};

function pesos(valor) {
  const texto = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(Number(valor) || 0));
  return `$ ${texto}`;
}

function iniciales(nombre) {
  const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] || 'S') + (partes[1]?.[0] || '')).toUpperCase();
}

function mismoMes(iso) {
  const fecha = new Date(iso);
  const hoy = new Date();
  return fecha.getFullYear() === hoy.getFullYear() && fecha.getMonth() === hoy.getMonth();
}

function cuando(iso) {
  const fecha = new Date(iso);
  const hoy = new Date();
  const hora = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const dia = fecha.toDateString() === hoy.toDateString()
    ? 'Hoy'
    : fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  return `${dia}, ${hora}`;
}

function detalle(venta) {
  const items = venta.items || [];
  if (!items.length) return { titulo: 'Sin productos', sub: '' };
  return {
    titulo: items.map((item) => `${Number(item.cantidad)}x ${item.producto}`).join(' + '),
    sub: items.map((item) => item.variante).filter(Boolean).join(' / '),
  };
}

function porSemana(serie) {
  const mapa = new Map();
  (serie || []).forEach((item) => {
    const fecha = new Date(`${item.dia}T00:00:00`);
    const lunes = new Date(fecha);
    lunes.setDate(fecha.getDate() - ((fecha.getDay() + 6) % 7));
    const clave = `${lunes.getFullYear()}-${String(lunes.getMonth() + 1).padStart(2, '0')}-${String(lunes.getDate()).padStart(2, '0')}`;
    mapa.set(clave, (mapa.get(clave) || 0) + (Number(item.total) || 0));
  });
  return [...mapa.entries()].map(([dia, total]) => ({ dia, total }));
}

function cobrada(venta) {
  return venta.estado === 'CONFIRMADA' && venta.medio !== 'CUENTA_CORRIENTE';
}

function pendiente(venta) {
  return venta.estado === 'CONFIRMADA' && venta.medio === 'CUENTA_CORRIENTE';
}

export default function Ventas() {
  const [tablero, setTablero] = useState(null);
  const [ventas, setVentas] = useState([]);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const [buscar, setBuscar] = useState('');
  const [tab, setTab] = useState('todas');
  const [medioFiltro, setMedioFiltro] = useState('');
  const [filtros, setFiltros] = useState(false);
  const [vista, setVista] = useState('dia');
  const [abierta, setAbierta] = useState(null);
  const [registrar, setRegistrar] = useState(false);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    let vivo = true;
    Promise.all([api('/api/dashboard'), api('/api/ventas')])
      .then(([resumen, lista]) => {
        if (!vivo) return;
        setTablero(resumen);
        setVentas(lista);
      })
      .catch((err) => vivo && setError(err.message));
    return () => { vivo = false; };
  }, [version]);

  const delMes = useMemo(
    () => ventas.filter((venta) => venta.estado === 'CONFIRMADA' && mismoMes(venta.fecha)),
    [ventas],
  );

  const facturado = Number(tablero?.ventasDelMes) || 0;
  const cobrado = Number(tablero?.cobrosDelMes) || 0;
  const enEspera = Math.max(0, facturado - cobrado);
  const porcentaje = facturado > 0 ? Math.round((cobrado / facturado) * 100) : 0;
  const ticket = delMes.length ? delMes.reduce((sum, venta) => sum + Number(venta.total), 0) / delMes.length : 0;
  const mes = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(new Date());

  const metodos = useMemo(() => {
    const totales = new Map();
    delMes.forEach((venta) => {
      const medio = venta.medio || 'EFECTIVO';
      totales.set(medio, (totales.get(medio) || 0) + Number(venta.total));
    });
    const suma = [...totales.values()].reduce((a, b) => a + b, 0);
    return [...totales.entries()]
      .map(([medio, monto]) => ({ medio, monto, parte: suma > 0 ? Math.round((monto / suma) * 100) : 0 }))
      .sort((a, b) => b.monto - a.monto);
  }, [delMes]);

  const serie = vista === 'semana' ? porSemana(tablero?.evolucion) : tablero?.evolucion;

  const filas = ventas.filter((venta) => {
    if (!mismoMes(venta.fecha)) return false;
    if (tab === 'cobradas' && !cobrada(venta)) return false;
    if (tab === 'pendientes' && !pendiente(venta)) return false;
    if (medioFiltro && venta.medio !== medioFiltro) return false;
    const texto = `${venta.id} ${venta.cliente || ''} ${(venta.items || []).map((item) => item.producto).join(' ')}`.toLowerCase();
    return texto.includes(buscar.trim().toLowerCase());
  });

  const conteos = {
    todas: ventas.filter((venta) => mismoMes(venta.fecha)).length,
    cobradas: ventas.filter((venta) => mismoMes(venta.fecha) && cobrada(venta)).length,
    pendientes: ventas.filter((venta) => mismoMes(venta.fecha) && pendiente(venta)).length,
  };

  async function anular(id) {
    setAviso('');
    try {
      await api(`/api/ventas/${id}/anular`, { method: 'POST' });
      setAbierta(null);
      setVersion((valor) => valor + 1);
    } catch (err) {
      setAviso(err.message);
    }
  }

  if (error) return <p className="text-sm font-semibold text-rose-600">{error}</p>;
  if (!tablero) return <p className="text-sm text-muted">Cargando ventas…</p>;

  return (
    <div className="flex flex-col items-stretch gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-black text-ink">
            Ventas
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">En tiempo real</span>
          </h1>
          <p className="mt-0.5 text-xs text-muted">Gestioná tus transacciones, cobranzas y rendimiento comercial</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-ink" title="Los números corresponden al mes en curso">
            <Calendario className="h-3.5 w-3.5" />
            Este mes
          </span>
          <div className="relative">
            <button type="button" className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-ink" onClick={() => setFiltros(!filtros)}>
              <Filtro className="h-3.5 w-3.5" />
              {medioFiltro ? medios[medioFiltro].label : 'Filtrar'}
            </button>
            {filtros && (
              <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl bg-card p-1 text-sm shadow-lg">
                <button type="button" className="block w-full rounded-lg px-3 py-1.5 text-left hover:bg-sunken" onClick={() => { setMedioFiltro(''); setFiltros(false); }}>Todos los medios</button>
                {Object.entries(medios).map(([clave, medio]) => (
                  <button type="button" key={clave} className="block w-full rounded-lg px-3 py-1.5 text-left hover:bg-sunken" onClick={() => { setMedioFiltro(clave); setFiltros(false); }}>{medio.label}</button>
                ))}
              </div>
            )}
          </div>
          <button type="button" className="rounded-xl bg-fill px-4 py-2 text-sm font-bold text-onfill shadow-md hover:bg-fill-hover" onClick={() => setRegistrar(true)}>
            + Registrar venta
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <Tarjeta titulo="Total facturado" icono={<span className="text-sm font-black">$</span>} tono="bg-accent-soft text-accent">
          <p className="text-xl font-extrabold text-ink">{pesos(facturado)}</p>
          <p className="text-xs font-bold text-rose-600">Salió {pesos(tablero.gastosDelMes)}</p>
        </Tarjeta>
        <Tarjeta titulo="Ticket promedio" icono={<Billete className="h-4 w-4" />} tono="bg-sky-50 text-sky-600">
          <p className="text-xl font-extrabold text-ink">{pesos(ticket)}</p>
          <p className="text-xs font-medium text-faint">{delMes.length ? 'Sobre las ventas confirmadas' : 'Sin ventas este mes'}</p>
        </Tarjeta>
        <Tarjeta titulo="Total transacciones" icono={<Bolsa className="h-4 w-4" />} tono="bg-amber-50 text-amber-600">
          <p className="text-xl font-extrabold text-ink">{delMes.length} ventas</p>
          <p className="text-xs font-medium text-faint">Mes en curso</p>
        </Tarjeta>
        <Tarjeta titulo="Cobrado vs pendiente" icono={<Check className="h-4 w-4" />} tono="bg-emerald-50 text-emerald-600">
          <p className="text-xl font-extrabold text-emerald-700">{pesos(cobrado)} <span className="text-sm font-semibold text-faint">/ {pesos(enEspera)}</span></p>
          <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-sunken">
            {facturado > 0 && (
              <>
                <span className="bg-emerald-500" style={{ width: `${porcentaje}%` }} />
                <span className="bg-amber-200" style={{ width: `${100 - porcentaje}%` }} />
              </>
            )}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-faint">
            <span>{facturado > 0 ? `${porcentaje}% cobrado` : 'Sin movimientos'}</span>
            <span>{facturado > 0 ? `${100 - porcentaje}% en espera` : ''}</span>
          </div>
        </Tarjeta>
      </div>

      <EgresosDelMes items={tablero.egresosDelMes} total={tablero.gastosDelMes} />

      <div className="grid grid-cols-1 items-start gap-3.5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-line bg-card p-4 shadow-sm">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
              <span className="h-2 w-2 rounded-full bg-fill" />
              Evolución de ventas <span className="font-medium capitalize text-faint">{mes}</span>
            </h2>
            <div className="flex rounded-full bg-sunken p-0.5 text-xs font-semibold">
              {[['dia', 'Día'], ['semana', 'Semana'], ['mes', 'Mes']].map(([clave, label]) => (
                <button key={clave} type="button" className={`rounded-full px-3 py-1 ${vista === clave ? 'bg-card text-accent shadow-sm' : 'text-muted'}`} onClick={() => setVista(clave)}>{label}</button>
              ))}
            </div>
          </div>
          {vista === 'mes' ? (
            <div className="flex h-[180px] flex-col items-center justify-center text-center">
              <p className="text-sm text-muted">El total del mes es {pesos(facturado)}.</p>
              <p className="mt-1 text-xs text-faint">El detalle diario cubre los últimos 14 días.</p>
            </div>
          ) : (
            <Grafico serie={serie} alRegistrar={() => setRegistrar(true)} />
          )}
        </section>

        <section className="rounded-2xl border border-line bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">Métodos de cobro</h2>
            <button type="button" className="text-xs font-semibold text-accent" onClick={() => { setTab('todas'); setMedioFiltro(''); }}>Ver detalle</button>
          </div>
          {metodos.length === 0 && <p className="rounded-xl bg-sunken px-3 py-6 text-center text-sm text-muted">Todavía no hay cobros para desglosar.</p>}
          <div className="flex flex-col gap-3">
            {metodos.map((item) => {
              const medio = medios[item.medio] || { label: item.medio, punto: 'bg-faint', barra: 'bg-faint' };
              return (
                <div key={item.medio}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                    <span className="flex min-w-0 items-center gap-2 text-muted"><span className={`h-2 w-2 shrink-0 rounded-full ${medio.punto}`} /> <span className="truncate">{medio.label}</span></span>
                    <span className="shrink-0 font-bold text-ink">{pesos(item.monto)} <span className="font-medium text-faint">{item.parte}%</span></span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-sunken">
                    <div className={`h-full rounded-full ${medio.barra}`} style={{ width: `${item.parte}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-line bg-card p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm text-faint">
            <Lupa className="h-4 w-4" />
            <input className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-faint" placeholder="Buscar por comprobante o cliente..." value={buscar} onChange={(event) => setBuscar(event.target.value)} />
          </label>
          <div className="flex rounded-full bg-sunken p-0.5 text-xs font-semibold">
            {[['todas', `Todas (${conteos.todas})`], ['cobradas', `Cobradas (${conteos.cobradas})`], ['pendientes', `Pendientes (${conteos.pendientes})`]].map(([clave, label]) => (
              <button key={clave} type="button" className={`rounded-full px-3 py-1.5 ${tab === clave ? 'bg-fill text-onfill' : 'text-muted'}`} onClick={() => setTab(clave)}>{label}</button>
            ))}
          </div>
        </div>
        {aviso && <p className="mb-2 text-sm font-semibold text-rose-600">{aviso}</p>}
        {filas.length === 0 ? (
          <div className="rounded-xl bg-sunken px-3 py-6 text-center">
            <p className="text-sm text-muted">No hay ventas para este filtro.</p>
            <button type="button" className="mt-1 text-sm font-semibold text-accent" onClick={() => setRegistrar(true)}>Registrar la primera venta</button>
          </div>
        ) : (
          <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="border-b border-line text-[11px] font-bold tracking-wide text-faint">
                  {['Comprobante', 'Cliente', 'Detalle productos', 'Método de pago', 'Monto', 'Estado', 'Acción'].map((columna) => (
                    <th key={columna} className="pb-2 pr-3 font-bold">{columna.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((venta) => {
                  const info = detalle(venta);
                  const medio = medios[venta.medio] || { label: venta.medio || 'Sin medio', punto: 'bg-faint' };
                  const espera = pendiente(venta);
                  const anulada = venta.estado === 'ANULADA';
                  return (
                    <tr key={venta.id} className="border-b border-line align-middle">
                      <td className="py-3 pr-3">
                        <p className="text-sm font-bold text-accent">#V-{venta.id}</p>
                        <p className="text-[11px] text-faint">{cuando(venta.fecha)}</p>
                      </td>
                      <td className="py-3 pr-3">
                        <span className="flex items-center gap-2">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-100 text-[11px] font-bold text-accent">{iniciales(venta.cliente)}</span>
                          <span className="text-sm font-semibold text-ink">{venta.cliente || 'Compra en local'}</span>
                        </span>
                      </td>
                      <td className="max-w-[240px] py-3 pr-3">
                        <p className="truncate text-sm text-ink">{info.titulo}</p>
                        {info.sub && <p className="truncate text-[11px] text-faint">{info.sub}</p>}
                      </td>
                      <td className="py-3 pr-3 text-sm text-muted">
                        <span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${medio.punto}`} />{medio.label}</span>
                      </td>
                      <td className="py-3 pr-3 text-sm font-extrabold text-ink">{pesos(venta.total)}</td>
                      <td className="py-3 pr-3">
                        <span className={`text-xs font-semibold ${anulada ? 'text-rose-600' : espera ? 'text-amber-600' : 'text-emerald-700'}`}>
                          ● {anulada ? 'Anulada' : espera ? 'En espera' : 'Cobrado'}
                        </span>
                      </td>
                      <td className="py-3">
                        <button type="button" className="text-faint" aria-label="Ver venta" onClick={() => setAbierta(abierta === venta.id ? null : venta.id)}>
                          <Chevron abajo className={`h-4 w-4 ${abierta === venta.id ? 'rotate-180' : ''}`} />
                        </button>
                        {abierta === venta.id && venta.estado === 'CONFIRMADA' && (
                          <button type="button" className="ml-2 text-xs font-semibold text-rose-600" onClick={() => anular(venta.id)}>Anular</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {registrar && <RegistrarVenta onClose={() => setRegistrar(false)} onLista={() => setVersion((valor) => valor + 1)} />}
    </div>
  );
}

function Tarjeta({ titulo, icono, tono, children }) {
  return (
    <article className="rounded-2xl border border-line bg-card px-4 py-3 shadow-sm">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted">{titulo}</p>
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${tono}`}>{icono}</span>
      </div>
      {children}
    </article>
  );
}
