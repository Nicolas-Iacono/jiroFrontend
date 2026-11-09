import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, sesion, token, urlApi } from '../api.js';
import { EgresosDelMes } from './Inicio.jsx';

const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const periodos = [
  ['hoy', 'Hoy'],
  ['7', '7 días'],
  ['30', 'Últimos 30 días'],
  ['anio', 'Este año'],
  ['custom', 'Personalizado'],
];
const nombreCanal = { LOCAL: 'En el local', DOMICILIO: 'Envío a domicilio', PUNTO: 'Punto de retiro' };
const colorCanal = { LOCAL: 'bg-emerald-500', DOMICILIO: 'bg-fill', PUNTO: 'bg-sky-500' };
const nombreMedio = { EFECTIVO: 'Efectivo', TRANSFERENCIA: 'Transferencia', TARJETA: 'Tarjeta', CUENTA_CORRIENTE: 'Cuenta corriente' };
const colorMedio = { EFECTIVO: 'bg-emerald-500', TRANSFERENCIA: 'bg-sky-500', TARJETA: 'bg-fill', CUENTA_CORRIENTE: 'bg-amber-400' };

function iso(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function rango(clave) {
  const fin = new Date();
  fin.setHours(12, 0, 0, 0);
  const inicio = new Date(fin);
  if (clave === '7') inicio.setDate(inicio.getDate() - 6);
  if (clave === '30') inicio.setDate(inicio.getDate() - 29);
  if (clave === 'anio') inicio.setMonth(0, 1);
  return { desde: iso(inicio), hasta: iso(fin) };
}

function pesos(valor) {
  const texto = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(Number(valor) || 0));
  return `$ ${texto}`;
}

function puntos(valor) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(Number(valor) || 0);
}

function unidades(valor) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(Number(valor) || 0);
}

function fechaCorta(valor) {
  const fecha = new Date(`${valor}T12:00:00`);
  return `${fecha.getDate()} ${meses[fecha.getMonth()]}`;
}

function curva(puntosCurva) {
  if (!puntosCurva.length) return '';
  let trazo = `M ${puntosCurva[0].x} ${puntosCurva[0].y}`;
  for (let i = 0; i < puntosCurva.length - 1; i += 1) {
    const p0 = puntosCurva[i - 1] || puntosCurva[i];
    const p1 = puntosCurva[i];
    const p2 = puntosCurva[i + 1];
    const p3 = puntosCurva[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    trazo += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return trazo;
}

export default function Estadisticas() {
  const comercio = sesion()?.comercio || 'tu negocio';
  const inicial = rango('30');
  const [periodo, setPeriodo] = useState('30');
  const [desde, setDesde] = useState(inicial.desde);
  const [hasta, setHasta] = useState(inicial.hasta);
  const [comparar, setComparar] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!desde || !hasta || desde > hasta) return undefined;
    let vivo = true;
    setError('');
    api(`/api/dashboard/analitica?desde=${desde}&hasta=${hasta}`)
      .then((valor) => vivo && setData(valor))
      .catch((err) => vivo && setError(err.message));
    return () => { vivo = false; };
  }, [desde, hasta]);

  function elegir(clave) {
    setPeriodo(clave);
    if (clave === 'custom') return;
    const siguiente = rango(clave);
    setDesde(siguiente.desde);
    setHasta(siguiente.hasta);
  }

  function exportar() {
    if (!data) return;
    const filas = [
      ['Período', data.desde, data.hasta],
      ['Facturado', data.facturado],
      ['Ganancia', data.ganancia],
      ['Margen %', data.margen ?? ''],
      ['Tickets', data.tickets],
      ['Ticket promedio', data.ticketPromedio ?? ''],
      ['Unidades', data.unidades],
      ['Promedio diario', data.promedioDiario],
      ['Recompra %', data.recompra ?? ''],
      ['Egresos', data.gastos],
      [],
      ['Producto', 'SKU', 'Unidades', 'Facturado', 'Margen %'],
      ...(data.productos || []).map((item) => [item.nombre, item.sku, item.unidades, item.facturado, item.margen ?? '']),
      [],
      ['Medio', 'Total', 'Cobros', '%'],
      ...(data.medios || []).map((item) => [nombreMedio[item.clave] || item.clave, item.total, item.tickets, item.parte ?? '']),
    ];
    const csv = `\uFEFF${filas.map((fila) => fila.map((celda) => `"${String(celda ?? '').replaceAll('"', '""')}"`).join(';')).join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `estadisticas-${data.desde}-${data.hasta}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  const fechasInvalidas = desde && hasta && desde > hasta;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-accent">Analítica del negocio</p>
          <h1 className="text-2xl font-black tracking-tight text-ink">Estadísticas</h1>
          <p className="mt-0.5 text-xs text-muted">Facturación, margen, cobros y prendas de {comercio}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap rounded-xl border border-line bg-card p-1">
            {periodos.map(([clave, etiqueta]) => (
              <button key={clave} type="button" className={`rounded-lg px-3 py-1.5 text-xs font-bold ${periodo === clave ? 'bg-fill text-onfill' : 'text-muted hover:bg-sunken'}`} onClick={() => elegir(clave)}>{etiqueta}</button>
            ))}
          </div>
          <button type="button" aria-pressed={comparar} className={`rounded-xl border px-3 py-2 text-xs font-bold ${comparar ? 'border-accent/30 bg-accent-soft text-accent' : 'border-line bg-card text-muted'}`} onClick={() => setComparar((valor) => !valor)}>
            vs. período anterior
          </button>
          <button type="button" className="rounded-xl border border-line bg-card px-3 py-2 text-xs font-bold text-ink hover:bg-sunken disabled:opacity-50" disabled={!data} onClick={exportar}>Exportar CSV</button>
        </div>
      </div>

      {periodo === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
          <label className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2">Desde <input type="date" className="bg-transparent outline-none" value={desde} onChange={(event) => setDesde(event.target.value)} /></label>
          <label className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2">Hasta <input type="date" className="bg-transparent outline-none" value={hasta} onChange={(event) => setHasta(event.target.value)} /></label>
        </div>
      )}

      {fechasInvalidas && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">La fecha final es anterior a la inicial.</p>}
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {!data && !error && !fechasInvalidas && <p className="text-sm text-muted">Cargando estadísticas…</p>}

      {data && <Panel data={data} comparar={comparar} />}
    </div>
  );
}

function Panel({ data, comparar }) {
  const canales = data.canales || [];
  const local = Number(canales.find((item) => item.clave === 'LOCAL')?.total) || 0;
  const envios = canales.filter((item) => item.clave !== 'LOCAL').reduce((suma, item) => suma + (Number(item.total) || 0), 0);
  const variacion = data.variacion || {};

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi etiqueta="Facturación" valor={pesos(data.facturado)} detalle={`${data.tickets} ${Number(data.tickets) === 1 ? 'venta' : 'ventas'}`} delta={comparar ? variacion.facturado : null} />
        <Kpi etiqueta="Margen bruto" valor={data.margen == null ? '—' : `${puntos(data.margen)}%`} detalle={data.margen == null ? (Number(data.facturado) > 0 ? 'Falta cargar el costo' : 'Sin ventas') : 'Precio menos costo'} />
        <Kpi etiqueta="Ticket promedio" valor={data.ticketPromedio == null ? '—' : pesos(data.ticketPromedio)} detalle="Por venta confirmada" delta={comparar ? variacion.ticketPromedio : null} />
        <Kpi etiqueta="Unidades vendidas" valor={unidades(data.unidades)} detalle={data.recompra == null ? 'Sin clientes en las ventas' : `${puntos(data.recompra)}% volvió a comprar`} delta={comparar ? variacion.unidades : null} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Mini etiqueta="Promedio diario" valor={pesos(data.promedioDiario)} />
        <Mini etiqueta="Ganancia" valor={pesos(data.ganancia)} delta={comparar ? variacion.ganancia : null} />
        <Mini etiqueta="En el local / envíos" valor={`${pesos(local)} · ${pesos(envios)}`} />
        <Mini etiqueta="Salió de caja" valor={pesos(data.gastos)} tono="text-rose-600" />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
        <section className="rounded-2xl border border-line/90 bg-card p-4 shadow-sm xl:col-span-7">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-ink">Evolución de facturación</h2>
              <p className="text-[11px] text-faint">Este período {pesos(data.facturado)}{comparar ? ` · Anterior ${pesos(data.anteriorFacturado)}` : ''}</p>
            </div>
            {comparar && <span className="text-[11px] font-semibold text-faint">Línea punteada: período anterior</span>}
          </div>
          <Curva actual={data.evolucion} anterior={comparar ? data.evolucionAnterior : []} />
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
            {data.diaFuerte && <p>Día con más ventas: <span className="font-bold text-ink">{data.diaFuerte.nombre}</span> · {puntos(data.diaFuerte.parte)}% del total</p>}
            {data.horaFuerte && <p>Horario pico: <span className="font-bold text-ink">{data.horaFuerte.desde} a {data.horaFuerte.hasta}</span> · {puntos(data.horaFuerte.parte)}%</p>}
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-line/90 bg-card p-4 shadow-sm xl:col-span-5">
          <div>
            <h2 className="text-sm font-black text-ink">Dónde se vendió</h2>
            <Barras items={canales} nombre={nombreCanal} color={colorCanal} vacio="No hay ventas en este período." />
          </div>
          <div>
            <h2 className="text-sm font-black text-ink">Medios de cobro</h2>
            <Barras items={data.medios} nombre={nombreMedio} color={colorMedio} vacio="No hay cobros en este período." />
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
        <section className="rounded-2xl border border-line/90 bg-card p-4 shadow-sm xl:col-span-7">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-black text-ink">Prendas más vendidas</h2>
            <Link to="/productos" className="text-xs font-bold text-accent">Ver catálogo</Link>
          </div>
          {(data.productos || []).length === 0 ? (
            <p className="rounded-xl bg-sunken px-3 py-6 text-center text-sm text-muted">No hay prendas vendidas en este período.</p>
          ) : (
            <ol className="divide-y divide-line">
              {data.productos.map((item, indice) => (
                <li key={item.id}>
                  <Link to={`/productos/${item.id}`} className="flex items-center gap-3 py-2.5">
                    <span className="w-4 text-xs font-black text-faint">{indice + 1}</span>
                    <Miniatura id={item.id} imagen={item.imagen} nombre={item.nombre} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink">{item.nombre}</span>
                      <span className="block truncate text-[11px] text-faint">{item.sku ? `SKU ${item.sku} · ` : ''}{unidades(item.unidades)} {Number(item.unidades) === 1 ? 'unidad' : 'unidades'}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-black text-ink">{pesos(item.facturado)}</span>
                      <span className="block text-[11px] font-semibold text-emerald-600">{item.margen == null ? 'Sin costo' : `Margen ${puntos(item.margen)}%`}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-2xl border border-line/90 bg-card p-4 shadow-sm xl:col-span-5">
          <h2 className="text-sm font-black text-ink">Variantes más vendidas</h2>
          <p className="mb-3 text-[11px] text-faint">Talles, colores u otras variantes de las ventas.</p>
          {(data.variantes || []).length === 0 ? (
            <p className="rounded-xl bg-sunken px-3 py-6 text-center text-sm text-muted">Estas ventas no tienen variante.</p>
          ) : (
            <ul className="space-y-3">
              {data.variantes.map((item) => (
                <li key={item.nombre}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-bold text-ink">{item.nombre}</span>
                    <span className="text-muted">{puntos(item.parte)}% · {unidades(item.unidades)} un.</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-sunken">
                    <span className="block h-full rounded-full bg-fill" style={{ width: `${Math.max(4, Math.min(100, Number(item.parte) || 0))}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <EgresosDelMes items={data.egresos} total={data.gastos} detalle="Salidas de efectivo del período." />
      <p className="text-[11px] text-faint">{data.aclaracion}</p>
    </>
  );
}

function Kpi({ etiqueta, valor, detalle, delta }) {
  return (
    <article className="rounded-2xl border border-line/90 bg-card p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{etiqueta}</p>
      <p className="mt-1 text-2xl font-black tracking-tight text-ink">{valor}</p>
      <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted"><Delta valor={delta} />{detalle}</p>
    </article>
  );
}

function Mini({ etiqueta, valor, delta, tono = 'text-ink' }) {
  return (
    <article className="rounded-2xl border border-line/80 bg-card px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-faint">{etiqueta}</p>
      <p className={`mt-0.5 text-sm font-black ${tono}`}>{valor}</p>
      <Delta valor={delta} />
    </article>
  );
}

function Delta({ valor }) {
  if (valor == null || valor === '') return null;
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return null;
  const sube = numero >= 0;
  return <span className={`text-[11px] font-bold ${sube ? 'text-emerald-600' : 'text-rose-600'}`}>{sube ? '↗ +' : '↘ −'}{puntos(Math.abs(numero))}%</span>;
}

function Barras({ items, nombre, color, vacio }) {
  const lista = items || [];
  if (!lista.length) return <p className="mt-3 rounded-xl bg-sunken px-3 py-4 text-center text-xs text-muted">{vacio}</p>;
  return (
    <ul className="mt-3 space-y-2.5">
      {lista.map((item) => (
        <li key={item.clave}>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="font-bold text-ink">{nombre[item.clave] || item.clave}</span>
            <span className="text-muted">{pesos(item.total)} · {puntos(item.parte)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-sunken">
            <span className={`block h-full rounded-full ${color[item.clave] || 'bg-faint'}`} style={{ width: `${Math.max(4, Math.min(100, Number(item.parte) || 0))}%` }} />
          </div>
          <p className="mt-0.5 text-[11px] text-faint">{item.tickets} {Number(item.tickets) === 1 ? 'venta' : 'ventas'}</p>
        </li>
      ))}
    </ul>
  );
}

function Curva({ actual, anterior }) {
  const id = useId().replace(/:/g, '');
  const puntos = (actual || []).map((item) => ({ dia: item.dia, total: Number(item.total) || 0 }));
  const previos = (anterior || []).map((item) => Number(item.total) || 0);
  const picoValor = Math.max(0, ...puntos.map((item) => item.total), ...previos);
  if (picoValor <= 0) {
    return <p className="flex h-[180px] items-center justify-center text-sm text-muted">Todavía no hay ventas en este período.</p>;
  }
  const maximo = 10 ** Math.floor(Math.log10(picoValor)) * Math.ceil(picoValor / (10 ** Math.floor(Math.log10(picoValor))));
  const ancho = 1100;
  const alto = 160;
  const izq = 78;
  const der = 12;
  const arriba = 16;
  const abajo = 26;
  const x = (indice, largo) => (largo === 1 ? izq + (ancho - izq - der) / 2 : izq + (indice / (largo - 1)) * (ancho - izq - der));
  const y = (valor) => arriba + (1 - valor / maximo) * (alto - arriba - abajo);
  const marca = puntos.map((item, indice) => ({ ...item, x: x(indice, puntos.length), y: y(item.total) }));
  const marcaPrevia = previos.map((total, indice) => ({ x: x(indice, previos.length), y: y(total) }));
  const trazo = curva(marca);
  const trazoPrevio = curva(marcaPrevia);
  const base = y(0);
  const area = marca.length ? `${trazo} L ${marca.at(-1).x} ${base} L ${marca[0].x} ${base} Z` : '';
  const pico = marca.reduce((mejor, punto) => (punto.total >= mejor.total ? punto : mejor), marca[0] || null);
  const paso = Math.max(1, Math.ceil(marca.length / 6));
  const etiquetas = marca.filter((_, indice) => indice % paso === 0);

  return (
    <div className="relative h-[220px] w-full">
      <svg viewBox={`0 0 ${ancho} ${alto}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-c)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--accent-c)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((nivel) => <line key={nivel} x1={izq} x2={ancho - der} y1={y((maximo / 3) * (3 - nivel))} y2={y((maximo / 3) * (3 - nivel))} stroke="var(--line-c)" />)}
        {area && <path d={area} fill={`url(#${id})`} />}
        {trazoPrevio && <path d={trazoPrevio} fill="none" stroke="var(--faint-c)" strokeWidth="2" strokeDasharray="6 5" />}
        {trazo && <path d={trazo} fill="none" stroke="var(--accent-c)" strokeWidth="2.4" />}
        {marca.length <= 31 && marca.map((punto) => <circle key={punto.dia} cx={punto.x} cy={punto.y} r="3" fill="var(--card-c)" stroke="var(--accent-c)" strokeWidth="1.6" />)}
      </svg>
      {[0, 1, 2, 3].map((nivel) => {
        const valor = (maximo / 3) * (3 - nivel);
        return <span key={nivel} className="absolute -translate-x-full -translate-y-1/2 text-[10px] text-faint" style={{ left: `${(izq / ancho) * 100}%`, top: `${(y(valor) / alto) * 100}%` }}>{pesos(valor)}</span>;
      })}
      {etiquetas.map((punto) => (
        <span key={punto.dia} className="absolute -translate-x-1/2 text-[10px] text-faint" style={{ left: `${(punto.x / ancho) * 100}%`, top: `${((alto - 8) / alto) * 100}%` }}>{fechaCorta(punto.dia)}</span>
      ))}
      {pico?.total > 0 && (
        <div className="absolute -translate-x-1/2 -translate-y-full rounded-lg bg-inverse px-2.5 py-1 text-[11px] font-semibold text-oninverse shadow" style={{ left: `${(pico.x / ancho) * 100}%`, top: `${(pico.y / alto) * 100}%` }}>
          {pesos(pico.total)} · {fechaCorta(pico.dia)}
        </div>
      )}
    </div>
  );
}

function Miniatura({ id, imagen, nombre }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!imagen) return undefined;
    let vivo = true;
    let objeto = '';
    fetch(urlApi(`/api/productos/${id}/imagenes/${imagen}`), { headers: token() ? { Authorization: `Bearer ${token()}` } : {} })
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
  }, [id, imagen]);
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-sunken text-xs font-black text-faint">
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : (nombre || '?').slice(0, 1).toUpperCase()}
    </span>
  );
}
