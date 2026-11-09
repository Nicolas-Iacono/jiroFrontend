import { useEffect, useMemo, useState } from 'react';
import { api, pedir } from '../api.js';
import { Lupa } from './Iconos.jsx';

const POR_PAGINA = 5;

function pesos(valor) {
  const texto = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(Number(valor) || 0));
  return `$ ${texto}`;
}

function fechaDe(iso) {
  if (!iso) return null;
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function diaCorto(iso) {
  const fecha = fechaDe(iso);
  if (!fecha) return '';
  return fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

function diaLargo(iso) {
  const fecha = fechaDe(iso);
  if (!fecha) return '';
  return fecha.toLocaleString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function hora(iso) {
  const fecha = fechaDe(iso);
  if (!fecha) return '';
  return `${fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs`;
}

function iniciales(nombre) {
  const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] || '?') + (partes[1]?.[0] || '')).toUpperCase();
}

function diferenciaDe(item) {
  if (item?.diferencia == null || item.diferencia === '') return null;
  const valor = Number(item.diferencia);
  return Number.isFinite(valor) ? valor : null;
}

function conforme(item) {
  const dif = diferenciaDe(item);
  return dif == null || Math.abs(dif) < 0.5;
}

function entra(item, periodo, buscar, filtro) {
  const ahora = new Date();
  ahora.setHours(23, 59, 59, 999);
  const desde = new Date(ahora);
  if (periodo > 0) desde.setDate(desde.getDate() - (periodo - 1));
  desde.setHours(0, 0, 0, 0);
  const fecha = fechaDe(item.cerradaEn || item.abiertaEn);
  if (periodo > 0 && fecha && fecha < desde) return false;
  if (filtro === 'exactos' && !conforme(item)) return false;
  if (filtro === 'diferencias' && conforme(item)) return false;
  const texto = buscar.trim().toLowerCase();
  if (!texto) return true;
  return `${item.cajero || ''} ${diaCorto(item.cerradaEn || item.abiertaEn)} ${item.id}`.toLowerCase().includes(texto);
}

function contar(lista, periodo, buscar, filtro) {
  return (lista || []).filter((item) => entra(item, periodo, buscar, filtro)).length;
}

export default function HistorialCierres({ onVolver }) {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState('');
  const [periodo, setPeriodo] = useState(30);
  const [filtro, setFiltro] = useState('todos');
  const [buscar, setBuscar] = useState('');
  const [pagina, setPagina] = useState(0);
  const [elegido, setElegido] = useState(null);
  const [bajando, setBajando] = useState(false);

  useEffect(() => {
    let vivo = true;
    api('/api/caja/cierres')
      .then((items) => vivo && setLista(items))
      .catch((err) => vivo && setError(err.message));
    return () => { vivo = false; };
  }, []);

  const filtrados = useMemo(() => {
    return (lista || []).filter((item) => entra(item, periodo, buscar, filtro));
  }, [lista, periodo, filtro, buscar]);

  useEffect(() => {
    setPagina(0);
    setElegido(filtrados[0]?.id ?? null);
  }, [periodo, filtro, buscar, lista]);

  const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, paginas - 1);
  const visibles = filtrados.slice(paginaSegura * POR_PAGINA, paginaSegura * POR_PAGINA + POR_PAGINA);
  const cierre = filtrados.find((item) => item.id === elegido) || filtrados[0] || null;

  const facturado = filtrados.reduce((suma, item) => suma + Number(item.facturado || 0), 0);
  const efectivo = filtrados.reduce((suma, item) => suma + Number(item.esperado || 0), 0);
  const electronicos = filtrados.reduce((suma, item) => suma + Number(item.electronicos || 0), 0);
  const transferencia = filtrados.reduce((suma, item) => suma + Number(item.transferencia || 0), 0);
  const tarjeta = filtrados.reduce((suma, item) => suma + Number(item.tarjeta || 0), 0);
  const contados = filtrados.filter((item) => item.montoContado != null);
  const exactos = contados.filter(conforme).length;
  const precision = contados.length ? Math.round((exactos / contados.length) * 1000) / 10 : null;
  const desvio = contados.reduce((suma, item) => suma + (diferenciaDe(item) || 0), 0);
  const parteTransferencia = electronicos > 0 ? Math.round((transferencia / electronicos) * 100) : 0;
  const parteTarjeta = electronicos > 0 ? 100 - parteTransferencia : 0;

  async function pdf(item) {
    const fecha = fechaDe(item.abiertaEn || item.cerradaEn);
    if (!fecha) return;
    setBajando(true);
    setError('');
    const params = new URLSearchParams({
      anio: String(fecha.getFullYear()),
      mes: String(fecha.getMonth() + 1),
      dia: String(fecha.getDate()),
      alcance: 'dia',
    });
    try {
      const respuesta = await pedir(`/api/caja/historial.pdf?${params}`);
      if (!respuesta.ok) {
        const cuerpo = await respuesta.json().catch(() => null);
        throw new Error(cuerpo?.mensaje || 'No se pudo descargar el arqueo');
      }
      const blob = await respuesta.blob();
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `arqueo-${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}.pdf`;
      enlace.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setBajando(false);
    }
  }

  return (
    <div className="space-y-5 font-sans text-ink antialiased">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <button type="button" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent hover:bg-accent-soft" onClick={onVolver} aria-label="Volver a la caja">‹</button>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-accent">Módulo caja <span className="text-faint">•</span> <span className="font-medium normal-case tracking-normal text-faint">Cierres del día</span></p>
            <h1 className="text-xl font-black tracking-tight">Historial de cierres de caja</h1>
            <p className="mt-0.5 text-xs text-muted">Fondo, ventas, egresos y diferencia de cada día que ya cerró.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="rounded-xl border border-line bg-card px-3.5 py-2 text-xs font-semibold text-ink outline-none" value={periodo} onChange={(event) => setPeriodo(Number(event.target.value))}>
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
            <option value={0}>Todos los cierres</option>
          </select>
          <button type="button" className="rounded-xl bg-fill px-4 py-2 text-xs font-bold text-onfill shadow-md shadow-fill/20 hover:bg-fill-hover" onClick={onVolver}>Ir a la caja de hoy</button>
        </div>
      </div>

      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {!lista && !error && <p className="text-sm text-muted">Cargando cierres…</p>}

      {lista && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tarjeta etiqueta="Total facturado" valor={pesos(facturado)} detalle={`${filtrados.length} ${filtrados.length === 1 ? 'cierre' : 'cierres'}`} tono="bg-accent-soft text-accent" />
            <Tarjeta etiqueta="Efectivo teórico" valor={pesos(efectivo)} detalle="Suma del cajón al cierre" tono="bg-emerald-50 text-emerald-600" />
            <Tarjeta etiqueta="Cobros electrónicos" valor={pesos(electronicos)} detalle={electronicos > 0 ? `Transferencia ${parteTransferencia}% · Tarjeta ${parteTarjeta}%` : 'Sin cobros electrónicos'} tono="bg-sky-50 text-sky-600" />
            <Tarjeta etiqueta="Cierres sin diferencia" valor={precision == null ? '—' : `${precision}%`} detalle={contados.length ? `Desvío neto ${desvio < 0 ? '−' : ''}${pesos(Math.abs(desvio))}` : 'Todavía no hay un conteo'} tono="bg-accent-soft text-accent" marca="%" valorClase={precision == null ? 'text-ink' : precision >= 100 ? 'text-emerald-600' : 'text-amber-600'} />
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line/90 bg-card p-2.5 shadow-sm">
            <label className="flex w-52 items-center gap-2 rounded-xl border border-line bg-sunken px-3 py-1.5 text-xs text-faint">
              <Lupa className="h-3.5 w-3.5" />
              <input className="w-full bg-transparent text-ink outline-none placeholder:text-faint" placeholder="Cajero o fecha" value={buscar} onChange={(event) => setBuscar(event.target.value)} />
            </label>
            <Pastilla activa={filtro === 'todos'} onClick={() => setFiltro('todos')}>Todos ({contar(lista, periodo, buscar, 'todos')})</Pastilla>
            <Pastilla activa={filtro === 'exactos'} onClick={() => setFiltro('exactos')}>Sin diferencia ({contar(lista, periodo, buscar, 'exactos')})</Pastilla>
            <Pastilla activa={filtro === 'diferencias'} tono="ambar" onClick={() => setFiltro('diferencias')}>Con diferencia ({contar(lista, periodo, buscar, 'diferencias')})</Pastilla>
          </div>

          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
            <section className="space-y-3 rounded-2xl border border-line/90 bg-card p-4 shadow-sm lg:col-span-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-wider text-ink">Cierres</h2>
                <p className="text-[11px] font-medium text-faint">Pág {paginaSegura + 1} de {paginas}</p>
              </div>
              {filtrados.length === 0 && <p className="rounded-xl bg-sunken px-3 py-6 text-center text-sm text-muted">No hay cierres en este período.</p>}
              <ul className="space-y-2">
                {visibles.map((item) => {
                  const activo = cierre?.id === item.id;
                  const dif = diferenciaDe(item);
                  const ok = conforme(item);
                  return (
                    <li key={item.id}>
                      <button type="button" className={`w-full space-y-1.5 rounded-xl border p-3.5 text-left ${activo ? 'border-accent/30 border-l-4 border-l-accent bg-accent-soft/50' : ok ? 'border-line bg-card hover:border-line' : 'border-amber-200 border-l-4 border-l-amber-400 bg-amber-50/40'}`} onClick={() => setElegido(item.id)}>
                        <div className="flex items-start justify-between gap-2">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-black text-ink">Cierre {diaCorto(item.cerradaEn || item.abiertaEn)}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ok ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{ok ? 'Conforme' : `Dif ${dif < 0 ? '−' : '+'}${pesos(Math.abs(dif))}`}</span>
                          </span>
                          <span className="text-sm font-black text-ink">{pesos(item.facturado)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-xs text-muted">
                          <span>{diaCorto(item.abiertaEn)} · {hora(item.abiertaEn)}</span>
                          <span>Efectivo {pesos(item.esperado)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-faint">{item.cajero || 'Sin cajero'}</span>
                          <span className={`font-bold ${ok ? 'text-emerald-600' : 'text-amber-700'}`}>{dif == null ? 'Sin conteo' : `Dif ${dif < 0 ? '−' : ''}${pesos(Math.abs(dif))}`}</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {filtrados.length > POR_PAGINA && (
                <div className="flex items-center justify-between border-t border-line pt-3 text-xs">
                  <button type="button" className="font-semibold text-muted disabled:cursor-not-allowed disabled:text-faint" disabled={paginaSegura === 0} onClick={() => setPagina((valor) => Math.max(0, valor - 1))}>‹ Anterior</button>
                  <span className="font-bold text-muted">{paginaSegura + 1} / {paginas}</span>
                  <button type="button" className="font-semibold text-ink hover:text-accent disabled:cursor-not-allowed disabled:text-faint" disabled={paginaSegura >= paginas - 1} onClick={() => setPagina((valor) => valor + 1)}>Siguiente ›</button>
                </div>
              )}
            </section>

            <section className="space-y-5 rounded-2xl border border-line/90 bg-card p-5 shadow-sm lg:col-span-7">
              {!cierre && <p className="text-sm text-muted">Elegí un cierre para ver el arqueo.</p>}
              {cierre && <Detalle cierre={cierre} bajando={bajando} onPdf={() => pdf(cierre)} />}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function Detalle({ cierre, bajando, onPdf }) {
  const dif = diferenciaDe(cierre);
  const ok = conforme(cierre);
  const facturado = Number(cierre.facturado || 0);
  const canales = [
    { label: 'Efectivo', monto: Number(cierre.ventasEfectivo || 0), cantidad: Number(cierre.nEfectivo || 0), color: 'bg-emerald-500' },
    { label: 'Transferencia', monto: Number(cierre.transferencia || 0), cantidad: Number(cierre.nTransferencia || 0), color: 'bg-sky-500' },
    { label: 'Tarjeta', monto: Number(cierre.tarjeta || 0), cantidad: Number(cierre.nTarjeta || 0), color: 'bg-fill' },
    { label: 'Cuenta corriente', monto: Number(cierre.fiado || 0), cantidad: Number(cierre.nFiado || 0), color: 'bg-amber-400' },
  ].filter((canal) => canal.monto > 0);
  const marcas = [
    { hora: hora(cierre.abiertaEn), texto: `Apertura · fondo ${pesos(cierre.montoInicial)}`, tono: 'text-muted' },
    ...(cierre.movimientos || []).filter((item) => !item.venta).map((item) => ({
      hora: hora(item.fecha),
      texto: `${item.tipo === 'EGRESO' ? 'Egreso' : 'Ingreso'} · ${item.concepto} (${item.tipo === 'EGRESO' ? '−' : '+'}${pesos(item.monto)})`,
      tono: item.tipo === 'EGRESO' ? 'text-rose-600' : 'text-accent',
    })),
    cierre.cerradaEn ? { hora: hora(cierre.cerradaEn), texto: `Cierre · contado ${pesos(cierre.montoContado)}`, tono: 'text-emerald-700' } : null,
  ].filter(Boolean);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-black">Cierre del {diaCorto(cierre.cerradaEn || cierre.abiertaEn)}</h2>
            <span className={`rounded-lg border px-2.5 py-0.5 text-xs font-black ${ok ? 'border-emerald-300 bg-emerald-100 text-emerald-800' : 'border-amber-300 bg-amber-100 text-amber-800'}`}>{ok ? 'Cuadre exacto' : 'Con diferencia'}</span>
          </div>
          <p className="mt-1 text-xs text-muted">{diaLargo(cierre.cerradaEn || cierre.abiertaEn)}</p>
          <p className="mt-1.5 flex items-center gap-2 text-xs font-bold text-ink">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-accent-soft text-[10px] text-accent">{iniciales(cierre.cajero)}</span>
            {cierre.cajero || 'Sin cajero'}
          </p>
        </div>
        <button type="button" className="rounded-xl bg-fill px-3 py-1.5 text-xs font-bold text-onfill hover:bg-fill-hover disabled:opacity-60" disabled={bajando} onClick={onPdf}>{bajando ? 'Armando PDF…' : 'Descargar PDF'}</button>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-faint">Cajón del día</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Celda etiqueta="Fondo inicial" valor={pesos(cierre.montoInicial)} nota="Al abrir el día" />
          <Celda etiqueta="Ventas en efectivo" valor={`+ ${pesos(cierre.ventasEfectivo)}`} nota={`${Number(cierre.nEfectivo || 0)} ${Number(cierre.nEfectivo) === 1 ? 'cobro' : 'cobros'}`} tono="bg-emerald-50/60 border-emerald-200 text-emerald-700" />
          <Celda etiqueta="Egresos" valor={`− ${pesos(cierre.egresosManuales)}`} nota="Salidas de efectivo" tono="bg-rose-50/60 border-rose-200 text-rose-600" />
          <Celda etiqueta="Teórico en el cajón" valor={pesos(cierre.esperado)} nota="Cálculo del sistema" />
          <Celda etiqueta="Contado al cierre" valor={cierre.montoContado == null ? '—' : pesos(cierre.montoContado)} nota={cierre.montoContado == null ? 'Sin conteo' : 'Lo que quedó registrado'} tono="bg-accent-soft/50 border-accent/30 text-accent" />
          <Celda etiqueta="Diferencia" valor={dif == null ? '—' : `${dif < 0 ? '−' : ''}${pesos(Math.abs(dif))}`} nota={ok ? 'Cuadre exacto' : 'Contado contra teórico'} tono={ok ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-amber-50 border-amber-300 text-amber-700'} />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2 text-xs font-bold text-ink">
          <span>Facturado {pesos(facturado)}</span>
          <span className="font-medium text-faint">{canales.reduce((suma, canal) => suma + canal.cantidad, 0)} cobros</span>
        </div>
        {facturado <= 0 ? (
          <p className="rounded-xl bg-sunken px-3 py-4 text-center text-xs text-muted">Ese día no tiene ventas confirmadas.</p>
        ) : (
          <>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-sunken">
              {canales.map((canal) => (
                <span key={canal.label} className={canal.color} style={{ width: `${Math.max(2, Math.round((canal.monto / facturado) * 100))}%` }} />
              ))}
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {canales.map((canal) => (
                <p key={canal.label} className="flex items-center gap-2 text-xs text-muted">
                  <span className={`h-2 w-2 rounded-full ${canal.color}`} />
                  <span className="font-black text-ink">{pesos(canal.monto)}</span>
                  {canal.label} · {canal.cantidad} {canal.cantidad === 1 ? 'venta' : 'ventas'}
                </p>
              ))}
            </div>
          </>
        )}
      </div>

      <div>
        <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-faint">Qué pasó en el día</p>
        <ol className="space-y-2">
          {marcas.map((marca, indice) => (
            <li key={`${marca.hora}-${indice}`} className={`text-xs ${marca.tono}`}>
              <span className="font-bold">{marca.hora}</span> {marca.texto}
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}

function Tarjeta({ etiqueta, valor, detalle, tono, marca = '$', valorClase = 'text-ink' }) {
  return (
    <article className="rounded-2xl border border-line/90 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{etiqueta}</p>
        <span className={`grid h-8 w-8 place-items-center rounded-xl text-xs font-black ${tono}`}>{marca}</span>
      </div>
      <p className={`mt-1 text-2xl font-black tracking-tight ${valorClase}`}>{valor}</p>
      <p className="mt-1 text-xs text-muted">{detalle}</p>
    </article>
  );
}

function Pastilla({ activa, tono, onClick, children }) {
  const clase = activa
    ? 'bg-fill text-onfill shadow-sm'
    : tono === 'ambar'
      ? 'border border-amber-200 bg-amber-50 text-amber-800'
      : 'bg-sunken text-muted hover:bg-raise';
  return <button type="button" className={`rounded-xl px-3 py-1.5 text-xs font-bold ${clase}`} onClick={onClick}>{children}</button>;
}

function Celda({ etiqueta, valor, nota, tono = 'bg-sunken border-line text-ink' }) {
  return (
    <article className={`rounded-xl border p-3 ${tono}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{etiqueta}</p>
      <p className="mt-1 text-sm font-black">{valor}</p>
      <p className="mt-0.5 text-[11px] text-muted">{nota}</p>
    </article>
  );
}
