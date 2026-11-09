import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, sesion, token, urlApi, urlVidriera } from '../api.js';
import { Alerta, Bolsa, Lupa, Tienda } from './Iconos.jsx';
import { CamposDetalle, camposDe, payloadDetalles } from './detalles.jsx';

const medios = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  TARJETA: 'Tarjeta',
  CUENTA_CORRIENTE: 'Cuenta corriente',
};
const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function fichaDatos(producto) {
  return {
    nombre: producto.nombre,
    sku: producto.sku || '',
    categoriaId: producto.categoriaId || '',
    costo: producto.costo,
    precio: producto.precio,
    stock: producto.stock,
    stockMinimo: producto.stockMinimo,
    publicado: producto.publicado,
    publico: producto.publico || '',
    descripcion: producto.descripcion || '',
    ...camposDe(producto),
  };
}

function pesos(valor) {
  return `$ ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(Number(valor) || 0))}`;
}

function numero(valor) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 }).format(Number(valor) || 0);
}

function unidades(producto) {
  if (!producto) return 0;
  if (producto.usaVariantes) return (producto.variantes || []).reduce((suma, variante) => suma + Number(variante.stock || 0), 0);
  return Number(producto.stock || 0);
}

function curva(puntos) {
  if (!puntos.length) return '';
  let trazo = `M ${puntos[0].x} ${puntos[0].y}`;
  for (let i = 0; i < puntos.length - 1; i += 1) {
    const p0 = puntos[i - 1] || puntos[i];
    const p1 = puntos[i];
    const p2 = puntos[i + 1];
    const p3 = puntos[i + 2] || p2;
    trazo += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}, ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6}, ${p2.x} ${p2.y}`;
  }
  return trazo;
}

function enRango(iso, rango) {
  const fecha = new Date(iso);
  const hoy = new Date();
  if (rango === 'anio') return fecha.getFullYear() === hoy.getFullYear();
  if (rango === 'todo') return true;
  const limite = new Date();
  limite.setDate(hoy.getDate() - rango);
  return fecha >= limite;
}

function lunesDe(iso) {
  const fecha = new Date(iso);
  const lunes = new Date(fecha);
  lunes.setHours(0, 0, 0, 0);
  lunes.setDate(fecha.getDate() - ((fecha.getDay() + 6) % 7));
  return `${lunes.getFullYear()}-${String(lunes.getMonth() + 1).padStart(2, '0')}-${String(lunes.getDate()).padStart(2, '0')}`;
}

function whatsapp(telefono) {
  const digitos = String(telefono || '').replace(/\D/g, '');
  return digitos.length >= 8 ? `https://wa.me/${digitos}` : '';
}

export default function FichaProducto() {
  const { id } = useParams();
  const navigate = useNavigate();
  const archivo = useRef(null);
  const [producto, setProducto] = useState(undefined);
  const [categorias, setCategorias] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const [pestana, setPestana] = useState('datos');
  const [rango, setRango] = useState(30);
  const [buscar, setBuscar] = useState('');
  const [datos, setDatos] = useState(null);
  const [nuevas, setNuevas] = useState([]);
  const [fotos, setFotos] = useState([]);
  const [oferta, setOferta] = useState(false);
  const [precioOferta, setPrecioOferta] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [talle, setTalle] = useState({ nombre: '', stock: 0, precio: '' });
  const [detalles, setDetalles] = useState([]);
  const [rubros, setRubros] = useState([]);
  const [ofertaNegocio, setOfertaNegocio] = useState('PRODUCTOS');
  const fotosRef = useRef([]);
  fotosRef.current = fotos;

  useEffect(() => () => fotosRef.current.forEach((foto) => URL.revokeObjectURL(foto.url)), []);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      api('/api/productos'),
      api('/api/categorias').catch(() => []),
      api('/api/ventas').catch(() => []),
      api('/api/clientes').catch(() => []),
    ]).then(([catalogo, rubros, movimientos, gente]) => {
      if (!vivo) return;
      setProducto(catalogo.find((item) => String(item.id) === String(id)) || null);
      setCategorias(rubros);
      setVentas(movimientos);
      setClientes(gente);
    }).catch((err) => vivo && setError(err.message));
    api('/api/ajustes').then((ajuste) => {
      if (!vivo) return;
      setDetalles(ajuste.detalles || []);
      setRubros(ajuste.rubros || []);
      setOfertaNegocio(ajuste.oferta || 'PRODUCTOS');
    }).catch(() => {});
    return () => { vivo = false; };
  }, [id, version]);

  useEffect(() => {
    if (!producto) return;
    setDatos(fichaDatos(producto));
    setNuevas([]);
    setFotos([]);
    setOferta(false);
    setPrecioOferta('');
    setMensaje('');
  }, [producto]);

  const movimientos = useMemo(() => {
    if (!producto) return [];
    return ventas.flatMap((venta) => {
      if (venta.estado !== 'CONFIRMADA') return [];
      const items = (venta.items || []).filter((item) => item.producto === producto.nombre);
      if (!items.length) return [];
      return [{
        id: venta.id,
        fecha: venta.fecha,
        cliente: venta.cliente,
        clienteId: venta.clienteId,
        medio: venta.medio,
        variantes: [...new Set(items.map((item) => item.variante).filter(Boolean))],
        cantidad: items.reduce((suma, item) => suma + Number(item.cantidad), 0),
        subtotal: items.reduce((suma, item) => suma + Number(item.subtotal), 0),
      }];
    });
  }, [producto, ventas]);

  const delPeriodo = movimientos.filter((item) => enRango(item.fecha, rango));
  const unidadesVendidas = delPeriodo.reduce((suma, item) => suma + item.cantidad, 0);
  const facturado = delPeriodo.reduce((suma, item) => suma + item.subtotal, 0);
  const operaciones = delPeriodo.length;
  const compradores = new Set(delPeriodo.map((item) => item.clienteId || item.cliente || 'sin')).size;
  const repetidos = [...delPeriodo.reduce((mapa, item) => {
    const clave = item.clienteId || item.cliente || '';
    if (!clave) return mapa;
    mapa.set(clave, (mapa.get(clave) || 0) + 1);
    return mapa;
  }, new Map()).values()].filter((cantidad) => cantidad > 1).length;
  const recompra = compradores > 0 ? Math.round((repetidos / compradores) * 1000) / 10 : null;
  const costo = Number(datos?.costo ?? producto?.costo) || 0;
  const precio = Number(datos?.precio ?? producto?.precio) || 0;
  const margenLista = precio > 0 ? Math.round(((precio - costo) / precio) * 1000) / 10 : null;
  const gananciaUnidad = precio - costo;
  const stock = unidades(producto);
  const bajo = producto && stock > 0 && stock <= Number(producto.stockMinimo || 0);
  const slug = sesion()?.slug;
  const vidriera = slug ? urlVidriera(slug) : '';
  const sucio = Boolean(datos && producto && (
    datos.nombre !== producto.nombre
    || (datos.sku || '') !== (producto.sku || '')
    || String(datos.categoriaId || '') !== String(producto.categoriaId || '')
    || Number(datos.costo) !== Number(producto.costo)
    || Number(datos.precio) !== Number(producto.precio)
    || Number(datos.stock) !== Number(producto.stock)
    || Number(datos.stockMinimo) !== Number(producto.stockMinimo)
    || Boolean(datos.publicado) !== Boolean(producto.publicado)
    || (datos.publico || '') !== (producto.publico || '')
    || (datos.descripcion || '') !== (producto.descripcion || '')
    || (datos.marca || '') !== (producto.marca || '')
    || (datos.modelo || '') !== (producto.modelo || '')
    || (datos.color || '') !== (producto.color || '')
    || (datos.material || '') !== (producto.material || '')
    || (datos.medidas || '') !== (producto.medidas || '')
    || (datos.peso || '') !== (producto.peso || '')
    || nuevas.length > 0
    || fotos.length > 0
    || oferta
  ));

  const semanas = useMemo(() => {
    const mapa = new Map();
    delPeriodo.forEach((item) => {
      const clave = lunesDe(item.fecha);
      mapa.set(clave, (mapa.get(clave) || 0) + item.cantidad);
    });
    return [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([dia, total]) => ({ dia, total }));
  }, [delPeriodo]);

  const ranking = useMemo(() => {
    const mapa = new Map();
    delPeriodo.forEach((item) => {
      const nombre = item.variantes.join(', ') || 'Sin variante';
      mapa.set(nombre, (mapa.get(nombre) || 0) + item.cantidad);
    });
    return [...mapa.entries()].map(([nombre, cantidad]) => ({ nombre, cantidad })).sort((a, b) => b.cantidad - a.cantidad);
  }, [delPeriodo]);

  const medioTop = useMemo(() => {
    const mapa = new Map();
    delPeriodo.forEach((item) => mapa.set(item.medio, (mapa.get(item.medio) || 0) + 1));
    const orden = [...mapa.entries()].sort((a, b) => b[1] - a[1]);
    if (!orden.length) return null;
    return { medio: orden[0][0], parte: Math.round((orden[0][1] / delPeriodo.length) * 100) };
  }, [delPeriodo]);

  const mejorDia = useMemo(() => {
    const mapa = new Map();
    delPeriodo.forEach((item) => {
      const dia = new Date(item.fecha).getDay();
      mapa.set(dia, (mapa.get(dia) || 0) + item.cantidad);
    });
    const orden = [...mapa.entries()].sort((a, b) => b[1] - a[1]);
    if (!orden.length || unidadesVendidas <= 0) return null;
    return { nombre: dias[orden[0][0]], parte: Math.round((orden[0][1] / unidadesVendidas) * 100) };
  }, [delPeriodo, unidadesVendidas]);

  const esteMes = movimientos.filter((item) => {
    const fecha = new Date(item.fecha);
    const hoy = new Date();
    return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
  }).reduce((suma, item) => suma + item.cantidad, 0);
  const mesPrevio = movimientos.filter((item) => {
    const fecha = new Date(item.fecha);
    const previo = new Date();
    previo.setMonth(previo.getMonth() - 1);
    return fecha.getMonth() === previo.getMonth() && fecha.getFullYear() === previo.getFullYear();
  }).reduce((suma, item) => suma + item.cantidad, 0);
  const variacion = mesPrevio > 0 ? Math.round(((esteMes - mesPrevio) / mesPrevio) * 100) : null;

  const clientesVisibles = delPeriodo.filter((item) => {
    const texto = buscar.trim().toLowerCase();
    if (!texto) return true;
    const ficha = clientes.find((cliente) => cliente.id === item.clienteId);
    return `${item.cliente || ''} ${ficha?.email || ''} ${ficha?.telefono || ''}`.toLowerCase().includes(texto);
  });

  function set(clave) {
    return (event) => setDatos({ ...datos, [clave]: event.target.type === 'checkbox' ? event.target.checked : event.target.value });
  }

  function descartar() {
    if (!producto) return;
    setDatos(fichaDatos(producto));
    setNuevas([]);
    setFotos([]);
    setOferta(false);
    setPrecioOferta('');
    setMensaje('');
  }

  async function guardar() {
    if (!datos.nombre.trim()) {
      setMensaje('El nombre es obligatorio');
      return;
    }
    if (oferta && !(Number(precioOferta) > 0)) {
      setMensaje('Ingresá el precio de oferta');
      return;
    }
    setOcupado(true);
    setMensaje('');
    try {
      const conVariantes = (producto.variantes || []).length + nuevas.length > 0;
      await api(`/api/productos/${producto.id}`, {
        method: 'PUT',
        body: {
          nombre: datos.nombre.trim(),
          descripcion: datos.descripcion || null,
          sku: datos.sku || null,
          categoriaId: datos.categoriaId ? Number(datos.categoriaId) : null,
          costo: Number(datos.costo),
          precio: Number(datos.precio),
          stock: Number(datos.stock),
          stockMinimo: Number(datos.stockMinimo),
          publicado: Boolean(datos.publicado),
          usaVariantes: conVariantes || producto.usaVariantes,
          publico: datos.publico || null,
          ...payloadDetalles(datos),
        },
      });
      for (const variante of nuevas) {
        await api(`/api/productos/${producto.id}/variantes`, {
          method: 'POST',
          body: {
            nombre: variante.nombre,
            sku: null,
            precio: variante.precio === '' ? null : Number(variante.precio),
            stock: Number(variante.stock) || 0,
          },
        });
      }
      if (oferta) {
        await api(`/api/productos/${producto.id}/promociones`, {
          method: 'POST',
          body: { precioPromo: Number(precioOferta), desde: null, hasta: null },
        });
      }
      for (const foto of fotos) {
        const cuerpo = new FormData();
        cuerpo.append('archivo', foto.archivo);
        await api(`/api/productos/${producto.id}/imagenes`, { method: 'POST', body: cuerpo });
      }
      setVersion((valor) => valor + 1);
    } catch (err) {
      setMensaje(err.message);
      setOcupado(false);
    } finally {
      setOcupado(false);
    }
  }

  async function duplicar() {
    setMensaje('');
    try {
      const copia = await api('/api/productos', {
        method: 'POST',
        body: {
          nombre: `${producto.nombre} (copia)`,
          descripcion: producto.descripcion || null,
          sku: producto.sku ? `${producto.sku}-copia` : null,
          categoriaId: producto.categoriaId,
          costo: Number(producto.costo),
          precio: Number(producto.precio),
          stock: producto.usaVariantes ? 0 : Number(producto.stock),
          stockMinimo: Number(producto.stockMinimo),
          publicado: false,
          usaVariantes: producto.usaVariantes,
          publico: producto.publico || null,
          ...payloadDetalles(producto),
        },
      });
      for (const variante of producto.variantes || []) {
        await api(`/api/productos/${copia.id}/variantes`, {
          method: 'POST',
          body: { nombre: variante.nombre, sku: variante.sku ? `${variante.sku}-copia` : null, precio: variante.precio, stock: 0 },
        });
      }
      navigate(`/productos/${copia.id}`);
    } catch (err) {
      setMensaje(err.message);
    }
  }

  async function eliminar() {
    if (!window.confirm('Si el producto no tiene ventas, se elimina. Si ya se vendió, queda inactivo.')) return;
    try {
      await api(`/api/productos/${producto.id}/desactivar`, { method: 'POST' });
      navigate('/productos');
    } catch (err) {
      setMensaje(err.message);
    }
  }

  function exportar() {
    const encabezado = ['fecha', 'cliente', 'variante', 'medio', 'unidades', 'importe'];
    const lineas = delPeriodo.map((item) => [item.fecha, item.cliente || '', item.variantes.join(' | '), item.medio || '', item.cantidad, item.subtotal]
      .map((valor) => `"${String(valor).replaceAll('"', '""')}"`).join(','));
    const blob = new Blob([`\uFEFF${[encabezado.join(','), ...lineas].join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.download = `producto-${producto.id}.csv`;
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  }

  if (error) return <p className="text-sm font-semibold text-rose-600">{error}</p>;
  if (producto === undefined) return <p className="text-sm text-muted">Cargando el producto…</p>;
  if (producto === null) return <p className="text-sm text-muted">Ese producto no está en el catálogo. <Link to="/productos" className="font-semibold text-accent">Volver</Link></p>;
  if (!datos) return <p className="text-sm text-muted">Cargando el producto…</p>;

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <p>
          <Link to="/productos" className="hover:text-accent">Productos</Link>
          {producto.categoria ? ` / ${producto.categoria}` : ''}
          {` / ${producto.nombre}`}
        </p>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 font-semibold ${datos.publicado ? 'bg-emerald-50 text-emerald-700' : 'bg-sunken text-muted'}`}>
            {datos.publicado ? '● Activo en vidriera' : '● Oculto en vidriera'}
          </span>
          <span className="font-mono">SKU: {producto.sku || 'sin código'}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-ink">Editar: {producto.nombre}</h1>
          <p className="mt-0.5 text-xs text-muted">Edición del catálogo, variantes y precios. Las cifras salen de las ventas registradas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {vidriera && (
            <a href={vidriera} target="_blank" rel="noreferrer" className="rounded-xl border border-line bg-card px-3 py-1.5 text-xs font-semibold text-ink hover:bg-sunken">Ver en vidriera ↗</a>
          )}
          <button type="button" className="rounded-xl border border-line bg-card px-3 py-1.5 text-xs font-semibold text-ink hover:bg-sunken" onClick={duplicar}>Duplicar</button>
          <button type="button" className="rounded-xl px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50" onClick={eliminar}>Eliminar</button>
        </div>
      </div>

      <div className="flex w-fit flex-wrap gap-1 rounded-2xl bg-sunken/80 p-1.5">
        <button type="button" className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${pestana === 'datos' ? 'bg-card text-accent shadow-sm' : 'text-muted'}`} onClick={() => setPestana('datos')}>Información y edición</button>
        <button type="button" className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${pestana === 'stats' ? 'bg-card text-accent shadow-sm' : 'text-muted'}`} onClick={() => setPestana('stats')}>
          Estadísticas y clientes
          {unidadesVendidas > 0 && <span className="ml-1 rounded-full bg-accent-soft px-1.5 text-[10px]">{numero(unidadesVendidas)}</span>}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-line bg-card px-4 py-3 shadow-sm">
          <div className="mb-1 flex items-center justify-between"><p className="text-[11px] font-bold tracking-wide text-faint">UNIDADES VENDIDAS</p><span className="grid h-8 w-8 place-items-center rounded-full bg-accent-soft text-accent"><Bolsa className="h-4 w-4" /></span></div>
          <p className="text-2xl font-black text-ink">{numero(unidadesVendidas)} unid.</p>
          {variacion != null && <p className={`text-[11px] font-bold ${variacion >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{variacion >= 0 ? '↗' : '↘'} {variacion >= 0 ? '+' : ''}{variacion}% vs mes anterior</p>}
          {variacion == null && <p className="text-[11px] text-faint">En el período elegido</p>}
        </article>
        <article className="rounded-2xl border border-line bg-card px-4 py-3 shadow-sm">
          <div className="mb-1 flex items-center justify-between"><p className="text-[11px] font-bold tracking-wide text-faint">FACTURACIÓN</p><span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-sm font-black text-emerald-600">$</span></div>
          <p className="text-2xl font-black text-ink">{pesos(facturado)}</p>
          <p className="text-[11px] text-faint">{unidadesVendidas > 0 ? `Precio promedio ${pesos(facturado / unidadesVendidas)}` : 'Sin ventas en el período'}</p>
        </article>
        <article className="rounded-2xl border border-line bg-card px-4 py-3 shadow-sm">
          <div className="mb-1 flex items-center justify-between"><p className="text-[11px] font-bold tracking-wide text-faint">STOCK ACTUAL</p><span className="grid h-8 w-8 place-items-center rounded-full bg-amber-50 text-amber-600"><Alerta className="h-4 w-4" /></span></div>
          <p className={`text-2xl font-black ${stock <= 0 ? 'text-rose-600' : bajo ? 'text-amber-600' : 'text-ink'}`}>{numero(stock)} unid.</p>
          <p className="text-[11px] text-faint">{stock <= 0 ? 'Agotado' : bajo ? 'Por debajo del mínimo' : 'Por encima del mínimo'}</p>
        </article>
        <article className="rounded-2xl border border-line bg-card px-4 py-3 shadow-sm">
          <div className="mb-1 flex items-center justify-between"><p className="text-[11px] font-bold tracking-wide text-faint">MARGEN</p><span className="grid h-8 w-8 place-items-center rounded-full bg-accent-soft text-accent">%</span></div>
          <p className="text-2xl font-black text-ink">{margenLista == null ? '—' : `${margenLista}%`}</p>
          <p className="text-[11px] text-muted">{margenLista == null ? 'Cargá precio y costo' : `${pesos(gananciaUnidad)} sobre el costo actual`}</p>
        </article>
      </div>

      {pestana === 'datos' ? (
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
          <section className="rounded-2xl border border-line bg-card p-4 shadow-sm">
            <h2 className="text-sm font-bold text-ink">Galería</h2>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {(producto.fotos?.length ? producto.fotos : (producto.imagenes || []).map((imagen) => ({ id: imagen, url: '' }))).map((foto, indice) => (
                <Foto key={foto.id} productoId={producto.id} imagenId={foto.id} urlDirecta={foto.url} principal={indice === 0} />
              ))}
              {fotos.map((foto) => (
                <span key={foto.url} className="relative aspect-square overflow-hidden rounded-xl bg-sunken">
                  <img src={foto.url} alt="" className="h-full w-full object-cover" />
                  <button type="button" className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-card text-xs" onClick={() => setFotos((actual) => actual.filter((item) => item !== foto))}>×</button>
                </span>
              ))}
              {(producto.imagenes || []).length + fotos.length < 8 && (
                <button type="button" className="grid aspect-square place-items-center rounded-xl border border-dashed border-accent/30 text-lg text-accent" onClick={() => archivo.current?.click()}>+</button>
              )}
            </div>
            <input ref={archivo} hidden type="file" accept="image/*" multiple onChange={(event) => {
              const lugar = 8 - (producto.imagenes || []).length - fotos.length;
              const validas = [...event.target.files].filter((item) => item.type.startsWith('image/')).slice(0, lugar);
              setFotos((actual) => [...actual, ...validas.map((item) => ({ archivo: item, url: URL.createObjectURL(item) }))]);
              event.target.value = '';
            }} />
            <div className="mt-4 grid gap-2">
              <label className="text-xs font-semibold text-muted">Nombre<input className="mt-1 w-full rounded-xl border border-line bg-sunken px-3 py-2 text-sm font-medium text-ink outline-none focus:border-accent" value={datos.nombre} onChange={set('nombre')} /></label>
              <label className="text-xs font-semibold text-muted">Descripción<textarea className="mt-1 w-full rounded-xl border border-line bg-sunken px-3 py-2 text-sm text-ink outline-none focus:border-accent" rows={3} maxLength={2000} value={datos.descripcion || ''} onChange={set('descripcion')} /></label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-semibold text-muted">Categoría
                  <select className="mt-1 w-full rounded-xl border border-line bg-sunken px-3 py-2 text-sm" value={datos.categoriaId} onChange={set('categoriaId')}>
                    <option value="">Sin categoría</option>
                    {categorias.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
                  </select>
                </label>
                <label className="text-xs font-semibold text-muted">SKU<input className="mt-1 w-full rounded-xl border border-line bg-sunken px-3 py-2 font-mono text-sm" value={datos.sku} onChange={set('sku')} /></label>
              </div>
              {(datos.publico || rubros.includes('indumentaria') || rubros.includes('calzado') || detalles.includes('talle') || detalles.includes('calzado')) && <div>
                <p className="text-xs font-semibold text-muted">Hombre o mujer</p>
                <p className="mb-2 text-[11px] text-faint">Si lo marcás, la categoría entra en ese submenú de la tienda. Si no, queda afuera.</p>
                <div className="flex flex-wrap gap-2">
                  {[['', 'Sin marcar'], ['hombre', 'Hombre'], ['mujer', 'Mujer']].map(([id, etiqueta]) => (
                    <button key={etiqueta} type="button" className={`rounded-xl px-3 py-1.5 text-xs font-bold ${datos.publico === id ? 'bg-fill text-onfill' : 'bg-sunken text-muted'}`} onClick={() => setDatos({ ...datos, publico: id })}>{etiqueta}</button>
                  ))}
                </div>
              </div>}
              <CamposDetalle datos={datos} activos={detalles} onChange={(clave, valorCampo) => setDatos({ ...datos, [clave]: valorCampo })} />
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
              <h2 className="text-sm font-bold text-ink">Precios</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="text-xs font-semibold text-muted">Costo<input className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-bold" type="number" min="0" step="0.01" value={datos.costo} onChange={set('costo')} /></label>
                <label className="text-xs font-semibold text-muted">Precio de venta<input className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-bold" type="number" min="0" step="0.01" value={datos.precio} onChange={set('precio')} /></label>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-ink">Precio promocional</span>
                <button type="button" role="switch" aria-checked={oferta} className={`relative h-6 w-11 rounded-full ${oferta ? 'bg-fill' : 'bg-raise'}`} onClick={() => setOferta(!oferta)}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-card ${oferta ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
              {oferta && <input className="mt-2 w-full rounded-xl border border-line px-3 py-2 text-sm" type="number" min="0.01" step="0.01" placeholder="Precio de oferta" value={precioOferta} onChange={(event) => setPrecioOferta(event.target.value)} />}
            </div>

            {(ofertaNegocio !== 'SERVICIOS' || (producto.variantes || []).length > 0) && <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
              <h2 className="text-sm font-bold text-ink">{detalles.includes('calzado') && !detalles.includes('talle') ? 'Números y stock' : 'Variantes y stock'}</h2>
              <div className="mt-2 divide-y divide-line text-xs">
                {(producto.variantes || []).length === 0 && nuevas.length === 0 && (
                  <label className="block py-2 text-muted">Stock del producto
                    <input className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm" type="number" min="0" step="0.001" value={datos.stock} onChange={set('stock')} />
                  </label>
                )}
                {(producto.variantes || []).map((variante) => (
                  <div key={variante.id} className="flex items-center justify-between py-2">
                    <span className="font-bold text-ink">{variante.nombre}</span>
                    <span className={Number(variante.stock) <= Number(datos.stockMinimo || 0) ? 'font-bold text-amber-600' : 'text-emerald-700'}>{numero(variante.stock)} unid.</span>
                  </div>
                ))}
                {nuevas.map((variante) => (
                  <div key={variante.nombre} className="flex items-center justify-between py-2">
                    <span className="font-bold text-accent">{variante.nombre}</span>
                    <span>{numero(variante.stock)} unid. · sin guardar</span>
                  </div>
                ))}
              </div>
              {(detalles.includes('talle') || detalles.includes('calzado') || (producto.variantes || []).length > 0) && <div className="mt-2 flex flex-wrap gap-2">
                <input className="min-w-[120px] flex-1 rounded-xl border border-line px-3 py-2 text-xs" placeholder={detalles.includes('calzado') && !detalles.includes('talle') ? 'Nuevo número' : 'Nuevo talle'} value={talle.nombre} onChange={(event) => setTalle({ ...talle, nombre: event.target.value })} />
                <input className="w-20 rounded-xl border border-line px-2 py-2 text-xs" type="number" min="0" step="0.001" value={talle.stock} onChange={(event) => setTalle({ ...talle, stock: event.target.value })} />
                <button type="button" className="rounded-xl bg-sunken px-3 text-xs font-bold text-ink" onClick={() => {
                  const nombre = talle.nombre.trim();
                  if (!nombre) return;
                  setNuevas((actual) => [...actual, { nombre, stock: talle.stock, precio: talle.precio }]);
                  setTalle({ nombre: '', stock: 0, precio: '' });
                }}>Sumar</button>
              </div>}
              <label className="mt-3 block text-xs font-semibold text-muted">Mínimo para reponer
                <input className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm" type="number" min="0" step="0.001" value={datos.stockMinimo} onChange={set('stockMinimo')} />
              </label>
              <p className="mt-1 text-[11px] text-faint">El stock de un talle ya guardado no se modifica desde acá. Se pueden sumar talles nuevos.</p>
            </div>}

            <div className="flex items-center justify-between rounded-2xl border border-accent/20 bg-accent-soft/40 p-4">
              <span>
                <span className="flex items-center gap-2 text-sm font-bold text-ink"><Tienda className="h-4 w-4 text-accent" /> Vidriera</span>
                <span className="text-[11px] text-muted">{datos.publicado ? 'Visible en la tienda pública.' : 'Oculto en la vidriera.'}</span>
              </span>
              <button type="button" role="switch" aria-checked={datos.publicado} className={`relative h-6 w-11 rounded-full ${datos.publicado ? 'bg-fill' : 'bg-raise'}`} onClick={() => setDatos({ ...datos, publicado: !datos.publicado })}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-card ${datos.publicado ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          </section>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1 rounded-full bg-sunken p-0.5 text-xs font-semibold">
              {[[7, '7 días'], [30, 'Últimos 30 días'], ['anio', 'Este año'], ['todo', 'Histórico']].map(([clave, etiqueta]) => (
                <button key={clave} type="button" className={`rounded-full px-3 py-1 ${rango === clave ? 'bg-fill text-onfill' : 'text-muted'}`} onClick={() => setRango(clave)}>{etiqueta}</button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
              <span>{compradores} compradores</span>
              {recompra != null && <span>Recompra {recompra}%</span>}
              <button type="button" className="font-semibold text-accent" onClick={exportar}>Exportar CSV</button>
            </div>
          </div>
          {ventas.length >= 50 && <p className="text-[11px] text-faint">Estas cifras usan las últimas 50 ventas del comercio.</p>}

          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <section className="rounded-2xl border border-line bg-card p-4 shadow-sm">
              <h2 className="text-sm font-bold text-ink">Evolución de unidades</h2>
              <p className="text-[11px] text-faint">Suma semanal de este artículo.</p>
              {semanas.length < 2 ? (
                <p className="py-10 text-center text-sm text-muted">Todavía no hay ventas suficientes en este período para dibujar la curva.</p>
              ) : <Curva serie={semanas} />}
              <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                <p className="rounded-xl bg-sunken px-3 py-2"><span className="block text-[10px] font-bold text-faint">DÍA CON MÁS UNIDADES</span>{mejorDia ? `${mejorDia.nombre} · ${mejorDia.parte}%` : 'Sin datos'}</p>
                <p className="rounded-xl bg-sunken px-3 py-2"><span className="block text-[10px] font-bold text-faint">MEDIO DE PAGO MÁS USADO</span>{medioTop ? `${medios[medioTop.medio] || medioTop.medio} · ${medioTop.parte}%` : 'Sin datos'}</p>
              </div>
            </section>
            <section className="rounded-2xl border border-line bg-card p-4 shadow-sm">
              <h2 className="text-sm font-bold text-ink">Por variante</h2>
              <p className="mb-3 text-[11px] text-faint">{numero(unidadesVendidas)} unidades en el período</p>
              {ranking.length === 0 && <p className="text-sm text-muted">Sin ventas para agrupar.</p>}
              <div className="flex flex-col gap-3">
                {ranking.map((item) => {
                  const parte = unidadesVendidas > 0 ? Math.round((item.cantidad / unidadesVendidas) * 100) : 0;
                  return (
                    <div key={item.nombre}>
                      <div className="mb-1 flex justify-between text-xs"><span className="font-semibold text-ink">{item.nombre}</span><span className="font-bold">{numero(item.cantidad)} · {parte}%</span></div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-sunken"><div className="h-full rounded-full bg-fill" style={{ width: `${parte}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-line bg-card p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-ink">Últimos compradores</h2>
              <label className="flex items-center gap-2 rounded-xl border border-line px-3 py-1.5 text-faint">
                <Lupa className="h-3.5 w-3.5" />
                <input className="bg-transparent text-xs text-ink outline-none" placeholder="Buscar cliente" value={buscar} onChange={(event) => setBuscar(event.target.value)} />
              </label>
            </div>
            {clientesVisibles.length === 0 ? <p className="text-sm text-muted">Nadie compró este artículo en el período.</p> : (
              <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-line text-[10px] font-bold tracking-wide text-faint">
                      {['Cliente', 'Variante', 'Fecha', 'Unidades', 'Importe', ''].map((columna) => <th key={columna} className="pb-2 pr-3">{columna.toUpperCase()}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {clientesVisibles.map((item) => {
                      const ficha = clientes.find((cliente) => cliente.id === item.clienteId);
                      const chat = whatsapp(ficha?.telefono);
                      return (
                        <tr key={item.id} className="border-b border-line">
                          <td className="py-2 pr-3">
                            <p className="font-bold text-ink">{item.cliente || 'Sin cliente'}</p>
                            <p className="text-[11px] text-faint">{ficha?.email || ficha?.telefono || ''}</p>
                          </td>
                          <td className="py-2 pr-3">{item.variantes.join(', ') || '—'}</td>
                          <td className="py-2 pr-3 text-muted">{new Date(item.fecha).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {medios[item.medio] || item.medio}</td>
                          <td className="py-2 pr-3 font-bold">{numero(item.cantidad)}</td>
                          <td className="py-2 pr-3 font-bold">{pesos(item.subtotal)}</td>
                          <td className="py-2">{chat && <a className="font-semibold text-accent" href={chat} target="_blank" rel="noreferrer">WhatsApp</a>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {mensaje && <p className="text-sm font-semibold text-rose-600">{mensaje}</p>}

      <div className="sticky bottom-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-inverse px-4 py-3 text-oninverse shadow-lg">
        <span className="text-xs text-white/80">{sucio ? '● Hay cambios sin guardar' : '● Sin cambios'}</span>
        <div className="flex gap-2">
          <button type="button" className="rounded-xl px-3 py-2 text-xs font-semibold text-white/80" disabled={!sucio} onClick={descartar}>Descartar</button>
          <button type="button" className="rounded-xl bg-fill px-4 py-2 text-sm font-bold disabled:opacity-40" disabled={!sucio || ocupado} onClick={guardar}>Guardar cambios</button>
        </div>
      </div>
    </div>
  );
}

function Curva({ serie }) {
  const maximo = Math.max(...serie.map((item) => item.total), 1);
  const ancho = 640;
  const alto = 160;
  const puntos = serie.map((item, indice) => ({
    x: 16 + (indice / Math.max(serie.length - 1, 1)) * (ancho - 32),
    y: 16 + (1 - item.total / maximo) * (alto - 36),
    ...item,
  }));
  const trazo = curva(puntos);
  const area = `${trazo} L ${puntos.at(-1).x} ${alto - 16} L ${puntos[0].x} ${alto - 16} Z`;
  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} className="mt-2 h-40 w-full">
      <path d={area} fill="var(--fill-c)" opacity="0.12" />
      <path d={trazo} fill="none" stroke="var(--accent-c)" strokeWidth="2.4" />
      {puntos.map((punto) => <circle key={punto.dia} cx={punto.x} cy={punto.y} r="3" fill="var(--card-c)" stroke="var(--accent-c)" strokeWidth="1.6" />)}
    </svg>
  );
}

function Foto({ productoId, imagenId, urlDirecta, principal }) {
  const [url, setUrl] = useState(urlDirecta || '');
  useEffect(() => {
    if (urlDirecta) {
      setUrl(urlDirecta);
      return undefined;
    }
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
  }, [productoId, imagenId, urlDirecta]);
  return (
    <span className="relative aspect-square overflow-hidden rounded-xl bg-sunken">
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
      {principal && <span className="absolute left-1 top-1 rounded bg-emerald-600 px-1 text-[9px] font-bold text-white">Principal</span>}
    </span>
  );
}
