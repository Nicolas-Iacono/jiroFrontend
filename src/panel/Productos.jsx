import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, sesion, token, urlApi, urlFoto, urlVidriera } from '../api.js';
import { Alerta, Etiqueta, Filtro, Lupa, Tienda } from './Iconos.jsx';
import { CamposDetalle, camposDe, payloadDetalles } from './detalles.jsx';

const vacio = { nombre: '', descripcion: '', notasBot: '', sku: '', categoriaId: '', costo: 0, precio: 0, stock: 0, stockMinimo: 0, publicado: true, usaVariantes: false, publico: '', servicio: false, ...camposDe() };

function nombreCatalogo(oferta) {
  if (oferta === 'SERVICIOS') return 'Servicios';
  if (oferta === 'AMBAS') return 'Productos y servicios';
  return 'Productos';
}

function itemServicio(producto, oferta) {
  return oferta === 'SERVICIOS' || Boolean(producto?.servicio);
}
const porPagina = 8;
const tonos = ['bg-accent-soft text-accent', 'bg-sky-50 text-sky-700', 'bg-amber-50 text-amber-700', 'bg-emerald-50 text-emerald-700'];

function pesos(valor) {
  const texto = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(Number(valor) || 0));
  return `$ ${texto}`;
}

function numero(valor) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 }).format(Number(valor) || 0);
}

function unidades(producto) {
  if (producto.usaVariantes) return (producto.variantes || []).reduce((suma, variante) => suma + Number(variante.stock || 0), 0);
  return Number(producto.stock || 0);
}

function hayQueReponer(producto) {
  const minimo = Number(producto.stockMinimo || 0);
  if (producto.usaVariantes) return (producto.variantes || []).some((variante) => Number(variante.stock) <= minimo);
  return Number(producto.stock) <= minimo;
}

function tonoCategoria(nombre) {
  let indice = 0;
  for (const letra of nombre || '') indice += letra.charCodeAt(0);
  return tonos[indice % tonos.length];
}

function cuerpo(form) {
  return {
    nombre: form.nombre,
    descripcion: form.descripcion || null,
    notasBot: form.notasBot || null,
    sku: form.sku || null,
    categoriaId: form.categoriaId ? Number(form.categoriaId) : null,
    costo: Number(form.costo),
    precio: Number(form.precio),
    stock: Number(form.stock),
    stockMinimo: Number(form.stockMinimo),
    publicado: Boolean(form.publicado),
    usaVariantes: Boolean(form.usaVariantes),
    servicio: Boolean(form.servicio),
    publico: form.publico || null,
    ...payloadDetalles(form),
  };
}

function valorStock(producto) {
  const costo = Number(producto.costo) || 0;
  if (producto.usaVariantes && producto.variantes?.length) {
    return producto.variantes.reduce((total, variante) => {
      const stock = Number(variante.stock) || 0;
      const precio = variante.precio != null ? Number(variante.precio) : Number(producto.precio);
      return { costo: total.costo + costo * stock, venta: total.venta + precio * stock };
    }, { costo: 0, venta: 0 });
  }
  const stock = Number(producto.stock) || 0;
  return { costo: costo * stock, venta: Number(producto.precio) * stock };
}

export default function Productos() {
  const [productos, setProductos] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [version, setVersion] = useState(0);
  const [buscar, setBuscar] = useState('');
  const [categoria, setCategoria] = useState('');
  const [estado, setEstado] = useState('activos');
  const [stock, setStock] = useState('todos');
  const [vista, setVista] = useState('lista');
  const [pagina, setPagina] = useState(0);
  const [elegidos, setElegidos] = useState([]);
  const [menu, setMenu] = useState(null);
  const [form, setForm] = useState(null);
  const [oferta, setOferta] = useState('PRODUCTOS');

  useEffect(() => {
    let vivo = true;
    api('/api/ajustes').then((ajuste) => vivo && setOferta(ajuste.oferta || 'PRODUCTOS')).catch(() => {});
    const alCambiar = (event) => setOferta(event.detail || 'PRODUCTOS');
    window.addEventListener('giro-oferta', alCambiar);
    return () => { vivo = false; window.removeEventListener('giro-oferta', alCambiar); };
  }, []);

  function abrirAlta() {
    setForm({ ...vacio, servicio: oferta === 'SERVICIOS' });
  }

  useEffect(() => {
    let vivo = true;
    Promise.all([api('/api/productos'), api('/api/categorias').catch(() => [])])
      .then(([lista, rubros]) => {
        if (!vivo) return;
        setProductos(lista);
        setCategorias(rubros);
      })
      .catch((err) => vivo && setError(err.message));
    return () => { vivo = false; };
  }, [version]);

  const activos = useMemo(() => (productos || []).filter((producto) => producto.activo), [productos]);
  const rubros = useMemo(() => {
    const conteo = new Map();
    activos.forEach((producto) => {
      if (!producto.categoria) return;
      conteo.set(producto.categoria, (conteo.get(producto.categoria) || 0) + 1);
    });
    return [...conteo.entries()];
  }, [activos]);

  const valores = useMemo(() => activos.reduce((total, producto) => {
    const item = valorStock(producto);
    return { costo: total.costo + item.costo, venta: total.venta + item.venta };
  }, { costo: 0, venta: 0 }), [activos]);
  const margen = valores.venta > 0 ? Math.round(((valores.venta - valores.costo) / valores.venta) * 100) : null;
  const bajos = activos.filter((producto) => !itemServicio(producto, oferta) && hayQueReponer(producto) && unidades(producto) > 0);
  const criticos = activos.filter((producto) => !itemServicio(producto, oferta) && unidades(producto) <= 0);
  const publicados = activos.filter((producto) => producto.publicado);

  const filas = (productos || []).filter((producto) => {
    if (estado === 'activos' && !producto.activo) return false;
    if (estado === 'inactivos' && producto.activo) return false;
    if (estado === 'vidriera' && !producto.publicado) return false;
    if (estado === 'ocultos' && producto.publicado) return false;
    if (categoria && producto.categoria !== categoria) return false;
    if (stock !== 'todos' && itemServicio(producto, oferta)) return false;
    if (stock === 'reponer' && !(hayQueReponer(producto) && unidades(producto) > 0)) return false;
    if (stock === 'agotados' && unidades(producto) > 0) return false;
    if (stock === 'con-stock' && unidades(producto) <= 0) return false;
    const texto = buscar.trim().toLowerCase();
    if (!texto) return true;
    const variantes = (producto.variantes || []).some((variante) => `${variante.nombre} ${variante.sku || ''}`.toLowerCase().includes(texto));
    return `${producto.nombre} ${producto.sku || ''} ${producto.categoria || ''} ${producto.descripcion || ''}`.toLowerCase().includes(texto) || variantes;
  });

  const paginas = Math.max(1, Math.ceil(filas.length / porPagina));
  const paginaSegura = Math.min(pagina, paginas - 1);
  const visibles = filas.slice(paginaSegura * porPagina, paginaSegura * porPagina + porPagina);
  const todosVisibles = visibles.length > 0 && visibles.every((producto) => elegidos.includes(producto.id));

  function recargar() {
    setVersion((valor) => valor + 1);
  }

  function exportar() {
    const encabezado = ['nombre', 'sku', 'categoria', 'precio', 'costo', 'stock', 'publicado', 'activo'];
    const lineas = filas.map((producto) => [
      producto.nombre,
      producto.sku || '',
      producto.categoria || '',
      producto.precio,
      producto.costo,
      unidades(producto),
      producto.publicado ? 'si' : 'no',
      producto.activo ? 'si' : 'no',
    ].map((valor) => `"${String(valor).replaceAll('"', '""')}"`).join(','));
    const blob = new Blob([`\uFEFF${[encabezado.join(','), ...lineas].join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.download = 'catalogo-giro.csv';
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  }

  async function publicar(producto) {
    setMensaje('');
    try {
      await api(`/api/productos/${producto.id}`, {
        method: 'PUT',
        body: cuerpo({ ...producto, categoriaId: producto.categoriaId || '', publicado: !producto.publicado }),
      });
      recargar();
    } catch (err) {
      setMensaje(err.message);
    }
  }

  async function desactivar(ids) {
    if (!ids.length) return;
    const texto = ids.length === 1
      ? 'Si el producto no tiene ventas, se elimina. Si ya se vendió, queda inactivo.'
      : `Se van a desactivar ${ids.length} productos. Los que no tengan ventas se eliminan.`;
    if (!window.confirm(texto)) return;
    setMensaje('');
    try {
      for (const id of ids) await api(`/api/productos/${id}/desactivar`, { method: 'POST' });
      setElegidos([]);
      setMenu(null);
      recargar();
    } catch (err) {
      setMensaje(err.message);
    }
  }

  if (error) return <p className="text-sm font-semibold text-rose-600">{error}</p>;
  if (!productos) return <p className="text-sm text-muted">Cargando el catálogo…</p>;

  return (
    <div className="flex flex-col items-stretch gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-black text-ink">
            {nombreCatalogo(oferta)}
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">● Catálogo activo</span>
          </h1>
          <p className="mt-0.5 text-xs text-muted">{oferta === 'SERVICIOS' ? 'Cargá los servicios, sus precios y las fotos. El bot los usa para asesorar y dar turnos.' : oferta === 'AMBAS' ? 'Productos con stock y servicios para turnos. El bot lee ambos.' : 'Gestioná tu inventario, precios, variantes y publicación en la vidriera.'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="flex items-center gap-1.5 rounded-xl border border-line bg-card px-3.5 py-2 text-xs font-semibold text-ink hover:bg-sunken" onClick={exportar}>
            Exportar catálogo
          </button>
          <button type="button" className="rounded-xl bg-fill px-4 py-2 text-sm font-bold text-onfill shadow-md hover:bg-fill-hover" onClick={abrirAlta}>
            + {oferta === 'SERVICIOS' ? 'Nuevo servicio' : 'Nuevo producto'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-line bg-card px-4 py-3 shadow-sm">
          <div className="mb-1 flex items-center justify-between"><p className="text-[11px] font-bold tracking-wide text-faint">TOTAL ARTÍCULOS</p><span className="grid h-8 w-8 place-items-center rounded-full bg-accent-soft text-accent"><Etiqueta className="h-4 w-4" /></span></div>
          <p className="text-2xl font-black text-ink">{activos.length}</p>
          <p className="text-[11px] text-faint">{rubros.length ? `En ${rubros.length} ${rubros.length === 1 ? 'categoría' : 'categorías'}` : 'Sin categorías'}</p>
        </article>
        <article className="rounded-2xl border border-line bg-card px-4 py-3 shadow-sm">
          <div className="mb-1 flex items-center justify-between"><p className="text-[11px] font-bold tracking-wide text-faint">VALORIZACIÓN DE STOCK</p><span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-emerald-600"><span className="text-sm font-black">$</span></span></div>
          <p className="text-2xl font-black text-ink">{pesos(valores.venta)}</p>
          <p className="text-[11px] text-muted">Costo: {pesos(valores.costo)}{margen != null ? ` · Margen ${margen}%` : ''}</p>
        </article>
        <article className="rounded-2xl border border-line bg-card px-4 py-3 shadow-sm">
          <div className="mb-1 flex items-center justify-between"><p className="text-[11px] font-bold tracking-wide text-faint">STOCK BAJO / REPONER</p><span className="grid h-8 w-8 place-items-center rounded-full bg-rose-50 text-rose-500"><Alerta className="h-4 w-4" /></span></div>
          <p className="flex items-center gap-2 text-2xl font-black text-ink">{bajos.length + criticos.length}{criticos.length > 0 && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600">{criticos.length} críticos</span>}</p>
          <p className="text-[11px] text-faint">Por debajo del mínimo cargado</p>
        </article>
        <article className="rounded-2xl border border-line bg-card px-4 py-3 shadow-sm">
          <div className="mb-1 flex items-center justify-between"><p className="text-[11px] font-bold tracking-wide text-faint">EN VIDRIERA</p><span className="grid h-8 w-8 place-items-center rounded-full bg-sky-50 text-sky-600"><Tienda className="h-4 w-4" /></span></div>
          <p className="text-2xl font-black text-ink">{publicados.length} <span className="text-sm font-semibold text-faint">{activos.length ? `${Math.round((publicados.length / activos.length) * 100)}%` : '0%'}</span></p>
          <p className="text-[11px] text-faint">Publicados en tu vidriera</p>
        </article>
      </div>

      <section className="rounded-2xl border border-line bg-card p-4 shadow-sm">
        {rubros.length > 0 && (
          <div className="mb-3 flex gap-1.5 overflow-x-auto text-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button type="button" className={`rounded-lg px-3 py-1.5 font-semibold ${categoria === '' ? 'bg-fill text-onfill' : 'bg-sunken text-muted'}`} onClick={() => { setCategoria(''); setPagina(0); }}>Todos ({activos.length})</button>
            {rubros.map(([nombre, cantidad]) => (
              <button type="button" key={nombre} className={`rounded-lg px-3 py-1.5 font-medium ${categoria === nombre ? 'bg-fill text-onfill' : 'bg-sunken text-muted'}`} onClick={() => { setCategoria(nombre); setPagina(0); }}>{nombre} ({cantidad})</button>
            ))}
          </div>
        )}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-line px-3 py-2 text-faint">
            <Lupa className="h-4 w-4" />
            <input className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-faint" placeholder="Buscar por nombre, SKU o código..." value={buscar} onChange={(event) => { setBuscar(event.target.value); setPagina(0); }} />
          </label>
          <select className="rounded-xl border border-line px-3 py-2 text-xs font-medium text-muted" value={estado} onChange={(event) => { setEstado(event.target.value); setPagina(0); }}>
            <option value="activos">Estado: Activos</option>
            <option value="inactivos">Estado: Inactivos</option>
            <option value="vidriera">Estado: En vidriera</option>
            <option value="ocultos">Estado: Ocultos</option>
            <option value="todos">Estado: Todos</option>
          </select>
          <select className="rounded-xl border border-line px-3 py-2 text-xs font-medium text-muted" value={stock} onChange={(event) => { setStock(event.target.value); setPagina(0); }}>
            <option value="todos">Stock: Todos</option>
            <option value="con-stock">Stock: Con stock</option>
            <option value="reponer">Stock: Reponer</option>
            <option value="agotados">Stock: Agotados</option>
          </select>
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-line text-faint" title="Los filtros de arriba alcanzan para el catálogo"><Filtro className="h-4 w-4" /></span>
          <div className="flex rounded-xl border border-line p-0.5">
            <button type="button" className={`rounded-lg px-2 py-1 text-xs font-semibold ${vista === 'lista' ? 'bg-accent-soft text-accent' : 'text-faint'}`} onClick={() => setVista('lista')}>Lista</button>
            <button type="button" className={`rounded-lg px-2 py-1 text-xs font-semibold ${vista === 'grilla' ? 'bg-accent-soft text-accent' : 'text-faint'}`} onClick={() => setVista('grilla')}>Grilla</button>
          </div>
        </div>
        {mensaje && <p className="mb-2 text-sm font-semibold text-rose-600">{mensaje}</p>}

        {filas.length === 0 ? (
          <div className="rounded-xl bg-sunken px-3 py-8 text-center">
            <p className="text-sm text-muted">No hay {oferta === 'SERVICIOS' ? 'servicios' : 'productos'} para este filtro.</p>
            <button type="button" className="mt-1 text-sm font-semibold text-accent" onClick={abrirAlta}>Cargar el primer {oferta === 'SERVICIOS' ? 'servicio' : 'producto'}</button>
          </div>
        ) : vista === 'grilla' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibles.map((producto) => <TarjetaProducto key={producto.id} producto={producto} onPublicar={() => publicar(producto)} />)}
          </div>
        ) : (
          <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="border-b border-line text-[11px] font-bold tracking-wider text-faint">
                  <th className="pb-3 pr-2"><input type="checkbox" checked={todosVisibles} onChange={() => setElegidos(todosVisibles ? [] : visibles.map((producto) => producto.id))} aria-label="Seleccionar página" /></th>
                  {['Producto / SKU', 'Categoría', 'Variantes', 'Precio venta', 'Inventario', 'Vidriera', 'Acciones'].map((columna) => (
                    <th key={columna} className="pb-3 pr-3 font-bold">{columna.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibles.map((producto) => {
                  const cantidad = unidades(producto);
                  const sinStock = cantidad <= 0;
                  const bajo = !sinStock && hayQueReponer(producto);
                  const nivel = Number(producto.stockMinimo) > 0 ? Math.min(100, (cantidad / (Number(producto.stockMinimo) * 2)) * 100) : (sinStock ? 0 : 100);
                  return (
                    <tr key={producto.id} className="border-b border-line align-middle">
                      <td className="py-3 pr-2"><input type="checkbox" checked={elegidos.includes(producto.id)} onChange={() => setElegidos((actual) => actual.includes(producto.id) ? actual.filter((id) => id !== producto.id) : [...actual, producto.id])} aria-label={`Seleccionar ${producto.nombre}`} /></td>
                      <td className="py-3 pr-3">
                        <span className="flex items-center gap-2.5">
                          <Miniatura producto={producto} />
                          <span className="min-w-0">
                            <Link to={`/productos/${producto.id}`} className="block truncate text-sm font-bold text-ink hover:text-accent">{producto.nombre}</Link>
                            <span className="mt-0.5 inline-block rounded-md bg-sunken px-1.5 py-0.5 text-[10px] font-bold text-muted">{itemServicio(producto, oferta) ? 'Servicio' : 'Producto'}</span>
                            <span className="block font-mono text-[10px] text-faint">{producto.sku || 'Sin SKU'}</span>
                          </span>
                        </span>
                      </td>
                      <td className="py-3 pr-3">{producto.categoria ? <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${tonoCategoria(producto.categoria)}`}>{producto.categoria}</span> : <span className="text-xs text-faint">Sin categoría</span>}{producto.publico === 'hombre' && <span className="ml-1 text-[10px] font-bold text-muted">Hombre</span>}{producto.publico === 'mujer' && <span className="ml-1 text-[10px] font-bold text-muted">Mujer</span>}</td>
                      <td className="py-3 pr-3">
                        {itemServicio(producto, oferta) ? <span className="text-[11px] text-faint">—</span> : <span className="flex flex-wrap gap-1">
                          {(producto.variantes || []).length === 0 && <span className="text-[11px] text-faint">Sin variantes</span>}
                          {(producto.variantes || []).slice(0, 4).map((variante) => <span key={variante.id} className="rounded-md bg-sunken px-1.5 py-0.5 text-[10px] font-bold text-muted">{variante.nombre}</span>)}
                          {(producto.variantes || []).length > 4 && <span className="text-[10px] text-faint">+{producto.variantes.length - 4}</span>}
                        </span>}
                      </td>
                      <td className="py-3 pr-3 text-sm font-extrabold text-ink">{pesos(producto.precioVigente ?? producto.precio)}</td>
                      <td className="py-3 pr-3">
                        {itemServicio(producto, oferta) ? <p className="text-xs font-bold text-muted">Sin stock</p> : <>
                        <p className={`text-xs font-bold ${sinStock ? 'text-rose-600' : bajo ? 'text-amber-600' : 'text-emerald-700'}`}>{sinStock ? 'Agotado (0)' : `${numero(cantidad)} unid.`}</p>
                        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${sinStock ? 'bg-rose-50 text-rose-600' : bajo ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{sinStock ? 'Agotado' : bajo ? 'Reponer' : 'En stock'}</span>
                        <span className="mt-1 block h-1 w-16 overflow-hidden rounded-full bg-sunken"><span className={`block h-full ${sinStock ? 'bg-rose-400' : bajo ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${nivel}%` }} /></span>
                        </>}
                      </td>
                      <td className="py-3 pr-3">
                        <button type="button" role="switch" aria-checked={producto.publicado} disabled={!producto.activo} className={`relative h-5 w-9 rounded-full ${producto.publicado ? 'bg-fill' : 'bg-raise'} disabled:opacity-40`} onClick={() => publicar(producto)}>
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-card transition ${producto.publicado ? 'left-4' : 'left-0.5'}`} />
                        </button>
                      </td>
                      <td className="relative py-3">
                        <Link to={`/productos/${producto.id}`} className="mr-1 inline-block text-faint hover:text-accent" aria-label="Editar">
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 20h4l10-10-4-4L4 16z" />                          <path d="m12 6 4 4" /></svg>
                        </Link>
                        <button type="button" className="text-faint" aria-label="Más acciones" onClick={() => setMenu(menu === producto.id ? null : producto.id)}>•••</button>
                        {menu === producto.id && (
                          <span className="absolute right-0 z-10 mt-1 w-36 rounded-xl bg-card p-1 text-xs shadow-lg">
                            <button type="button" className="block w-full rounded-lg px-2 py-1.5 text-left text-rose-600 hover:bg-rose-50" onClick={() => desactivar([producto.id])}>Desactivar</button>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-faint">
          <span>Mostrando {filas.length === 0 ? 0 : paginaSegura * porPagina + 1}–{Math.min(filas.length, (paginaSegura + 1) * porPagina)} de {filas.length}</span>
          <div className="flex items-center gap-2">
            {elegidos.length > 0 && <button type="button" className="font-semibold text-rose-600" onClick={() => desactivar(elegidos)}>Desactivar {elegidos.length}</button>}
            <button type="button" className="rounded-lg border border-line px-2 py-1 disabled:opacity-40" disabled={paginaSegura === 0} onClick={() => setPagina(paginaSegura - 1)}>Anterior</button>
            <span>{paginaSegura + 1} / {paginas}</span>
            <button type="button" className="rounded-lg border border-line px-2 py-1 disabled:opacity-40" disabled={paginaSegura >= paginas - 1} onClick={() => setPagina(paginaSegura + 1)}>Siguiente</button>
          </div>
        </div>
      </section>

      {form && <Formulario form={form} categorias={categorias} onClose={() => setForm(null)} onLista={recargar} />}
    </div>
  );
}

function Miniatura({ producto }) {
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
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-sunken text-xs font-bold text-faint">
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : (producto.nombre || 'P').slice(0, 1).toUpperCase()}
    </span>
  );
}

function TarjetaProducto({ producto, onPublicar }) {
  const cantidad = unidades(producto);
  return (
    <article className="rounded-2xl border border-line p-3">
      <div className="flex items-center gap-2">
        <Miniatura producto={producto} />
        <div className="min-w-0 flex-1">
          <Link to={`/productos/${producto.id}`} className="block truncate text-sm font-bold text-ink hover:text-accent">{producto.nombre}</Link>
          <p className="font-mono text-[10px] text-faint">{producto.servicio ? 'Servicio' : 'Producto'}{producto.sku ? ` · ${producto.sku}` : ''}</p>
        </div>
        <Link to={`/productos/${producto.id}`} className="text-xs font-semibold text-accent">Editar</Link>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="font-extrabold text-ink">{pesos(producto.precioVigente ?? producto.precio)}</span>
        <span className={producto.servicio ? 'text-muted' : cantidad <= 0 ? 'font-bold text-rose-600' : 'text-muted'}>{producto.servicio ? 'Servicio' : cantidad <= 0 ? 'Agotado' : `${numero(cantidad)} unid.`}</span>
        <button type="button" className="font-semibold text-accent" onClick={onPublicar}>{producto.publicado ? 'En vidriera' : 'Oculto'}</button>
      </div>
    </article>
  );
}

const escalas = {
  indumentaria: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  calzado: ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44'],
  unico: ['Único'],
};

function skuDe(base, nombre) {
  const limpio = String(nombre || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return base ? `${base}-${limpio}` : limpio;
}

function Formulario({ form, categorias, onClose, onLista }) {
  const archivo = useRef(null);
  const camara = useRef(null);
  const [datos, setDatos] = useState(form);
  const [rubroNuevo, setRubroNuevo] = useState('');
  const [escala, setEscala] = useState('indumentaria');
  const [detalles, setDetalles] = useState([]);
  const [rubros, setRubros] = useState([]);
  const [nuevas, setNuevas] = useState([]);
  const [talleExtra, setTalleExtra] = useState('');
  const [oferta, setOferta] = useState(false);
  const [precioOferta, setPrecioOferta] = useState('');
  const [fotos, setFotos] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [sobre, setSobre] = useState(false);
  const existentes = datos.variantes || [];
  const slug = sesion()?.slug;
  const set = (clave) => (event) => setDatos({ ...datos, [clave]: event.target.type === 'checkbox' ? event.target.checked : event.target.value });

  useEffect(() => {
    let vivo = true;
    api('/api/ajustes').then((ajuste) => {
      if (!vivo) return;
      const lista = ajuste.detalles || [];
      setDetalles(lista);
      setRubros(ajuste.rubros || []);
      if (lista.includes('calzado') && !lista.includes('talle')) setEscala('calzado');
    }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  const fotosRef = useRef([]);
  fotosRef.current = fotos;
  useEffect(() => () => fotosRef.current.forEach((foto) => URL.revokeObjectURL(foto.url)), []);

  const precio = Number(datos.precio) || 0;
  const costo = Number(datos.costo) || 0;
  const margen = precio > 0 ? Math.round(((precio - costo) / precio) * 100) : null;
  const ofertaNumero = Number(precioOferta);
  const ahorro = precio > ofertaNumero && ofertaNumero > 0 ? precio - ofertaNumero : 0;
  const descuento = ahorro ? Math.round((ahorro / precio) * 100) : 0;
  const esServicio = Boolean(datos.servicio);
  const usaTalle = detalles.includes('talle');
  const usaCalzado = detalles.includes('calzado');
  const muestraPublico = !esServicio && (Boolean(datos.publico) || rubros.includes('indumentaria') || rubros.includes('calzado') || usaTalle || usaCalzado);
  const muestraVariantes = !esServicio && (usaTalle || usaCalzado || existentes.length > 0 || nuevas.length > 0);
  const chips = [...new Set([...(escalas[escala] || []), ...existentes.map((item) => item.nombre), ...nuevas.map((item) => item.nombre)])];
  const totalStock = existentes.reduce((suma, item) => suma + Number(item.stock || 0), 0) + nuevas.reduce((suma, item) => suma + Number(item.stock || 0), 0);
  const cupoFotos = Math.max(0, 8 - (datos.imagenes || []).length - fotos.length);

  function alternar(nombre) {
    if (existentes.some((item) => item.nombre === nombre)) return;
    setNuevas((actual) => (actual.some((item) => item.nombre === nombre)
      ? actual.filter((item) => item.nombre !== nombre)
      : [...actual, { nombre, stock: 0, sku: skuDe(datos.sku, nombre), precio: '' }]));
  }

  function agregarTalle() {
    const nombre = talleExtra.trim();
    if (!nombre || existentes.some((item) => item.nombre === nombre) || nuevas.some((item) => item.nombre === nombre)) return;
    setNuevas((actual) => [...actual, { nombre, stock: 0, sku: skuDe(datos.sku, nombre), precio: '' }]);
    setTalleExtra('');
  }

  function sumarFotos(lista) {
    const validas = [...lista].filter((item) => item.type.startsWith('image/')).slice(0, cupoFotos);
    setFotos((actual) => [...actual, ...validas.map((item) => ({ archivo: item, url: URL.createObjectURL(item) }))]);
  }

  async function guardar(publicado) {
    if (!datos.nombre.trim()) {
      setMensaje('El nombre es obligatorio');
      return;
    }
    if (oferta && !(ofertaNumero > 0)) {
      setMensaje('Ingresá el precio de oferta');
      return;
    }
    setOcupado(true);
    setMensaje('');
    try {
      let categoriaId = datos.categoriaId ? Number(datos.categoriaId) : null;
      if (rubroNuevo.trim()) {
        const creada = await api('/api/categorias', { method: 'POST', body: { nombre: rubroNuevo.trim() } });
        categoriaId = creada.id;
        setRubroNuevo('');
        setDatos((actual) => ({ ...actual, categoriaId }));
      }
      const esAltaServicio = Boolean(datos.servicio);
      const conVariantes = !esAltaServicio && existentes.length + nuevas.length > 0;
      const producto = await api(datos.id ? `/api/productos/${datos.id}` : '/api/productos', {
        method: datos.id ? 'PUT' : 'POST',
        body: cuerpo({
          ...datos,
          categoriaId: categoriaId || '',
          publicado,
          servicio: esAltaServicio,
          usaVariantes: conVariantes,
          stock: esAltaServicio || (conVariantes && !datos.id) ? 0 : datos.stock,
        }),
      });
      const id = producto.id;
      setDatos((actual) => ({ ...actual, id, publicado, servicio: esAltaServicio, usaVariantes: conVariantes, categoriaId: categoriaId || '' }));
      const pendientes = esAltaServicio ? [] : [...nuevas];
      while (pendientes.length) {
        const variante = pendientes[0];
        await api(`/api/productos/${id}/variantes`, {
          method: 'POST',
          body: {
            nombre: variante.nombre,
            sku: variante.sku || null,
            precio: variante.precio === '' ? null : Number(variante.precio),
            stock: Number(variante.stock) || 0,
          },
        });
        pendientes.shift();
        setNuevas([...pendientes]);
      }
      if (oferta) {
        await api(`/api/productos/${id}/promociones`, { method: 'POST', body: { precioPromo: ofertaNumero, desde: null, hasta: null } });
        setOferta(false);
      }
      const cola = [...fotos];
      while (cola.length) {
        const cuerpoFoto = new FormData();
        cuerpoFoto.append('archivo', cola[0].archivo);
        await api(`/api/productos/${id}/imagenes`, { method: 'POST', body: cuerpoFoto });
        URL.revokeObjectURL(cola[0].url);
        cola.shift();
        setFotos([...cola]);
      }
      onLista();
      onClose();
    } catch (err) {
      setMensaje(err.message);
      onLista();
      setOcupado(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 pt-14 backdrop-blur-sm md:p-8" onClick={onClose}>
      <form className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-line bg-card shadow-2xl" onClick={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); guardar(true); }}>
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-card px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft font-bold text-accent">
              <Etiqueta className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-ink">{datos.id ? `Editar ${esServicio ? 'servicio' : 'producto'}` : `Nuevo ${esServicio ? 'servicio' : 'producto'}`}</h2>
                <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent">{datos.id ? 'Edición' : 'Alta de catálogo'}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted">{esServicio ? 'Cargá el nombre, el precio, la descripción y las fotos. El bot usa estos datos para asesorar y dar turnos.' : 'Cargá los datos, las variantes, los precios y las fotos de la vidriera.'}</p>
            </div>
          </div>
          <button type="button" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sunken text-faint hover:bg-raise hover:text-ink" aria-label="Cerrar" onClick={onClose}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto p-5 [scrollbar-width:none] md:grid-cols-12 md:p-6 [&::-webkit-scrollbar]:hidden">
          <section className="space-y-5 md:col-span-7">
            <div className="flex gap-2" role="tablist" aria-label="Tipo de alta">
              {[[false, 'Producto'], [true, 'Servicio']].map(([valor, etiqueta]) => (
                <button key={etiqueta} type="button" role="tab" aria-selected={esServicio === valor} className={`rounded-xl px-4 py-2 text-sm font-bold ${esServicio === valor ? 'bg-fill text-onfill' : 'bg-sunken text-muted'}`} onClick={() => setDatos({ ...datos, servicio: valor })}>{etiqueta}</button>
              ))}
            </div>
            <label className="block text-xs font-semibold text-muted">
              {esServicio ? 'Nombre del servicio' : 'Nombre del producto'}
              <input className="mt-1 w-full rounded-xl border border-line bg-sunken px-4 py-2.5 text-sm font-medium text-ink outline-none placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/20" placeholder={esServicio ? 'Ej: Corte de pelo' : 'Ej: Campera puffer con capucha'} value={datos.nombre} onChange={set('nombre')} required />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Descripción
              <textarea className="mt-1 w-full rounded-xl border border-line bg-sunken px-4 py-2.5 text-sm text-ink outline-none placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/20" rows={3} maxLength={2000} placeholder={esServicio ? 'Qué incluye, cuánto dura o cómo se hace' : 'Qué es, de qué está hecho o cómo se usa'} value={datos.descripcion || ''} onChange={set('descripcion')} />
            </label>
            {sesion()?.rol === 'DUENO' && <label className="block text-xs font-semibold text-muted">
              Aclaraciones para el asesor
              <span className="mt-0.5 block text-[11px] font-medium text-faint">Solo las ves vos. No se publican en la vidriera. El bot las usa para asesorar.</span>
              <textarea className="mt-1 w-full rounded-xl border border-line bg-sunken px-4 py-2.5 text-sm text-ink outline-none placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/20" rows={3} maxLength={2000} placeholder={esServicio ? 'Ej: si piden color, preguntar si ya se tiñó antes.' : 'Ej: el perfume es floral, con jazmín. Si no hay talle M, ofrecer el L.'} value={datos.notasBot || ''} onChange={set('notasBot')} />
            </label>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-muted">
                Categoría
                <select className="mt-1 w-full rounded-xl border border-line bg-sunken px-3 py-2.5 text-sm text-ink outline-none focus:border-accent" value={datos.categoriaId} onChange={set('categoriaId')}>
                  <option value="">Sin categoría</option>
                  {categorias.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-muted">
                SKU
                <span className="mt-1 flex gap-2">
                  <input className="w-full rounded-xl border border-line bg-sunken px-3 py-2.5 font-mono text-sm text-ink outline-none focus:border-accent" placeholder="CAM-006" value={datos.sku} onChange={set('sku')} />
                  <button type="button" className="shrink-0 rounded-xl bg-sunken px-3 text-[11px] font-bold text-muted" onClick={() => {
                    const base = datos.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase();
                    if (base) setDatos({ ...datos, sku: `${base}-${String(Date.now()).slice(-3)}` });
                  }}>Sugerir</button>
                </span>
              </label>
            </div>
            <input className="w-full rounded-xl border border-dashed border-line px-3 py-2 text-sm outline-none focus:border-accent" placeholder="O escribí una categoría nueva" value={rubroNuevo} onChange={(event) => setRubroNuevo(event.target.value)} />
            {muestraPublico && <div>
              <p className="text-xs font-semibold text-muted">Hombre o mujer</p>
              <p className="mb-2 text-[11px] text-faint">Si lo marcás, la categoría entra en ese submenú de la tienda. Si no, queda afuera.</p>
              <div className="flex flex-wrap gap-2">
                {[['', 'Sin marcar'], ['hombre', 'Hombre'], ['mujer', 'Mujer']].map(([id, etiqueta]) => (
                  <button key={etiqueta} type="button" className={`rounded-xl px-3 py-1.5 text-xs font-bold ${datos.publico === id ? 'bg-fill text-onfill' : 'bg-sunken text-muted'}`} onClick={() => setDatos({ ...datos, publico: id })}>{etiqueta}</button>
                ))}
              </div>
            </div>}
            {!esServicio && <CamposDetalle datos={datos} activos={detalles} onChange={(clave, valorCampo) => setDatos({ ...datos, [clave]: valorCampo })} />}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-muted">
                Precio costo
                <input className="mt-1 w-full rounded-xl border border-line bg-sunken px-3 py-2.5 text-sm font-bold outline-none focus:border-accent" type="number" min="0" step="0.01" value={datos.costo} onChange={set('costo')} />
              </label>
              <label className="text-xs font-semibold text-muted">
                Precio de venta
                <span className="mt-1 flex items-center gap-2">
                  <input className="w-full rounded-xl border border-line bg-sunken px-3 py-2.5 text-sm font-bold outline-none focus:border-accent" type="number" min="0" step="0.01" value={datos.precio} onChange={set('precio')} required />
                  {margen != null && <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-600">Margen {margen}%</span>}
                </span>
              </label>
            </div>

            <div className="rounded-2xl border border-line p-3">
              <div className="flex items-center justify-between gap-3">
                <span>
                  <span className="block text-sm font-bold text-ink">Precio promocional</span>
                  <span className="text-[11px] text-muted">Reemplaza el precio de venta mientras esté vigente.</span>
                </span>
                <button type="button" role="switch" aria-checked={oferta} className={`relative h-6 w-11 rounded-full ${oferta ? 'bg-fill' : 'bg-raise'}`} onClick={() => setOferta(!oferta)}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-card transition ${oferta ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
              {oferta && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input className="w-40 rounded-xl border border-line px-3 py-2 text-sm font-bold outline-none focus:border-accent" type="number" min="0.01" step="0.01" placeholder="Precio de oferta" value={precioOferta} onChange={(event) => setPrecioOferta(event.target.value)} />
                  {ahorro > 0 && <span className="rounded-full bg-accent-soft px-2 py-1 text-[11px] font-bold text-accent">-{pesos(ahorro)} ({descuento}% OFF)</span>}
                </div>
              )}
            </div>

            {!esServicio && <div>
              {muestraVariantes && (
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-ink">{usaCalzado && !usaTalle ? 'Números y stock inicial' : 'Talles y stock inicial'}</h3>
                {usaTalle && usaCalzado && (
                  <select className="rounded-lg border border-line px-2 py-1 text-xs" value={escala} onChange={(event) => setEscala(event.target.value)}>
                    <option value="indumentaria">Indumentaria</option>
                    <option value="calzado">Calzado</option>
                    <option value="unico">Talle único</option>
                  </select>
                )}
              </div>
              )}
              {muestraVariantes && <div className="flex flex-wrap gap-1.5">
                {chips.map((nombre) => {
                  const activo = existentes.some((item) => item.nombre === nombre) || nuevas.some((item) => item.nombre === nombre);
                  return (
                    <button type="button" key={nombre} className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${activo ? 'bg-fill text-onfill' : 'bg-sunken text-muted'}`} onClick={() => alternar(nombre)}>{nombre}</button>
                  );
                })}
              </div>}
              {muestraVariantes && <div className="mt-2 flex gap-2">
                <input className="flex-1 rounded-xl border border-line px-3 py-2 text-xs outline-none focus:border-accent" placeholder="Talle personalizado" value={talleExtra} onChange={(event) => setTalleExtra(event.target.value)} />
                <button type="button" className="rounded-xl bg-sunken px-3 text-xs font-bold text-ink" onClick={agregarTalle}>Agregar</button>
              </div>}
              {(existentes.length > 0 || nuevas.length > 0) && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[10px] font-bold tracking-wide text-faint">
                        <th className="pb-1">Talle</th><th>SKU</th><th>Stock</th><th>Precio</th><th>Nivel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {existentes.map((item) => (
                        <tr key={item.id} className="border-t border-line">
                          <td className="py-1.5 font-bold">{item.nombre}</td>
                          <td className="font-mono text-[10px] text-faint">{item.sku || '—'}</td>
                          <td>{numero(item.stock)}</td>
                          <td>{item.precio != null ? pesos(item.precio) : 'Precio de venta'}</td>
                          <td className={Number(item.stock) <= Number(datos.stockMinimo || 0) ? 'font-bold text-amber-600' : 'text-emerald-600'}>{Number(item.stock) <= 0 ? 'Agotado' : Number(item.stock) <= Number(datos.stockMinimo || 0) ? 'Reponer' : 'En stock'}</td>
                        </tr>
                      ))}
                      {nuevas.map((item) => (
                        <tr key={item.nombre} className="border-t border-line">
                          <td className="py-1.5 font-bold">{item.nombre}</td>
                          <td><input className="w-24 rounded-lg border border-line px-2 py-1 font-mono text-[10px]" value={item.sku} onChange={(event) => setNuevas((actual) => actual.map((fila) => fila.nombre === item.nombre ? { ...fila, sku: event.target.value } : fila))} /></td>
                          <td><input className="w-16 rounded-lg border border-line px-2 py-1" type="number" min="0" step="0.001" value={item.stock} onChange={(event) => setNuevas((actual) => actual.map((fila) => fila.nombre === item.nombre ? { ...fila, stock: event.target.value } : fila))} /></td>
                          <td><input className="w-20 rounded-lg border border-line px-2 py-1" type="number" min="0" step="0.01" placeholder="Igual" value={item.precio} onChange={(event) => setNuevas((actual) => actual.map((fila) => fila.nombre === item.nombre ? { ...fila, precio: event.target.value } : fila))} /></td>
                          <td className="text-faint">Nuevo</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 text-xs font-bold text-accent">Total: {numero(totalStock)} unidades</p>
                </div>
              )}
              {existentes.length === 0 && nuevas.length === 0 && (
                <label className="mt-3 block text-xs font-semibold text-muted">
                  Stock inicial
                  <input className="mt-1 w-full rounded-xl border border-line bg-sunken px-3 py-2.5 text-sm outline-none focus:border-accent" type="number" min="0" step="0.001" value={datos.stock} onChange={set('stock')} />
                </label>
              )}
              <label className="mt-3 block text-xs font-semibold text-muted">
                Stock mínimo para reponer
                <input className="mt-1 w-full rounded-xl border border-line bg-sunken px-3 py-2.5 text-sm outline-none focus:border-accent" type="number" min="0" step="0.001" value={datos.stockMinimo} onChange={set('stockMinimo')} />
              </label>
              {existentes.length > 0 && <p className="mt-1 text-[11px] text-faint">El stock de las variantes ya guardadas se mantiene. Desde acá podés sumar talles nuevos.</p>}
            </div>}
          </section>

          <section className="space-y-4 md:col-span-5">
            <div>
              <h3 className="text-sm font-bold text-ink">Fotografías <span className="font-medium text-faint">hasta 8</span></h3>
              <button
                type="button"
                className={`mt-2 w-full rounded-2xl border-2 border-dashed p-6 text-center ${sobre ? 'border-accent bg-accent-soft' : 'border-accent/30 bg-accent-soft/30'}`}
                onClick={() => archivo.current?.click()}
                onDragOver={(event) => { event.preventDefault(); setSobre(true); }}
                onDragLeave={() => setSobre(false)}
                onDrop={(event) => { event.preventDefault(); setSobre(false); sumarFotos(event.dataTransfer.files); }}
              >
                <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-card text-accent">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 8h3l2-2h6l2 2h3v10H4z" /><circle cx="12" cy="13" r="3" /></svg>
                </span>
                <span className="mt-2 block text-sm font-semibold text-ink">Arrastrá tus fotos o explorá</span>
                <span className="mt-1 block text-[11px] text-faint">La primera foto queda como portada.</span>
              </button>
              <input ref={archivo} type="file" accept="image/*" multiple hidden onChange={(event) => { sumarFotos(event.target.files); event.target.value = ''; }} />
              <input ref={camara} type="file" accept="image/*" capture="environment" hidden onChange={(event) => { sumarFotos(event.target.files); event.target.value = ''; }} />
              <button type="button" className="mt-2 text-xs font-semibold text-accent" onClick={() => camara.current?.click()}>Tomar foto</button>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {(datos.imagenes || []).map((imagen, indice) => <FotoGuardada key={imagen} productoId={datos.id} imagenId={imagen} principal={indice === 0 && fotos.length === 0} />)}
                {fotos.map((foto, indice) => (
                  <span key={foto.url} className="relative aspect-square overflow-hidden rounded-xl bg-sunken">
                    <img src={foto.url} alt="" className="h-full w-full object-cover" />
                    {indice === 0 && (datos.imagenes || []).length === 0 && <span className="absolute left-1 top-1 rounded bg-emerald-600 px-1 text-[9px] font-bold text-white">Principal</span>}
                    <button type="button" className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-card text-[10px] text-muted" aria-label="Quitar foto" onClick={() => setFotos((actual) => actual.filter((item) => item.url !== foto.url))}>×</button>
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-accent/20 bg-accent-soft/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <span>
                  <span className="block text-sm font-bold text-ink">Publicar en la vidriera</span>
                  <span className="text-[11px] text-muted">{datos.publicado ? 'Va a verse en la tienda pública.' : 'Queda en el catálogo, oculto en la vidriera.'}</span>
                </span>
                <button type="button" role="switch" aria-checked={datos.publicado} className={`relative h-6 w-11 shrink-0 rounded-full ${datos.publicado ? 'bg-fill' : 'bg-raise'}`} onClick={() => setDatos({ ...datos, publicado: !datos.publicado })}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-card transition ${datos.publicado ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
              {slug && <p className="truncate text-[11px] text-faint">{urlVidriera(slug)}</p>}
            </div>
          </section>
        </div>

        {mensaje && <p className="px-7 text-sm font-semibold text-rose-600">{mensaje}</p>}

        <footer className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-card px-5 py-4 sm:px-7">
          <button type="button" className="text-sm font-semibold text-muted hover:text-ink" onClick={onClose}>Cancelar</button>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-ink hover:bg-sunken disabled:opacity-40" disabled={ocupado} onClick={() => guardar(false)}>Guardar sin publicar</button>
            <button type="submit" className="rounded-xl bg-fill px-5 py-2.5 text-sm font-bold text-onfill shadow-md hover:bg-fill-hover disabled:opacity-40" disabled={ocupado}>Guardar y publicar</button>
          </div>
        </footer>
      </form>
    </div>
  );
}

function FotoGuardada({ productoId, imagenId, principal }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let vivo = true;
    let objeto = '';
    fetch(urlApi(`/api/productos/${productoId}/imagenes/${imagenId}`), { headers: token() ? { Authorization: `Bearer ${token()}` } : {} })
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
  }, [productoId, imagenId]);
  return (
    <span className="relative aspect-square overflow-hidden rounded-xl bg-sunken">
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
      {principal && <span className="absolute left-1 top-1 rounded bg-emerald-600 px-1 text-[9px] font-bold text-white">Principal</span>}
    </span>
  );
}
