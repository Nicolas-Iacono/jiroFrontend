import { useEffect, useMemo, useState } from 'react';
import { api, pedir } from '../api.js';
import { Billete, Caja as IconoCaja, Check, Lupa, Monedas } from './Iconos.jsx';
import MovimientoCaja from './MovimientoCaja.jsx';
import HistorialCierres from './HistorialCierres.jsx';

const medios = {
  EFECTIVO: { label: 'Efectivo', clase: 'bg-emerald-50 text-emerald-700' },
  TRANSFERENCIA: { label: 'Transferencia', clase: 'bg-sky-50 text-sky-700' },
  TARJETA: { label: 'Tarjeta', clase: 'bg-accent-soft text-accent' },
};

function pesos(valor) {
  const texto = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(Number(valor) || 0));
  return `$ ${texto}`;
}

function textoPrenda(item) {
  const cantidad = Number(item.cantidad);
  const texto = Number.isFinite(cantidad)
    ? (Number.isInteger(cantidad) ? String(cantidad) : cantidad.toLocaleString('es-AR', { maximumFractionDigits: 3 }))
    : '1';
  const nombre = `${item.nombre || item.producto || ''}${item.variante ? ` · ${item.variante}` : ''}`;
  return `${texto} × ${nombre}`;
}

function hora(iso) {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return `${fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs`;
}

function cuando(iso) {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  const dia = fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  return `${dia} ${hora(iso)}`;
}

export default function Caja() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const [filtro, setFiltro] = useState('todos');
  const [buscar, setBuscar] = useState('');
  const [panel, setPanel] = useState('');
  const [ventaId, setVentaId] = useState(null);

  useEffect(() => {
    let vivo = true;
    api('/api/caja')
      .then((caja) => vivo && setData(caja))
      .catch((err) => vivo && setError(err.message));
    return () => { vivo = false; };
  }, [version]);

  const movimientos = data?.movimientos || [];
  const ventas = movimientos.filter((m) => m.venta && m.tipo === 'INGRESO');
  const ingresos = movimientos.filter((m) => m.tipo === 'INGRESO' && !m.venta);
  const egresos = movimientos.filter((m) => m.tipo === 'EGRESO');

  const visibles = useMemo(() => {
    const base = filtro === 'ventas' ? ventas : filtro === 'ingresos' ? ingresos : filtro === 'egresos' ? egresos : movimientos;
    const q = buscar.trim().toLowerCase();
    const lista = [...base].reverse();
    if (!q) return lista;
    return lista.filter((m) => `${m.concepto || ''} ${m.cliente || ''} ${(m.productos || []).map((item) => `${item.nombre || ''} ${item.variante || ''}`).join(' ')} ${medios[m.medio]?.label || ''}`.toLowerCase().includes(q));
  }, [movimientos, ventas, ingresos, egresos, filtro, buscar]);

  if (error) return <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>;
  if (!data) return <p className="text-sm text-muted">Cargando caja…</p>;
  if (panel === 'historial') {
    return (
      <div className="font-sans antialiased text-ink">
        <HistorialCierres onVolver={() => setPanel('')} />
      </div>
    );
  }

  const transacciones = Number(data.nEfectivo || 0) + Number(data.nTransferencia || 0) + Number(data.nTarjeta || 0) + Number(data.nFiado || 0);
  const facturado = Number(data.facturado || 0);
  const parte = facturado > 0 ? Math.round((Number(data.electronicos || 0) / facturado) * 1000) / 10 : null;

  return (
    <div className="font-sans antialiased text-ink">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-ink">Control de Caja & Turno</h1>
          {data.abierta ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">● Caja abierta</span>
              {data.cajero && <span className="rounded-full bg-sunken px-2.5 py-0.5 text-xs font-medium text-muted">Cajero: {data.cajero}</span>}
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">Apertura: {cuando(data.abiertaEn)}</span>
            </div>
          ) : (
            <span className="mt-2 inline-flex rounded-full bg-sunken px-2.5 py-0.5 text-xs font-bold text-muted">Caja cerrada</span>
          )}
          <p className="mt-1 text-xs text-muted">La caja abre todos los días a las 00:00 y cierra a las 23:59. Las ventas, los ingresos y los egresos quedan en el día en que se hacen.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="flex items-center gap-1.5 rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-ink hover:bg-sunken" onClick={() => setPanel('historial')}>Historial de cierres</button>
          {data.abierta && (
            <button type="button" className="flex items-center gap-1.5 rounded-xl border border-accent/30 bg-accent-soft px-3.5 py-2 text-xs font-bold text-accent hover:bg-accent-soft" onClick={() => setPanel('movimiento')}>+ Ingreso / Egreso</button>
          )}
        </div>
      </div>

      {!data.abierta && (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Todavía no hay una caja abierta para hoy. Se abre sola a las 00:00.</p>
      )}

      {data.abierta && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3.5 xl:grid-cols-4">
            <Kpi titulo="Total facturado turno" valor={pesos(data.facturado)} detalle="Desde la apertura" extra={transacciones === 1 ? '1 transacción' : `${transacciones} transacciones`} icono={<IconoCaja className="h-4 w-4" />} tono="bg-accent-soft text-accent" />
            <Kpi titulo="Efectivo teórico en cajón" valor={pesos(data.esperado)} detalle={`Fondo ${pesos(data.montoInicial)} + cobros en efectivo`} valorClase="text-emerald-600" icono={<Billete className="h-4 w-4" />} tono="bg-emerald-50 text-emerald-600" />
            <Kpi titulo="Cobros electrónicos" valor={pesos(data.electronicos)} detalle="Transferencia + tarjeta" extra={parte == null ? '' : `${parte}% del total`} icono={<Monedas className="h-4 w-4" />} tono="bg-sky-50 text-sky-600" />
            <Kpi titulo="A cuenta corriente" valor={pesos(data.fiado)} detalle={Number(data.nFiado) === 1 ? '1 venta a plazo' : `${Number(data.nFiado || 0)} ventas a plazo`} valorClase="text-amber-600" icono={<span className="text-sm font-black">CC</span>} tono="bg-amber-50 text-amber-600" />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <section className="rounded-2xl border border-line/80 bg-card p-5 xl:col-span-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-bold text-ink">Movimientos del turno activo</h2>
                <div className="flex flex-wrap gap-1.5">
                  <Filtro activo={filtro === 'todos'} onClick={() => setFiltro('todos')}>Todos ({movimientos.length})</Filtro>
                  <Filtro activo={filtro === 'ventas'} onClick={() => setFiltro('ventas')}>Ventas ({ventas.length})</Filtro>
                  <Filtro activo={filtro === 'ingresos'} onClick={() => setFiltro('ingresos')}>Ingresos ({ingresos.length})</Filtro>
                  <Filtro activo={filtro === 'egresos'} onClick={() => setFiltro('egresos')}>Egresos ({egresos.length})</Filtro>
                </div>
              </div>
              <label className="mt-3 flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm text-faint">
                <Lupa className="h-4 w-4" />
                <input className="w-full bg-transparent text-ink outline-none placeholder:text-faint" placeholder="Buscar por ticket o concepto" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
              </label>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-wide text-faint">
                      <th className="pb-2 pr-3 font-semibold">Hora</th>
                      <th className="pb-2 pr-3 font-semibold">Tipo y concepto</th>
                      <th className="pb-2 pr-3 font-semibold">Método</th>
                      <th className="pb-2 pr-3 font-semibold">Responsable</th>
                      <th className="pb-2 text-right font-semibold">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.map((m, i) => {
                      const medio = medios[m.medio] || (m.venta ? null : medios.EFECTIVO);
                      const egreso = m.tipo === 'EGRESO';
                      return (
                        <tr key={`${m.fecha}-${i}`} className={`border-t border-line ${m.ventaId ? 'cursor-pointer hover:bg-sunken' : ''}`} onClick={() => m.ventaId && setVentaId(m.ventaId)}>
                          <td className="py-3 pr-3 font-mono text-xs text-muted">{hora(m.fecha)}</td>
                          <td className="py-3 pr-3">
                            <Prendas productos={m.productos} concepto={m.concepto} />
                            {m.ventaId && <p className="mt-1 text-xs text-muted">{m.cliente || 'Compra en local'}</p>}
                            <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${egreso ? 'bg-rose-50 text-rose-600' : m.venta ? 'bg-emerald-50 text-emerald-700' : 'bg-accent-soft text-accent'}`}>
                              {egreso ? 'Egreso' : m.venta ? 'Cobro' : 'Ingreso'}
                            </span>
                          </td>
                          <td className="py-3 pr-3">
                            {medio && <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${medio.clase}`}>{medio.label}</span>}
                          </td>
                          <td className="py-3 pr-3 text-xs text-muted">{data.cajero}</td>
                          <td className={`py-3 text-right font-black ${egreso ? 'text-rose-600' : m.venta ? 'text-emerald-600' : 'text-accent'}`}>
                            {egreso ? '−' : '+'}{pesos(m.monto)}
                          </td>
                        </tr>
                      );
                    })}
                    {(filtro === 'todos' || filtro === 'ingresos') && !buscar.trim() && (
                      <tr className="border-t border-line">
                        <td className="py-3 pr-3 font-mono text-xs text-muted">{hora(data.abiertaEn)}</td>
                        <td className="py-3 pr-3">
                          <p className="font-semibold text-ink">Apertura de caja (fondo inicial)</p>
                          <span className="mt-1 inline-flex rounded-full bg-sunken px-2 py-0.5 text-[11px] font-bold text-muted">Apertura</span>
                        </td>
                        <td className="py-3 pr-3"><span className="rounded-full bg-sunken px-2 py-0.5 text-[11px] font-bold text-muted">Efectivo</span></td>
                        <td className="py-3 pr-3 text-xs text-muted">{data.cajero}</td>
                        <td className="py-3 text-right font-black text-ink">{pesos(data.montoInicial)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {visibles.length === 0 && (filtro === 'egresos' || filtro === 'ventas' || buscar.trim()) && (
                  <p className="py-6 text-center text-sm text-faint">No hay movimientos para este filtro.</p>
                )}
              </div>
            </section>

            <aside className="space-y-3 rounded-2xl border border-line/80 bg-card p-5 xl:col-span-4">
              <div>
                <h2 className="text-base font-bold text-ink">Resumen por medio de pago</h2>
                <p className="text-xs text-faint">Totales del turno para cotejar con el cajón y los comprobantes.</p>
              </div>
              <Medio tono="bg-emerald-50/50 border-emerald-100" icono={<Billete className="h-4 w-4" />} titulo="Efectivo" valor={pesos(data.esperado)} detalle={`Base ${pesos(data.montoInicial)} · Ventas ${signo(data.ventasEfectivo)} · Ingresos ${signo(data.ingresosManuales)} · Egresos ${signo(-Number(data.egresosManuales || 0))}`} />
              <Medio tono="bg-sky-50/50 border-sky-100" icono={<span className="text-[10px] font-black">TR</span>} titulo="Transferencia" valor={pesos(data.transferencia)} detalle={Number(data.nTransferencia) === 1 ? '1 venta' : `${Number(data.nTransferencia || 0)} ventas`} />
              <Medio tono="bg-accent-soft/50 border-accent/20" icono={<span className="text-[10px] font-black">TJ</span>} titulo="Tarjeta" valor={pesos(data.tarjeta)} detalle={Number(data.nTarjeta) === 1 ? '1 venta' : `${Number(data.nTarjeta || 0)} ventas`} />
              <Medio tono="bg-amber-50/50 border-amber-100" icono={<span className="text-[10px] font-black">CC</span>} titulo="Cuenta corriente" valor={pesos(data.fiado)} detalle={(data.fiados || []).map((f) => f.cliente).filter(Boolean).join(', ') || (Number(data.nFiado) ? `${data.nFiado} ventas` : 'Sin ventas a plazo')} />
              <div className="rounded-xl border border-accent/20 bg-accent-soft p-3.5 text-sm text-accent">
                <p className="flex items-center gap-2 font-bold"><Check className="h-4 w-4" /> Efectivo teórico al día</p>
                <p className="mt-1 text-xs leading-5 text-muted">Transferencia y tarjeta no entran al cajón. El día cierra solo a las 23:59 con el efectivo teórico.</p>
              </div>
            </aside>
          </div>
        </>
      )}

      <Libro version={version} />

      {panel === 'movimiento' && (
        <MovimientoCaja
          saldo={data.esperado}
          cajero={data.cajero}
          abiertaEn={data.abiertaEn}
          onClose={() => setPanel('')}
          onListo={() => { setPanel(''); setVersion((v) => v + 1); }}
        />
      )}
      {ventaId && <DetalleVenta id={ventaId} onClose={() => setVentaId(null)} />}
    </div>
  );
}

function signo(valor) {
  const n = Number(valor) || 0;
  return `${n < 0 ? '−' : '+'}${pesos(Math.abs(n))}`;
}

function Kpi({ titulo, valor, detalle, extra, icono, tono, valorClase = 'text-ink' }) {
  return (
    <article className="rounded-2xl border border-line/80 bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-faint">{titulo}</p>
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${tono}`}>{icono}</span>
      </div>
      <p className={`mt-2 text-2xl font-black ${valorClase}`}>{valor}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {extra && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">{extra}</span>}
        <span className="text-[11px] text-faint">{detalle}</span>
      </div>
    </article>
  );
}

function Filtro({ activo, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${activo ? 'bg-accent-soft text-accent' : 'bg-sunken text-muted hover:bg-raise'}`}>
      {children}
    </button>
  );
}

function Medio({ tono, icono, titulo, valor, detalle }) {
  return (
    <div className={`rounded-xl border p-3 ${tono}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-card/80">{icono}</span>
          {titulo}
        </span>
        <strong className="text-sm">{valor}</strong>
      </div>
      <p className="mt-1 text-[11px] leading-4 text-muted">{detalle}</p>
    </div>
  );
}

function Cortina({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function Libro({ version }) {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [dia, setDia] = useState(hoy.getDate());
  const [vista, setVista] = useState('dia');
  const [clienteId, setClienteId] = useState('');
  const [productoId, setProductoId] = useState('');
  const [medio, setMedio] = useState('');
  const [tipo, setTipo] = useState('todos');
  const [buscar, setBuscar] = useState('');
  const [consulta, setConsulta] = useState('');
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [bajando, setBajando] = useState(false);
  const [ventaId, setVentaId] = useState(null);

  useEffect(() => {
    const espera = setTimeout(() => setConsulta(buscar.trim()), 250);
    return () => clearTimeout(espera);
  }, [buscar]);

  useEffect(() => {
    api('/api/clientes').then((lista) => setClientes([...(lista || [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')))).catch(() => setClientes([]));
    api('/api/productos').then((lista) => setProductos([...(lista || [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')))).catch(() => setProductos([]));
  }, []);

  useEffect(() => {
    let vivo = true;
    const params = new URLSearchParams({ anio: String(anio), mes: String(mes), dia: String(dia) });
    if (clienteId) params.set('clienteId', clienteId);
    if (productoId) params.set('productoId', productoId);
    if (medio) params.set('medio', medio);
    if (tipo !== 'todos') params.set('tipo', tipo);
    if (consulta) params.set('q', consulta);
    api(`/api/caja/historial?${params}`)
      .then((libro) => { if (vivo) { setDatos(libro); setError(''); } })
      .catch((err) => vivo && setError(err.message));
    return () => { vivo = false; };
  }, [anio, mes, dia, clienteId, productoId, medio, tipo, consulta, version]);

  function mover(delta) {
    const fecha = new Date(anio, mes - 1, dia);
    if (vista === 'dia') fecha.setDate(fecha.getDate() + delta);
    if (vista === 'mes') fecha.setMonth(fecha.getMonth() + delta);
    if (vista === 'anio') fecha.setFullYear(fecha.getFullYear() + delta);
    setAnio(fecha.getFullYear());
    setMes(fecha.getMonth() + 1);
    setDia(fecha.getDate());
  }

  function elegir(clave) {
    const partes = String(clave).split('-').map(Number);
    if (partes.length === 1) {
      setAnio(partes[0]);
      setVista('mes');
      return;
    }
    setAnio(partes[0]);
    setMes(partes[1]);
    if (partes.length > 2) setDia(partes[2]);
    setVista('dia');
  }

  async function descargar() {
    setBajando(true);
    setError('');
    const params = new URLSearchParams({ anio: String(anio), mes: String(mes), dia: String(dia), alcance: vista });
    if (clienteId) params.set('clienteId', clienteId);
    if (productoId) params.set('productoId', productoId);
    if (medio) params.set('medio', medio);
    if (tipo !== 'todos') params.set('tipo', tipo);
    if (consulta) params.set('q', consulta);
    try {
      const respuesta = await pedir(`/api/caja/historial.pdf?${params}`);
      if (!respuesta.ok) {
        const cuerpo = await respuesta.json().catch(() => null);
        throw new Error(cuerpo?.mensaje || 'No se pudo descargar el arqueo');
      }
      const blob = await respuesta.blob();
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      const mesTexto = String(mes).padStart(2, '0');
      const diaTexto = String(dia).padStart(2, '0');
      enlace.href = url;
      enlace.download = vista === 'anio' ? `arqueo-${anio}.pdf` : vista === 'mes' ? `arqueo-${anio}-${mesTexto}.pdf` : `arqueo-${anio}-${mesTexto}-${diaTexto}.pdf`;
      enlace.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setBajando(false);
    }
  }

  const grupos = vista === 'anio' ? (datos?.anios || []) : vista === 'mes' ? (datos?.meses || []) : (datos?.dias || []);
  const cursor = vista === 'anio' ? String(datos?.anio || anio) : vista === 'mes' ? `${anio}-${String(mes).padStart(2, '0')}` : `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  const tituloFecha = new Date(anio, mes - 1, dia).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <section className="mt-5 rounded-2xl border border-line/80 bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink">Historial de caja</h2>
          <p className="text-xs text-faint">Lo que entró y salió, agrupado por día, mes y año. El PDF usa el período y los filtros que estás viendo.</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {[['dia', 'Por día'], ['mes', 'Por mes'], ['anio', 'Por año']].map(([id, label]) => (
            <button type="button" key={id} className={`rounded-full px-3 py-1 text-xs font-bold ${vista === id ? 'bg-accent-soft text-accent' : 'bg-sunken text-muted'}`} onClick={() => setVista(id)}>{label}</button>
          ))}
          <button type="button" className="rounded-xl bg-fill px-3 py-1.5 text-xs font-bold text-onfill hover:bg-fill-hover disabled:opacity-60" disabled={bajando} onClick={descargar}>{bajando ? 'Armando PDF…' : 'Descargar PDF'}</button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-line text-muted hover:bg-sunken" onClick={() => mover(-1)} aria-label="Período anterior">‹</button>
        <p className="min-w-40 text-sm font-bold capitalize text-ink">{tituloFecha}</p>
        <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-line text-muted hover:bg-sunken" onClick={() => mover(1)} aria-label="Período siguiente">›</button>
        <input type="date" className="rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-accent" value={`${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`} onChange={(event) => {
          const fecha = new Date(`${event.target.value}T12:00:00`);
          if (Number.isNaN(fecha.getTime())) return;
          setAnio(fecha.getFullYear());
          setMes(fecha.getMonth() + 1);
          setDia(fecha.getDate());
          setVista('dia');
        }} />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <label className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm text-faint">
          <Lupa className="h-4 w-4 shrink-0" />
          <input className="w-full bg-transparent text-ink outline-none placeholder:text-faint" placeholder="Buscar concepto, cliente o producto" value={buscar} onChange={(event) => setBuscar(event.target.value)} />
        </label>
        <select className="rounded-xl border border-line px-3 py-2 text-sm text-ink outline-none focus:border-accent" value={clienteId} onChange={(event) => setClienteId(event.target.value)}>
          <option value="">Todos los clientes</option>
          {clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>)}
        </select>
        <select className="rounded-xl border border-line px-3 py-2 text-sm text-ink outline-none focus:border-accent" value={productoId} onChange={(event) => setProductoId(event.target.value)}>
          <option value="">Todos los productos</option>
          {productos.map((producto) => <option key={producto.id} value={producto.id}>{producto.nombre}</option>)}
        </select>
        <select className="rounded-xl border border-line px-3 py-2 text-sm text-ink outline-none focus:border-accent" value={medio} onChange={(event) => setMedio(event.target.value)}>
          <option value="">Todos los medios</option>
          <option value="EFECTIVO">Efectivo</option>
          <option value="TRANSFERENCIA">Transferencia</option>
          <option value="TARJETA">Tarjeta</option>
          <option value="CUENTA_CORRIENTE">Cuenta corriente</option>
        </select>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {[['todos', 'Todos'], ['ventas', 'Ventas'], ['ingresos', 'Ingresos'], ['egresos', 'Egresos']].map(([id, label]) => (
          <button type="button" key={id} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${tipo === id ? 'bg-accent-soft text-accent' : 'bg-sunken text-muted'}`} onClick={() => setTipo(id)}>{label}</button>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <TotalPeriodo titulo="Este día" total={datos?.totales?.dia} />
        <TotalPeriodo titulo="Este mes" total={datos?.totales?.mes} />
        <TotalPeriodo titulo="Este año" total={datos?.totales?.anio} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <p className="text-xs font-bold uppercase tracking-wide text-faint">{tituloGrupos(vista, anio, mes)}</p>
          <ul className="mt-2 max-h-80 space-y-1.5 overflow-auto">
            {grupos.map((grupo) => (
              <li key={grupo.clave}>
                <button type="button" className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left ${grupo.clave === cursor ? 'bg-accent-soft' : 'hover:bg-sunken'}`} onClick={() => elegir(grupo.clave)}>
                  <span>
                    <span className="block text-sm font-semibold capitalize text-ink">{etiquetaPeriodo(grupo.clave)}</span>
                    <span className="text-[11px] text-faint">{grupo.operaciones} {grupo.operaciones === 1 ? 'movimiento' : 'movimientos'}</span>
                  </span>
                  <span className="text-right text-xs">
                    <span className="block font-black text-emerald-600">+{pesos(grupo.entro)}</span>
                    <span className="block font-bold text-rose-600">−{pesos(grupo.salio)}</span>
                  </span>
                </button>
              </li>
            ))}
            {datos && grupos.length === 0 && <li className="py-4 text-sm text-faint">No hay movimientos en este período.</li>}
          </ul>
        </div>
        <div className="xl:col-span-7">
          <p className="text-xs font-bold uppercase tracking-wide text-faint">Movimientos del {tituloFecha}</p>
          <ul className="mt-2 max-h-80 space-y-2 overflow-auto">
            {(datos?.movimientos || []).map((movimiento, indice) => <LineaHistorial key={`${movimiento.fecha}-${indice}`} movimiento={movimiento} onAbrir={setVentaId} />)}
            {datos && (datos.movimientos || []).length === 0 && <li className="py-4 text-sm text-faint">Este día no tiene movimientos con el filtro actual.</li>}
          </ul>
        </div>
      </div>
      {ventaId && <DetalleVenta id={ventaId} onClose={() => setVentaId(null)} />}
    </section>
  );
}

function tituloGrupos(vista, anio, mes) {
  const nombre = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][mes - 1];
  if (vista === 'anio') return 'Años';
  if (vista === 'mes') return `Meses de ${anio}`;
  return `Días de ${nombre} ${anio}`;
}

function etiquetaPeriodo(clave) {
  const partes = String(clave).split('-');
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  if (partes.length === 1) return partes[0];
  if (partes.length === 2) return `${meses[Number(partes[1]) - 1]} ${partes[0]}`;
  const fecha = new Date(`${clave}T12:00:00`);
  return fecha.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function TotalPeriodo({ titulo, total }) {
  return (
    <article className="rounded-xl border border-line bg-sunken px-3 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-faint">{titulo}</p>
      <p className="mt-1 text-lg font-black text-ink">{pesos(total?.neto)}</p>
      <p className="text-[11px] text-muted">Entró {pesos(total?.entro)} · Salió {pesos(total?.salio)}{Number(total?.fiado) ? ` · A cuenta ${pesos(total.fiado)}` : ''}</p>
    </article>
  );
}

function Prendas({ productos, concepto }) {
  if (!(productos || []).length) return <p className="font-semibold text-ink">{concepto}</p>;
  return (
    <div className="space-y-1.5">
      {productos.map((item, indice) => (
        <p key={`${item.id || item.producto}-${indice}`} className={`font-semibold leading-5 text-ink ${indice > 0 ? 'border-t border-line pt-1.5' : ''}`}>{textoPrenda(item)}</p>
      ))}
    </div>
  );
}

function DetalleVenta({ id, onClose }) {
  const [venta, setVenta] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let vivo = true;
    api(`/api/ventas/${id}`)
      .then((dato) => vivo && setVenta(dato))
      .catch((err) => vivo && setError(err.message));
    return () => { vivo = false; };
  }, [id]);
  const medio = medios[venta?.medio];
  return (
    <Cortina onClose={onClose}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">Venta #{id}</h2>
          {venta && <p className="text-xs text-faint">{cuando(venta.fecha)}</p>}
        </div>
        <button type="button" className="text-sm text-faint" onClick={onClose}>Cerrar</button>
      </div>
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      {!venta && !error && <p className="mt-3 text-sm text-faint">Cargando…</p>}
      {venta && (
        <>
          <p className="mt-3 text-sm text-muted">{venta.cliente || 'Compra en local'}</p>
          <ul className="mt-3 space-y-2">
            {(venta.items || []).map((item, indice) => (
              <li key={indice} className="flex items-start justify-between gap-3 border-t border-line pt-2 text-sm">
                <span className="font-semibold text-ink">{textoPrenda(item)}</span>
                <span className="shrink-0 font-bold text-ink">{pesos(item.subtotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="flex flex-wrap gap-1">
              {medio && <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${medio.clase}`}>{medio.label}</span>}
              {venta.estado === 'ANULADA' && <span className="rounded-full bg-sunken px-2 py-0.5 text-[11px] font-bold text-muted">Anulada</span>}
            </span>
            <strong className="text-base">{pesos(venta.total)}</strong>
          </div>
        </>
      )}
    </Cortina>
  );
}

function LineaHistorial({ movimiento, onAbrir }) {
  const egreso = movimiento.tipo === 'EGRESO';
  const anulada = movimiento.tipo === 'ANULADA';
  const fiado = Number(movimiento.fiado) > 0;
  const medio = medios[movimiento.medio];
  const abre = Boolean(movimiento.ventaId);
  return (
    <li className={`rounded-xl border border-line px-3 py-2 ${abre ? 'cursor-pointer hover:bg-sunken' : ''}`} onClick={() => abre && onAbrir(movimiento.ventaId)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Prendas productos={movimiento.productos} concepto={movimiento.concepto} />
          {(movimiento.ventaId || movimiento.cliente) && <p className="mt-1 text-xs text-muted">{movimiento.cliente || 'Compra en local'}</p>}
          <p className="text-[11px] text-faint">{cuando(movimiento.fecha)}</p>
        </div>
        <strong className={`shrink-0 text-sm ${egreso ? 'text-rose-600' : anulada ? 'text-faint line-through' : fiado ? 'text-amber-600' : 'text-emerald-600'}`}>
          {anulada ? '' : egreso ? '−' : '+'}{pesos(fiado ? movimiento.fiado : movimiento.monto)}
        </strong>
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${egreso ? 'bg-rose-50 text-rose-600' : movimiento.tipo === 'INGRESO' ? 'bg-accent-soft text-accent' : anulada ? 'bg-sunken text-muted' : fiado ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {egreso ? 'Egreso' : movimiento.tipo === 'INGRESO' ? 'Ingreso' : anulada ? 'Anulada' : fiado ? 'A cuenta' : 'Venta'}
        </span>
        {medio && <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${medio.clase}`}>{medio.label}</span>}
      </div>
    </li>
  );
}
