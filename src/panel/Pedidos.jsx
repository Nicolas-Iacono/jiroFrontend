import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import Comanda from './Comanda.jsx';
import MapaDomicilio from './MapaDomicilio.jsx';
import PedidoManual from './PedidoManual.jsx';
import { Billete, Lupa, Paquete } from './Iconos.jsx';

const porPagina = 6;
const medios = [
  { id: 'EFECTIVO', label: 'Efectivo' },
  { id: 'TRANSFERENCIA', label: 'Transferencia' },
  { id: 'TARJETA', label: 'Tarjeta' },
  { id: 'CUENTA_CORRIENTE', label: 'Cuenta corriente' },
];
const estados = {
  PENDIENTE: { label: 'Pendiente', clase: 'bg-amber-50 text-amber-700' },
  ENTREGADO: { label: 'Entregado', clase: 'bg-emerald-50 text-emerald-700' },
  CANCELADO: { label: 'Cancelado', clase: 'bg-sunken text-muted' },
};

function pesos(valor) {
  const texto = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(Number(valor) || 0));
  return `$ ${texto}`;
}

function unidades(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return String(valor ?? '');
  return Number.isInteger(numero) ? String(numero) : numero.toLocaleString('es-AR', { maximumFractionDigits: 3 });
}

function cuando(iso) {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  const hoy = new Date();
  const hora = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  if (fecha.toDateString() === hoy.toDateString()) return `Hoy ${hora}`;
  return `${fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} ${hora}`;
}

function esHoy(iso) {
  const fecha = new Date(iso);
  return !Number.isNaN(fecha.getTime()) && fecha.toDateString() === new Date().toDateString();
}

function whatsapp(telefono) {
  const digitos = String(telefono || '').replace(/\D/g, '');
  return digitos.length >= 8 ? `https://wa.me/${digitos}` : '';
}

function entregaDe(pedido) {
  const modo = pedido?.entrega || 'LOCAL';
  if (modo === 'LOCAL') return { titulo: 'Retiro en el local', detalle: 'El cliente retira en el local.' };
  const calle = [pedido.direccion, pedido.altura].filter(Boolean).join(' ');
  const zona = [pedido.localidad, pedido.partido, pedido.provincia].filter(Boolean).join(', ');
  const cp = pedido.codigoPostal ? `CP ${pedido.codigoPostal}` : '';
  const lejos = pedido.distanciaKm != null ? `${new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Number(pedido.distanciaKm))} km` : '';
  return {
    titulo: modo === 'DOMICILIO' ? 'Entrega a domicilio' : (pedido.puntoNombre ? `Punto de retiro · ${pedido.puntoNombre}` : 'Punto de retiro'),
    detalle: [calle, zona, cp, lejos].filter(Boolean).join(' · '),
  };
}

function resumenItems(pedido) {
  const items = pedido.items || [];
  if (!items.length) return 'Sin prendas';
  const texto = items.slice(0, 2).map((item) => `${unidades(item.cantidad)} × ${item.producto}${item.variante ? ` (${item.variante})` : ''}`).join(' · ');
  return items.length > 2 ? `${texto} · +${items.length - 2}` : texto;
}

export default function Pedidos() {
  const [pedidos, setPedidos] = useState(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [version, setVersion] = useState(0);
  const [filtro, setFiltro] = useState('todos');
  const [buscar, setBuscar] = useState('');
  const [pagina, setPagina] = useState(0);
  const [elegido, setElegido] = useState(null);
  const [detalle, setDetalle] = useState(false);
  const [cobro, setCobro] = useState(false);
  const [toque, setToque] = useState('');
  const [crear, setCrear] = useState(false);

  useEffect(() => {
    let vivo = true;
    api('/api/pedidos')
      .then((lista) => {
        if (!vivo) return;
        setPedidos(lista);
        setElegido((actual) => (actual && lista.some((pedido) => pedido.id === actual) ? actual : lista.find((pedido) => pedido.estado === 'PENDIENTE')?.id ?? lista[0]?.id ?? null));
      })
      .catch((err) => vivo && setError(err.message));
    return () => { vivo = false; };
  }, [version]);

  const pendientes = (pedidos || []).filter((pedido) => pedido.estado === 'PENDIENTE');
  const entregados = (pedidos || []).filter((pedido) => pedido.estado === 'ENTREGADO');
  const entregadosHoy = entregados.filter((pedido) => esHoy(pedido.fecha));
  const cancelados = (pedidos || []).filter((pedido) => pedido.estado === 'CANCELADO');
  const aCobrar = pendientes.reduce((suma, pedido) => suma + Number(pedido.total || 0), 0);

  const visibles = useMemo(() => (pedidos || []).filter((pedido) => {
    if (filtro === 'pendientes' && pedido.estado !== 'PENDIENTE') return false;
    if (filtro === 'entregados' && pedido.estado !== 'ENTREGADO') return false;
    if (filtro === 'cancelados' && pedido.estado !== 'CANCELADO') return false;
    const texto = `${pedido.id} ${pedido.cliente || ''} ${pedido.telefono || ''} ${(pedido.items || []).map((item) => `${item.producto} ${item.variante || ''}`).join(' ')}`.toLowerCase();
    return texto.includes(buscar.trim().toLowerCase());
  }), [pedidos, filtro, buscar]);

  const paginas = Math.max(1, Math.ceil(visibles.length / porPagina));
  const paginaSegura = Math.min(pagina, paginas - 1);
  const hoja = visibles.slice(paginaSegura * porPagina, paginaSegura * porPagina + porPagina);
  const activo = (pedidos || []).find((pedido) => pedido.id === elegido) || null;

  async function cancelar(pedido) {
    if (!window.confirm(`¿Cancelar el pedido #${pedido.id}? No se descuenta stock.`)) return;
    setAviso('');
    try {
      await api(`/api/pedidos/${pedido.id}/cancelar`, { method: 'POST' });
      setAviso(`Pedido #${pedido.id} cancelado`);
      setVersion((valor) => valor + 1);
    } catch (err) {
      setAviso(err.message);
    }
  }

  if (error) return <p className="text-sm font-semibold text-rose-600">{error}</p>;
  if (!pedidos) return <p className="text-sm text-muted">Cargando pedidos…</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex flex-wrap items-center gap-2.5 text-2xl font-black text-ink">
            Gestión de Pedidos
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent">{pendientes.length} {pendientes.length === 1 ? 'pendiente' : 'pendientes'}</span>
          </h1>
          {aviso && <p className="mt-1 w-fit rounded-xl bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">{aviso}</p>}
          <p className="mt-0.5 text-xs text-muted">Pedidos sin cobrar. Al confirmarlos se descuenta el stock y se registra la venta.</p>
        </div>
        <button type="button" className="rounded-xl bg-fill px-4 py-2 text-sm font-bold text-onfill shadow-md hover:bg-fill-hover" onClick={() => setCrear(true)}>+ Crear pedido</button>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <Tarjeta titulo="Pendientes" icono={<Paquete className="h-4 w-4" />} tono="bg-amber-50 text-amber-600">
          <p className="text-2xl font-black text-ink">{pendientes.length}</p>
          <p className="text-[11px] text-faint">Sin cobrar ni entregar</p>
        </Tarjeta>
        <Tarjeta titulo="Entregados hoy" icono={<CheckMini />} tono="bg-emerald-50 text-emerald-600">
          <p className="text-2xl font-black text-ink">{entregadosHoy.length}</p>
          <p className="text-[11px] font-medium text-emerald-600">{entregados.length} cobrados en total</p>
        </Tarjeta>
        <Tarjeta titulo="Cancelados" icono={<CerrarMini />} tono="bg-sunken text-muted">
          <p className="text-2xl font-black text-ink">{cancelados.length}</p>
          <p className="text-[11px] text-faint">No descontaron stock</p>
        </Tarjeta>
        <Tarjeta titulo="A cobrar" icono={<Billete className="h-4 w-4" />} tono="bg-accent-soft text-accent">
          <p className="text-2xl font-black text-accent">{pesos(aCobrar)}</p>
          <p className="text-[11px] text-faint">Suma de los pedidos pendientes</p>
        </Tarjeta>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Pastilla activo={filtro === 'todos'} onClick={() => { setFiltro('todos'); setPagina(0); }}>Todos {pedidos.length}</Pastilla>
        <Pastilla activo={filtro === 'pendientes'} onClick={() => { setFiltro('pendientes'); setPagina(0); }}>Pendientes {pendientes.length}</Pastilla>
        <Pastilla activo={filtro === 'entregados'} onClick={() => { setFiltro('entregados'); setPagina(0); }}>Entregados {entregados.length}</Pastilla>
        <Pastilla activo={filtro === 'cancelados'} onClick={() => { setFiltro('cancelados'); setPagina(0); }}>Cancelados {cancelados.length}</Pastilla>
      </div>

      <label className="flex min-w-[220px] items-center gap-2 rounded-xl border border-line bg-sunken px-3 py-2 text-xs text-faint">
        <Lupa className="h-3.5 w-3.5 shrink-0" />
        <input className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-faint" placeholder="Buscar por número, cliente o prenda" value={buscar} onChange={(event) => { setBuscar(event.target.value); setPagina(0); }} />
      </label>

      <div>
        <section className="overflow-hidden rounded-2xl border border-line/80 bg-card shadow-sm">
          {hoja.length === 0 && <p className="px-4 py-8 text-sm text-muted">{pedidos.length === 0 ? 'Todavía no hay pedidos.' : 'Nadie coincide con este filtro.'}</p>}
          {hoja.map((pedido) => {
            const estado = estados[pedido.estado] || estados.PENDIENTE;
            const seleccionado = pedido.id === elegido;
            return (
              <button type="button" key={pedido.id} className={`grid w-full gap-1 border-b border-line px-4 py-3 text-left ${seleccionado && detalle ? 'bg-accent-soft/70 shadow-[inset_3px_0_0_rgb(var(--fill))]' : 'hover:bg-sunken'}`} onClick={() => { setElegido(pedido.id); setDetalle(true); }}>
                <span className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-bold text-ink">#{pedido.id}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${estado.clase}`}>{estado.label}</span>
                </span>
                <span className="truncate text-sm font-semibold text-ink">{pedido.cliente || (pedido.entrega === 'LOCAL' || !pedido.entrega ? 'Compra en local' : 'Sin cliente')}</span>
                <span className="flex items-end justify-between gap-3">
                  <span className="line-clamp-2 text-xs text-muted">{resumenItems(pedido)}</span>
                  <span className="shrink-0 text-sm font-black text-ink">{pesos(pedido.total)}</span>
                </span>
                <span className="text-[11px] text-faint">{cuando(pedido.fecha)} · {entregaDe(pedido).titulo}</span>
              </button>
            );
          })}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-muted">
            <span>{visibles.length === 0 ? '0 pedidos' : `Mostrando ${paginaSegura * porPagina + 1}-${Math.min(visibles.length, paginaSegura * porPagina + porPagina)} de ${visibles.length}`}</span>
            <span className="flex items-center gap-1">
              <button type="button" className="rounded-lg px-2 py-1 hover:bg-sunken disabled:opacity-40" disabled={paginaSegura === 0} onClick={() => setPagina(paginaSegura - 1)}>Anterior</button>
              <span className="grid h-7 min-w-7 place-items-center rounded-lg bg-fill px-2 font-bold text-onfill">{paginaSegura + 1}</span>
              <button type="button" className="rounded-lg px-2 py-1 hover:bg-sunken disabled:opacity-40" disabled={paginaSegura >= paginas - 1} onClick={() => setPagina(paginaSegura + 1)}>Siguiente</button>
            </span>
          </div>
        </section>

      </div>

      {detalle && activo && (
        <DetallePedido
          key={activo.id}
          pedido={activo}
          previos={(pedidos || []).filter((pedido) => pedido.clienteId && pedido.clienteId === activo.clienteId && pedido.id !== activo.id).length}
          onClose={() => setDetalle(false)}
          onCobrar={() => { setToque(''); setCobro(true); }}
          onCancelar={() => cancelar(activo)}
        />
      )}

      {cobro && activo && (
        <Cobro
          pedido={activo}
          mensaje={toque}
          onClose={() => setCobro(false)}
          onCobrar={async (medio) => {
            setToque('');
            try {
              await api(`/api/pedidos/${activo.id}/confirmar`, { method: 'POST', body: { medio } });
              setAviso(`Pedido #${activo.id} cobrado`);
              sessionStorage.removeItem(`giro-picking-${activo.id}`);
              setCobro(false);
              setVersion((valor) => valor + 1);
            } catch (err) {
              setToque(err.message);
            }
          }}
        />
      )}

      {crear && (
        <PedidoManual
          onClose={() => setCrear(false)}
          onLista={() => setVersion((valor) => valor + 1)}
        />
      )}
    </div>
  );
}

function clavePicking(pedido) {
  return `giro-picking-${pedido.id}`;
}

function leerPicking(pedido) {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(clavePicking(pedido)) || '[]'));
  } catch {
    return new Set();
  }
}

function DetallePedido({ pedido, previos, onClose, onCobrar, onCancelar }) {
  const items = pedido.items || [];
  const [listos, setListos] = useState(() => (pedido.estado === 'PENDIENTE' ? leerPicking(pedido) : new Set(items.map((_, indice) => indice))));
  const marcados = items.filter((_, indice) => listos.has(indice)).length;
  const progreso = items.length ? Math.round((marcados / items.length) * 100) : 0;
  const chat = whatsapp(pedido.telefono);
  const entrega = entregaDe(pedido);
  const estado = estados[pedido.estado] || estados.PENDIENTE;
  const pendiente = pedido.estado === 'PENDIENTE';
  const [comanda, setComanda] = useState(false);

  function marcar(indice) {
    if (!pendiente) return;
    const copia = new Set(listos);
    if (copia.has(indice)) copia.delete(indice);
    else copia.add(indice);
    setListos(copia);
    sessionStorage.setItem(clavePicking(pedido), JSON.stringify([...copia]));
  }

  function avisar() {
    if (!chat) return;
    const entrega = entregaDe(pedido);
    const texto = encodeURIComponent(`Pedido #${pedido.id}. ${entrega.titulo}. ${entrega.detalle} Total ${pesos(pedido.total)}`);
    window.open(`${chat}?text=${texto}`, '_blank', 'noopener');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 pt-10 font-sans antialiased backdrop-blur-sm md:p-8" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-line bg-card shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-start justify-between gap-3 border-b border-line bg-card px-7 py-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><Recibo /></span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-ink">Pedido #{pedido.id}</h2>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${estado.clase}`}>{estado.label}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted">{cuando(pedido.fecha)} · {items.length} {items.length === 1 ? 'prenda' : 'prendas'} · {entrega.titulo}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" className="rounded-xl border border-line bg-card px-3 py-1.5 text-xs font-semibold text-ink hover:bg-sunken" onClick={() => setComanda(true)}>Imprimir comanda</button>
            <button type="button" className="grid h-9 w-9 place-items-center rounded-full bg-sunken text-faint hover:bg-raise hover:text-ink" onClick={onClose} aria-label="Cerrar"><CerrarMini /></button>
          </div>
        </header>

        <div className="space-y-4 overflow-y-auto px-7 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <section className="flex items-center justify-between gap-3 rounded-2xl border border-line/90 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-bold text-accent">{iniciales(pedido.cliente)}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">{pedido.cliente || (pedido.entrega === 'LOCAL' || !pedido.entrega ? 'Compra en local' : 'Sin cliente')}{pedido.categoria && pedido.categoria !== 'ESTANDAR' ? <span className="ml-2 rounded bg-accent-soft px-1.5 text-[10px] font-bold text-accent">{pedido.categoria}</span> : null}</p>
                  <p className="truncate text-xs text-muted">{pedido.telefono || 'Sin teléfono'}</p>
                  {pedido.clienteId && <p className="text-[11px] text-faint">{previos} {previos === 1 ? 'pedido previo' : 'pedidos previos'}</p>}
                </div>
              </div>
              {chat && <a className="shrink-0 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600" href={chat} target="_blank" rel="noreferrer">WhatsApp</a>}
            </section>
            <section className="rounded-2xl border border-line/90 p-4">
              <p className="text-sm font-bold text-ink">{entrega.titulo}</p>
              <p className="mt-0.5 text-xs text-muted">{entrega.detalle}</p>
              {pedido.entrega === 'DOMICILIO' && (
                <div className="mt-3">
                  <MapaDomicilio direccion={pedido.direccion} altura={pedido.altura} localidad={pedido.localidad} partido={pedido.partido} provincia={pedido.provincia} codigoPostal={pedido.codigoPostal} />
                </div>
              )}
            </section>
          </div>

          <section className="space-y-3 rounded-2xl border border-line/90 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-bold tracking-wider text-ink">CHECKLIST DE PREPARACIÓN</p>
              <div className="flex items-center gap-2">
                <span className="h-2 w-28 overflow-hidden rounded-full bg-sunken"><span className="block h-full rounded-full bg-fill" style={{ width: `${progreso}%` }} /></span>
                <span className="text-xs font-bold text-accent">{marcados} de {items.length} listos ({progreso}%)</span>
              </div>
            </div>
            {items.length === 0 && <p className="text-sm text-muted">Este pedido no tiene prendas.</p>}
            {items.map((item, indice) => {
              const listo = listos.has(indice);
              return (
                <button type="button" key={`${item.productoId}-${item.varianteId || indice}`} className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left ${listo ? 'border-line bg-sunken/70' : 'border-line'}`} onClick={() => marcar(indice)}>
                  <span className="flex min-w-0 items-start gap-3">
                    <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md text-xs font-bold text-white ${listo ? 'bg-fill' : 'border-2 border-line'}`}>{listo ? '✓' : ''}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-ink">{unidades(item.cantidad)} × {item.producto}</span>
                      <span className="block text-[11px] text-faint">{item.sku ? `SKU ${item.sku}` : 'Sin SKU'}{item.variante ? ` · Talle ${item.variante}` : ''}</span>
                      <span className={`text-xs font-bold ${listo ? 'text-emerald-600' : 'text-amber-600'}`}>{listo ? 'Empacado' : 'Por buscar'}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-black text-ink">{pesos(item.subtotal)}</span>
                </button>
              );
            })}
          </section>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {pedido.nota && (
              <section className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4">
                <p className="text-xs font-bold text-amber-900">Nota del cliente</p>
                <p className="mt-1 text-xs italic leading-relaxed text-amber-800">{pedido.nota}</p>
              </section>
            )}
            <section className="rounded-2xl border border-line/90 p-4">
              <div className="flex justify-between text-xs text-muted"><span>Prendas</span><span>{pesos(Number(pedido.total || 0) - Number(pedido.envio || 0))}</span></div>
              {Number(pedido.envio) > 0 && <div className="mt-1 flex justify-between text-xs text-muted"><span>Envío{pedido.distanciaKm != null ? ` · ${pedido.distanciaKm} km` : ''}</span><span>{pesos(pedido.envio)}</span></div>}
              <div className="mt-2 flex items-baseline justify-between border-t border-dashed border-line pt-2">
                <span className="text-sm font-bold text-ink">{pendiente ? 'A cobrar' : pedido.estado === 'ENTREGADO' ? 'Cobrado' : 'Total'}</span>
                <span className="text-xl font-black text-ink">{pesos(pedido.total)}</span>
              </div>
              {pedido.estado === 'ENTREGADO' && <p className="mt-2 text-xs font-medium text-emerald-700">El stock ya se descontó.</p>}
              {pedido.estado === 'CANCELADO' && <p className="mt-2 text-xs font-medium text-muted">Cancelado. No generó venta.</p>}
            </section>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-card px-7 py-4">
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:text-ink" onClick={onClose}>Cerrar</button>
            {pendiente && <button type="button" className="text-xs font-semibold text-faint hover:text-rose-600" onClick={onCancelar}>Cancelar pedido</button>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {chat && pendiente && <button type="button" className="rounded-xl border border-emerald-500 px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50" onClick={avisar}>Avisar por WhatsApp</button>}
            {pendiente && <button type="button" className="rounded-xl bg-fill px-6 py-2.5 text-sm font-bold text-onfill shadow-md shadow-fill/25 hover:bg-fill-hover disabled:opacity-40" disabled={items.length > 0 && marcados < items.length} onClick={onCobrar}>Cobrar y entregar</button>}
          </div>
        </footer>
      </div>
      {comanda && <Comanda pedido={pedido} listos={listos} onClose={() => setComanda(false)} />}
    </div>
  );
}

function iniciales(nombre) {
  const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] || '?') + (partes[1]?.[0] || '')).toUpperCase();
}

function Recibo() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M7 3h10v18l-2-1.5L13 21l-2-1.5L9 21l-2-1.5L5 21V3h2z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
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

function Cobro({ pedido, mensaje, onClose, onCobrar }) {
  const opciones = pedido.clienteId ? medios : medios.filter((item) => item.id !== 'CUENTA_CORRIENTE');
  const [medio, setMedio] = useState('EFECTIVO');
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <form className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-xl" onClick={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); onCobrar(medio); }}>
        <h2 className="text-lg font-black text-ink">Cobrar pedido #{pedido.id}</h2>
        <p className="mt-1 text-xs text-muted">Total {pesos(pedido.total)}. El pedido se cobra y pasa a entregado.</p>
        <div className="mt-3 grid gap-2">
          {opciones.map((item) => (
            <button type="button" key={item.id} className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold ${medio === item.id ? 'border-accent bg-accent-soft text-accent' : 'border-line text-ink'}`} onClick={() => setMedio(item.id)}>{item.label}</button>
          ))}
        </div>
        {mensaje && <p className="mt-3 text-sm font-semibold text-rose-600">{mensaje}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="rounded-xl px-3 py-2 text-sm font-semibold text-muted" onClick={onClose}>Cancelar</button>
          <button type="submit" className="rounded-xl bg-fill px-4 py-2 text-sm font-bold text-onfill">Confirmar cobro</button>
        </div>
      </form>
    </div>
  );
}

function CheckMini() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M5 12.5 10 17l9-9" />
    </svg>
  );
}

function CerrarMini() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
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
