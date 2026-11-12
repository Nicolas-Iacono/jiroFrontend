import { useEffect, useState } from 'react';

const papeles = { blanco: '#FFFFFF', gris: '#F4F5F9', calido: '#FFF7ED', crema: '#F6F1E8', oscuro: '#111827' };
const apiBase = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function urlApi(path) {
  return `${apiBase}${path}`;
}

function pesos(valor) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(valor) || 0);
}

function tintaSobre(hex) {
  const n = String(hex || '').replace('#', '');
  if (n.length !== 6) return '#FFFFFF';
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160 ? '#1A1614' : '#FFFFFF';
}

function lineasMarca(titulo) {
  const partes = String(titulo || 'Tienda').trim().split(/\s+/).filter(Boolean);
  if (partes.length < 2) return [partes[0] || 'Tienda'];
  const medio = Math.ceil(partes.length / 2);
  return [partes.slice(0, medio).join(' '), partes.slice(medio).join(' ')];
}

function fotoDe(producto, slug) {
  const directa = (producto.fotos || []).find((item) => item.url);
  if (directa?.url) return directa.url;
  const id = producto.imagenes?.[0];
  return id ? urlApi(`/api/public/vidrieras/${slug}/imagenes/${id}`) : '';
}

function claveFav(slug) {
  return `giro-favoritos-${slug}`;
}

export default function Barrio({ data, slug, persistir = true, carrito, onAgregar, onCantidad }) {
  const [pagina, setPagina] = useState('inicio');
  const [buscar, setBuscar] = useState('');
  const [categoria, setCategoria] = useState('Todas');
  const [productoId, setProductoId] = useState(null);
  const [favoritos, setFavoritos] = useState([]);
  const [aviso, setAviso] = useState('');
  const papel = papeles[data.fondo] || papeles.crema;
  const claro = data.texto === 'claro';
  const tinta = claro ? '#F6F1E8' : '#1A1614';
  const suave = claro ? 'rgba(246,241,232,0.72)' : '#5C534C';
  const acento = data.color || '#7C2F3B';
  const sobre = tintaSobre(acento);
  const unidades = carrito.reduce((suma, item) => suma + item.cantidad, 0);
  const producto = (data.productos || []).find((item) => String(item.id) === String(productoId)) || null;
  const categorias = [...new Set((data.productos || []).map((item) => item.categoria).filter(Boolean))];
  const portada = (data.portadas && data.portadas[0]) || data.portadaUrl || '';

  useEffect(() => {
    document.title = data.titulo || 'Tienda';
    document.documentElement.style.background = papel;
    document.body.style.background = papel;
  }, [data.titulo, papel]);

  useEffect(() => {
    if (!persistir) return;
    try {
      setFavoritos(JSON.parse(localStorage.getItem(claveFav(slug)) || '[]').map(String));
    } catch {
      setFavoritos([]);
    }
  }, [persistir, slug]);

  function ir(destino, filtro = {}) {
    setPagina(destino);
    setProductoId(null);
    if (filtro.categoria) setCategoria(filtro.categoria);
    if (destino === 'productos' && !filtro.categoria) setCategoria('Todas');
    setAviso('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function abrir(id) {
    setProductoId(id);
    setPagina('producto');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function alternarFav(id) {
    const clave = String(id);
    setFavoritos((actual) => {
      const siguiente = actual.includes(clave) ? actual.filter((item) => item !== clave) : [...actual, clave];
      if (persistir) localStorage.setItem(claveFav(slug), JSON.stringify(siguiente));
      return siguiente;
    });
  }

  const estilo = {
    '--papel': papel,
    '--tinta': tinta,
    '--suave': suave,
    '--acento': acento,
    '--sobre': sobre,
    background: papel,
    color: tinta,
    fontFamily: 'Inter, sans-serif',
    minHeight: '100vh',
  };

  return (
    <main className="barrio" style={estilo}>
      <style>{css}</style>
      {data.marquesina && <p className="barrio-cinta">{data.marquesina}</p>}
      <header className="barrio-barra">
        <button type="button" className="barrio-marca" onClick={() => ir('inicio')}>
          {data.logoUrl ? <img alt="" src={data.logoUrl} className="barrio-logo" /> : <span className="barrio-sello" aria-hidden="true" />}
          <span className="barrio-nombre">{lineasMarca(data.titulo).map((linea) => <span key={linea}>{linea}</span>)}</span>
        </button>
        <span className="barrio-atajos">
          <button type="button" aria-label="Favoritos" onClick={() => ir('favoritos')}><Corazon lleno={false} /></button>
          <button type="button" aria-label="Carrito" onClick={() => ir('carrito')}><Bolsa />{unidades > 0 && <span className="barrio-cuenta">{unidades}</span>}</button>
        </span>
        <nav className="barrio-nav" aria-label="Tienda">
          <button type="button" className={pagina === 'inicio' ? 'activo' : ''} onClick={() => ir('inicio')}>Inicio</button>
          <button type="button" className={pagina === 'productos' ? 'activo' : ''} onClick={() => ir('productos')}>Productos</button>
          <button type="button" className={pagina === 'favoritos' ? 'activo' : ''} onClick={() => ir('favoritos')}>Favoritos <Corazon lleno={pagina === 'favoritos'} /></button>
          <button type="button" className={pagina === 'carrito' ? 'activo' : ''} onClick={() => ir('carrito')}>Carrito <Bolsa />{unidades > 0 && <span className="barrio-cuenta">{unidades}</span>}</button>
        </nav>
      </header>

      {pagina === 'inicio' && (
        <>
          <Hero data={data} portada={portada} onVer={() => ir('productos')} />
          <section className="barrio-bloque">
            <h2 className="barrio-seccion">Productos destacados</h2>
            <Grilla productos={(data.productos || []).slice(0, 4)} slug={slug} favoritos={favoritos} onAbrir={abrir} onFav={alternarFav} />
          </section>
        </>
      )}

      {pagina === 'favoritos' && (
        <section className="barrio-bloque">
          <h1 className="barrio-display">Tus favoritos</h1>
          <Grilla
            productos={(data.productos || []).filter((item) => favoritos.includes(String(item.id)))}
            slug={slug}
            favoritos={favoritos}
            conBoton
            enFoto
            mayus
            vacio="Todavía no marcaste favoritos."
            onAbrir={abrir}
            onFav={alternarFav}
            onAgregar={onAgregar}
          />
          <p className="barrio-pie-link"><button type="button" onClick={() => ir('productos')}>Ver todos los productos →</button></p>
          <Corte />
        </section>
      )}

      {pagina === 'productos' && (
        <section className="barrio-bloque">
          <h1 className="barrio-titulo">Productos</h1>
          <div className="barrio-filtros">
            <label className="barrio-buscar">
              <Lupa />
              <input value={buscar} onChange={(event) => setBuscar(event.target.value)} placeholder={data.buscar || 'Buscar productos'} aria-label="Buscar productos" />
            </label>
            <div className="barrio-pills">
              <button type="button" className={categoria === 'Todas' ? 'on' : ''} onClick={() => setCategoria('Todas')}>Todos</button>
              {categorias.map((item) => (
                <button key={item} type="button" className={categoria === item ? 'on' : ''} onClick={() => setCategoria(item)}>{item}</button>
              ))}
            </div>
          </div>
          <Grilla
            productos={(data.productos || []).filter((item) => {
              if (categoria !== 'Todas' && item.categoria !== categoria) return false;
              const texto = buscar.trim().toLowerCase();
              return !texto || `${item.nombre} ${item.descripcion || ''} ${item.categoria || ''}`.toLowerCase().includes(texto);
            })}
            slug={slug}
            favoritos={favoritos}
            conBoton
            onAbrir={abrir}
            onFav={alternarFav}
            onAgregar={onAgregar}
          />
        </section>
      )}

      {pagina === 'producto' && (
        producto ? <Detalle producto={producto} slug={slug} data={data} favorito={favoritos.includes(String(producto.id))} onVolver={() => ir('productos')} onFav={() => alternarFav(producto.id)} onAgregar={onAgregar} onCarrito={() => ir('carrito')} /> : <p className="barrio-vacio">Ese producto ya no está publicado.</p>
      )}

      {pagina === 'carrito' && (
        <CarritoBarrio items={carrito} portada={portada} aviso={aviso} onCantidad={onCantidad} onAbrir={abrir} onSeguir={() => ir('productos')} onSeguirCompra={() => setAviso('El carrito queda guardado en este navegador. El local todavía no cobra desde la vidriera.')} />
      )}
      <nav className="barrio-tabs" aria-label="Secciones">
        <button type="button" className={pagina === 'inicio' ? 'activo' : ''} onClick={() => ir('inicio')}><Casa />Inicio</button>
        <button type="button" className={pagina === 'productos' || pagina === 'producto' ? 'activo' : ''} onClick={() => ir('productos')}><GrillaIcono />Productos</button>
        <button type="button" className={pagina === 'favoritos' ? 'activo' : ''} onClick={() => ir('favoritos')}><Corazon lleno={pagina === 'favoritos'} />Favoritos</button>
        <button type="button" className={pagina === 'carrito' ? 'activo' : ''} onClick={() => ir('carrito')}><Bolsa />Carrito</button>
      </nav>
    </main>
  );
}

function Hero({ data, portada, onVer }) {
  if (data.hero === 'ninguno') return null;
  const titulo = data.heroTitulo || data.titulo;
  const texto = data.heroTexto || data.descripcion;
  const cta = data.heroCta || 'Ver productos';
  return (
    <section className="barrio-hero">
      <div className="barrio-hero-copia">
        {data.heroEtiqueta && <p className="barrio-etiqueta">{data.heroEtiqueta}</p>}
        <h1>{titulo}</h1>
        {texto && <p>{texto}</p>}
        <button type="button" onClick={onVer}>{cta}</button>
      </div>
      {data.hero !== 'tipografico' && (
        <div className="barrio-hero-foto" style={portada ? { backgroundImage: `url(${portada})` } : undefined} />
      )}
    </section>
  );
}

function Grilla({ productos, slug, favoritos, conBoton, enFoto, mayus, vacio, onAbrir, onFav, onAgregar }) {
  if (!productos.length) return <p className="barrio-vacio">{vacio || 'Todavía no hay productos publicados.'}</p>;
  return (
    <div className={`barrio-grilla${mayus ? ' mayus' : ''}`}>
      {productos.map((item) => {
        const imagen = fotoDe(item, slug);
        const valor = Number(item.precioVigente ?? item.precio) || 0;
        const lleno = favoritos.includes(String(item.id));
        return (
          <article key={item.id}>
            <span className="barrio-foto-caja">
              <button type="button" className="barrio-foto" onClick={() => onAbrir(item.id)} aria-label={`Ver ${item.nombre}`}>
                {imagen ? <img alt="" src={imagen} /> : <span />}
              </button>
              {enFoto && (
                <button type="button" className="barrio-corazon foto" aria-label={lleno ? 'Quitar de favoritos' : 'Guardar en favoritos'} onClick={() => onFav(item.id)}>
                  <Corazon lleno={lleno} />
                </button>
              )}
            </span>
            <div className="barrio-meta">
              <button type="button" onClick={() => onAbrir(item.id)}>
                <h3>{item.nombre}</h3>
                <p>{pesos(valor)}</p>
              </button>
              {!enFoto && (
                <button type="button" className="barrio-corazon" aria-label={lleno ? 'Quitar de favoritos' : 'Guardar en favoritos'} onClick={() => onFav(item.id)}>
                  <Corazon lleno={lleno} />
                </button>
              )}
            </div>
            {conBoton && (
              <button type="button" className="barrio-sumar" onClick={() => onAgregar(item)}>
                <Bolsa /> <span className="corto">Agregar</span><span className="largo">Agregar al carrito</span>
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}

function Detalle({ producto, slug, data, favorito, onVolver, onFav, onAgregar, onCarrito }) {
  const imagen = fotoDe(producto, slug);
  const valor = Number(producto.precioVigente ?? producto.precio) || 0;
  const [aviso, setAviso] = useState('');
  return (
    <article className="barrio-detalle">
      <button type="button" className="barrio-volver" onClick={onVolver}>← Seguir mirando</button>
      <div className="barrio-detalle-foto">{imagen ? <img alt="" src={imagen} /> : null}</div>
      <div>
        <h1>{producto.nombre}</h1>
        {producto.descripcion && <p className="barrio-descripcion">{producto.descripcion}</p>}
        <p className="barrio-precio-grande">{pesos(valor)}</p>
        <div className="barrio-acciones">
          <button type="button" className="barrio-cta" onClick={() => { onAgregar(producto); setAviso('Agregado al carrito'); }}>Agregar al carrito</button>
          <button type="button" className="barrio-corazon grande" aria-label={favorito ? 'Quitar de favoritos' : 'Guardar en favoritos'} onClick={onFav}><Corazon lleno={favorito} /></button>
        </div>
        {aviso && <p className="barrio-aviso">{aviso} · <button type="button" onClick={onCarrito}>Ver carrito</button></p>}
        {data.cuotas && valor > 0 && <p className="barrio-cuotas">3 x {pesos(valor / 3)} s/int</p>}
      </div>
    </article>
  );
}

function CarritoBarrio({ items, portada, aviso, onCantidad, onAbrir, onSeguir, onSeguirCompra }) {
  const total = items.reduce((suma, item) => suma + item.precio * item.cantidad, 0);
  return (
    <section className="barrio-bloque barrio-carrito">
      <div className="barrio-carrito-cabeza">
        {portada && <div className="barrio-banda" style={{ backgroundImage: `url(${portada})` }} />}
        <h1 className="barrio-display">Tu carrito</h1>
      </div>
      {!items.length ? (
        <p className="barrio-vacio">El carrito está vacío. <button type="button" onClick={onSeguir}>Ver productos</button></p>
      ) : (
        <div className="barrio-carrito-cuerpo">
          <ul>
            {items.map((item) => {
              const clave = item.clave || String(item.id);
              return (
                <li key={clave}>
                  <button type="button" className="barrio-mini" onClick={() => onAbrir(item.id)}>{item.imagen ? <img alt="" src={item.imagen} /> : <span />}</button>
                  <span>
                    <strong>{item.nombre}</strong>
                    {item.varianteNombre && <em>{item.varianteNombre}</em>}
                    <b>{pesos(item.precio)}</b>
                  </span>
                  <span className="barrio-controles">
                    <span className="barrio-paso">
                      <button type="button" aria-label="Quitar uno" onClick={() => onCantidad(clave, -1)}>−</button>
                      <span>{item.cantidad}</span>
                      <button type="button" aria-label="Sumar uno" onClick={() => onCantidad(clave, 1)}>+</button>
                    </span>
                    <button type="button" className="barrio-basura" aria-label="Quitar del carrito" onClick={() => onCantidad(clave, -999)}><Basura /></button>
                  </span>
                </li>
              );
            })}
          </ul>
          <aside>
            <h2>Resumen del pedido</h2>
            <p><span>Subtotal</span><span>{pesos(total)}</span></p>
            <p className="total"><span>Total</span><span>{pesos(total)}</span></p>
            <button type="button" className="barrio-cta ancho" onClick={onSeguirCompra}>Continuar compra</button>
            {aviso && <p className="barrio-aviso">{aviso}</p>}
          </aside>
        </div>
      )}
      <button type="button" className="barrio-seguir" onClick={onSeguir}>← Seguir comprando</button>
    </section>
  );
}

function Corte() {
  return (
    <svg className="barrio-corte" viewBox="0 0 1200 70" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 30 L48 14 L92 36 L140 12 L188 34 L236 16 L290 40 L340 14 L388 36 L440 12 L492 38 L540 16 L596 40 L648 14 L700 36 L752 18 L808 40 L860 14 L912 36 L968 16 L1020 40 L1076 18 L1130 36 L1200 16 L1200 70 L0 70 Z" />
    </svg>
  );
}

function Corazon({ lleno }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z" fill={lleno ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function Bolsa() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M6 8h12l-1 12H7L6 8z" />
      <path d="M9 8V7a3 3 0 0 1 6 0v1" />
    </svg>
  );
}

function Casa() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v9h12v-9" />
    </svg>
  );
}

function GrillaIcono() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="13" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="13" width="7" height="7" rx="1" />
      <rect x="13" y="13" width="7" height="7" rx="1" />
    </svg>
  );
}

function Lupa() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function Basura() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 7h16M9 7V5h6v2M8 7l1 13h6l1-13" />
    </svg>
  );
}

const css = `
.barrio { --display: "Oswald", Impact, sans-serif; padding-bottom: 76px; }
.barrio-cinta { margin: 0; overflow: hidden; white-space: nowrap; background: var(--acento); color: var(--sobre); text-align: center; font-size: 12px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; padding: 8px 16px; }
.barrio button, .barrio input { font: inherit; color: inherit; }
.barrio-barra { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; background: var(--papel); }
.barrio-marca { display: flex; align-items: center; gap: 8px; border: 0; background: transparent; padding: 0; cursor: pointer; text-align: left; }
.barrio-logo { width: 36px; height: 36px; object-fit: cover; }
.barrio-sello { width: 22px; height: 28px; background: var(--tinta); clip-path: polygon(50% 0, 100% 18%, 82% 100%, 18% 100%, 0 18%); }
.barrio-nombre { display: flex; flex-direction: column; font-family: var(--display); font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; line-height: 0.9; font-size: 13px; }
.barrio-atajos { display: flex; align-items: center; gap: 14px; }
.barrio-atajos button { position: relative; border: 0; background: transparent; padding: 0; cursor: pointer; color: var(--tinta); }
.barrio-nav { display: none; }
.barrio-tabs { position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; display: grid; grid-template-columns: repeat(4, 1fr); background: var(--papel); border-top: 1px solid color-mix(in srgb, var(--tinta) 10%, transparent); padding: 8px 4px calc(8px + env(safe-area-inset-bottom)); }
.barrio-tabs button { display: flex; flex-direction: column; align-items: center; gap: 2px; border: 0; background: transparent; color: var(--suave); font-size: 11px; font-weight: 600; cursor: pointer; }
.barrio-tabs button.activo { color: var(--acento); }
.barrio-cuenta { position: absolute; top: -6px; right: -8px; min-width: 16px; border-radius: 999px; background: var(--acento); color: var(--sobre); font-size: 10px; font-weight: 800; text-align: center; padding: 1px 4px; }
.barrio-hero { display: flex; flex-direction: column; gap: 14px; padding: 4px 16px 0; }
.barrio-hero-copia h1 { margin: 0; font-family: var(--display); font-weight: 700; font-size: 42px; line-height: 0.88; letter-spacing: -0.02em; text-transform: uppercase; }
.barrio-hero-copia p { max-width: 280px; margin: 8px 0 0; font-size: 14px; }
.barrio-etiqueta { margin: 0 0 8px; font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--suave); }
.barrio-hero-copia button, .barrio-cta { border: 0; border-radius: 8px; background: var(--acento); color: var(--sobre); font-weight: 700; padding: 10px 16px; cursor: pointer; }
.barrio-hero-copia button { margin-top: 14px; }
.barrio-hero-foto { min-height: 190px; margin: 0 -16px; background: color-mix(in srgb, var(--tinta) 12%, var(--papel)) center/cover no-repeat; }
.barrio-bloque { padding: 18px 16px 8px; }
.barrio-seccion, .barrio-display, .barrio-titulo { margin: 0 0 14px; font-family: var(--display); font-weight: 700; line-height: 0.9; }
.barrio-seccion { font-size: 26px; letter-spacing: 0.02em; text-transform: uppercase; }
.barrio-display { font-size: 40px; letter-spacing: -0.02em; text-transform: uppercase; }
.barrio-titulo { font-size: 36px; letter-spacing: -0.03em; }
.barrio-grilla { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 12px; }
.barrio-foto-caja { position: relative; display: block; }
.barrio-foto { display: block; width: 100%; aspect-ratio: 4 / 5; padding: 0; border: 0; border-radius: 16px; overflow: hidden; background: color-mix(in srgb, var(--tinta) 5%, #fff); cursor: pointer; }
.barrio-foto img { width: 100%; height: 100%; object-fit: contain; padding: 12px; display: block; }
.barrio-detalle-foto img, .barrio-mini img { width: 100%; height: 100%; object-fit: cover; display: block; }
.barrio-meta { display: flex; align-items: flex-start; justify-content: space-between; gap: 6px; margin-top: 8px; }
.barrio-meta button:first-child { min-width: 0; border: 0; background: transparent; padding: 0; text-align: left; cursor: pointer; }
.barrio-meta h3 { margin: 0; font-size: 13px; font-weight: 600; }
.barrio-grilla.mayus h3 { font-size: 12px; font-weight: 800; letter-spacing: 0.03em; text-transform: uppercase; }
.barrio-meta p, .barrio-precio-grande { margin: 2px 0 0; color: var(--acento); font-weight: 800; font-size: 14px; }
.barrio-corazon { border: 0; background: transparent; color: var(--acento); padding: 0; cursor: pointer; }
.barrio-corazon.foto { position: absolute; top: 8px; right: 8px; }
.barrio-sumar { display: inline-flex; align-items: center; gap: 6px; margin-top: 6px; border: 0; background: transparent; padding: 0; font-size: 13px; font-weight: 600; cursor: pointer; }
.barrio-sumar .largo { display: none; }
.barrio-filtros { display: flex; flex-direction: column; align-items: stretch; gap: 12px; margin-bottom: 16px; }
.barrio-pills { display: flex; gap: 8px; overflow-x: auto; }
.barrio-pills button { flex: 0 0 auto; border: 1px solid color-mix(in srgb, var(--tinta) 22%, transparent); border-radius: 999px; background: transparent; padding: 6px 12px; font-size: 13px; font-weight: 600; cursor: pointer; }
.barrio-pills button.on { border-color: var(--acento); background: var(--acento); color: var(--sobre); }
.barrio-buscar { display: flex; align-items: center; gap: 8px; border: 1px solid color-mix(in srgb, var(--tinta) 16%, transparent); border-radius: 999px; padding: 9px 14px; color: var(--suave); background: color-mix(in srgb, var(--tinta) 4%, var(--papel)); }
.barrio-buscar input { width: 100%; border: 0; background: transparent; outline: none; }
.barrio-pie-link { display: flex; justify-content: center; margin: 18px 0 8px; }
.barrio-pie-link button, .barrio-aviso button, .barrio-vacio button, .barrio-seguir { border: 0; background: transparent; color: var(--acento); font-weight: 700; cursor: pointer; padding: 0; }
.barrio-corte { display: block; width: calc(100% + 32px); height: 64px; margin: 20px -16px 0; color: color-mix(in srgb, var(--tinta) 88%, var(--acento)); }
.barrio-vacio { color: var(--suave); }
.barrio-detalle { display: flex; flex-direction: column; gap: 16px; padding: 12px 16px 24px; }
.barrio-volver { align-self: flex-start; }
.barrio-detalle-foto { border-radius: 8px; overflow: hidden; background: color-mix(in srgb, var(--tinta) 8%, var(--papel)); min-height: 240px; }
.barrio-detalle h1 { margin: 0; font-family: var(--display); font-size: 36px; line-height: 0.95; text-transform: uppercase; }
.barrio-descripcion { white-space: pre-wrap; line-height: 1.5; }
.barrio-precio-grande { font-size: 26px; }
.barrio-acciones { display: flex; align-items: center; gap: 12px; margin-top: 16px; }
.barrio-aviso, .barrio-cuotas { color: var(--suave); font-size: 14px; }
.barrio-carrito { padding-top: 0; }
.barrio-carrito-cabeza { display: flex; flex-direction: column; }
.barrio-banda { height: 132px; margin: 0 -16px 12px; background: color-mix(in srgb, var(--tinta) 12%, var(--papel)) center/cover no-repeat; }
.barrio-carrito-cuerpo { display: flex; flex-direction: column; gap: 18px; }
.barrio-carrito ul { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 16px; }
.barrio-carrito li { display: grid; grid-template-columns: 72px minmax(0, 1fr) auto; gap: 10px; align-items: center; }
.barrio-mini { width: 72px; height: 72px; padding: 0; border: 0; border-radius: 8px; overflow: hidden; background: color-mix(in srgb, var(--tinta) 8%, var(--papel)); cursor: pointer; }
.barrio-carrito strong { display: block; font-size: 14px; }
.barrio-carrito em { display: block; color: var(--suave); font-style: normal; font-size: 12px; }
.barrio-carrito b { display: block; margin-top: 4px; font-weight: 700; }
.barrio-controles { display: flex; align-items: center; gap: 8px; }
.barrio-paso { display: inline-flex; align-items: center; gap: 6px; border: 1px solid color-mix(in srgb, var(--tinta) 18%, transparent); border-radius: 8px; padding: 2px 4px; }
.barrio-paso button, .barrio-basura { border: 0; background: transparent; cursor: pointer; font-size: 16px; padding: 0 4px; }
.barrio-carrito aside { padding: 4px 0 0; }
.barrio-carrito aside h2 { margin: 0 0 12px; font-family: var(--display); font-size: 26px; letter-spacing: 0.02em; text-transform: uppercase; line-height: 0.95; }
.barrio-carrito aside p { display: flex; justify-content: space-between; margin: 8px 0; }
.barrio-carrito aside .total { font-weight: 800; }
.barrio-carrito aside .total span:last-child { color: var(--acento); font-size: 22px; }
.barrio-cta.ancho { width: 100%; margin-top: 12px; padding: 12px 16px; }
.barrio-seguir { display: none; }
@media (min-width: 860px) {
  .barrio { padding-bottom: 0; }
  .barrio-barra { padding: 20px max(28px, calc((100% - 1160px) / 2)); }
  .barrio-nombre { font-size: 18px; }
  .barrio-atajos { display: none; }
  .barrio-nav { display: flex; align-items: center; gap: 26px; }
  .barrio-nav button { display: inline-flex; align-items: center; gap: 6px; border: 0; border-bottom: 2px solid transparent; background: transparent; padding: 6px 0; cursor: pointer; font-size: 15px; font-weight: 600; }
  .barrio-nav button.activo { border-bottom-color: var(--acento); }
  .barrio-nav .barrio-cuenta { position: static; }
  .barrio-tabs { display: none; }
  .barrio-hero { display: grid; grid-template-columns: minmax(280px, 0.82fr) minmax(0, 1.18fr); gap: 48px; align-items: center; width: min(1160px, calc(100% - 56px)); margin: 12px auto 0; padding: 12px 0 8px; }
  .barrio-hero-copia h1 { font-size: clamp(64px, 6vw, 92px); }
  .barrio-hero-copia p { font-size: 18px; max-width: 380px; line-height: 1.45; }
  .barrio-hero-foto { height: 480px; min-height: 480px; margin: 0; border-radius: 22px; clip-path: none; }
  .barrio-bloque { width: min(1160px, calc(100% - 56px)); margin: 0 auto; padding: 56px 0 48px; }
  .barrio-seccion { font-size: 34px; letter-spacing: 0.04em; margin-bottom: 22px; }
  .barrio-display { font-size: 80px; }
  .barrio-titulo { font-size: 64px; }
  .barrio-grilla { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px 22px; }
  .barrio-meta h3 { font-size: 15px; }
  .barrio-meta p { font-size: 16px; }
  .barrio-sumar .corto { display: none; }
  .barrio-sumar .largo { display: inline; }
  .barrio-filtros { flex-direction: row; align-items: center; justify-content: space-between; }
  .barrio-buscar { min-width: 240px; order: 2; }
  .barrio-pie-link { justify-content: flex-end; }
  .barrio-corte { width: calc(100% + 56px); margin: 36px -28px -48px; }
  .barrio-detalle { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(260px, 0.9fr); width: min(1160px, calc(100% - 56px)); margin: 0 auto; padding: 28px 0 64px; }
  .barrio-volver { grid-column: 1 / -1; }
  .barrio-carrito-cabeza { display: grid; grid-template-columns: minmax(0, 1fr) minmax(180px, 360px); align-items: end; }
  .barrio-banda { grid-column: 2; grid-row: 1; height: 120px; margin: 0; clip-path: polygon(0 12%, 6% 0, 100% 0, 100% 100%, 0 100%); }
  .barrio-carrito-cabeza h1 { grid-column: 1; grid-row: 1; }
  .barrio-carrito-cuerpo { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(240px, 0.7fr); gap: 28px; align-items: start; }
  .barrio-carrito aside { border-radius: 8px; padding: 18px; background: color-mix(in srgb, var(--tinta) 5%, var(--papel)); }
  .barrio-seguir { display: inline; margin-top: 22px; }
}
`;
