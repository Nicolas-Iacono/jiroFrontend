import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { provincias } from '../provincias.js';
import MapaDomicilio from './MapaDomicilio.jsx';
import RegistrarVenta from './RegistrarVenta.jsx';
import { Billete, Lupa, Personas } from './Iconos.jsx';

const porPagina = 7;
const categoriasCliente = [
  { id: 'ESTANDAR', label: 'Estándar', punto: 'bg-raise' },
  { id: 'VIP', label: 'VIP / Frecuente', punto: 'bg-fill' },
  { id: 'MAYORISTA', label: 'Mayorista', punto: 'bg-emerald-500' },
  { id: 'AMIGOS', label: 'Amigos & Familia', punto: 'bg-amber-400' },
];
const tallesCliente = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const numerosCalzado = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];
const numerosPantalon = ['30', '32', '34', '36', '38', '40', '42', '44', '46', '48', '50'];
const interesesCliente = [
  { id: 'BUZOS', label: 'Buzos / Hoodies' },
  { id: 'REMERAS', label: 'Remeras' },
  { id: 'PANTALONES', label: 'Pantalones' },
  { id: 'ACCESORIOS', label: 'Accesorios' },
  { id: 'CALZADO', label: 'Calzado' },
];

function compraCalzado(intereses) {
  return (intereses || []).includes('CALZADO');
}

function compraPantalon(intereses) {
  return (intereses || []).includes('PANTALONES');
}

function compraRopa(intereses) {
  const lista = intereses || [];
  return lista.some((id) => id === 'BUZOS' || id === 'REMERAS' || id === 'PANTALONES') || !lista.includes('CALZADO');
}
const plazosCliente = [
  { id: 15, label: '15 días' },
  { id: 30, label: 'Fin de mes (30 días)' },
  { id: 45, label: '45 días' },
];

function etiquetaCategoria(id) {
  return categoriasCliente.find((item) => item.id === id)?.label || 'Estándar';
}

function etiquetaInteres(id) {
  return interesesCliente.find((item) => item.id === id)?.label || id;
}

function limiteNumero(valor) {
  const texto = String(valor ?? '').trim().replace(',', '.');
  if (!texto) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(texto)) return undefined;
  return Number(texto);
}

function fichaVacia() {
  return {
    id: null,
    nombre: '',
    telefono: '',
    email: '',
    observaciones: '',
    saldo: 0,
    documento: '',
    direccion: '',
    altura: '',
    localidad: '',
    partido: '',
    provincia: '',
    codigoPostal: '',
    categoria: 'ESTANDAR',
    avisosWhatsapp: false,
    cuentaCorriente: false,
    limiteCredito: '',
    plazoDias: 30,
    avisoVencimiento: false,
    talle: '',
    talleCalzado: '',
    tallePantalon: '',
    intereses: [],
  };
}

function fichaDesde(cliente) {
  return {
    id: cliente.id,
    nombre: cliente.nombre || '',
    telefono: cliente.telefono || '',
    email: cliente.email || '',
    observaciones: cliente.observaciones || '',
    saldo: cliente.saldo || 0,
    documento: cliente.documento || '',
    direccion: cliente.direccion || '',
    altura: cliente.altura || '',
    localidad: cliente.localidad || '',
    partido: cliente.partido || '',
    provincia: cliente.provincia || '',
    codigoPostal: cliente.codigoPostal || '',
    categoria: cliente.categoria || 'ESTANDAR',
    avisosWhatsapp: Boolean(cliente.avisosWhatsapp),
    cuentaCorriente: cliente.cuentaCorriente !== false,
    limiteCredito: cliente.limiteCredito == null ? '' : String(cliente.limiteCredito),
    plazoDias: cliente.plazoDias || 30,
    avisoVencimiento: Boolean(cliente.avisoVencimiento),
    talle: cliente.talle || '',
    talleCalzado: cliente.talleCalzado || '',
    tallePantalon: cliente.tallePantalon || '',
    intereses: Array.isArray(cliente.intereses) ? cliente.intereses : [],
  };
}
const medios = [
  { id: 'EFECTIVO', label: 'Efectivo' },
  { id: 'TRANSFERENCIA', label: 'Transferencia' },
  { id: 'TARJETA', label: 'Tarjeta' },
];

function pesos(valor) {
  const texto = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(Number(valor) || 0));
  return `$ ${texto}`;
}

function domicilioCliente(cliente) {
  const calle = [cliente.direccion, cliente.altura].filter(Boolean).join(' ');
  const zona = [cliente.localidad, cliente.partido, cliente.provincia, cliente.codigoPostal].filter(Boolean).join(', ');
  return [calle, zona].filter(Boolean).join(' · ');
}

function iniciales(nombre) {
  const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] || '?') + (partes[1]?.[0] || '')).toUpperCase();
}

function primerNombre(nombre) {
  return String(nombre || '').trim().split(/\s+/)[0] || 'este cliente';
}

function whatsapp(telefono) {
  const digitos = String(telefono || '').replace(/\D/g, '');
  return digitos.length >= 8 ? `https://wa.me/${digitos}` : '';
}

function diasDesde(iso) {
  if (!iso) return null;
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return null;
  return (Date.now() - fecha.getTime()) / 86400000;
}

function cuando(iso) {
  if (!iso) return 'Sin compras';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return 'Sin compras';
  const hoy = new Date();
  const hora = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  if (fecha.toDateString() === hoy.toDateString()) return `Hoy ${hora}`;
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  if (fecha.toDateString() === ayer.toDateString()) return `Ayer ${hora}`;
  return fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function resumir(cliente, ventas) {
  const propias = ventas.filter((venta) => venta.estado === 'CONFIRMADA' && String(venta.clienteId) === String(cliente.id));
  const ordenadas = [...propias].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  return {
    compras: propias.length,
    ultima: ordenadas[0] || null,
    ltv: propias.reduce((suma, venta) => suma + Number(venta.total || 0), 0),
  };
}

function segmentoDe(cliente, resumen) {
  const saldo = Number(cliente.saldo) || 0;
  const dias = diasDesde(resumen.ultima?.fecha);
  return {
    recurrente: resumen.compras >= 2,
    reciente: dias != null && dias <= 30,
    fiado: saldo > 0,
    inactivo: dias != null && dias > 60,
  };
}

function csv(filas) {
  const encabezado = ['Nombre', 'Teléfono', 'Email', 'Documento', 'Dirección', 'Altura', 'Localidad', 'Partido', 'Provincia', 'Código postal', 'Categoría', 'Cuenta corriente', 'Límite', 'Plazo días', 'Talle', 'Número calzado', 'Número pantalón', 'Intereses', 'Saldo', 'Última compra', 'Compras en últimas ventas', 'Total en últimas ventas', 'Observaciones'];
  const lineas = filas.map(({ cliente, resumen }) => [
    cliente.nombre,
    cliente.telefono || '',
    cliente.email || '',
    cliente.documento || '',
    cliente.direccion || '',
    cliente.altura || '',
    cliente.localidad || '',
    cliente.partido || '',
    cliente.provincia || '',
    cliente.codigoPostal || '',
    etiquetaCategoria(cliente.categoria),
    cliente.cuentaCorriente === false ? 'No' : 'Sí',
    cliente.limiteCredito == null ? '' : cliente.limiteCredito,
    cliente.plazoDias || '',
    cliente.talle || '',
    cliente.talleCalzado || '',
    cliente.tallePantalon || '',
    (cliente.intereses || []).join(' '),
    Number(cliente.saldo) || 0,
    resumen.ultima ? cuando(resumen.ultima.fecha) : '',
    resumen.compras,
    Math.round(resumen.ltv),
    cliente.observaciones || '',
  ].map((valor) => `"${String(valor).replaceAll('"', '""')}"`).join(','));
  return [encabezado.join(','), ...lineas].join('\n');
}

export default function Clientes() {
  const [clientes, setClientes] = useState(null);
  const [ventas, setVentas] = useState([]);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const [buscar, setBuscar] = useState('');
  const [segmento, setSegmento] = useState('todos');
  const [orden, setOrden] = useState('volumen');
  const [pagina, setPagina] = useState(0);
  const [elegido, setElegido] = useState(null);
  const [ficha, setFicha] = useState(null);
  const [form, setForm] = useState(null);
  const [cobro, setCobro] = useState(false);
  const [registrarId, setRegistrarId] = useState(null);
  const [aviso, setAviso] = useState('');
  const [toque, setToque] = useState('');

  useEffect(() => {
    let vivo = true;
    Promise.all([api('/api/clientes'), api('/api/ventas').catch(() => [])])
      .then(([gente, movimientos]) => {
        if (!vivo) return;
        setClientes(gente);
        setVentas(movimientos);
        setElegido((actual) => (actual && gente.some((cliente) => cliente.id === actual) ? actual : gente[0]?.id ?? null));
      })
      .catch((err) => vivo && setError(err.message));
    return () => { vivo = false; };
  }, [version]);

  useEffect(() => {
    if (!elegido) {
      setFicha(null);
      return undefined;
    }
    let vivo = true;
    api(`/api/clientes/${elegido}`)
      .then((detalle) => vivo && setFicha(detalle))
      .catch(() => vivo && setFicha(null));
    return () => { vivo = false; };
  }, [elegido, version]);

  const enriquecidos = useMemo(
    () => (clientes || []).map((cliente) => {
      const resumen = resumir(cliente, ventas);
      return { cliente, resumen, marcas: segmentoDe(cliente, resumen) };
    }),
    [clientes, ventas],
  );

  const confirmadas = ventas.filter((venta) => venta.estado === 'CONFIRMADA');
  const ticket = confirmadas.length
    ? confirmadas.reduce((suma, venta) => suma + Number(venta.total || 0), 0) / confirmadas.length
    : 0;
  const recurrentes = enriquecidos.filter((item) => item.marcas.recurrente).length;
  const recientes = enriquecidos.filter((item) => item.marcas.reciente).length;
  const fiados = enriquecidos.filter((item) => item.marcas.fiado);
  const inactivos = enriquecidos.filter((item) => item.marcas.inactivo).length;
  const saldoFiado = fiados.reduce((suma, item) => suma + Number(item.cliente.saldo || 0), 0);
  const parteRecurrente = enriquecidos.length ? Math.round((recurrentes / enriquecidos.length) * 100) : 0;
  const tope = ventas.length >= 50;

  const visibles = enriquecidos.filter((item) => {
    if (segmento === 'recurrentes' && !item.marcas.recurrente) return false;
    if (segmento === 'recientes' && !item.marcas.reciente) return false;
    if (segmento === 'fiados' && !item.marcas.fiado) return false;
    if (segmento === 'inactivos' && !item.marcas.inactivo) return false;
    const texto = `${item.cliente.nombre} ${item.cliente.telefono || ''} ${item.cliente.email || ''} ${item.cliente.documento || ''}`.toLowerCase();
    return texto.includes(buscar.trim().toLowerCase());
  }).sort((a, b) => {
    if (orden === 'nombre') return a.cliente.nombre.localeCompare(b.cliente.nombre, 'es');
    if (orden === 'saldo') return Number(b.cliente.saldo) - Number(a.cliente.saldo);
    if (orden === 'reciente') return new Date(b.resumen.ultima?.fecha || 0) - new Date(a.resumen.ultima?.fecha || 0);
    return b.resumen.ltv - a.resumen.ltv || a.cliente.nombre.localeCompare(b.cliente.nombre, 'es');
  });

  const paginas = Math.max(1, Math.ceil(visibles.length / porPagina));
  const paginaSegura = Math.min(pagina, paginas - 1);
  const hoja = visibles.slice(paginaSegura * porPagina, paginaSegura * porPagina + porPagina);
  const activo = enriquecidos.find((item) => item.cliente.id === elegido) || null;
  const comprasFicha = (ficha?.compras || []).filter((compra) => compra.estado === 'CONFIRMADA');
  const ltvFicha = comprasFicha.reduce((suma, compra) => suma + Number(compra.total || 0), 0);

  function ir(siguiente) {
    setPagina(Math.min(Math.max(0, siguiente), paginas - 1));
  }

  function exportar() {
    const blob = new Blob([csv(visibles)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'clientes-giro.csv';
    enlace.click();
    URL.revokeObjectURL(url);
  }

  if (error) return <p className="text-sm font-semibold text-rose-600">{error}</p>;
  if (!clientes) return <p className="text-sm text-muted">Cargando clientes…</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex flex-wrap items-center gap-2.5 text-2xl font-black text-ink">
            Directorio de Clientes
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent">Base activa: {clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'}</span>
          </h1>
          {aviso && <p className="mt-1 w-fit rounded-xl bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">{aviso}</p>}
          <p className="mt-0.5 text-xs text-muted">Historial, recompra y saldo de cuenta corriente de este comercio</p>
          {tope && <p className="mt-1 text-[11px] text-faint">La tabla usa las últimas 50 ventas. La ficha de la derecha muestra el historial completo del cliente elegido.</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="flex items-center gap-1.5 rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-ink hover:bg-sunken" onClick={exportar}>
            Exportar
          </button>
          <button type="button" className="rounded-xl bg-fill px-4 py-2 text-sm font-bold text-onfill shadow-md hover:bg-fill-hover" onClick={() => { setToque(''); setForm(fichaVacia()); }}>
            + Nuevo cliente
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <Tarjeta titulo="Total registrados" icono={<Personas className="h-4 w-4" />} tono="bg-accent-soft text-accent">
          <p className="text-2xl font-black text-ink">{clientes.length}</p>
          <p className="text-[11px] text-faint">Clientes activos del comercio</p>
        </Tarjeta>
        <Tarjeta titulo="Ticket promedio" icono={<Billete className="h-4 w-4" />} tono="bg-accent-soft text-accent">
          <p className="text-2xl font-black text-ink">{pesos(ticket)}</p>
          <p className="text-[11px] text-muted">{confirmadas.length ? `Sobre ${confirmadas.length} ventas confirmadas` : 'Sin ventas confirmadas'}</p>
        </Tarjeta>
        <Tarjeta titulo="Clientes recurrentes" icono={<Estrella />} tono="bg-amber-50 text-amber-500">
          <p className="flex items-end gap-2 text-2xl font-black text-ink">
            {recurrentes}
            {enriquecidos.length > 0 && <span className="mb-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent">{parteRecurrente}% base</span>}
          </p>
          <p className="text-[11px] text-muted">Con 2 o más compras en las últimas ventas</p>
        </Tarjeta>
        <Tarjeta titulo="Saldo cta. corriente" icono={<Billetera />} tono="bg-rose-50 text-rose-500">
          <p className={`text-2xl font-black ${saldoFiado > 0 ? 'text-rose-600' : 'text-ink'}`}>{pesos(saldoFiado)}</p>
          <p className="text-[11px] text-muted">{fiados.length === 0 ? 'Nadie debe saldo' : `${fiados.length} ${fiados.length === 1 ? 'cliente' : 'clientes'} con saldo pendiente`}</p>
        </Tarjeta>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Pastilla activo={segmento === 'todos'} onClick={() => { setSegmento('todos'); setPagina(0); }}>Todos {clientes.length}</Pastilla>
        <Pastilla activo={segmento === 'recurrentes'} onClick={() => { setSegmento('recurrentes'); setPagina(0); }}>Recurrentes {recurrentes}</Pastilla>
        <Pastilla activo={segmento === 'recientes'} onClick={() => { setSegmento('recientes'); setPagina(0); }}>Compradores recientes {recientes}</Pastilla>
        <Pastilla activo={segmento === 'fiados'} onClick={() => { setSegmento('fiados'); setPagina(0); }}>Con saldo {fiados.length}</Pastilla>
        <Pastilla activo={segmento === 'inactivos'} onClick={() => { setSegmento('inactivos'); setPagina(0); }}>Inactivos +60 días {inactivos}</Pastilla>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-line bg-sunken px-3 py-2 text-xs text-faint">
          <Lupa className="h-3.5 w-3.5 shrink-0" />
          <input className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-faint" placeholder="Buscar por nombre, teléfono, email o DNI" value={buscar} onChange={(event) => { setBuscar(event.target.value); setPagina(0); }} />
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-ink">
          Ordenar
          <select className="bg-transparent outline-none" value={orden} onChange={(event) => setOrden(event.target.value)}>
            <option value="volumen">Mayor volumen de compra</option>
            <option value="reciente">Última compra</option>
            <option value="saldo">Mayor saldo</option>
            <option value="nombre">Nombre</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        <section className="overflow-hidden rounded-2xl border border-line/80 bg-card shadow-sm lg:col-span-7">
          <div className="hidden grid-cols-[1.4fr_1fr_1fr_0.8fr_auto] gap-2 border-b border-line px-4 py-2 text-[10px] font-bold tracking-wide text-faint lg:grid">
            <span>CLIENTE</span>
            <span>CONTACTO</span>
            <span>ÚLTIMA COMPRA</span>
            <span>EN ÚLTIMAS VENTAS</span>
            <span>ACCIONES</span>
          </div>
          {hoja.length === 0 && <p className="px-4 py-8 text-sm text-muted">{clientes.length === 0 ? 'Todavía no hay clientes.' : 'Nadie coincide con este filtro.'}</p>}
          {hoja.map(({ cliente, resumen, marcas }) => {
            const chat = whatsapp(cliente.telefono);
            const seleccionado = cliente.id === elegido;
            return (
              <button type="button" key={cliente.id} className={`grid w-full gap-2 border-b border-line px-4 py-3 text-left lg:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto] ${seleccionado ? 'bg-accent-soft/70 shadow-[inset_3px_0_0_rgb(var(--fill))]' : 'hover:bg-sunken'}`} onClick={() => setElegido(cliente.id)}>
                <span className="flex min-w-0 items-center gap-2">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold ${seleccionado ? 'bg-fill text-onfill' : 'bg-accent-soft text-accent'}`}>{iniciales(cliente.nombre)}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-ink">{cliente.nombre}</span>
                    <span className="mt-0.5 flex flex-wrap gap-1">
                      {marcas.recurrente && <span className="rounded bg-accent-soft px-1.5 text-[10px] font-bold text-accent">Recurrente</span>}
                      {cliente.categoria && cliente.categoria !== 'ESTANDAR' && <span className="rounded bg-accent-soft px-1.5 text-[10px] font-bold text-accent">{etiquetaCategoria(cliente.categoria)}</span>}
                      {resumen.compras === 0 && <span className="rounded bg-sky-50 px-1.5 text-[10px] font-bold text-sky-700">Sin compras</span>}
                      {marcas.inactivo && <span className="rounded bg-amber-50 px-1.5 text-[10px] font-bold text-amber-700">Inactivo</span>}
                      <span className="text-[10px] text-faint">#{cliente.id}</span>
                    </span>
                  </span>
                </span>
                <span className="self-center text-xs text-muted">{cliente.telefono || cliente.email || 'Sin contacto'}</span>
                <span className="self-center text-xs text-ink">
                  {cuando(resumen.ultima?.fecha)}
                  {resumen.ultima && <span className="block text-[11px] text-faint">{pesos(resumen.ultima.total)}</span>}
                </span>
                <span className="self-center">
                  <span className="block text-sm font-black text-ink">{pesos(resumen.ltv)}</span>
                  <span className={`text-[11px] ${marcas.fiado ? 'font-semibold text-rose-600' : 'text-faint'}`}>{marcas.fiado ? `Debe ${pesos(cliente.saldo)}` : 'Al día'}</span>
                </span>
                <span className="flex items-center gap-1 self-center">
                  {cliente.telefono && <a className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-card" href={`tel:${cliente.telefono}`} aria-label="Llamar" onClick={(event) => event.stopPropagation()}><Telefono /></a>}
                  {chat && <a className="grid h-7 w-7 place-items-center rounded-full text-emerald-600 hover:bg-card" href={chat} target="_blank" rel="noreferrer" aria-label="WhatsApp" onClick={(event) => event.stopPropagation()}><WhatsApp /></a>}
                </span>
              </button>
            );
          })}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-muted">
            <span>{visibles.length === 0 ? '0 clientes' : `Mostrando ${paginaSegura * porPagina + 1}-${Math.min(visibles.length, paginaSegura * porPagina + porPagina)} de ${visibles.length}`}</span>
            <span className="flex items-center gap-1">
              <button type="button" className="rounded-lg px-2 py-1 hover:bg-sunken disabled:opacity-40" disabled={paginaSegura === 0} onClick={() => ir(paginaSegura - 1)}>Anterior</button>
              {Array.from({ length: paginas }, (_, indice) => indice).filter((indice) => indice === 0 || indice === paginas - 1 || Math.abs(indice - paginaSegura) <= 1).map((indice, ordenIndice, lista) => (
                <span key={indice} className="flex items-center">
                  {ordenIndice > 0 && lista[ordenIndice - 1] !== indice - 1 && <span className="px-1">…</span>}
                  <button type="button" className={`grid h-7 w-7 place-items-center rounded-lg ${indice === paginaSegura ? 'bg-fill font-bold text-onfill' : 'hover:bg-sunken'}`} onClick={() => ir(indice)}>{indice + 1}</button>
                </span>
              ))}
              <button type="button" className="rounded-lg px-2 py-1 hover:bg-sunken disabled:opacity-40" disabled={paginaSegura >= paginas - 1} onClick={() => ir(paginaSegura + 1)}>Siguiente</button>
            </span>
          </div>
        </section>

        <aside className="rounded-2xl border border-line/80 bg-card p-5 shadow-sm lg:col-span-5">
          {!activo && <p className="text-sm text-muted">Seleccioná un cliente para ver su ficha.</p>}
          {activo && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-fill text-lg font-bold text-onfill">{iniciales(activo.cliente.nombre)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-lg font-black text-ink">{activo.cliente.nombre}</h2>
                    <button type="button" className="text-faint hover:text-accent" aria-label="Editar cliente" onClick={() => setForm(fichaDesde(activo.cliente))}><Lapiz /></button>
                  </div>
                  <p className="text-xs text-muted">Cliente #{activo.cliente.id} · {etiquetaCategoria(activo.cliente.categoria)}{activo.marcas.recurrente ? ' · Recurrente' : ''}{activo.resumen.compras === 0 ? ' · Sin compras' : ''}</p>
                </div>
              </div>

              <div className="space-y-1 text-sm">
                {whatsapp(activo.cliente.telefono)
                  ? <a className="flex items-center gap-2 font-semibold text-emerald-600" href={whatsapp(activo.cliente.telefono)} target="_blank" rel="noreferrer"><WhatsApp />{activo.cliente.telefono}</a>
                  : <p className="text-faint">{activo.cliente.telefono || 'Sin teléfono'}</p>}
                <p className="text-muted">{activo.cliente.email || 'Sin email'}</p>
                {activo.cliente.documento && <p className="text-muted">DNI / CUIT {activo.cliente.documento}</p>}
                {domicilioCliente(activo.cliente) && <p className="text-muted">{domicilioCliente(activo.cliente)}</p>}
                <MapaDomicilio direccion={activo.cliente.direccion} altura={activo.cliente.altura} localidad={activo.cliente.localidad} partido={activo.cliente.partido} provincia={activo.cliente.provincia} codigoPostal={activo.cliente.codigoPostal} />
                <p className="text-xs text-muted">
                  {activo.cliente.cuentaCorriente === false
                    ? 'Sin cuenta corriente'
                    : `Cuenta corriente ${activo.cliente.limiteCredito == null ? 'sin límite' : `hasta ${pesos(activo.cliente.limiteCredito)}`}${activo.cliente.plazoDias ? ` · ${activo.cliente.plazoDias} días` : ''}`}
                </p>
                {(activo.cliente.talle || activo.cliente.talleCalzado || activo.cliente.tallePantalon || (activo.cliente.intereses || []).length > 0) && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {activo.cliente.talle && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent">Talle {activo.cliente.talle}</span>}
                    {activo.cliente.tallePantalon && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent">Pantalón {activo.cliente.tallePantalon}</span>}
                    {activo.cliente.talleCalzado && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent">Calzado {activo.cliente.talleCalzado}</span>}
                    {(activo.cliente.intereses || []).map((item) => <span key={item} className="rounded-full bg-sunken px-2 py-0.5 text-[11px] font-semibold text-muted">{etiquetaInteres(item)}</span>)}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Mini titulo="Compras" valor={pesos(ficha && String(ficha.id) === String(activo.cliente.id) ? ltvFicha : activo.resumen.ltv)} detalle={comprasFicha.length ? `${comprasFicha.length} confirmadas` : 'Sin compras'} />
                <Mini titulo="Saldo cta. cte." valor={pesos(activo.cliente.saldo)} detalle={Number(activo.cliente.saldo) > 0 ? 'Pendiente' : 'Al día'} alerta={Number(activo.cliente.saldo) > 0} />
                <Mini titulo="Última" valor={activo.resumen.ultima ? cuando(activo.resumen.ultima.fecha) : '—'} detalle={activo.resumen.ultima ? pesos(activo.resumen.ultima.total) : 'Sin movimiento'} />
              </div>

              <div className="grid gap-2">
                <button type="button" className="w-full rounded-xl bg-fill py-2.5 text-sm font-bold text-onfill hover:bg-fill-hover" onClick={() => setRegistrarId(activo.cliente.id)}>+ Registrar venta a {primerNombre(activo.cliente.nombre)}</button>
                {whatsapp(activo.cliente.telefono) && (
                  <a className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 py-2 text-sm font-bold text-emerald-700" href={whatsapp(activo.cliente.telefono)} target="_blank" rel="noreferrer">
                    <WhatsApp /> Escribir por WhatsApp
                  </a>
                )}
                {Number(activo.cliente.saldo) > 0 && (
                  <button type="button" className="w-full rounded-xl bg-sunken py-2 text-sm font-semibold text-ink" onClick={() => { setToque(''); setCobro(true); }}>Cobrar cuenta corriente</button>
                )}
              </div>

              {activo.cliente.observaciones && (
                <p className="rounded-xl bg-sunken px-3 py-2 text-xs leading-5 text-muted">{activo.cliente.observaciones}</p>
              )}

              <div>
                <h3 className="text-xs font-bold tracking-wide text-faint">COMPRAS</h3>
                {(!ficha || String(ficha.id) !== String(activo.cliente.id)) && <p className="mt-2 text-xs text-faint">Cargando historial…</p>}
                {ficha && String(ficha.id) === String(activo.cliente.id) && (ficha.compras || []).length === 0 && (
                  <div className="mt-2 rounded-xl bg-accent-soft px-3 py-4 text-center">
                    <p className="text-sm font-semibold text-ink">Sin compras registradas</p>
                    <button type="button" className="mt-2 text-xs font-bold text-accent" onClick={() => setRegistrarId(activo.cliente.id)}>+ Crear la primera venta</button>
                  </div>
                )}
                {ficha && String(ficha.id) === String(activo.cliente.id) && (ficha.compras || []).length > 0 && (
                  <ul className="mt-2 space-y-2">
                    {(ficha.compras || []).slice(0, 6).map((compra) => (
                      <li key={compra.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-muted">#{compra.id} · {cuando(compra.fecha)}{compra.estado !== 'CONFIRMADA' ? ` · ${compra.estado.toLowerCase()}` : ''}</span>
                        <span className={`font-bold ${compra.estado === 'CONFIRMADA' ? 'text-ink' : 'text-faint line-through'}`}>{pesos(compra.total)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>

      {form && (
        <Formulario
          form={form}
          mensaje={toque}
          onChange={setForm}
          onClose={() => setForm(null)}
          onGuardar={async (crearVenta) => {
            setToque('');
            try {
              const limite = limiteNumero(form.limiteCredito);
              if (limite === undefined) {
                setToque('El límite va sin puntos de miles. Ejemplo: 150000');
                return;
              }
              const cuerpo = {
                nombre: form.nombre.trim(),
                telefono: form.telefono.trim(),
                email: form.email.trim(),
                observaciones: form.observaciones.trim(),
                documento: form.documento.trim(),
                direccion: form.direccion.trim(),
                altura: form.altura.trim(),
                localidad: form.localidad.trim(),
                partido: form.partido.trim(),
                provincia: form.provincia || null,
                codigoPostal: form.codigoPostal.trim(),
                categoria: form.categoria,
                avisosWhatsapp: form.avisosWhatsapp,
                cuentaCorriente: form.cuentaCorriente,
                limiteCredito: limite,
                plazoDias: Number(form.plazoDias) || null,
                avisoVencimiento: form.avisoVencimiento,
                talle: compraRopa(form.intereses) ? (form.talle || null) : null,
                talleCalzado: compraCalzado(form.intereses) ? (form.talleCalzado || null) : null,
                tallePantalon: compraPantalon(form.intereses) ? (form.tallePantalon || null) : null,
                intereses: form.intereses,
              };
              const guardado = await api(form.id ? `/api/clientes/${form.id}` : '/api/clientes', { method: form.id ? 'PUT' : 'POST', body: cuerpo });
              setAviso(`Cliente ${guardado.nombre} guardado (#${guardado.id})`);
              setElegido(guardado.id);
              setForm(null);
              setVersion((valor) => valor + 1);
              if (crearVenta) setRegistrarId(guardado.id);
            } catch (err) {
              setToque(err.message);
            }
          }}
        />
      )}

      {cobro && activo && (
        <Cobro
          cliente={activo.cliente}
          mensaje={toque}
          onClose={() => setCobro(false)}
          onCobrar={async (monto, medio) => {
            setToque('');
            try {
              await api(`/api/clientes/${activo.cliente.id}/cobros`, { method: 'POST', body: { monto: Number(monto), medio } });
              setAviso(`Cobro registrado para ${activo.cliente.nombre}`);
              setCobro(false);
              setVersion((valor) => valor + 1);
            } catch (err) {
              setToque(err.message);
            }
          }}
        />
      )}

      {registrarId && (
        <RegistrarVenta
          clienteInicial={registrarId}
          onClose={() => setRegistrarId(null)}
          onLista={() => setVersion((valor) => valor + 1)}
        />
      )}
    </div>
  );
}

function Tarjeta({ titulo, icono, tono, children }) {
  return (
    <article className="rounded-2xl border border-line bg-card px-4 py-3 shadow-sm">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold tracking-wide text-faint">{titulo.toUpperCase()}</p>
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${tono}`}>{icono}</span>
      </div>
      {children}
    </article>
  );
}

function Pastilla({ activo, onClick, children }) {
  return (
    <button type="button" className={`rounded-full px-3 py-1.5 text-xs font-semibold ${activo ? 'bg-fill text-onfill' : 'bg-card text-muted ring-1 ring-line hover:bg-sunken'}`} onClick={onClick}>{children}</button>
  );
}

function Mini({ titulo, valor, detalle, alerta }) {
  return (
    <div className="rounded-xl bg-sunken px-2 py-2">
      <p className="text-[10px] font-bold tracking-wide text-faint">{titulo.toUpperCase()}</p>
      <p className={`truncate text-sm font-black ${alerta ? 'text-rose-600' : 'text-ink'}`}>{valor}</p>
      <p className="truncate text-[11px] text-muted">{detalle}</p>
    </div>
  );
}

function telefonoLocal(telefono) {
  const texto = String(telefono || '');
  return texto.startsWith('+54') ? texto.replace(/^\+54\s?/, '') : texto;
}

function telefonoCompleto(local, anterior) {
  const numero = String(local || '');
  if (!numero.trim()) return '';
  if (anterior && !String(anterior).startsWith('+54') && !String(anterior).startsWith('+')) return numero;
  if (numero.trim().startsWith('+')) return numero;
  return `+54 ${numero.replace(/^\s+/, '')}`;
}

function Formulario({ form, mensaje, onChange, onClose, onGuardar }) {
  const [guardando, setGuardando] = useState(false);
  const campo = 'w-full bg-transparent px-4 py-2.5 text-sm text-ink outline-none placeholder:text-faint';
  const caja = 'overflow-hidden rounded-xl border border-line bg-sunken focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20';
  const nuevo = !form.id;
  const forzarPrefijo = !form.telefono || String(form.telefono).startsWith('+54');

  async function enviar(event, crearVenta) {
    event.preventDefault();
    if (guardando) return;
    setGuardando(true);
    try {
      await onGuardar(crearVenta);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 pt-12 font-sans antialiased backdrop-blur-sm md:p-8" onClick={onClose}>
      <form className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-line bg-card shadow-2xl" onClick={(event) => event.stopPropagation()} onSubmit={(event) => enviar(event, false)}>
        <header className="flex items-center justify-between border-b border-line bg-card px-7 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><UsuarioMas /></span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-ink">{nuevo ? 'Nuevo Cliente' : 'Editar cliente'}</h2>
                <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent">{nuevo ? 'Alta de ficha' : 'Ficha comercial'}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted">Contacto, segmento y límite de cuenta corriente. El saldo se mueve con las ventas a fiado.</p>
            </div>
          </div>
          <button type="button" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sunken text-faint transition-colors hover:bg-raise hover:text-ink" onClick={onClose} aria-label="Cerrar"><Cerrar /></button>
        </header>

        <div className="overflow-y-auto px-7 py-5">
          <div className="grid items-start gap-5 md:grid-cols-2">
            <section className="space-y-3">
              <h3 className="text-[11px] font-bold tracking-wide text-accent">INFORMACIÓN PERSONAL Y CONTACTO</h3>
              <label className="block text-xs font-semibold text-muted">Nombre y apellido
                <span className={`mt-1.5 block ${caja}`}>
                  <input className={`${campo} font-medium`} placeholder="Nombre y apellido" value={form.nombre} onChange={(event) => onChange({ ...form, nombre: event.target.value })} required />
                </span>
              </label>
              <label className="block text-xs font-semibold text-muted">WhatsApp / teléfono
                <span className={`mt-1.5 flex items-center ${caja}`}>
                  {forzarPrefijo && <span className="border-r border-line bg-card px-3 py-2.5 text-sm font-semibold text-ink">+54</span>}
                  <input className={campo} inputMode="tel" placeholder="9 11 2345-6789" value={telefonoLocal(form.telefono)} onChange={(event) => onChange({ ...form, telefono: telefonoCompleto(event.target.value, form.telefono) })} />
                  <span className="pr-3 text-emerald-600"><WhatsApp /></span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-xs font-medium text-muted">
                <input type="checkbox" className="mt-0.5 accent-fill" checked={form.avisosWhatsapp} onChange={(event) => onChange({ ...form, avisosWhatsapp: event.target.checked })} />
                Habilitar para recordatorios de cobro por WhatsApp
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-muted">Email
                  <span className={`mt-1.5 flex items-center ${caja}`}>
                    <span className="pl-3 text-faint"><Correo /></span>
                    <input className={campo} type="email" placeholder="cliente@email.com" value={form.email} onChange={(event) => onChange({ ...form, email: event.target.value })} />
                  </span>
                </label>
                <label className="block text-xs font-semibold text-muted">DNI / CUIT
                  <span className={`mt-1.5 block ${caja}`}>
                    <input className={campo} inputMode="numeric" placeholder="38.452.190" value={form.documento} onChange={(event) => onChange({ ...form, documento: event.target.value })} />
                  </span>
                </label>
              </div>
              <div className="grid grid-cols-6 gap-3">
                <label className="col-span-4 block text-xs font-semibold text-muted">Dirección
                  <span className={`mt-1.5 block ${caja}`}>
                    <input className={campo} value={form.direccion} onChange={(event) => onChange({ ...form, direccion: event.target.value })} />
                  </span>
                </label>
                <label className="col-span-2 block text-xs font-semibold text-muted">Altura
                  <span className={`mt-1.5 block ${caja}`}>
                    <input className={campo} value={form.altura} onChange={(event) => onChange({ ...form, altura: event.target.value })} />
                  </span>
                </label>
                <label className="col-span-3 block text-xs font-semibold text-muted">Localidad
                  <span className={`mt-1.5 block ${caja}`}>
                    <input className={campo} value={form.localidad} onChange={(event) => onChange({ ...form, localidad: event.target.value })} />
                  </span>
                </label>
                <label className="col-span-3 block text-xs font-semibold text-muted">Partido
                  <span className={`mt-1.5 block ${caja}`}>
                    <input className={campo} value={form.partido} onChange={(event) => onChange({ ...form, partido: event.target.value })} />
                  </span>
                </label>
                <label className="col-span-4 block text-xs font-semibold text-muted">Provincia
                  <span className={`mt-1.5 block ${caja}`}>
                    <select className={campo} value={form.provincia} onChange={(event) => onChange({ ...form, provincia: event.target.value })}>
                      <option value="">Elegir</option>
                      {provincias.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </span>
                </label>
                <label className="col-span-2 block text-xs font-semibold text-muted">Código postal
                  <span className={`mt-1.5 block ${caja}`}>
                    <input className={`${campo} uppercase`} value={form.codigoPostal} onChange={(event) => onChange({ ...form, codigoPostal: event.target.value })} />
                  </span>
                </label>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted">Categoría</p>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {categoriasCliente.map((item) => {
                    const activo = form.categoria === item.id;
                    return (
                      <button type="button" key={item.id} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-left text-xs font-semibold ${activo ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-card text-muted'}`} onClick={() => onChange({ ...form, categoria: item.id })}>
                        <span className={`h-2 w-2 rounded-full ${item.punto}`} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <div className="space-y-4">
              <section className="space-y-3 rounded-2xl border border-accent/20 bg-accent-soft/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[11px] font-bold tracking-wide text-accent">CUENTA CORRIENTE / FIADOS</h3>
                    <p className="mt-1 text-xs leading-5 text-muted">Si está activa, una venta a fiado suma al saldo hasta el límite.</p>
                  </div>
                  <button type="button" role="switch" aria-checked={form.cuentaCorriente} aria-label="Cuenta corriente" className={`relative h-6 w-11 shrink-0 rounded-full ${form.cuentaCorriente ? 'bg-fill' : 'bg-raise'}`} onClick={() => onChange({ ...form, cuentaCorriente: !form.cuentaCorriente })}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-card transition-all ${form.cuentaCorriente ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </div>
                {form.cuentaCorriente && (
                  <>
                    <label className="block text-xs font-semibold text-muted">Límite de crédito
                      <span className="mt-1.5 flex items-center rounded-xl border border-accent/30 bg-card focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
                        <span className="pl-3 text-sm font-black text-faint">$</span>
                        <input className="w-full bg-transparent px-2 py-2 text-lg font-black text-ink outline-none" inputMode="decimal" min="0" placeholder="Sin límite" value={form.limiteCredito} onChange={(event) => onChange({ ...form, limiteCredito: event.target.value })} />
                      </span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[['50000', '$ 50.000'], ['100000', '$ 100.000'], ['', 'Sin límite']].map(([valor, texto]) => (
                        <button type="button" key={texto} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${String(form.limiteCredito) === valor ? 'bg-fill text-onfill' : 'bg-card text-muted ring-1 ring-line'}`} onClick={() => onChange({ ...form, limiteCredito: valor })}>{texto}</button>
                      ))}
                    </div>
                    {!nuevo && <p className="text-[11px] text-muted">Saldo actual {pesos(form.saldo)}{form.limiteCredito !== '' ? ` · disponible ${pesos(Math.max(Number(form.limiteCredito) - Number(form.saldo || 0), 0))}` : ''}</p>}
                    <label className="block text-xs font-semibold text-muted">Plazo habitual de pago
                      <select className="mt-1.5 w-full rounded-xl border border-accent/30 bg-card px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-accent" value={form.plazoDias} onChange={(event) => onChange({ ...form, plazoDias: Number(event.target.value) })}>
                        {plazosCliente.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                      </select>
                    </label>
                    <label className="flex items-start gap-2 text-xs font-medium text-muted">
                      <input type="checkbox" className="mt-0.5 accent-fill" checked={form.avisoVencimiento} onChange={(event) => onChange({ ...form, avisoVencimiento: event.target.checked })} />
                      Marcar para avisar por WhatsApp cuando venza el plazo
                    </label>
                    <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">Las compras a fiado se suman a este saldo y quedan en la ficha.</p>
                  </>
                )}
              </section>

              <section className="space-y-3 rounded-2xl border border-line bg-sunken/70 p-4">
                <h3 className="text-[11px] font-bold tracking-wide text-accent">PREFERENCIAS</h3>
                <div>
                  <p className="text-xs font-semibold text-muted">Prendas de mayor interés</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {interesesCliente.map((item) => {
                      const activo = form.intereses.includes(item.id);
                      return (
                        <button type="button" key={item.id} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${activo ? 'bg-accent-soft text-accent ring-1 ring-accent' : 'bg-card text-muted ring-1 ring-line'}`} onClick={() => onChange({ ...form, talleCalzado: item.id === 'CALZADO' && activo ? '' : form.talleCalzado, tallePantalon: item.id === 'PANTALONES' && activo ? '' : form.tallePantalon, intereses: activo ? form.intereses.filter((id) => id !== item.id) : [...form.intereses, item.id] })}>{item.label}</button>
                      );
                    })}
                  </div>
                </div>
                {compraRopa(form.intereses) && (
                  <div>
                    <p className="text-xs font-semibold text-muted">{compraCalzado(form.intereses) ? 'Talle de ropa' : 'Talle habitual'}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {tallesCliente.map((talle) => (
                        <button type="button" key={talle} className={`grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold ${form.talle === talle ? 'bg-fill text-onfill' : 'bg-card text-muted ring-1 ring-line'}`} onClick={() => onChange({ ...form, talle: form.talle === talle ? '' : talle })}>{talle}</button>
                      ))}
                    </div>
                  </div>
                )}
                {compraPantalon(form.intereses) && (
                  <div>
                    <p className="text-xs font-semibold text-muted">Número de pantalón</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {numerosPantalon.map((numero) => (
                        <button type="button" key={numero} className={`grid h-8 min-w-8 place-items-center rounded-full px-1.5 text-[11px] font-bold ${form.tallePantalon === numero ? 'bg-fill text-onfill' : 'bg-card text-muted ring-1 ring-line'}`} onClick={() => onChange({ ...form, tallePantalon: form.tallePantalon === numero ? '' : numero })}>{numero}</button>
                      ))}
                    </div>
                  </div>
                )}
                {compraCalzado(form.intereses) && (
                  <div>
                    <p className="text-xs font-semibold text-muted">Número de calzado</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {numerosCalzado.map((numero) => (
                        <button type="button" key={numero} className={`grid h-8 min-w-8 place-items-center rounded-full px-1.5 text-[11px] font-bold ${form.talleCalzado === numero ? 'bg-fill text-onfill' : 'bg-card text-muted ring-1 ring-line'}`} onClick={() => onChange({ ...form, talleCalzado: form.talleCalzado === numero ? '' : numero })}>{numero}</button>
                      ))}
                    </div>
                  </div>
                )}
                <label className="block text-xs font-semibold text-muted">Notas de estilo o atención
                  <textarea className="mt-1.5 h-20 w-full resize-none rounded-xl border border-line bg-card p-3 text-xs text-ink outline-none placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/20" placeholder="Preferencias de prenda, color o aviso para la próxima visita" value={form.observaciones} onChange={(event) => onChange({ ...form, observaciones: event.target.value })} />
                </label>
              </section>
            </div>
          </div>
          {mensaje && <p className="mt-4 text-sm font-semibold text-rose-600">{mensaje}</p>}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-card px-7 py-4">
          <button type="button" className="text-sm font-semibold text-muted transition-colors hover:text-ink" onClick={onClose}>Cancelar</button>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-sunken disabled:opacity-60" disabled={guardando} onClick={(event) => enviar(event, true)}>Guardar y crear venta</button>
            <button type="submit" className="flex items-center gap-2 rounded-xl bg-fill px-6 py-2.5 text-sm font-bold text-onfill shadow-md shadow-fill/25 hover:bg-fill-hover disabled:opacity-60" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar cliente'}
              {!guardando && <CheckMini />}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

function Cobro({ cliente, mensaje, onClose, onCobrar }) {
  const [monto, setMonto] = useState(String(cliente.saldo || ''));
  const [medio, setMedio] = useState('EFECTIVO');
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-neutral-900/40 p-4" onClick={onClose}>
      <form className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-xl" onClick={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); onCobrar(monto, medio); }}>
        <h2 className="text-lg font-black text-ink">Cobrar saldo</h2>
        <p className="mt-1 text-xs text-muted">{cliente.nombre} debe {pesos(cliente.saldo)}. El cobro baja el saldo. Si hay una caja abierta, también queda en el turno.</p>
        <label className="mt-3 block text-xs font-semibold text-muted">Monto
          <input className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-bold outline-none focus:border-accent" type="number" min="0.01" step="0.01" max={cliente.saldo} value={monto} onChange={(event) => setMonto(event.target.value)} required />
        </label>
        <div className="mt-3 grid gap-2">
          {medios.map((item) => (
            <button type="button" key={item.id} className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold ${medio === item.id ? 'border-accent bg-accent-soft text-accent' : 'border-line text-ink'}`} onClick={() => setMedio(item.id)}>{item.label}</button>
          ))}
        </div>
        {mensaje && <p className="mt-3 text-sm font-semibold text-rose-600">{mensaje}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="rounded-xl px-3 py-2 text-sm font-semibold text-muted" onClick={onClose}>Cancelar</button>
          <button type="submit" className="rounded-xl bg-fill px-4 py-2 text-sm font-bold text-onfill">Registrar cobro</button>
        </div>
      </form>
    </div>
  );
}

function Estrella() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="m12 3 2.4 5.4 5.8.6-4.4 3.8 1.3 5.7L12 15.8 6.9 18.5l1.3-5.7L3.8 9l5.8-.6L12 3z" />
    </svg>
  );
}

function Billetera() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="16.5" cy="14.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function Telefono() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M7 3h3l1.5 4-2 1.5a12 12 0 0 0 6 6L17 13l4 1.5V18a2 2 0 0 1-2 2A15 15 0 0 1 4 5a2 2 0 0 1 2-2z" />
    </svg>
  );
}

function WhatsApp() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
      <path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.7-1.2A9 9 0 1 0 12 3zm5 12.6c-.2.6-1.2 1.1-1.7 1.1-.4.1-.9.2-2.9-.6-2.4-1-4-3.5-4.1-3.6-.1-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.2-.2.5-.3.8-.3h.6c.2 0 .4 0 .6.5.2.6.8 2 .8 2.1.1.2 0 .4-.1.5l-.4.5c-.1.2-.3.3-.1.6.2.3.7 1.2 1.6 1.9 1.1.9 1.9 1.1 2.2 1.3.3.1.4.1.6-.1l.8-.9c.2-.2.4-.2.6-.1.2.1 1.6.8 1.9.9.3.2.4.2.5.3.1.2 0 .7-.2 1.2z" />
    </svg>
  );
}

function UsuarioMas() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="10" cy="8" r="3" />
      <path d="M4 19v-1.2A3.8 3.8 0 0 1 7.8 14h4.4A3.8 3.8 0 0 1 16 17.8V19" />
      <path d="M19 8v6M16 11h6" />
    </svg>
  );
}

function Cerrar() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function Correo() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function CheckMini() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M5 12.5 10 17l9-9" />
    </svg>
  );
}

function Lapiz() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 20h4l10-10-4-4L4 16v4z" />
      <path d="m13 7 4 4" />
    </svg>
  );
}
