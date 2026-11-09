import { useEffect, useMemo, useState } from 'react';
import { api, token, urlApi, urlFoto } from '../api.js';
import { provincias } from '../provincias.js';
import { Lupa } from './Iconos.jsx';
import MapaDomicilio from './MapaDomicilio.jsx';

const cobros = [
  { id: 'PENDIENTE', label: 'Pendiente', clase: 'border-amber-300 bg-amber-50 text-amber-800' },
  { id: 'EFECTIVO', label: 'Efectivo', clase: 'border-accent bg-accent-soft text-accent' },
  { id: 'TRANSFERENCIA', label: 'Transferencia', clase: 'border-accent bg-accent-soft text-accent' },
  { id: 'TARJETA', label: 'Tarjeta', clase: 'border-accent bg-accent-soft text-accent' },
  { id: 'CUENTA_CORRIENTE', label: 'Cuenta corriente', clase: 'border-accent bg-accent-soft text-accent' },
];

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

function whatsapp(telefono) {
  const digitos = String(telefono || '').replace(/\D/g, '');
  return digitos.length >= 8 ? `https://wa.me/${digitos}` : '';
}

function cpValido(valor) {
  const limpio = String(valor || '').trim().toUpperCase().replace(/\s/g, '');
  return /^\d{4}$/.test(limpio) || /^[A-Z]\d{4}[A-Z]{3}$/.test(limpio);
}

function km(valor) {
  return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Number(valor) || 0);
}

function precioDe(producto, variante) {
  const promo = Number(producto.precioVigente) !== Number(producto.precio);
  if (promo) return Number(producto.precioVigente);
  if (variante && variante.precio != null) return Number(variante.precio);
  return Number(producto.precioVigente ?? producto.precio);
}

export default function PedidoManual({ onClose, onLista }) {
  const [productos, setProductos] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [error, setError] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [cambiar, setCambiar] = useState(false);
  const [alta, setAlta] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [telefonoNuevo, setTelefonoNuevo] = useState('');
  const [buscarCliente, setBuscarCliente] = useState('');
  const [catalogo, setCatalogo] = useState(false);
  const [vista, setVista] = useState(() => (sessionStorage.getItem('giro-catalogo-vista') === 'lista' ? 'lista' : 'cards'));
  const [buscar, setBuscar] = useState('');
  const [tallePendiente, setTallePendiente] = useState(null);
  const [carrito, setCarrito] = useState([]);
  const [medio, setMedio] = useState('PENDIENTE');
  const [entrega, setEntrega] = useState('LOCAL');
  const [direccion, setDireccion] = useState('');
  const [altura, setAltura] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [partido, setPartido] = useState('');
  const [provincia, setProvincia] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');
  const [tarifa, setTarifa] = useState(undefined);
  const [cotizacion, setCotizacion] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      api('/api/productos'),
      api('/api/clientes').catch(() => []),
    ]).then(([lista, gente]) => {
      if (!vivo) return;
      setProductos(lista);
      setClientes(gente);
    }).catch((err) => vivo && setError(err.message));
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    let vivo = true;
    api('/api/envios').then((dato) => { if (vivo) setTarifa(dato); }).catch((err) => { if (vivo) setError(err.message); });
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    function tecla(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onClose]);

  useEffect(() => {
    if (!clienteId) return;
    const elegido = clientes.find((item) => String(item.id) === String(clienteId));
    if (!elegido) return;
    const datos = {
      direccion: elegido.direccion || '',
      altura: elegido.altura || '',
      localidad: elegido.localidad || '',
      partido: elegido.partido || '',
      provincia: provincias.includes(elegido.provincia) ? elegido.provincia : '',
      codigoPostal: elegido.codigoPostal || '',
    };
    const completo = datos.direccion.trim() && datos.altura.trim() && datos.localidad.trim() && datos.partido.trim() && datos.provincia && cpValido(datos.codigoPostal);
    setDireccion(datos.direccion);
    setAltura(datos.altura);
    setLocalidad(datos.localidad);
    setPartido(datos.partido);
    setProvincia(datos.provincia);
    setCodigoPostal(datos.codigoPostal);
    if (completo) setEntrega('DOMICILIO');
  }, [clienteId]);

  const activos = useMemo(() => (productos || []).filter((producto) => producto.activo), [productos]);
  const cliente = clientes.find((item) => String(item.id) === String(clienteId)) || null;
  const chat = whatsapp(cliente?.telefono);
  const gente = clientes.filter((item) => `${item.nombre} ${item.telefono || ''}`.toLowerCase().includes(buscarCliente.trim().toLowerCase()));
  const encontrados = activos.filter((producto) => {
    const texto = buscar.trim().toLowerCase();
    if (!texto) return true;
    const variantes = (producto.variantes || []).some((variante) => `${variante.nombre} ${variante.sku || ''}`.toLowerCase().includes(texto));
    return `${producto.nombre} ${producto.sku || ''}`.toLowerCase().includes(texto) || variantes;
  });
  const mostrados = encontrados.slice(0, 24);

  const unidades = carrito.reduce((suma, item) => suma + item.cantidad, 0);
  const total = carrito.reduce((suma, item) => suma + item.precio * item.cantidad, 0);
  const lista = carrito.reduce((suma, item) => suma + item.lista * item.cantidad, 0);
  const descuento = Math.max(0, lista - total);
  const cobraAhora = medio !== 'PENDIENTE';
  const faltaCliente = medio === 'CUENTA_CORRIENTE' && !cliente;
  const pideDireccion = entrega !== 'LOCAL';
  const domicilioListo = Boolean(direccion.trim() && altura.trim() && localidad.trim() && partido.trim() && provincia && cpValido(codigoPostal));
  const faltaDireccion = pideDireccion && !domicilioListo;
  const tarifaLista = Boolean(tarifa && tarifa.base != null && tarifa.porKm != null && tarifa.direccion && tarifa.localidad);
  const tramo = entrega === 'DOMICILIO' ? cotizacion?.domicilio : entrega === 'PUNTO' ? cotizacion?.punto : null;
  const costoEnvio = Number(tramo?.costo || 0);
  const faltaEnvio = pideDireccion && !tramo;

  useEffect(() => {
    if (entrega === 'LOCAL' || !tarifaLista || !domicilioListo) {
      setCotizacion(null);
      if (entrega === 'LOCAL') setError('');
      return undefined;
    }
    let vivo = true;
    setCotizacion(null);
    setError('');
    const espera = setTimeout(() => {
      api('/api/envios/cotizar', {
        method: 'POST',
        body: {
          direccion: direccion.trim(),
          altura: altura.trim(),
          localidad: localidad.trim(),
          partido: partido.trim(),
          provincia,
          codigoPostal: codigoPostal.trim().toUpperCase().replace(/\s/g, ''),
        },
      }).then((dato) => { if (vivo) setCotizacion(dato); })
        .catch((err) => { if (vivo) { setCotizacion(null); setError(err.message); } });
    }, 600);
    return () => { vivo = false; clearTimeout(espera); };
  }, [entrega, tarifaLista, domicilioListo, direccion, altura, localidad, partido, provincia, codigoPostal]);

  function agregar(producto, variante) {
    if (producto.usaVariantes && !variante) {
      setTallePendiente(producto.id);
      return;
    }
    const stock = Number(variante ? variante.stock : producto.stock);
    if (stock <= 0) return;
    const clave = `${producto.id}-${variante?.id || 0}`;
    const precio = precioDe(producto, variante);
    const precioLista = Number(variante?.precio ?? producto.precio);
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
        sku: variante?.sku || producto.sku || '',
        talle: variante?.nombre || '',
        imagenId: producto.imagenes?.[0] || null,
        fotos: producto.fotos || [],
        precio,
        lista: precioLista,
        stock,
        cantidad: 1,
      }];
    });
    setTallePendiente(null);
    setCatalogo(false);
    setBuscar('');
  }

  function cantidad(clave, delta) {
    setCarrito((actual) => actual.flatMap((item) => {
      if (item.clave !== clave) return [item];
      const proxima = item.cantidad + delta;
      if (proxima <= 0) return [];
      if (proxima > item.stock) return [item];
      return [{ ...item, cantidad: proxima }];
    }));
  }

  async function crearCliente(event) {
    event.preventDefault();
    setError('');
    try {
      const guardado = await api('/api/clientes', { method: 'POST', body: { nombre: nombreNuevo.trim(), telefono: telefonoNuevo.trim() } });
      setClientes((actual) => [...actual, guardado].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
      setClienteId(guardado.id);
      setAlta(false);
      setNombreNuevo('');
      setTelefonoNuevo('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function guardar(avisar, dejarPendiente) {
    const cobrar = !dejarPendiente && medio !== 'PENDIENTE';
    if (!carrito.length || ocupado) return;
    if (cobrar && faltaCliente) return;
    if (faltaDireccion || faltaEnvio) return;
    setError('');
    setOcupado(true);
    try {
      const pedido = await api('/api/pedidos', {
        method: 'POST',
        body: {
          clienteId: cliente ? Number(cliente.id) : null,
          items: carrito.map(({ productoId, varianteId, cantidad: qty }) => ({ productoId, varianteId, cantidad: qty })),
          entrega,
          direccion: pideDireccion ? direccion.trim() : null,
          altura: pideDireccion ? altura.trim() : null,
          localidad: pideDireccion ? localidad.trim() : null,
          partido: pideDireccion ? partido.trim() : null,
          provincia: pideDireccion ? provincia : null,
          codigoPostal: pideDireccion ? codigoPostal.trim().toUpperCase().replace(/\s/g, '') : null,
        },
      });
      if (cobrar) {
        try {
          await api(`/api/pedidos/${pedido.id}/confirmar`, { method: 'POST', body: { medio } });
        } catch (err) {
          onLista();
          throw new Error(`El pedido #${pedido.id} quedó pendiente. ${err.message}`);
        }
      }
      if (avisar && chat) {
        const donde = entrega === 'LOCAL'
          ? 'Retiro en el local.'
          : `${entrega === 'DOMICILIO' ? 'Entrega a domicilio' : 'Punto de retiro'}: ${direccion.trim()} ${altura.trim()}, ${localidad.trim()}, ${partido.trim()}, ${provincia}, CP ${codigoPostal.trim().toUpperCase()}.`;
        const texto = encodeURIComponent(`Pedido #${pedido.id} por ${pesos(pedido.total)}. ${donde}`);
        window.open(`${chat}?text=${texto}`, '_blank', 'noopener');
      }
      onLista();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 pt-10 font-sans antialiased backdrop-blur-sm md:p-8" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-line bg-card shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-line bg-card px-7 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><Carrito /></span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-ink">Crear pedido</h2>
                <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent">Pendiente de cobro</span>
              </div>
              <p className="mt-0.5 text-xs text-muted">Elegí las prendas. Si retira en el local, no hace falta un cliente.</p>
            </div>
          </div>
          <button type="button" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sunken text-faint hover:bg-raise hover:text-ink" onClick={onClose} aria-label="Cerrar"><Cerrar /></button>
        </header>

        <div className="overflow-y-auto px-7 py-5">
          {!productos && !error && <p className="text-sm text-muted">Cargando catálogo…</p>}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <section className="rounded-2xl border border-line/90 bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold tracking-wider text-muted">CLIENTE</p>
                <button type="button" className="text-xs font-bold text-accent" onClick={() => setAlta((valor) => !valor)}>+ Cliente rápido</button>
              </div>
              {cliente ? (
                <div className="mt-3 flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-bold text-accent">{iniciales(cliente.nombre)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{cliente.nombre}{cliente.categoria && cliente.categoria !== 'ESTANDAR' ? <span className="ml-2 rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold text-accent">{cliente.categoria}</span> : null}</p>
                    <p className="truncate text-xs text-muted">{cliente.telefono || 'Sin teléfono'}{cliente.direccion ? ` · ${cliente.direccion}` : ''}</p>
                  </div>
                  <button type="button" className="rounded-xl border border-line bg-sunken px-3 py-1.5 text-xs font-semibold text-muted" onClick={() => setCambiar((valor) => !valor)}>Cambiar</button>
                </div>
              ) : entrega === 'LOCAL' ? (
                <div className="mt-3 flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-[10px] font-bold text-accent">CL</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-ink">Compra en local</p>
                    <p className="text-xs text-muted">Sin datos de cliente.</p>
                  </div>
                  <button type="button" className="rounded-xl border border-line bg-sunken px-3 py-1.5 text-xs font-semibold text-muted" onClick={() => setCambiar(true)}>Agregar cliente</button>
                </div>
              ) : (
                <button type="button" className="mt-3 text-sm font-semibold text-accent" onClick={() => setCambiar(true)}>Elegir cliente</button>
              )}
              {cambiar && (
                <div className="mt-3">
                  <input className="w-full rounded-xl border border-line bg-sunken px-3 py-2 text-xs outline-none focus:border-accent" placeholder="Buscar cliente" value={buscarCliente} onChange={(event) => setBuscarCliente(event.target.value)} />
                  <div className="mt-2 max-h-36 overflow-auto rounded-xl border border-line">
                    <button type="button" className="block w-full px-3 py-2 text-left text-xs hover:bg-sunken" onClick={() => { setClienteId(''); setCambiar(false); }}>Compra en local</button>
                    {gente.map((item) => (
                      <button type="button" key={item.id} className="block w-full px-3 py-2 text-left text-xs hover:bg-sunken" onClick={() => { setClienteId(item.id); setCambiar(false); if (medio === 'CUENTA_CORRIENTE' && item.cuentaCorriente === false) setMedio('PENDIENTE'); }}>{item.nombre}</button>
                    ))}
                  </div>
                </div>
              )}
              {alta && (
                <form className="mt-3 grid gap-2" onSubmit={crearCliente}>
                  <input className="rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-accent" placeholder="Nombre" value={nombreNuevo} onChange={(event) => setNombreNuevo(event.target.value)} required />
                  <input className="rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-accent" placeholder="Teléfono" value={telefonoNuevo} onChange={(event) => setTelefonoNuevo(event.target.value)} />
                  <button type="submit" className="rounded-xl bg-fill py-2 text-xs font-bold text-onfill">Guardar cliente</button>
                </form>
              )}
            </section>

            <section className="rounded-2xl border border-line/90 bg-card p-4">
              <p className="text-[11px] font-bold tracking-wider text-muted">COBRO</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {cobros.filter((item) => item.id !== 'CUENTA_CORRIENTE' || (cliente && cliente.cuentaCorriente !== false)).map((item) => (
                  <button type="button" key={item.id} className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold ${medio === item.id ? item.clase : 'border-line text-muted hover:bg-sunken'}`} onClick={() => setMedio(item.id)}>{item.label}</button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-faint">{medio === 'PENDIENTE' ? 'Queda pendiente. El stock se descuenta al cobrarlo.' : 'Al confirmar se cobra y se descuenta el stock.'}</p>
            </section>
          </div>

          <section className="mt-4 rounded-2xl border border-line/90 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold tracking-wider text-ink">PRENDAS {carrito.length > 0 ? `(${carrito.length} ${carrito.length === 1 ? 'ÍTEM' : 'ÍTEMS'} · ${numero(unidades)} ${unidades === 1 ? 'UNIDAD' : 'UNIDADES'})` : ''}</p>
              <button type="button" className="rounded-xl border border-accent/30 bg-accent-soft px-3 py-1.5 text-xs font-bold text-accent" onClick={() => setCatalogo((valor) => !valor)}>+ Agregar del catálogo</button>
            </div>
            {catalogo && (
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-sunken px-3 py-2">
                    <Lupa className="h-3.5 w-3.5 text-faint" />
                    <input className="w-full bg-transparent text-xs outline-none" placeholder="Nombre o SKU" value={buscar} onChange={(event) => setBuscar(event.target.value)} />
                  </label>
                  <div className="flex shrink-0 rounded-xl border border-line p-0.5">
                    <button type="button" className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${vista === 'cards' ? 'bg-accent-soft text-accent' : 'text-faint'}`} onClick={() => { setVista('cards'); sessionStorage.setItem('giro-catalogo-vista', 'cards'); }}>Cards</button>
                    <button type="button" className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${vista === 'lista' ? 'bg-accent-soft text-accent' : 'text-faint'}`} onClick={() => { setVista('lista'); sessionStorage.setItem('giro-catalogo-vista', 'lista'); }}>Lista</button>
                  </div>
                </div>
                <div className="mt-2 max-h-80 overflow-auto">
                  {mostrados.length === 0 && <p className="px-1 py-3 text-xs text-faint">{activos.length === 0 ? 'El catálogo no tiene productos activos.' : 'No hay productos con ese texto.'}</p>}
                  {vista === 'cards' ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {mostrados.map((producto) => (
                        <CatalogoCard key={producto.id} producto={producto} abierto={tallePendiente === producto.id} onElegir={() => agregar(producto, null)} onVariante={(variante) => agregar(producto, variante)} />
                      ))}
                    </div>
                  ) : (
                    <div className="divide-y divide-line rounded-xl border border-line">
                      {mostrados.map((producto) => (
                        <CatalogoFila key={producto.id} producto={producto} abierto={tallePendiente === producto.id} onElegir={() => agregar(producto, null)} onVariante={(variante) => agregar(producto, variante)} />
                      ))}
                    </div>
                  )}
                  {encontrados.length > mostrados.length && <p className="px-1 pt-2 text-[11px] text-faint">Hay {encontrados.length - mostrados.length} más. Escribí el nombre o el SKU para verlos.</p>}
                </div>
              </div>
            )}
            {carrito.length === 0 && <p className="mt-4 text-sm text-muted">Todavía no hay prendas.</p>}
            <ul className="mt-3 divide-y divide-line">
              {carrito.map((item) => (
                <li key={item.clave} className="flex items-center gap-3 py-3">
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-sunken">
                    <FotoPrenda producto={{ id: item.productoId, nombre: item.nombre, imagenes: item.imagenId ? [item.imagenId] : [], fotos: item.fotos }} />
                    <span className="absolute bottom-0 right-0 rounded-tl bg-slate-900/80 px-1 font-mono text-[10px] font-bold text-white">{numero(item.cantidad)}×</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{item.nombre}</p>
                    <p className="text-[11px] text-faint">{item.sku ? `SKU ${item.sku}` : 'Sin SKU'}{item.talle ? ` · Talle ${item.talle}` : ''} · <span className={item.stock > 0 ? 'text-emerald-600' : 'text-rose-600'}>Stock {numero(item.stock)}</span></p>
                  </div>
                  <div className="flex items-center rounded-lg border border-line">
                    <button type="button" className="grid h-7 w-7 place-items-center text-muted" onClick={() => cantidad(item.clave, -1)}>-</button>
                    <button type="button" className="grid h-7 w-7 place-items-center text-muted" onClick={() => cantidad(item.clave, 1)}>+</button>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-ink">{pesos(item.precio * item.cantidad)}</p>
                    <p className="text-[11px] text-faint">{pesos(item.precio)} c/u</p>
                  </div>
                  <button type="button" className="text-faint hover:text-rose-500" aria-label="Quitar" onClick={() => setCarrito((actual) => actual.filter((linea) => linea.clave !== item.clave))}><Tacho /></button>
                </li>
              ))}
            </ul>
            {carrito.length > 0 && (
              <div className="mt-2 space-y-1 text-right text-xs text-muted">
                {descuento > 0 && <p>Promo vigente <span className="font-bold text-amber-700">-{pesos(descuento)}</span></p>}
                {tramo && <p>Envío {km(tramo.km)} km <span className="font-bold text-ink">{pesos(tramo.costo)}</span></p>}
                <p className="font-bold text-ink">Total {pesos(total + costoEnvio)}</p>
              </div>
            )}
          </section>

          <section className="mt-4 rounded-2xl border border-accent/20 bg-accent-soft/40 p-4">
            <p className="text-[11px] font-bold tracking-wider text-accent">ENTREGA</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                ['LOCAL', 'Retiro en el local'],
                ['DOMICILIO', 'A domicilio'],
                ['PUNTO', 'Punto de retiro'],
              ].map(([id, label]) => (
                <button type="button" key={id} className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold ${entrega === id ? 'border-accent bg-card text-accent' : 'border-transparent bg-card/60 text-muted hover:bg-card'}`} onClick={() => setEntrega(id)}>{label}</button>
              ))}
            </div>
            {entrega === 'LOCAL' && <p className="mt-2 text-xs text-muted">El cliente retira en el local. El envío no se cobra.</p>}
            {tarifa && !tarifaLista && <TarifaLocal onLista={setTarifa} />}
            {pideDireccion && (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-6">
                <label className="sm:col-span-4">
                  <span className="mb-1 block text-[11px] font-semibold text-muted">Dirección</span>
                  <input className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent" value={direccion} onChange={(event) => setDireccion(event.target.value)} />
                </label>
                <label className="sm:col-span-2">
                  <span className="mb-1 block text-[11px] font-semibold text-muted">Altura</span>
                  <input className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent" value={altura} onChange={(event) => setAltura(event.target.value)} />
                </label>
                <label className="sm:col-span-3">
                  <span className="mb-1 block text-[11px] font-semibold text-muted">Localidad</span>
                  <input className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent" value={localidad} onChange={(event) => setLocalidad(event.target.value)} />
                </label>
                <label className="sm:col-span-3">
                  <span className="mb-1 block text-[11px] font-semibold text-muted">Partido</span>
                  <input className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent" value={partido} onChange={(event) => setPartido(event.target.value)} />
                </label>
                <label className="sm:col-span-4">
                  <span className="mb-1 block text-[11px] font-semibold text-muted">Provincia</span>
                  <select className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent" value={provincia} onChange={(event) => setProvincia(event.target.value)}>
                    <option value="">Elegir</option>
                    {provincias.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="sm:col-span-2">
                  <span className="mb-1 block text-[11px] font-semibold text-muted">Código postal</span>
                  <input className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm uppercase outline-none focus:border-accent" value={codigoPostal} onChange={(event) => setCodigoPostal(event.target.value)} />
                </label>
                {codigoPostal.trim() && !cpValido(codigoPostal) && <p className="sm:col-span-6 text-[11px] font-semibold text-amber-700">El código postal tiene que tener 4 números, o una letra, 4 números y 3 letras.</p>}
              </div>
            )}
            {domicilioListo && tarifaLista && (
              <div className="mt-3 space-y-2">
                {cotizacion?.domicilio && (
                  <button type="button" className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs ${entrega === 'DOMICILIO' ? 'border-accent bg-card text-accent' : 'border-transparent bg-card/70 text-ink'}`} onClick={() => setEntrega('DOMICILIO')}>
                    <span className="font-semibold">A domicilio · {km(cotizacion.domicilio.km)} km</span>
                    <span className="font-black">{pesos(cotizacion.domicilio.costo)}</span>
                  </button>
                )}
                {cotizacion?.punto ? (
                  <button type="button" className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs ${entrega === 'PUNTO' ? 'border-accent bg-card text-accent' : 'border-transparent bg-card/70 text-ink'}`} onClick={() => setEntrega('PUNTO')}>
                    <span className="font-semibold">{cotizacion.punto.nombre} · {km(cotizacion.punto.km)} km</span>
                    <span className="font-black">{pesos(cotizacion.punto.costo)}</span>
                  </button>
                ) : cotizacion?.aviso && <p className="text-[11px] text-muted">{cotizacion.aviso}</p>}
                {!cotizacion && <p className="text-[11px] text-faint">Calculando el envío…</p>}
              </div>
            )}
            {entrega === 'DOMICILIO' && (
              <div className="mt-3">
                <MapaDomicilio lat={cotizacion?.domicilio?.lat} lon={cotizacion?.domicilio?.lon} direccion={direccion} altura={altura} localidad={localidad} partido={partido} provincia={provincia} codigoPostal={codigoPostal} />
              </div>
            )}
            {entrega === 'PUNTO' && cotizacion?.punto && (
              <div className="mt-3">
                <MapaDomicilio lat={cotizacion.punto.lat} lon={cotizacion.punto.lon} marca="punto" direccion={cotizacion.punto.nombre} localidad={localidad} provincia={provincia} />
              </div>
            )}
          </section>
          {error && <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p>}
          {faltaCliente && <p className="mt-2 text-xs font-semibold text-amber-700">La cuenta corriente necesita un cliente habilitado.</p>}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-card px-7 py-4">
          <button type="button" className="text-sm font-semibold text-muted hover:text-ink disabled:opacity-40" disabled={!carrito.length || ocupado || faltaDireccion || faltaEnvio} onClick={() => guardar(false, true)}>Guardar pendiente</button>
          <div className="flex flex-wrap items-center gap-2">
            {chat && (
              <button type="button" className="rounded-xl border border-emerald-500 px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-40" disabled={!carrito.length || ocupado || faltaDireccion || faltaEnvio} onClick={() => guardar(true, true)}>Guardar y avisar por WhatsApp</button>
            )}
            <button type="button" className="rounded-xl bg-fill px-6 py-2.5 text-sm font-bold text-onfill shadow-md shadow-fill/25 hover:bg-fill-hover disabled:opacity-40" disabled={!carrito.length || ocupado || faltaCliente || faltaDireccion || faltaEnvio} onClick={() => guardar(false, false)}>{cobraAhora ? 'Cobrar y entregar' : 'Crear pedido'}</button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function TarifaLocal({ onLista }) {
  const [form, setForm] = useState({ direccion: '', altura: '', localidad: '', partido: '', provincia: '', codigoPostal: '', base: '', porKm: '' });
  const [falla, setFalla] = useState('');
  const [guardando, setGuardando] = useState(false);
  function campo(nombre, valor) { setForm((actual) => ({ ...actual, [nombre]: valor })); }
  async function guardar(event) {
    event.preventDefault();
    const base = Number(String(form.base).replace(',', '.'));
    const porKm = Number(String(form.porKm).replace(',', '.'));
    if (!Number.isFinite(base) || !Number.isFinite(porKm) || base < 0 || porKm < 0) {
      setFalla('La base y el monto por kilómetro van en números, sin puntos de miles.');
      return;
    }
    setGuardando(true);
    setFalla('');
    try {
      const guardada = await api('/api/envios', {
        method: 'PUT',
        body: {
          direccion: form.direccion.trim(),
          altura: form.altura.trim(),
          localidad: form.localidad.trim(),
          partido: form.partido.trim(),
          provincia: form.provincia,
          codigoPostal: form.codigoPostal.trim(),
          base,
          porKm,
        },
      });
      onLista(guardada);
    } catch (err) {
      setFalla(err.message);
    } finally {
      setGuardando(false);
    }
  }
  const caja = 'w-full rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent';
  return (
    <form className="mt-3 space-y-2 rounded-xl bg-card/80 p-3" onSubmit={guardar}>
      <p className="text-xs font-semibold text-ink">Para calcular el envío, cargá la dirección del local y la tarifa: un monto que se cobra siempre, más un monto por kilómetro.</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-6">
        <input className={`${caja} sm:col-span-4`} placeholder="Dirección del local" value={form.direccion} onChange={(event) => campo('direccion', event.target.value)} required />
        <input className={`${caja} sm:col-span-2`} placeholder="Altura" value={form.altura} onChange={(event) => campo('altura', event.target.value)} required />
        <input className={`${caja} sm:col-span-3`} placeholder="Localidad" value={form.localidad} onChange={(event) => campo('localidad', event.target.value)} required />
        <input className={`${caja} sm:col-span-3`} placeholder="Partido" value={form.partido} onChange={(event) => campo('partido', event.target.value)} required />
        <select className={`${caja} sm:col-span-4`} value={form.provincia} onChange={(event) => campo('provincia', event.target.value)} required>
          <option value="">Provincia</option>
          {provincias.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <input className={`${caja} sm:col-span-2 uppercase`} placeholder="CP" value={form.codigoPostal} onChange={(event) => campo('codigoPostal', event.target.value)} required />
        <input className={`${caja} sm:col-span-3`} inputMode="decimal" placeholder="Base $" value={form.base} onChange={(event) => campo('base', event.target.value)} required />
        <input className={`${caja} sm:col-span-3`} inputMode="decimal" placeholder="$ por km" value={form.porKm} onChange={(event) => campo('porKm', event.target.value)} required />
      </div>
      {falla && <p className="text-xs font-semibold text-rose-600">{falla}</p>}
      <button type="submit" className="rounded-xl bg-fill px-3 py-2 text-xs font-bold text-onfill disabled:opacity-40" disabled={guardando}>Guardar tarifa</button>
    </form>
  );
}

function stockDe(producto) {
  if (producto.usaVariantes) return (producto.variantes || []).reduce((suma, variante) => suma + Number(variante.stock || 0), 0);
  return Number(producto.stock || 0);
}

function Talles({ producto, onVariante }) {
  return (
    <div className="flex flex-wrap gap-1 px-2 pb-2">
      {(producto.variantes || []).map((variante) => (
        <button type="button" key={variante.id} className="rounded-full bg-sunken px-2 py-1 text-[11px] font-semibold text-muted ring-1 ring-line disabled:opacity-40" disabled={Number(variante.stock) <= 0} onClick={() => onVariante(variante)}>{variante.nombre} · {numero(variante.stock)}</button>
      ))}
    </div>
  );
}

function CatalogoCard({ producto, abierto, onElegir, onVariante }) {
  const stock = stockDe(producto);
  return (
    <article className="overflow-hidden rounded-xl border border-line bg-card">
      <button type="button" className="block w-full text-left disabled:opacity-50" disabled={!producto.usaVariantes && stock <= 0} onClick={onElegir}>
        <span className="block aspect-square bg-sunken"><FotoPrenda producto={producto} /></span>
        <span className="block px-2 pt-2">
          <span className="line-clamp-2 text-xs font-bold text-ink">{producto.nombre}</span>
          <span className="mt-0.5 block truncate text-[10px] text-faint">{producto.sku || 'Sin SKU'}</span>
        </span>
        <span className="flex items-center justify-between px-2 pb-2 pt-1">
          <span className="text-xs font-black text-ink">{pesos(precioDe(producto, null))}</span>
          <span className={`text-[10px] font-semibold ${stock <= 0 ? 'text-rose-600' : 'text-faint'}`}>{stock <= 0 ? 'Agotado' : `${numero(stock)}`}</span>
        </span>
      </button>
      {abierto && <Talles producto={producto} onVariante={onVariante} />}
    </article>
  );
}

function CatalogoFila({ producto, abierto, onElegir, onVariante }) {
  const stock = stockDe(producto);
  return (
    <div>
      <button type="button" className="flex w-full items-center gap-3 px-2 py-2 text-left disabled:opacity-50" disabled={!producto.usaVariantes && stock <= 0} onClick={onElegir}>
        <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-sunken"><FotoPrenda producto={producto} /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{producto.nombre}</span>
          <span className="block truncate text-[11px] text-faint">{producto.sku || 'Sin SKU'} · {stock <= 0 ? 'Agotado' : `${numero(stock)} en stock`}</span>
        </span>
        <span className="shrink-0 text-xs font-black text-ink">{pesos(precioDe(producto, null))}</span>
      </button>
      {abierto && <Talles producto={producto} onVariante={onVariante} />}
    </div>
  );
}

function FotoPrenda({ producto }) {
  const imagen = producto.imagenes?.[0] || '';
  const directa = urlFoto(producto, imagen || null);
  const [url, setUrl] = useState(directa);
  useEffect(() => {
    if (directa) {
      setUrl(directa);
      return undefined;
    }
    if (!imagen) {
      setUrl('');
      return undefined;
    }
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
  }, [producto.id, imagen, directa]);
  if (!url) return <span className="grid h-full w-full place-items-center text-xs font-bold text-faint">{(producto.nombre || 'P').slice(0, 1).toUpperCase()}</span>;
  return <img src={url} alt="" className="h-full w-full object-cover" />;
}

function Carrito() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="9" cy="19" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="17" cy="19" r="1.2" fill="currentColor" stroke="none" />
      <path d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8H17a1 1 0 0 0 1-.8L20 8H7" />
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

function Tacho() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 7h16M9 7V5h6v2M7 7l1 12h8l1-12" />
    </svg>
  );
}
