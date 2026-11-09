import { useEffect, useMemo, useRef, useState } from 'react';
import { api, plata } from '../api.js';
import { Lupa } from './Iconos.jsx';

function pesos(valor) {
  const texto = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(Number(valor) || 0));
  return `$ ${texto}`;
}

function numero(valor) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 }).format(Number(valor) || 0);
}

function iniciales(nombre) {
  const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] || '?') + (partes[1]?.[0] || '')).toUpperCase();
}

function hayPromo(producto) {
  return Number(producto.precioVigente) !== Number(producto.precio);
}

function precioDe(producto, variante) {
  if (hayPromo(producto)) return Number(producto.precioVigente);
  if (variante && variante.precio != null) return Number(variante.precio);
  return Number(producto.precioVigente ?? producto.precio);
}

function tonoStock(stock, minimo) {
  const actual = Number(stock);
  if (actual <= 0) return 'bg-rose-50 text-rose-600';
  if (Number(minimo) > 0 && actual <= Number(minimo)) return 'bg-amber-50 text-amber-700';
  return 'bg-emerald-50 text-emerald-700';
}

const cobros = [
  { id: 'EFECTIVO', titulo: 'Efectivo en mostrador', detalle: 'Cobro en efectivo. Si hay una caja abierta, queda en el turno.' },
  { id: 'TRANSFERENCIA', titulo: 'Transferencia', detalle: 'Anotá la venta cuando la plata ya está acreditada.' },
  { id: 'TARJETA', titulo: 'Tarjeta débito o crédito', detalle: 'El cobro se hace en el posnet. GIRO registra el medio.' },
  { id: 'CUENTA_CORRIENTE', titulo: 'Cuenta corriente', detalle: 'El total queda en el saldo del cliente y no entra a la caja.' },
];

export default function RegistrarVenta({ onClose, onLista, clienteInicial = '' }) {
  const busqueda = useRef(null);
  const [paso, setPaso] = useState(1);
  const [productos, setProductos] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [buscar, setBuscar] = useState('');
  const [categoria, setCategoria] = useState('');
  const [talles, setTalles] = useState({});
  const [carrito, setCarrito] = useState([]);
  const [clienteId, setClienteId] = useState(clienteInicial ? String(clienteInicial) : '');
  const [cambiarCliente, setCambiarCliente] = useState(false);
  const [medio, setMedio] = useState('EFECTIVO');
  const [pagaCon, setPagaCon] = useState('');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      api('/api/productos'),
      api('/api/clientes').catch(() => []),
    ]).then(([catalogo, gente]) => {
      if (!vivo) return;
      setProductos(catalogo);
      setClientes(gente);
    }).catch((err) => vivo && setError(err.message));
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    function tecla(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onClose]);

  const activos = useMemo(() => (productos || []).filter((producto) => producto.activo), [productos]);
  const categorias = useMemo(
    () => [...new Set(activos.map((producto) => producto.categoria).filter(Boolean))],
    [activos],
  );
  const cliente = clientes.find((item) => String(item.id) === String(clienteId)) || null;

  const visibles = activos.filter((producto) => {
    if (categoria && producto.categoria !== categoria) return false;
    const texto = buscar.trim().toLowerCase();
    if (!texto) return true;
    const variantes = (producto.variantes || []).some((variante) => `${variante.nombre} ${variante.sku || ''}`.toLowerCase().includes(texto));
    return `${producto.nombre} ${producto.sku || ''} ${producto.categoria || ''}`.toLowerCase().includes(texto) || variantes;
  });

  const unidades = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  const total = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  const descuento = carrito.reduce((sum, item) => {
    if (!item.promo) return sum;
    return sum + Math.max(0, item.lista - item.precio) * item.cantidad;
  }, 0);
  const recibido = Number(pagaCon);
  const vuelto = Number.isFinite(recibido) ? recibido - total : 0;

  function agregar(producto, variante) {
    if (producto.usaVariantes && !variante) {
      setTalles((actual) => ({ ...actual, [producto.id]: actual[producto.id] || 'falta' }));
      return;
    }
    const stock = Number(variante ? variante.stock : producto.stock);
    if (stock <= 0) return;
    const clave = `${producto.id}-${variante?.id || 0}`;
    const precio = precioDe(producto, variante);
    setCarrito((actual) => {
      const ya = actual.find((item) => item.clave === clave);
      if (ya) {
        if (ya.cantidad + 1 > stock) return actual;
        return actual.map((item) => (item.clave === clave ? { ...item, cantidad: item.cantidad + 1 } : item));
      }
      return [...actual, {
        clave,
        productoId: producto.id,
        varianteId: variante?.id || null,
        nombre: producto.nombre,
        detalle: variante?.nombre || '',
        precio,
        lista: Number(variante?.precio ?? producto.precio),
        promo: hayPromo(producto),
        stock,
        cantidad: 1,
      }];
    });
  }

  function cambiarCantidad(clave, delta) {
    setCarrito((actual) => actual.flatMap((item) => {
      if (item.clave !== clave) return [item];
      const cantidad = item.cantidad + delta;
      if (cantidad <= 0) return [];
      if (cantidad > item.stock) return [item];
      return [{ ...item, cantidad }];
    }));
  }

  function alEnter(event) {
    if (event.key !== 'Enter') return;
    const texto = buscar.trim().toLowerCase();
    if (!texto) return;
    const producto = activos.find((item) => (item.sku || '').toLowerCase() === texto
      || (item.variantes || []).some((variante) => (variante.sku || '').toLowerCase() === texto));
    if (!producto) return;
    const variante = (producto.variantes || []).find((item) => (item.sku || '').toLowerCase() === texto) || null;
    agregar(producto, producto.usaVariantes ? variante : null);
    setBuscar('');
  }

  function items() {
    return carrito.map(({ productoId, varianteId, cantidad }) => ({ productoId, varianteId, cantidad }));
  }

  async function guardarPendiente() {
    setMensaje('');
    setOcupado(true);
    try {
      const pedido = await api('/api/pedidos', {
        method: 'POST',
        body: { clienteId: clienteId ? Number(clienteId) : null, items: items() },
      });
      setMensaje(`Pedido #${pedido.id} guardado como pendiente.`);
      onLista();
    } catch (err) {
      setMensaje(err.message);
    } finally {
      setOcupado(false);
    }
  }

  async function cobrar() {
    setMensaje('');
    setOcupado(true);
    try {
      const venta = await api('/api/ventas', {
        method: 'POST',
        body: { clienteId: clienteId ? Number(clienteId) : null, medio, items: items() },
      });
      setMensaje(`Venta #${venta.id} por ${plata(venta.total)}. Ganancia ${plata(venta.ganancia)}.`);
      setCarrito([]);
      onLista();
    } catch (err) {
      setMensaje(err.message);
    } finally {
      setOcupado(false);
    }
  }

  const faltaCliente = medio === 'CUENTA_CORRIENTE' && !cliente;
  const disponibleCredito = cliente && cliente.limiteCredito != null ? Number(cliente.limiteCredito) - Number(cliente.saldo || 0) : null;
  const frenoCuenta = cliente && cliente.cuentaCorriente === false
    ? 'Sin cuenta corriente habilitada'
    : disponibleCredito != null && total > disponibleCredito + 0.001
      ? `Supera el límite. Disponible ${pesos(Math.max(disponibleCredito, 0))}`
      : '';
  const cuentaBloqueada = medio === 'CUENTA_CORRIENTE' && Boolean(frenoCuenta);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 font-sans text-ink backdrop-blur-sm sm:p-6" onClick={onClose}>
      <div className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-3xl border border-line bg-card shadow-2xl ${paso === 1 ? 'max-w-4xl' : 'max-w-2xl'}`} onClick={(event) => event.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-card px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-accent/20/60 bg-accent-soft text-accent shadow-sm">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 4.5v15m7.5-7.5h-15" /></svg>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-ink sm:text-xl">{paso === 1 ? 'Registrar nueva venta' : 'Registrar cobro de venta'}</h2>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${paso === 1 ? 'bg-accent-soft text-accent' : 'bg-fill text-onfill'}`}>
                  {paso === 1 ? 'Paso 1 de 2: Productos y carrito' : pesos(total)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted">
                {paso === 1 ? 'Seleccioná productos del inventario o ingresá el SKU' : 'El cobro usa los medios que ya registra GIRO'}
              </p>
            </div>
          </div>
          <button type="button" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sunken text-faint hover:bg-raise hover:text-ink" aria-label="Cerrar" onClick={onClose}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </header>

        {error && <p className="px-7 pt-3 text-sm font-semibold text-rose-600">{error}</p>}

        {paso === 1 ? (
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto [scrollbar-width:none] md:grid-cols-12 md:divide-x md:divide-line md:overflow-hidden [&::-webkit-scrollbar]:hidden">
            <section className="space-y-4 overflow-y-auto bg-card p-5 [scrollbar-width:none] md:col-span-7 md:p-6 [&::-webkit-scrollbar]:hidden">
              <div className="flex items-center gap-2.5">
                <div className="relative flex-1">
                  <Lupa className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                  <input
                    ref={busqueda}
                    value={buscar}
                    onChange={(event) => setBuscar(event.target.value)}
                    onKeyDown={alEnter}
                    placeholder="Buscar por nombre, código o SKU..."
                    className="w-full rounded-xl border border-line bg-sunken py-2.5 pl-10 pr-4 text-sm text-ink outline-none placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                </div>
                <button type="button" className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-sunken px-3.5 py-2.5 text-xs font-semibold text-ink hover:bg-raise" title="El lector escribe el SKU en el buscador" onClick={() => busqueda.current?.focus()}>
                  Escanear
                </button>
              </div>

              {categorias.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <button type="button" className={`rounded-lg px-3.5 py-1.5 font-semibold ${categoria === '' ? 'bg-fill text-onfill' : 'bg-sunken text-muted'}`} onClick={() => setCategoria('')}>Todos</button>
                  {categorias.map((nombre) => (
                    <button type="button" key={nombre} className={`rounded-lg px-3.5 py-1.5 font-medium ${categoria === nombre ? 'bg-fill text-onfill' : 'bg-sunken text-muted hover:bg-raise'}`} onClick={() => setCategoria(nombre)}>{nombre}</button>
                  ))}
                </div>
              )}

              {!productos && !error && <p className="text-sm text-muted">Cargando productos…</p>}
              {productos && visibles.length === 0 && <p className="rounded-xl bg-sunken px-3 py-6 text-center text-sm text-muted">No hay productos para esta búsqueda.</p>}

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                {visibles.map((producto) => {
                  const variante = (producto.variantes || []).find((item) => item.id === talles[producto.id]) || null;
                  const stock = variante ? variante.stock : producto.stock;
                  const minimo = producto.stockMinimo;
                  const falta = producto.usaVariantes && talles[producto.id] === 'falta';
                  return (
                    <article key={producto.id} className="flex flex-col justify-between rounded-2xl border border-line/90 bg-card p-3.5 hover:border-accent/50 hover:shadow-md">
                      <div>
                        <div className="mb-1.5 flex items-center justify-between text-[11px]">
                          <span className={`rounded-md px-2 py-0.5 font-semibold ${tonoStock(stock, minimo)}`}>Stock: {numero(stock)}</span>
                          <span className="font-mono text-[10px] text-faint">{(variante?.sku || producto.sku || '').toUpperCase()}</span>
                        </div>
                        <h4 className="truncate text-sm font-bold text-ink">{producto.nombre}</h4>
                        {producto.usaVariantes && (
                          <div className="my-2 flex flex-wrap items-center gap-1">
                            {(producto.variantes || []).map((item) => (
                              <button
                                type="button"
                                key={item.id}
                                className={`rounded-md px-1.5 py-1 text-[10px] font-bold ${variante?.id === item.id ? 'border border-accent/30 bg-accent-soft text-accent' : 'bg-sunken text-muted'}`}
                                onClick={() => setTalles((actual) => ({ ...actual, [producto.id]: item.id }))}
                              >
                                {item.nombre}
                              </button>
                            ))}
                          </div>
                        )}
                        {falta && <p className="text-[11px] font-semibold text-amber-600">Elegí una variante</p>}
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
                        <span className="text-base font-extrabold text-ink">{pesos(precioDe(producto, variante))}</span>
                        <button type="button" className="rounded-lg bg-fill px-2.5 py-1.5 text-xs font-semibold text-onfill hover:bg-fill-hover disabled:opacity-40" disabled={Number(stock) <= 0} onClick={() => agregar(producto, variante)}>
                          + Agregar
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="flex flex-col justify-between gap-4 bg-sunken/60 p-5 md:col-span-5 md:overflow-y-auto md:p-6">
              <div>
                <div className="flex items-center justify-between border-b border-line pb-3.5">
                  <h3 className="text-sm font-bold text-ink">Detalle de la venta</h3>
                  <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent">{unidades} {unidades === 1 ? 'producto' : 'productos'}</span>
                </div>
                {carrito.length === 0 && <p className="py-6 text-center text-sm text-muted">El carrito está vacío.</p>}
                <div className="divide-y divide-line text-xs">
                  {carrito.map((item) => (
                    <div key={item.clave} className="flex items-center justify-between gap-2 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-ink">{item.nombre}</p>
                        {item.detalle && <p className="text-[11px] text-muted">{item.detalle}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <div className="flex items-center rounded-lg border border-line bg-card">
                          <button type="button" className="grid h-6 w-6 place-items-center font-bold text-muted" onClick={() => cambiarCantidad(item.clave, -1)}>-</button>
                          <span className="w-6 text-center font-bold text-ink">{numero(item.cantidad)}</span>
                          <button type="button" className="grid h-6 w-6 place-items-center font-bold text-muted" onClick={() => cambiarCantidad(item.clave, 1)}>+</button>
                        </div>
                        <span className="w-16 text-right font-extrabold text-ink">{pesos(item.precio * item.cantidad)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-2 rounded-xl border border-line bg-card p-3">
                  {cliente ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent">{iniciales(cliente.nombre)}</span>
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-bold text-ink">{cliente.nombre}</span>
                          <span className="block truncate text-[10px] text-muted">{cliente.telefono || 'Sin teléfono'}</span>
                        </span>
                      </div>
                      <button type="button" className="text-xs font-semibold text-accent" onClick={() => setCambiarCliente(!cambiarCliente)}>Cambiar</button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-ink">Compra en local</span>
                      <button type="button" className="text-xs font-semibold text-accent" onClick={() => setCambiarCliente(!cambiarCliente)}>Agregar cliente</button>
                    </div>
                  )}
                  {cambiarCliente && (
                    <div className="mt-2 max-h-36 overflow-auto rounded-lg border border-line">
                      <button type="button" className="block w-full px-2 py-1.5 text-left text-xs hover:bg-sunken" onClick={() => { setClienteId(''); setCambiarCliente(false); }}>Compra en local</button>
                      {clientes.map((item) => (
                        <button type="button" key={item.id} className="block w-full px-2 py-1.5 text-left text-xs hover:bg-sunken" onClick={() => { setClienteId(item.id); setCambiarCliente(false); }}>
                          {item.nombre}{item.telefono ? ` · ${item.telefono}` : ''}
                        </button>
                      ))}
                      {clientes.length === 0 && <p className="px-2 py-2 text-xs text-faint">No hay clientes cargados.</p>}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 border-t border-line pt-3 text-xs">
                <div className="flex justify-between font-medium text-muted">
                  <span>Subtotal</span>
                  <span>{pesos(total + descuento)}</span>
                </div>
                {descuento > 0 && (
                  <div className="flex justify-between font-semibold text-emerald-600">
                    <span>Descuento de promo vigente</span>
                    <span>-{pesos(descuento)}</span>
                  </div>
                )}
                <div className="flex items-baseline justify-between border-t border-line pt-2">
                  <span className="text-sm font-bold text-ink">Total a cobrar</span>
                  <span className="text-xl font-black tracking-tight text-ink">{pesos(total)}</span>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-card p-5 [scrollbar-width:none] sm:p-6 [&::-webkit-scrollbar]:hidden">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-faint">
                <span className="h-3.5 w-1.5 rounded-full bg-fill" />
                Seleccionar método de cobro
              </span>
            </div>
            {cobros.map((opcion) => {
              const activo = medio === opcion.id;
              return (
                <div key={opcion.id} role="button" tabIndex={0} className={`w-full rounded-2xl p-4 text-left transition ${activo ? 'border-2 border-accent bg-accent-soft/40 shadow-sm' : 'border border-line bg-card hover:border-line'} ${opcion.id === 'CUENTA_CORRIENTE' && frenoCuenta ? 'opacity-60' : ''}`} onClick={() => { if (opcion.id === 'CUENTA_CORRIENTE' && frenoCuenta) return; setMedio(opcion.id); }} onKeyDown={(event) => { if (event.key === 'Enter' && !(opcion.id === 'CUENTA_CORRIENTE' && frenoCuenta)) setMedio(opcion.id); }}>
                  <span className="flex items-center justify-between gap-3">
                    <span>
                      <span className="block text-sm font-bold text-ink">{opcion.titulo}</span>
                      <span className="block text-[11px] text-muted">{opcion.id === 'CUENTA_CORRIENTE' && frenoCuenta ? frenoCuenta : opcion.detalle}</span>
                    </span>
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${activo ? 'bg-fill text-onfill' : 'border border-line'}`}>
                      {activo && <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3"><path d="M4.5 12.75 10.5 18.75 19.5 5.25" /></svg>}
                    </span>
                  </span>
                  {activo && opcion.id === 'EFECTIVO' && (
                    <span className="mt-3 flex items-end justify-end gap-4 border-t border-accent/20 pt-3" onClick={(event) => event.stopPropagation()}>
                      <label className="text-right">
                        <span className="block text-[10px] font-medium text-faint">Paga con</span>
                        <input inputMode="decimal" value={pagaCon} onChange={(event) => setPagaCon(event.target.value)} placeholder="0" className="w-28 rounded-lg border border-line px-2 py-1 text-right text-xs font-bold text-ink outline-none focus:border-accent" />
                      </label>
                      <span className="border-l border-line pl-4 text-right">
                        <span className="block text-[10px] font-medium text-faint">Vuelto</span>
                        <span className={`text-xs font-extrabold ${vuelto < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{pesos(Math.max(vuelto, 0))}</span>
                      </span>
                    </span>
                  )}
                  {activo && opcion.id !== 'EFECTIVO' && (
                    <span className="mt-3 block border-t border-accent/20 pt-3 text-right text-lg font-black text-ink">{pesos(total)}</span>
                  )}
                </div>
              );
            })}
            {faltaCliente && <p className="text-xs font-semibold text-amber-700">La cuenta corriente necesita un cliente. Volvé al paso anterior y elegilo.</p>}
          </div>
        )}

        {mensaje && <p className="px-7 pb-1 text-sm font-semibold text-ink">{mensaje}</p>}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-card px-5 py-4 sm:px-7">
          {paso === 1 ? (
            <button type="button" className="text-xs font-semibold text-muted hover:text-ink disabled:opacity-40 sm:text-sm" disabled={!carrito.length || ocupado} onClick={guardarPendiente}>
              Guardar como presupuesto / pendiente
            </button>
          ) : (
            <button type="button" className="text-xs font-semibold text-muted hover:text-ink sm:text-sm" onClick={() => setPaso(1)}>
              ← Volver a editar productos
            </button>
          )}
          {paso === 1 ? (
            <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-fill px-5 py-3 text-sm font-bold text-onfill shadow-md hover:bg-fill-hover disabled:opacity-40" disabled={!carrito.length} onClick={() => setPaso(2)}>
              Continuar a cobro ({pesos(total)})
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
            </button>
          ) : (
            <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-fill px-5 py-2.5 text-sm font-bold text-onfill shadow-md hover:bg-fill-hover disabled:opacity-40" disabled={!carrito.length || ocupado || faltaCliente || cuentaBloqueada} onClick={cobrar}>
              Confirmar cobro ({pesos(total)})
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
