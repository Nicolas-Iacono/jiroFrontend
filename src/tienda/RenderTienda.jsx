import { useEffect, useMemo, useState } from 'react';
import Barrio from './Barrio.jsx';
import Tienda from '@tienda/Tienda.jsx';

const fondos = { blanco: '#FFFFFF', gris: '#F4F5F9', calido: '#FFF7ED', crema: '#F6F1E8', oscuro: '#111827' };
const fuentes = {
  jakarta: '"Plus Jakarta Sans", Inter, sans-serif',
  inter: 'Inter, sans-serif',
  playfair: '"Playfair Display", Georgia, serif',
  grotesk: '"Space Grotesk", Inter, sans-serif',
};
const paginas = [['inicio', 'Inicio'], ['productos', 'Productos'], ['favoritos', 'Favoritos'], ['carrito', 'Carrito']];

const apiBase = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function urlApi(path) {
  return `${apiBase}${path}`;
}

function pesos(valor) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(valor) || 0);
}

function textoSobre(hex) {
  const n = String(hex || '').replace('#', '');
  if (n.length !== 6) return '#FFFFFF';
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160 ? '#1A1614' : '#FFFFFF';
}

function colorLegible(hex, oscuro) {
  if (oscuro) return '#FFFFFF';
  const n = String(hex || '').replace('#', '');
  if (n.length !== 6) return '#0F172A';
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 170 ? '#0F172A' : hex;
}

function iniciales(nombre) {
  const partes = String(nombre || 'Ti').trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] || 'T') + (partes[1]?.[0] || '')).toUpperCase();
}

function fotoDe(producto) {
  const directa = (producto.fotos || []).find((item) => item.url);
  if (directa?.url) return directa.url;
  return '';
}

function fotosDe(producto, slug) {
  const directas = (producto.fotos || []).map((item) => item.url).filter(Boolean);
  if (directas.length) return directas;
  return (producto.imagenes || []).map((id) => urlApi(`/api/public/vidrieras/${slug}/imagenes/${id}`));
}

function claveCarrito(slug) {
  return `giro-carrito-${slug}`;
}

// Render público extraído de frontend-storefront. El editor entrega el borrador ya cargado.
export default function RenderTienda({ data, dispositivo = 'auto', persistir = true }) {
  const slug = data.slug;
  const [buscar, setBuscar] = useState('');
  const [categoria, setCategoria] = useState('Todas');
  const [publico, setPublico] = useState('');
  const [soloSinMarca, setSoloSinMarca] = useState(false);
  const [pagina, setPagina] = useState('inicio');
  const [productoId, setProductoId] = useState(null);
  const [origen, setOrigen] = useState('inicio');
  const [abierto, setAbierto] = useState(false);
  const [hombreAbierto, setHombreAbierto] = useState(false);
  const [mujerAbierta, setMujerAbierta] = useState(false);
  const [favoritos, setFavoritos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [listo, setListo] = useState('');
  const menu = useMemo(() => menuPublico(data?.productos), [data]);

  useEffect(() => {
    if (!persistir || !slug) return;
    try {
      setCarrito(JSON.parse(localStorage.getItem(claveCarrito(slug)) || '[]'));
    } catch {
      setCarrito([]);
    }
    setListo(slug);
    return undefined;
  }, [persistir, slug]);

  useEffect(() => {
    if (!data) return undefined;
    const fondoPagina = fondos[data.fondo] || '#FFFFFF';
    document.documentElement.style.background = fondoPagina;
    document.body.style.background = fondoPagina;
    return undefined;
  }, [data]);

  useEffect(() => {
    if (!persistir || !slug || listo !== slug) return;
    localStorage.setItem(claveCarrito(slug), JSON.stringify(carrito));
  }, [persistir, slug, carrito, listo]);

  function alternarFavorito(id) {
    setFavoritos((actual) => actual.includes(id) ? actual.filter((item) => item !== id) : [...actual, id]);
  }

  function ir(destino, filtro = {}) {
    setPagina(destino);
    setProductoId(null);
    setAbierto(false);
    setCategoria(filtro.categoria || 'Todas');
    setPublico(filtro.publico || '');
    setSoloSinMarca(Boolean(filtro.soloSinMarca));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function abrirProducto(id) {
    setOrigen(pagina === 'producto' ? origen : pagina);
    setProductoId(id);
    setPagina('producto');
    setAbierto(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function agregar(producto, extra = {}) {
    const variante = extra.variante || null;
    const stock = Number(variante ? variante.stock : producto.stock);
    if (stock <= 0) return;
    const pedida = Math.max(1, Number(extra.cantidad) || 1);
    const clave = `${producto.id}:${variante?.id || ''}`;
    const imagen = fotoDe(producto) || (producto.imagenes?.[0] ? urlApi(`/api/public/vidrieras/${slug}/imagenes/${producto.imagenes[0]}`) : '');
    const precioLinea = Number(variante?.precio ?? producto.precioVigente ?? producto.precio) || 0;
    setCarrito((actual) => {
      const previo = actual.find((item) => (item.clave || String(item.id)) === clave);
      if (previo) {
        const cantidad = Math.min(stock, previo.cantidad + pedida);
        return actual.map((item) => ((item.clave || String(item.id)) === clave ? { ...item, cantidad, stock, precio: precioLinea } : item));
      }
      return [...actual, {
        clave,
        id: producto.id,
        varianteId: variante?.id || null,
        varianteNombre: variante?.nombre || '',
        nombre: producto.nombre,
        categoria: producto.categoria || '',
        precio: precioLinea,
        imagen,
        cantidad: Math.min(stock, pedida),
        stock,
      }];
    });
  }

  function cambiarCantidad(clave, delta) {
    setCarrito((actual) => actual.flatMap((item) => {
      if ((item.clave || String(item.id)) !== clave) return [item];
      const tope = Number(item.stock) > 0 ? Number(item.stock) : item.cantidad + 1;
      const cantidad = Math.min(tope, item.cantidad + delta);
      return cantidad > 0 ? [{ ...item, cantidad }] : [];
    }));
  }

  if (data.plantillaId && data.plantillaId !== 'giro') {
    return <Tienda tienda={data} dispositivo={dispositivo} persistir={persistir} />;
  }
  if (data.tema === 'barrio') {
    return <Barrio persistir={persistir} data={data} slug={slug} carrito={carrito} onAgregar={agregar} onCantidad={cambiarCantidad} />;
  }

  const fondo = fondos[data.fondo] || '#FFFFFF';
  const oscuro = data.texto === 'claro';
  const tinta = oscuro ? '#F8FAFC' : '#0F172A';
  const suave = oscuro ? 'rgba(248,250,252,0.72)' : '#64748B';
  const superficie = oscuro ? 'rgba(255,255,255,0.06)' : '#FFFFFF';
  const borde = oscuro ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.08)';
  const precio = colorLegible(data.color, oscuro);
  const lugar = [data.localidad, data.partido].filter(Boolean).join(', ');
  const unidades = carrito.reduce((suma, item) => suma + item.cantidad, 0);
  const productoActual = (data.productos || []).find((item) => String(item.id) === String(productoId)) || null;

  function elegirCategoria(nombre) {
    setPagina('inicio');
    setCategoria(nombre || 'Todas');
    setPublico('');
    setSoloSinMarca(false);
    setAbierto(false);
    window.requestAnimationFrame(() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  const buscarPlaceholder = data.buscar || 'Buscar en la tienda';
  const detalle = data.estado || lugar;

  return (
    <main style={{ margin: 0, minHeight: '100vh', background: fondo, color: tinta, fontFamily: fuentes[data.fuente] || fuentes.jakarta }}>
      <div className="giro-marco" style={{ minHeight: '100vh', background: fondo }}>
      <style>{`
        .giro-marco { width: 100%; max-width: 480px; margin: 0 auto; }
        .giro-links { display: none; }
        .giro-pie { position: fixed; inset: auto 0 0; z-index: 25; display: grid; grid-template-columns: repeat(4, 1fr); background: ${fondo}; border-top: 1px solid ${borde}; }
        .giro-pie button { min-height: 48px; background: transparent; border: 0; color: inherit; font: inherit; font-size: 12px; }
        .giro-pie [aria-current] { font-weight: 800; }
        .giro-marco { padding-bottom: 50px; }
        @media (min-width: 768px) { .giro-pie { display: none; } .giro-marco { padding-bottom: 0; } }
        .giro-burger { display: grid; }
        .giro-sub { position: relative; }
        .giro-sub > div { display: none; position: absolute; top: 100%; left: 0; min-width: 160px; padding: 8px; border-radius: 12px; background: ${fondo}; border: 1px solid ${borde}; z-index: 30; }
        .giro-sub:hover > div, .giro-sub:focus-within > div { display: flex; flex-direction: column; }
        .giro-hero { height: 250px; }
        .giro-foto { height: 360px; }
        .giro-carrusel, .giro-carrusel img { width: 100%; height: 100%; object-fit: cover; }
        .giro-grilla { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .giro-relacionados { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        @media (min-width: 768px) {
          .giro-marco { max-width: 1180px; margin: 0 auto; }
          .giro-links { display: flex; align-items: center; gap: 22px; }
          .giro-burger { display: none; }
          .giro-inicio { display: flex; flex-direction: column; padding: 8px 28px 0; }
          .giro-inicio .giro-buscar { order: 2; max-width: 380px; margin: 18px 0 0 !important; }
          .giro-inicio .giro-ficha { order: 3; margin: 14px 0 0 !important; }
          .giro-inicio .giro-hero { order: 1; height: 460px; min-height: 460px; margin: 8px 0 0 !important; border-radius: 22px; }
          .giro-hero h2 { font-size: 56px; line-height: 0.95; max-width: 14ch; }
          .giro-inicio .giro-rubros { order: 4; justify-content: flex-start !important; padding: 22px 0 0 !important; }
          .giro-inicio .giro-aviso { order: 5; margin: 14px 0 0 !important; }
          .giro-grilla { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .giro-catalogo { padding-left: 28px !important; padding-right: 28px !important; }
          .giro-detalle { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(280px, 0.9fr); column-gap: 36px; align-items: start; padding: 12px 28px 40px; }
          .giro-detalle .giro-foto { grid-column: 1; height: 560px; margin: 12px 0 0 !important; border-radius: 22px; }
          .giro-detalle .giro-detalle-info { grid-column: 2; grid-row: 1; padding: 28px 0 0 !important; }
          .giro-detalle .giro-tambien { grid-column: 1 / -1; }
          .giro-relacionados { grid-template-columns: repeat(4, minmax(0, 1fr)); }
          .giro-carrito { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.7fr); column-gap: 32px; align-items: start; }
          .giro-carrito-titulo { grid-column: 1 / -1; }
          .giro-carrito-resumen { position: sticky; top: 88px; margin-top: 14px; }
          .giro-carrito-vacio { max-width: 420px; margin: 48px auto !important; }
        }
      `}</style>
      {data.marquesina && (
        <p style={{ margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', background: data.color, color: textoSobre(data.color), textAlign: 'center', fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '8px 16px' }}>{data.marquesina}</p>
      )}
      <Barra
        data={data}
        tinta={tinta}
        suave={suave}
        borde={borde}
        fondo={fondo}
        detalle={detalle}
        pagina={pagina}
        publico={publico}
        categoria={categoria}
        menu={menu}
        abierto={abierto}
        unidades={unidades}
        onAbrir={() => setAbierto((valor) => !valor)}
        onIr={ir}
      />
      {abierto && (
        <nav style={{ borderBottom: `1px solid ${borde}`, background: fondo, padding: '8px 16px 16px' }}>
          {paginas.map(([id, etiqueta]) => (
            <button key={id} type="button" onClick={() => ir(id)} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 0, color: pagina === id ? data.color : tinta, font: 'inherit', fontWeight: 750, fontSize: 18, padding: '10px 0' }}>{etiqueta}{id === 'carrito' && unidades ? ` (${unidades})` : ''}</button>
          ))}
          <button type="button" onClick={() => setHombreAbierto((valor) => !valor)} style={{ display: menu.hombre.length ? 'flex' : 'none', width: '100%', justifyContent: 'space-between', background: 'transparent', border: 0, color: publico === 'hombre' ? data.color : tinta, font: 'inherit', fontWeight: 750, fontSize: 18, padding: '10px 0' }}>
            Hombre <span>{hombreAbierto ? '−' : '+'}</span>
          </button>
          {hombreAbierto && (
            <>
              <button type="button" onClick={() => ir('productos', { publico: 'hombre' })} style={subLink(data, suave)}>Todo hombre</button>
              {menu.hombre.map((item) => <button key={item} type="button" onClick={() => ir('productos', { categoria: item, publico: 'hombre' })} style={subLink(data, categoria === item && publico === 'hombre' ? data.color : suave)}>{item}</button>)}
            </>
          )}
          <button type="button" onClick={() => setMujerAbierta((valor) => !valor)} style={{ display: menu.mujer.length ? 'flex' : 'none', width: '100%', justifyContent: 'space-between', background: 'transparent', border: 0, color: publico === 'mujer' ? data.color : tinta, font: 'inherit', fontWeight: 750, fontSize: 18, padding: '10px 0' }}>
            Mujer <span>{mujerAbierta ? '−' : '+'}</span>
          </button>
          {mujerAbierta && (
            <>
              <button type="button" onClick={() => ir('productos', { publico: 'mujer' })} style={subLink(data, suave)}>Todo mujer</button>
              {menu.mujer.map((item) => <button key={item} type="button" onClick={() => ir('productos', { categoria: item, publico: 'mujer' })} style={subLink(data, categoria === item && publico === 'mujer' ? data.color : suave)}>{item}</button>)}
            </>
          )}
          {menu.sueltos.map((item) => (
            <button key={item} type="button" onClick={() => ir('productos', { categoria: item, soloSinMarca: true })} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 0, color: categoria === item && soloSinMarca ? data.color : tinta, font: 'inherit', fontWeight: 750, fontSize: 18, padding: '10px 0' }}>{item}</button>
          ))}
        </nav>
      )}
      {pagina === 'productos' && (
        <label className="giro-buscar" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 16px 0', border: `1px solid ${borde}`, background: oscuro ? 'rgba(255,255,255,0.06)' : '#fff', color: suave, borderRadius: 999, padding: '11px 14px' }}>
          <Lupa />
          <input value={buscar} onChange={(event) => setBuscar(event.target.value)} placeholder={buscarPlaceholder} aria-label={buscarPlaceholder} style={{ width: '100%', border: 0, background: 'transparent', color: tinta, font: 'inherit', outline: 'none' }} />
        </label>
      )}
      {pagina === 'inicio' && (
        <div className="giro-inicio">
          <label className="giro-buscar" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 16px 0', border: `1px solid ${borde}`, background: oscuro ? 'rgba(255,255,255,0.06)' : '#fff', color: suave, borderRadius: 999, padding: '11px 14px' }}>
            <Lupa />
            <input value={buscar} onChange={(event) => setBuscar(event.target.value)} placeholder={buscarPlaceholder} aria-label={buscarPlaceholder} style={{ width: '100%', border: 0, background: 'transparent', color: tinta, font: 'inherit', outline: 'none' }} />
          </label>
          <Ficha data={data} tinta={tinta} suave={suave} lugar={lugar} oscuro={oscuro} />
          <Hero data={data} suave={suave} onExplorar={() => elegirCategoria('Todas')} />
      {data.mostrarRubros && (data.rubros || []).length > 0 && (
        data.rubroForma === 'pastilla' ? (
          <div className="giro-rubros" style={{ padding: '16px 16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
              <strong style={{ fontSize: 15 }}>{data.explorar || 'Explorar'}</strong>
              <span style={{ color: suave, fontSize: 12 }}>{data.rubros.length} categorías</span>
            </div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
              <button type="button" onClick={() => elegirCategoria('Todas')} style={estiloPastilla(categoria === 'Todas', data, tinta)}>Todas</button>
              {data.rubros.map((item) => (
                <button key={item.id} type="button" onClick={() => elegirCategoria(item.nombre)} style={estiloPastilla(categoria === item.nombre, data, tinta)}>{item.nombre}</button>
              ))}
            </div>
          </div>
        ) : (
          <div className="giro-rubros" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 22, padding: '22px 16px 0' }}>
            {data.rubros.map((item) => (
              <button key={item.id} type="button" onClick={() => elegirCategoria(item.nombre)} style={{ display: 'flex', width: 88, flexDirection: 'column', alignItems: 'center', gap: 8, background: 'transparent', border: 0, color: categoria === item.nombre ? data.color : tinta, fontFamily: fuentes[data.fuente] || fuentes.jakarta, fontSize: 13, fontWeight: 500, letterSpacing: '0.04em', textAlign: 'center', cursor: 'pointer' }}>
                <IconoRubro nombre={item.nombre} color={data.rubroColor || data.color} forma={data.rubroForma} />
                {item.nombre}
              </button>
            ))}
          </div>
        )
      )}
      {data.aviso && (
        <p className="giro-aviso" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: '12px 16px 0', color: suave, fontSize: 13 }}>
          <span style={{ width: 7, height: 7, marginTop: 6, borderRadius: '50%', background: data.color, flexShrink: 0 }} />
          {data.aviso}
        </p>
      )}
        </div>
      )}
      {pagina === 'inicio' && (data.secciones || []).map((seccion) => {
        if (seccion.tipo === 'texto') {
          if (!seccion.titulo && !seccion.texto) return null;
          return (
            <section key={seccion.id} style={{ maxWidth: 760, margin: '28px auto 0', padding: '0 16px' }}>
              {seccion.titulo && <h2 style={{ margin: 0, fontSize: 28 }}>{seccion.titulo}</h2>}
              {seccion.texto && <p style={{ margin: '8px 0 0', color: suave, whiteSpace: 'pre-wrap' }}>{seccion.texto}</p>}
            </section>
          );
        }
        if (!seccion.categoria) return null;
        const prendas = (data.productos || []).filter((item) => item.categoria === seccion.categoria);
        return (
          <section key={seccion.id} style={{ maxWidth: 1120, margin: '8px auto 0', padding: '0 16px' }}>
            <h2 style={{ margin: '20px 0 0', fontSize: 28 }}>{seccion.titulo || seccion.categoria}</h2>
            <Grilla data={{ ...data, productos: prendas }} slug={slug} buscar="" categoria="Todas" publico="" soloSinMarca={false} tinta={tinta} suave={suave} superficie={superficie} borde={borde} precio={precio} onAgregar={agregar} onAbrir={abrirProducto} />
          </section>
        );
      })}
      {pagina === 'producto' && (
        productoActual ? (
          <Detalle key={productoActual.id} producto={productoActual} data={data} slug={slug} tinta={tinta} suave={suave} superficie={superficie} borde={borde} precioColor={precio} oscuro={oscuro} carrito={carrito} onVolver={() => ir(origen || 'inicio')} onAgregar={agregar} onCarrito={() => ir('carrito')} onAbrir={abrirProducto} />
        ) : (
          <p style={{ margin: '24px 16px', color: suave }}>Ese producto ya no está publicado.</p>
        )
      )}
      {pagina !== 'producto' && (
        <div id="catalogo" className="giro-catalogo" style={{ margin: '0 auto', padding: pagina === 'carrito' ? '8px 16px 28px' : '20px 16px 48px' }}>
          {pagina === 'favoritos' && <h1>Favoritos</h1>}
          {pagina === 'carrito' ? (
            <Carrito items={carrito} data={data} tinta={tinta} suave={suave} borde={borde} precio={precio} superficie={superficie} oscuro={oscuro} fondo={fondo} onCantidad={cambiarCantidad} onSeguir={() => ir('inicio')} onAbrir={abrirProducto} />
          ) : (
            <Grilla data={pagina === 'favoritos' ? { ...data, productos: data.productos.filter((item) => favoritos.includes(item.id)) } : data} favoritos={favoritos} onFavorito={alternarFavorito} slug={slug} buscar={buscar} categoria={categoria} publico={pagina === 'inicio' ? '' : publico} soloSinMarca={pagina !== 'inicio' && soloSinMarca} tinta={tinta} suave={suave} superficie={superficie} borde={borde} precio={precio} onAgregar={agregar} onAbrir={abrirProducto} />
          )}
        </div>
      )}
      </div>
      <nav className="giro-pie" aria-label="Secciones">
        {paginas.map(([id, etiqueta]) => <button key={id} type="button" aria-current={pagina === id ? 'page' : undefined} onClick={() => ir(id)}>{etiqueta}</button>)}
      </nav>
    </main>
  );
}

function radioLogo(forma) {
  if (forma === 'cuadrado') return '0';
  if (forma === 'curvo') return '8px';
  return '50%';
}

function Barra({ data, tinta, suave, borde, fondo, detalle, pagina, publico, categoria, menu, abierto, unidades, onAbrir, onIr }) {
  const modo = data.menu || 'lados';
  const radio = radioLogo(data.logoForma);
  const avatar = data.logoUrl
    ? <img alt="" src={data.logoUrl} style={{ width: 40, height: 40, borderRadius: radio, objectFit: 'cover' }} />
    : <span style={{ width: 40, height: 40, borderRadius: radio, background: data.color, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13 }}>{iniciales(data.titulo)}</span>;
  const nombre = (
    <span style={{ minWidth: 0 }}>
      <strong style={{ display: 'block', fontSize: 16, lineHeight: 1.15 }}>{data.titulo}</strong>
      {detalle && <span style={{ display: 'block', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: suave, fontSize: 12, fontWeight: 600 }}>{detalle}</span>}
    </span>
  );
  const marca = <button type="button" onClick={() => onIr('inicio')} style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, background: 'transparent', border: 0, color: tinta, font: 'inherit', padding: 0, cursor: 'pointer' }}>{avatar}{modo !== 'esquinas' && nombre}</button>;
  const links = (
    <div className="giro-links">
      {paginas.map(([id, etiqueta]) => (
        <button key={id} type="button" onClick={() => onIr(id)} style={{ background: 'transparent', border: 0, color: pagina === id && !publico && categoria === 'Todas' ? data.color : tinta, font: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>{etiqueta}</button>
      ))}
      {menu.hombre.length > 0 && (
        <span className="giro-sub">
          <button type="button" onClick={() => onIr('productos', { publico: 'hombre' })} style={{ background: 'transparent', border: 0, color: publico === 'hombre' ? data.color : tinta, font: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Hombre</button>
          <div>
            {menu.hombre.map((item) => <button key={item} type="button" onClick={() => onIr('productos', { categoria: item, publico: 'hombre' })} style={{ background: 'transparent', border: 0, color: tinta, font: 'inherit', textAlign: 'left', padding: '6px 4px', cursor: 'pointer' }}>{item}</button>)}
          </div>
        </span>
      )}
      {menu.mujer.length > 0 && (
        <span className="giro-sub">
          <button type="button" onClick={() => onIr('productos', { publico: 'mujer' })} style={{ background: 'transparent', border: 0, color: publico === 'mujer' ? data.color : tinta, font: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Mujer</button>
          <div>
            {menu.mujer.map((item) => <button key={item} type="button" onClick={() => onIr('productos', { categoria: item, publico: 'mujer' })} style={{ background: 'transparent', border: 0, color: tinta, font: 'inherit', textAlign: 'left', padding: '6px 4px', cursor: 'pointer' }}>{item}</button>)}
          </div>
        </span>
      )}
      {menu.sueltos.map((item) => (
        <button key={item} type="button" onClick={() => onIr('productos', { categoria: item, soloSinMarca: true })} style={{ background: 'transparent', border: 0, color: categoria === item && !publico ? data.color : tinta, font: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>{item}</button>
      ))}
    </div>
  );
  const bolsa = (
    <button type="button" onClick={() => onIr('carrito')} aria-label="Carrito" style={{ position: 'relative', background: 'transparent', border: 0, color: tinta, cursor: 'pointer', padding: 4 }}>
      <Bolsa />
      {unidades > 0 && <span style={{ position: 'absolute', top: -2, right: -6, background: data.color, color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 800, minWidth: 16, textAlign: 'center', padding: '1px 4px' }}>{unidades}</span>}
    </button>
  );
  const burger = (
    <button type="button" className="giro-burger" onClick={onAbrir} aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'} style={{ width: 40, height: 40, placeItems: 'center', borderRadius: 10, border: `1px solid ${borde}`, background: 'transparent', color: tinta, fontSize: 20 }}>{abierto ? '×' : '☰'}</button>
  );
  const caja = { position: 'sticky', top: 0, zIndex: 20, background: fondo, padding: '18px 28px' };
  if (modo === 'centro') return <header style={{ ...caja, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 16 }}>{burger}{marca}{links}{bolsa}</header>;
  if (modo === 'esquinas') {
    return (
      <header style={{ ...caja, display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 12 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{burger}{avatar}</span>
        <span style={{ minWidth: 0, textAlign: 'center' }}>{nombre}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>{links}{bolsa}</span>
      </header>
    );
  }
  return <header style={{ ...caja, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{burger}{marca}</span><span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>{links}{bolsa}</span></header>;
}

function Bolsa() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M6 8h12l-1 12H7L6 8z" />
      <path d="M9 8V7a3 3 0 0 1 6 0v1" />
    </svg>
  );
}

function menuPublico(productos) {
  const hombre = [];
  const mujer = [];
  const sueltos = [];
  const sumar = (lista, nombre) => { if (nombre && !lista.includes(nombre)) lista.push(nombre); };
  for (const item of productos || []) {
    if (item.publico === 'hombre') sumar(hombre, item.categoria);
    else if (item.publico === 'mujer') sumar(mujer, item.categoria);
    else sumar(sueltos, item.categoria);
  }
  return { hombre, mujer, sueltos };
}

function subLink(data, color) {
  return { display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 0, color, font: 'inherit', fontSize: 15, padding: '8px 0 8px 12px' };
}

function radioRubro(forma) {
  if (forma === 'recto') return '0';
  if (forma === 'redondeado') return '14px';
  return '50%';
}

function IconoRubro({ nombre, color, forma }) {
  return (
    <span style={{ width: 56, height: 56, borderRadius: radioRubro(forma), display: 'grid', placeItems: 'center', background: `${color}22`, color }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        {trazoRubro(nombre)}
      </svg>
    </span>
  );
}

function trazoRubro(nombre) {
  const texto = String(nombre || '').toLowerCase();
  if (/zapato|zapatilla|calzado|bota|borcego/.test(texto)) return <path d="M4 16c2-4 4-6 8-6h6v3c0 2-2 3-4 3H6c-1 0-2-1-2-2z" />;
  if (/jean|pantal/.test(texto)) return <path d="M8 4h8l1 16h-3l-2-8-2 8H7L8 4z" />;
  if (/campera|abrigo|camisa/.test(texto)) return <path d="M8 6 4 9v4l3-1v8h10v-8l3 1V9l-4-3-2 2h-2L8 6z" />;
  if (/buzo|sweater|hoodie/.test(texto)) return <path d="M8 6h8v3h3v9h-4v-5H9v5H5V9h3V6z" />;
  if (/remera|top|musculosa/.test(texto)) return <path d="M8 5h8l3 3v3h-3v8H8v-8H5V8l3-3z" />;
  return <path d="M12 3v18M8 7h8M9 21h6" />;
}

function Carrusel({ fotos }) {
  const [indice, setIndice] = useState(0);
  useEffect(() => {
    if (fotos.length < 2) return undefined;
    const id = setInterval(() => setIndice((actual) => (actual + 1) % fotos.length), 5000);
    return () => clearInterval(id);
  }, [fotos]);
  const foto = fotos[indice] || fotos[0];
  return (
    <div className="giro-carrusel" style={{ position: 'relative', height: '100%' }}>
      <img alt="" src={foto} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
      {fotos.length > 1 && (
        <>
          <button type="button" aria-label="Foto anterior" onClick={() => setIndice((actual) => (actual - 1 + fotos.length) % fotos.length)} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', border: 0, background: 'rgba(0,0,0,0.45)', color: '#fff', cursor: 'pointer' }}>‹</button>
          <button type="button" aria-label="Foto siguiente" onClick={() => setIndice((actual) => (actual + 1) % fotos.length)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', border: 0, background: 'rgba(0,0,0,0.45)', color: '#fff', cursor: 'pointer' }}>›</button>
          <span style={{ position: 'absolute', left: 0, right: 0, bottom: 12, display: 'flex', justifyContent: 'center', gap: 6 }}>
            {fotos.map((item, i) => <button key={item} type="button" aria-label={`Foto ${i + 1}`} onClick={() => setIndice(i)} style={{ width: 8, height: 8, borderRadius: '50%', border: 0, background: i === indice ? '#fff' : 'rgba(255,255,255,0.45)', padding: 0 }} />)}
          </span>
        </>
      )}
    </div>
  );
}

function Lupa() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function estiloPastilla(activa, data, tinta) {
  return {
    flex: '0 0 auto',
    border: 0,
    borderRadius: 999,
    padding: '8px 14px',
    font: 'inherit',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    background: activa ? data.color : `color-mix(in srgb, ${data.color} 14%, transparent)`,
    color: activa ? '#fff' : tinta,
  };
}

function Ficha({ data, tinta, suave, lugar, oscuro }) {
  if (!data.descripcion && !data.sello && !data.etiqueta) return null;
  const fondo = `color-mix(in srgb, ${data.color} ${oscuro ? '24%' : '13%'}, ${oscuro ? '#111827' : '#ffffff'})`;
  const radio = radioLogo(data.logoForma);
  const segunda = data.estado && lugar ? lugar : '';
  const chip = { borderRadius: 999, padding: '4px 8px', fontSize: 11, fontWeight: 700, background: `color-mix(in srgb, ${data.color} 16%, transparent)` };
  return (
    <section className="giro-ficha" style={{ margin: '12px 16px 0', padding: 14, borderRadius: 20, background: fondo, color: tinta }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', minWidth: 0, gap: 10 }}>
          {data.logoUrl
            ? <img alt="" src={data.logoUrl} style={{ width: 36, height: 36, borderRadius: radio, objectFit: 'cover' }} />
            : <span style={{ width: 36, height: 36, borderRadius: radio, background: data.color, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 12 }}>{iniciales(data.titulo)}</span>}
          <div style={{ minWidth: 0 }}>
            <strong style={{ display: 'block', letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 14 }}>{data.titulo}</strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {data.etiqueta && <span style={chip}>{data.etiqueta}</span>}
              {segunda && <span style={chip}>{segunda}</span>}
            </div>
          </div>
        </div>
        {data.sello && <span style={{ flexShrink: 0, borderRadius: 999, background: data.color, color: '#fff', fontSize: 11, fontWeight: 800, padding: '7px 10px' }}>{data.sello}</span>}
      </div>
      {data.descripcion && <p style={{ margin: '10px 0 0', color: suave, fontSize: 13, lineHeight: 1.45 }}>{data.descripcion}</p>}
    </section>
  );
}

function CopiaHero({ data, onExplorar }) {
  if (!data.heroEtiqueta && !data.heroTitulo && !data.heroTexto && !data.heroCta) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 18, color: '#fff', background: 'linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.62))', pointerEvents: 'none' }}>
      {data.heroEtiqueta && <span style={{ alignSelf: 'flex-start', marginBottom: 8, borderRadius: 999, background: 'rgba(255,255,255,0.18)', padding: '4px 8px', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{data.heroEtiqueta}</span>}
      {data.heroTitulo && <h2 style={{ margin: 0, fontSize: 28, lineHeight: 1.05 }}>{data.heroTitulo}</h2>}
      {data.heroTexto && <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.86)', fontSize: 13 }}>{data.heroTexto}</p>}
      {data.heroCta && <button type="button" onClick={onExplorar} style={{ alignSelf: 'flex-start', marginTop: 12, border: 0, borderRadius: 999, background: '#fff', color: '#111', font: 'inherit', fontWeight: 800, fontSize: 13, padding: '8px 14px', cursor: 'pointer', pointerEvents: 'auto' }}>{data.heroCta} →</button>}
    </div>
  );
}

function Hero({ data, suave, onExplorar }) {
  if (data.hero === 'ninguno') return null;
  const radio = Math.max(Number(data.radio) || 0, 18);
  const esFoto = data.hero === 'foto' && data.portadaUrl;
  if (data.hero === 'tipografico') {
    return (
      <section style={{ margin: '16px 16px 0' }}>
        {data.heroEtiqueta && <p style={{ margin: 0, color: suave, fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{data.heroEtiqueta}</p>}
        <h1 style={{ margin: '4px 0 0', fontSize: 34, lineHeight: 1.05 }}>{data.heroTitulo || data.titulo}</h1>
        {data.heroTexto && <p style={{ margin: '8px 0 0', color: suave }}>{data.heroTexto}</p>}
      </section>
    );
  }
  if (data.hero === 'foto' && !esFoto) return null;
  const fotos = data.portadas?.length ? data.portadas : [data.portadaUrl];
  return (
    <section className="giro-hero" style={{ position: 'relative', margin: '14px 16px 0', overflow: 'hidden', borderRadius: radio, background: `linear-gradient(145deg, ${data.color || '#7c3aed'}, #1e1b4b)` }}>
      {esFoto && <Carrusel fotos={fotos} />}
      <CopiaHero data={data} onExplorar={onExplorar} />
    </section>
  );
}

const FICHA = [
  ['marca', 'Marca'],
  ['modelo', 'Modelo'],
  ['color', 'Color'],
  ['material', 'Material'],
  ['medidas', 'Medidas'],
  ['peso', 'Peso'],
];

function datosVisibles(producto, data) {
  const activos = data.detalles || [];
  return FICHA.filter(([id]) => activos.includes(id) && producto[id]);
}

function tituloOpciones(data) {
  const activos = data.detalles || [];
  if (activos.includes('calzado') && !activos.includes('talle')) return 'Número';
  if (activos.includes('talle')) return 'Talle';
  return 'Opciones';
}

function Grilla({ data, favoritos = [], onFavorito, slug, buscar, categoria, publico, soloSinMarca, tinta, suave, superficie, borde, precio, onAgregar, onAbrir }) {
  const lista = data.catalogo === 'lista';
  const radio = Number(data.radio) || 0;
  const visibles = (data.productos || []).filter((item) => {
    const texto = buscar.trim().toLowerCase();
    const entra = !texto || `${item.nombre} ${item.sku || ''} ${item.descripcion || ''} ${item.marca || ''} ${item.modelo || ''}`.toLowerCase().includes(texto);
    if (!entra) return false;
    if (publico && item.publico !== publico) return false;
    if (soloSinMarca && item.publico) return false;
    return categoria === 'Todas' || item.categoria === categoria;
  });
  if (!visibles.length) return <p style={{ color: suave, marginTop: 28 }}>No hay productos para esta búsqueda.</p>;
  const placa = data.texto === 'claro' ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.92)';
  const placaTexto = data.texto === 'claro' ? '#fff' : '#0F172A';
  return (
    <div className={lista ? '' : 'giro-grilla'} style={{ display: 'grid', gap: 16, marginTop: 8, ...(lista ? { gridTemplateColumns: '1fr' } : {}) }}>
      {visibles.map((item) => {
        const valor = Number(item.precioVigente ?? item.precio) || 0;
        const imagen = fotoDe(item) || (item.imagenes?.[0] ? urlApi(`/api/public/vidrieras/${slug}/imagenes/${item.imagenes[0]}`) : '');
        const agotado = data.oferta !== 'SERVICIOS' && Number(item.stock) <= 0;
        return (
          <article key={item.id} style={{ display: lista ? 'flex' : 'block', gap: 12, minWidth: 0 }}>
            <div style={{ position: 'relative', width: lista ? 112 : '100%', height: lista ? 112 : undefined, aspectRatio: lista ? undefined : '4 / 5', background: data.texto === 'claro' ? 'rgba(255,255,255,0.04)' : '#F7F5F2', borderRadius: Math.max(radio, 16), overflow: 'hidden', flexShrink: 0 }}>
              <button type="button" onClick={() => onAbrir(item.id)} aria-label={`Ver ${item.nombre}`} style={{ display: 'block', width: '100%', height: '100%', padding: 0, border: 0, background: 'transparent', cursor: 'pointer' }}>
                {imagen ? <img alt="" src={imagen} style={{ width: '100%', height: lista ? 112 : '100%', aspectRatio: lista ? undefined : '4 / 5', objectFit: 'contain', padding: lista ? 0 : 16, display: 'block' }} /> : <span style={{ display: 'block', width: '100%', aspectRatio: '4 / 5' }} />}
              </button>
              {item.categoria && !agotado && <span style={{ position: 'absolute', left: 8, top: 8, maxWidth: '78%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: placa, color: placaTexto, borderRadius: 999, fontSize: 10, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '3px 8px', pointerEvents: 'none' }}>{item.categoria}</span>}
              {agotado && <span style={{ position: 'absolute', left: 8, top: 8, background: 'rgba(0,0,0,0.75)', color: '#fff', borderRadius: 999, fontSize: 11, fontWeight: 700, padding: '3px 8px', pointerEvents: 'none' }}>Agotado</span>}
              {onFavorito && <button type="button" aria-label={`Favorito: ${item.nombre}`} aria-pressed={favoritos.includes(item.id)} onClick={() => onFavorito(item.id)} style={{ position: 'absolute', top: 4, right: 4, width: 36, height: 36, border: 0, borderRadius: 999, background: placa, color: placaTexto, fontSize: 20 }}>{favoritos.includes(item.id) ? '♥' : '♡'}</button>}
              <BotonSumar data={data} agotado={agotado} nombre={item.nombre} onClick={() => onAgregar(item)} />
            </div>
            <button type="button" onClick={() => onAbrir(item.id)} style={{ minWidth: 0, paddingTop: 8, display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 0, color: tinta, font: 'inherit', cursor: 'pointer' }}>
              <h2 style={{ margin: 0, fontSize: 15, lineHeight: 1.3, fontWeight: 650 }}>{item.nombre}</h2>
              {item.descripcion && <p style={{ margin: '4px 0 0', color: suave, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.descripcion}</p>}
              {item.sku && <p style={{ margin: '2px 0 0', color: suave, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.sku}</p>}
              <p style={{ margin: '6px 0 0', color: precio, fontWeight: 800, fontSize: 16 }}>{pesos(valor)}</p>
              {data.cuotas && valor > 0 && <p style={{ margin: '2px 0 0', color: suave, fontSize: 12 }}>3 x {pesos(valor / 3)} s/int</p>}
            </button>
          </article>
        );
      })}
    </div>
  );
}

function etiquetaSumar(data) {
  const texto = String(data.sumar || '').trim();
  return texto || '+';
}

function BotonSumar({ data, agotado, nombre, onClick, chico }) {
  if (data.sumarVisible === false) return null;
  const texto = etiquetaSumar(data);
  const forma = data.sumarForma || 'circular';
  const corto = texto.length <= 2;
  const lado = chico ? 28 : 32;
  const compacto = forma !== 'pastilla' && corto;
  return (
    <button
      type="button"
      disabled={agotado}
      aria-label={agotado ? 'Sin stock' : `Agregar ${nombre || 'producto'}`}
      onClick={(event) => { event.stopPropagation(); if (!agotado) onClick(); }}
      style={{ position: 'absolute', right: 8, bottom: 8, height: lado, width: compacto ? lado : undefined, minWidth: compacto ? lado : undefined, padding: compacto ? 0 : '0 12px', borderRadius: forma === 'cuadrado' ? 8 : 999, border: 0, background: agotado ? 'rgba(0,0,0,0.35)' : (data.sumarColor || data.color), color: '#fff', font: 'inherit', fontWeight: 800, fontSize: corto ? 18 : 12, lineHeight: 1, cursor: agotado ? 'default' : 'pointer', boxShadow: '0 6px 16px rgba(0,0,0,0.18)' }}
    >{texto}</button>
  );
}

function botonPaso(tinta) {
  return { width: 28, height: 28, borderRadius: '50%', border: 0, background: 'transparent', color: tinta, font: 'inherit', fontSize: 18, fontWeight: 700, cursor: 'pointer' };
}

function Paso({ valor, onMenos, onMas, tinta, borde, fondo, tope }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, border: `1px solid ${borde}`, background: fondo }}>
      <button type="button" aria-label="Quitar uno" onClick={onMenos} style={botonPaso(tinta)}>−</button>
      <span style={{ minWidth: 18, textAlign: 'center', fontWeight: 800, fontSize: 14 }}>{valor}</span>
      <button type="button" aria-label="Sumar uno" onClick={onMas} disabled={tope && valor >= tope} style={{ ...botonPaso(tinta), opacity: tope && valor >= tope ? 0.35 : 1 }}>＋</button>
    </span>
  );
}

function Detalle({ producto, data, slug, tinta, suave, superficie, borde, precioColor, oscuro, carrito, onVolver, onAgregar, onCarrito, onAbrir }) {
  const fotos = fotosDe(producto, slug);
  const variantes = producto.usaVariantes ? (producto.variantes || []) : [];
  const [foto, setFoto] = useState(0);
  const [cantidad, setCantidad] = useState(1);
  const [varianteId, setVarianteId] = useState(null);
  const [aviso, setAviso] = useState('');
  useEffect(() => {
    const primera = variantes.find((item) => Number(item.stock) > 0) || variantes[0] || null;
    setFoto(0);
    setCantidad(1);
    setVarianteId(primera ? primera.id : null);
    setAviso('');
  }, [producto.id]);
  const variante = variantes.find((item) => item.id === varianteId) || null;
  const stock = Number(variante ? variante.stock : producto.stock);
  const servicios = data.oferta === 'SERVICIOS';
  const agotado = !servicios && stock <= 0;
  const ficha = datosVisibles(producto, data);
  const valor = Number(variante?.precio ?? producto.precioVigente ?? producto.precio) || 0;
  const radio = Math.max(Number(data.radio) || 0, 18);
  const placa = oscuro ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.92)';
  const placaTexto = oscuro ? '#fff' : '#111';
  const ya = carrito.filter((item) => String(item.id) === String(producto.id)).reduce((suma, item) => suma + item.cantidad, 0);
  const otros = (data.productos || []).filter((item) => item.id !== producto.id && item.categoria && item.categoria === producto.categoria).slice(0, 4);
  const imagen = fotos[foto] || fotos[0] || '';

  function sumar() {
    if (agotado) return;
    onAgregar(producto, { variante, cantidad });
    setAviso('Agregado al carrito');
  }

  return (
    <article className="giro-detalle">
      <div className="giro-foto" style={{ position: 'relative', margin: '12px 16px 0', borderRadius: radio, overflow: 'hidden', background: superficie, border: `1px solid ${borde}` }}>
        {imagen ? <img alt="" src={imagen} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : null}
        <button type="button" onClick={onVolver} aria-label="Volver" style={{ position: 'absolute', left: 12, top: 12, width: 36, height: 36, borderRadius: '50%', border: 0, background: 'rgba(255,255,255,0.92)', color: '#111', fontWeight: 800, cursor: 'pointer' }}>←</button>
        {producto.categoria && <span style={{ position: 'absolute', left: 12, bottom: 12, maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: placa, color: placaTexto, borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '5px 10px' }}>{producto.categoria}</span>}
        {fotos.length > 1 && (
          <span style={{ position: 'absolute', right: 12, bottom: 12, display: 'flex', gap: 6 }}>
            {fotos.map((item, indice) => (
              <button key={item} type="button" aria-label={`Foto ${indice + 1}`} onClick={() => setFoto(indice)} style={{ width: 8, height: 8, borderRadius: '50%', border: 0, padding: 0, background: indice === foto ? '#fff' : 'rgba(255,255,255,0.45)', cursor: 'pointer' }} />
            ))}
          </span>
        )}
      </div>
      <div className="giro-detalle-info" style={{ padding: '16px 16px 0' }}>
        <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.1 }}>{producto.nombre}</h1>
        {producto.descripcion && <p style={{ margin: '10px 0 0', fontSize: 15, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{producto.descripcion}</p>}
        {ficha.length > 0 && (
          <dl style={{ margin: '14px 0 0', display: 'grid', gap: 8 }}>
            {ficha.map(([id, etiqueta]) => (
              <div key={id} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 14 }}>
                <dt style={{ color: suave }}>{etiqueta}</dt>
                <dd style={{ margin: 0, fontWeight: 700, textAlign: 'right' }}>{producto[id]}</dd>
              </div>
            ))}
          </dl>
        )}
        {(producto.sku || producto.publico) && (
          <p style={{ margin: '6px 0 0', color: suave, fontSize: 13 }}>
            {[producto.sku, producto.publico === 'hombre' ? 'Hombre' : producto.publico === 'mujer' ? 'Mujer' : ''].filter(Boolean).join(' · ')}
          </p>
        )}
        <p style={{ margin: '12px 0 0', color: precioColor, fontWeight: 800, fontSize: 26 }}>{pesos(valor)}</p>
        {data.cuotas && valor > 0 && <p style={{ margin: '2px 0 0', color: suave, fontSize: 14 }}>3 x {pesos(valor / 3)} s/int</p>}
        {variantes.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 800 }}>{tituloOpciones(data)}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {variantes.map((item) => {
                const activa = item.id === varianteId;
                const sinStock = Number(item.stock) <= 0;
                return (
                  <button key={item.id} type="button" disabled={sinStock} onClick={() => { setVarianteId(item.id); setCantidad(1); }} style={{ borderRadius: 999, border: activa ? 'none' : `1px solid ${borde}`, background: activa ? data.color : 'transparent', color: activa ? '#fff' : tinta, opacity: sinStock ? 0.4 : 1, font: 'inherit', fontWeight: 700, fontSize: 13, padding: '8px 14px', cursor: sinStock ? 'default' : 'pointer' }}>{item.nombre}</button>
                );
              })}
            </div>
          </div>
        )}
        {!servicios && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 }}>
          <span style={{ fontSize: 13, fontWeight: 800 }}>{agotado ? 'Agotado' : stock <= 5 ? `Quedan ${stock}` : 'En stock'}</span>
          {!agotado && <Paso valor={cantidad} tope={stock} onMenos={() => setCantidad((actual) => Math.max(1, actual - 1))} onMas={() => setCantidad((actual) => Math.min(stock, actual + 1))} tinta={tinta} borde={borde} fondo={oscuro ? 'rgba(255,255,255,0.06)' : superficie} />}
        </div>
        )}
        <button type="button" disabled={agotado} onClick={sumar} style={{ width: '100%', marginTop: 16, border: 0, borderRadius: 999, background: agotado ? 'rgba(127,127,127,0.35)' : data.color, color: '#fff', font: 'inherit', fontWeight: 800, fontSize: 16, padding: '14px 16px', cursor: agotado ? 'default' : 'pointer' }}>{agotado ? 'Sin stock' : `Agregar · ${pesos(valor * cantidad)}`}</button>
        {(aviso || ya > 0) && (
          <p style={{ margin: '10px 0 0', fontSize: 13, color: suave }}>
            {aviso || 'Ya está en el carrito'}
            {' · '}
            <button type="button" onClick={onCarrito} style={{ border: 0, background: 'transparent', color: data.color, font: 'inherit', fontWeight: 800, cursor: 'pointer', padding: 0 }}>Ver carrito{ya ? ` (${ya})` : ''}</button>
          </p>
        )}
      </div>
      {otros.length > 0 && (
        <section className="giro-tambien" style={{ marginTop: 28, padding: '0 16px' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>También en {producto.categoria}</h2>
          <div className="giro-relacionados" style={{ display: 'grid', gap: 12 }}>
            {otros.map((item) => {
              const fotoRel = fotoDe(item) || (item.imagenes?.[0] ? urlApi(`/api/public/vidrieras/${slug}/imagenes/${item.imagenes[0]}`) : '');
              const valorRel = Number(item.precioVigente ?? item.precio) || 0;
              return (
                <article key={item.id} style={{ minWidth: 0 }}>
                  <span style={{ position: 'relative', display: 'block', aspectRatio: '1 / 1.05', borderRadius: radio, overflow: 'hidden', background: superficie, border: `1px solid ${borde}` }}>
                    <button type="button" onClick={() => onAbrir(item.id)} aria-label={`Ver ${item.nombre}`} style={{ display: 'block', width: '100%', height: '100%', padding: 0, border: 0, background: 'transparent', cursor: 'pointer' }}>
                      {fotoRel ? <img alt="" src={fotoRel} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                    </button>
                    <BotonSumar data={data} agotado={data.oferta !== 'SERVICIOS' && Number(item.stock) <= 0} nombre={item.nombre} chico onClick={() => onAgregar(item)} />
                  </span>
                  <button type="button" onClick={() => onAbrir(item.id)} style={{ display: 'block', width: '100%', marginTop: 8, textAlign: 'left', background: 'transparent', border: 0, color: tinta, font: 'inherit', padding: 0, cursor: 'pointer' }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{item.nombre}</span>
                    <span style={{ display: 'block', marginTop: 2, color: precioColor, fontWeight: 800, fontSize: 14 }}>{pesos(valorRel)}</span>
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </article>
  );
}

function Carrito({ items, data, tinta, suave, borde, precio, superficie, oscuro, fondo, onCantidad, onSeguir, onAbrir }) {
  const radio = Math.max(Number(data.radio) || 0, 16);
  const unidades = items.reduce((suma, item) => suma + item.cantidad, 0);
  const total = items.reduce((suma, item) => suma + item.precio * item.cantidad, 0);
  if (!items.length) {
    return (
      <section className="giro-carrito-vacio" style={{ margin: '28px 8px', textAlign: 'center' }}>
        <span style={{ width: 72, height: 72, margin: '0 auto', borderRadius: '50%', display: 'grid', placeItems: 'center', background: `color-mix(in srgb, ${data.color} 16%, ${oscuro ? '#111827' : '#fff'})`, color: data.color }}>
          <Bolsa />
        </span>
        <h1 style={{ margin: '16px 0 0', fontSize: 26 }}>El carrito está vacío</h1>
        <p style={{ margin: '8px 0 0', color: suave, fontSize: 14 }}>Cuando agregues un producto, vas a verlo acá con el total.</p>
        <button type="button" onClick={onSeguir} style={{ marginTop: 18, border: 0, borderRadius: 999, background: data.color, color: '#fff', font: 'inherit', fontWeight: 800, padding: '12px 18px', cursor: 'pointer' }}>Ver el catálogo</button>
      </section>
    );
  }
  return (
    <section className="giro-carrito">
      <div className="giro-carrito-titulo" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 26 }}>Carrito</h1>
        <span style={{ color: suave, fontSize: 13 }}>{unidades} {unidades === 1 ? 'producto' : 'productos'}</span>
      </div>
      <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'grid', gap: 12 }}>
        {items.map((item) => {
          const clave = item.clave || String(item.id);
          return (
            <li key={clave} style={{ display: 'grid', gridTemplateColumns: '84px 1fr', gap: 12, alignItems: 'center' }}>
              <button type="button" onClick={() => onAbrir(item.id)} aria-label={`Ver ${item.nombre}`} style={{ padding: 0, border: `1px solid ${borde}`, borderRadius: radio, overflow: 'hidden', background: superficie, cursor: 'pointer' }}>
                {item.imagen ? <img alt="" src={item.imagen} style={{ width: 84, height: 84, objectFit: 'cover', display: 'block' }} /> : <span style={{ display: 'block', width: 84, height: 84 }} />}
              </button>
              <span style={{ minWidth: 0 }}>
                <button type="button" onClick={() => onAbrir(item.id)} style={{ display: 'block', maxWidth: '100%', padding: 0, border: 0, background: 'transparent', color: tinta, font: 'inherit', fontWeight: 750, textAlign: 'left', cursor: 'pointer' }}>{item.nombre}</button>
                {item.varianteNombre && <span style={{ display: 'inline-block', marginTop: 4, borderRadius: 999, background: `color-mix(in srgb, ${data.color} 16%, transparent)`, fontSize: 11, fontWeight: 700, padding: '2px 8px' }}>{item.varianteNombre}</span>}
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
                  <Paso valor={item.cantidad} tope={Number(item.stock) || 0} onMenos={() => onCantidad(clave, -1)} onMas={() => onCantidad(clave, 1)} tinta={tinta} borde={borde} fondo={oscuro ? 'rgba(255,255,255,0.06)' : superficie} />
                  <strong style={{ color: precio }}>{pesos(item.precio * item.cantidad)}</strong>
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <div className="giro-carrito-resumen" style={{ marginTop: 18 }}>
        <div style={{ borderRadius: 20, padding: 16, background: `color-mix(in srgb, ${data.color} ${oscuro ? '22%' : '12%'}, ${oscuro ? '#111827' : '#fff'})` }}>
          <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between', color: suave, fontSize: 14 }}><span>Subtotal</span><span>{pesos(total)}</span></p>
          {data.cuotas && total > 0 && <p style={{ margin: '6px 0 0', color: suave, fontSize: 13 }}>o 3 cuotas de {pesos(total / 3)}</p>}
          <p style={{ margin: '12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontWeight: 800, fontSize: 18 }}><span>Total</span><span style={{ color: precio, fontSize: 22 }}>{pesos(total)}</span></p>
        </div>
        <button type="button" onClick={onSeguir} style={{ width: '100%', marginTop: 14, borderRadius: 999, border: `1px solid ${borde}`, background: fondo, color: tinta, font: 'inherit', fontWeight: 800, padding: '13px 16px', cursor: 'pointer' }}>Seguir mirando</button>
      </div>
    </section>
  );
}
