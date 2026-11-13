import { useEffect, useMemo, useState } from 'react';
import { fuentesCss, papeles, plantillaDe } from './registro.js';
import './tienda.css';

const paginas = [
  ['inicio', 'Inicio'],
  ['productos', 'Productos'],
  ['favoritos', 'Favoritos'],
  ['carrito', 'Carrito'],
];

function plata(valor) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(valor) || 0);
}

function iniciales(nombre) {
  const partes = String(nombre || 'Tienda').trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] || 'T') + (partes[1]?.[0] || '')).toUpperCase();
}

function tintaSobre(hex) {
  const n = String(hex || '').replace('#', '');
  if (n.length !== 6) return '#ffffff';
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160 ? '#1A1614' : '#FFFFFF';
}

function fotoDe(producto, slug) {
  if (producto?.foto) return producto.foto;
  const directa = (producto?.fotos || []).map((item) => item?.url).find(Boolean);
  if (directa) return directa;
  const id = producto?.imagenes?.[0];
  if (!id || !slug) return '';
  const base = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  return `${base}/api/public/vidrieras/${encodeURIComponent(slug)}/imagenes/${id}`;
}

function stockDe(producto) {
  if (!producto) return 0;
  if (producto.servicio) return 99;
  if (Array.isArray(producto.variantes) && producto.variantes.length) {
    return producto.variantes.reduce((suma, item) => suma + Number(item.stock || 0), 0);
  }
  return Number(producto.stock || 0);
}

function precioDe(producto) {
  return Number(producto?.precioVigente ?? producto?.precio) || 0;
}

function leerLista(clave) {
  try {
    const data = JSON.parse(localStorage.getItem(clave) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default function Tienda({ tienda, dispositivo = 'auto', persistir = true, anclado = false, vista }) {
  const plantilla = plantillaDe(tienda?.plantillaId);
  const slug = tienda?.slug || '';
  const productos = tienda?.productos || [];
  const [pagina, setPagina] = useState(vista || 'inicio');
  const [detalleId, setDetalleId] = useState(null);
  const [buscar, setBuscar] = useState('');
  const [categoria, setCategoria] = useState('Todas');
  const [favoritos, setFavoritos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [listo, setListo] = useState('');

  useEffect(() => {
    if (!vista) return undefined;
    setDetalleId(null);
    setPagina(vista);
    return undefined;
  }, [vista]);

  useEffect(() => {
    if (!persistir || !slug) {
      setFavoritos([]);
      setCarrito([]);
      setListo('memoria');
      return undefined;
    }
    setFavoritos(leerLista(`giro-favoritos-${slug}`));
    setCarrito(leerLista(`giro-carrito-${slug}`));
    setListo(slug);
    return undefined;
  }, [persistir, slug]);

  useEffect(() => {
    if (!persistir || !slug || listo !== slug) return undefined;
    localStorage.setItem(`giro-favoritos-${slug}`, JSON.stringify(favoritos));
    localStorage.setItem(`giro-carrito-${slug}`, JSON.stringify(carrito));
    return undefined;
  }, [persistir, slug, listo, favoritos, carrito]);

  const categorias = useMemo(() => {
    const nombres = productos.map((item) => item.categoria).filter(Boolean);
    return ['Todas', ...new Set(nombres)];
  }, [productos]);

  const portada = tienda?.portadaUrl || (tienda?.portadas || [])[0] || fotoDe(productos[0], slug);
  const tituloHero = tienda?.heroTitulo
    || (plantilla.variante === 'under' ? 'Ropa de calle' : tienda?.titulo || plantilla.ejemplo);
  const textoHero = tienda?.heroTexto || tienda?.descripcion || '';
  const cta = tienda?.heroCta || 'Ver productos';
  const papel = papeles[tienda?.fondo] || papeles.blanco;
  const clara = tienda?.texto === 'claro';
  const tinta = clara ? '#F8FAFC' : '#1A1614';
  const suave = clara ? 'rgba(248,250,252,0.72)' : '#64748B';
  const unidades = carrito.reduce((suma, item) => suma + Number(item.cantidad || 0), 0);
  const forzar = dispositivo === 'movil' ? 'es-movil' : dispositivo === 'escritorio' ? 'es-escritorio' : '';
  const detalle = productos.find((item) => String(item.id) === String(detalleId)) || null;

  function ir(destino, filtro) {
    setDetalleId(null);
    setPagina(destino);
    if (filtro) setCategoria(filtro);
  }

  function coincide(item) {
    const texto = buscar.trim().toLowerCase();
    const nombre = `${item.nombre || ''} ${item.sku || ''}`.toLowerCase();
    if (texto && !nombre.includes(texto)) return false;
    if (categoria !== 'Todas' && item.categoria !== categoria) return false;
    return true;
  }

  function alternarFavorito(id) {
    setFavoritos((actual) => (actual.includes(id) ? actual.filter((item) => item !== id) : [...actual, id]));
  }

  function sumar(producto) {
    if (stockDe(producto) <= 0) return;
    setCarrito((actual) => {
      const hay = actual.find((item) => item.id === producto.id);
      if (hay) {
        return actual.map((item) => (item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item));
      }
      return [...actual, {
        id: producto.id,
        nombre: producto.nombre,
        precio: precioDe(producto),
        foto: fotoDe(producto, slug),
        cantidad: 1,
      }];
    });
  }

  function cambiarCantidad(id, delta) {
    setCarrito((actual) => actual.flatMap((item) => {
      if (item.id !== id) return [item];
      const siguiente = item.cantidad + delta;
      if (siguiente <= 0) return [];
      const vivo = productos.find((producto) => producto.id === id);
      const tope = vivo ? Math.max(stockDe(vivo), 1) : 99;
      return [{ ...item, cantidad: Math.min(siguiente, tope) }];
    }));
  }

  const fuenteElegida = fuentesCss[tienda?.fuente] || fuentesCss[plantilla.fuente] || fuentesCss.jakarta;
  const fuenteBajoCero = plantilla.variante === 'under' && tienda?.estiloPropio === false
    ? '"Oswald", "Arial Narrow", sans-serif'
    : fuenteElegida;
  const bajada = tienda?.estado || (plantilla.variante === 'under' ? 'Ropa under' : '');
  const estilo = {
    '--acento': tienda?.color || plantilla.color,
    '--papel': papel,
    '--tinta': tinta,
    '--suave': suave,
    '--sobre': tintaSobre(tienda?.color || plantilla.color),
    '--tarjeta': clara ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
    '--linea': clara ? 'rgba(248,250,252,0.16)' : 'rgba(26,22,20,0.12)',
    '--fuente': fuenteElegida,
    '--display': fuenteElegida,
    '--bajo-cero-display': fuenteBajoCero,
  };

  return (
    <div
      className={`tienda ${forzar} ${anclado ? 'anclado' : ''}`}
      data-variante={plantilla.variante}
      data-portada={plantilla.portada}
      data-catalogo={plantilla.catalogo}
      data-encabezado={plantilla.encabezado}
      style={estilo}
    >
      <header className="tienda-cabecera">
        <div className="tienda-marco" style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%' }}>
          <button type="button" className="tienda-marca" onClick={() => ir('inicio', 'Todas')}>
            <span className={`tienda-logo ${tienda?.logoUrl ? 'tienda-logo--imagen' : 'tienda-logo--iniciales'}`}>
              {tienda?.logoUrl ? <img src={tienda.logoUrl} alt="" /> : iniciales(tienda?.titulo)}
            </span>
            <span>
              <span className="tienda-nombre">{tienda?.titulo || 'Tienda'}</span>
              {bajada ? <span className="tienda-bajada">{bajada}</span> : null}
            </span>
          </button>
          <nav className="tienda-links" aria-label="Secciones">
            {paginas.map(([id, etiqueta]) => (
              <button key={id} type="button" aria-current={pagina === id ? 'page' : undefined} onClick={() => ir(id)}>
                {etiqueta}{id === 'carrito' && unidades > 0 ? ` (${unidades})` : ''}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="tienda-cuerpo">
        <div className="tienda-marco">
          {detalle ? (
            <Ficha
              producto={detalle}
              slug={slug}
              favorito={favoritos.includes(detalle.id)}
              onVolver={() => setDetalleId(null)}
              onFavorito={() => alternarFavorito(detalle.id)}
              onSumar={() => sumar(detalle)}
            />
          ) : pagina === 'inicio' ? (
            <Inicio
              plantilla={plantilla}
              tienda={tienda}
              productos={productos}
              categorias={categorias}
              categoria={categoria}
              buscar={buscar}
              portada={portada}
              titulo={tituloHero}
              texto={textoHero}
              cta={cta}
              slug={slug}
              favoritos={favoritos}
              onBuscar={setBuscar}
              onCategoria={(nombre) => { setCategoria(nombre); }}
              onVerProductos={() => ir('productos')}
              onAbrir={setDetalleId}
              onFavorito={alternarFavorito}
              onSumar={sumar}
            />
          ) : pagina === 'productos' ? (
            <Catalogo
              productos={productos.filter(coincide)}
              categorias={categorias}
              categoria={categoria}
              buscar={buscar}
              placeholder={tienda?.buscar || 'Buscar productos'}
              slug={slug}
              favoritos={favoritos}
              onBuscar={setBuscar}
              onCategoria={setCategoria}
              onAbrir={setDetalleId}
              onFavorito={alternarFavorito}
              onSumar={sumar}
            />
          ) : pagina === 'favoritos' ? (
            <Favoritos
              productos={productos.filter((item) => favoritos.includes(item.id))}
              slug={slug}
              favoritos={favoritos}
              onAbrir={setDetalleId}
              onFavorito={alternarFavorito}
              onSumar={sumar}
              onCatalogo={() => ir('productos')}
            />
          ) : (
            <Carrito
              lineas={carrito}
              productos={productos}
              slug={slug}
              onCantidad={cambiarCantidad}
              onQuitar={(id) => setCarrito((actual) => actual.filter((item) => item.id !== id))}
              onCatalogo={() => ir('productos')}
            />
          )}
        </div>
      </main>

      <nav className="tienda-pie" aria-label="Secciones">
        {paginas.map(([id, etiqueta]) => (
          <button key={id} type="button" aria-current={pagina === id ? 'page' : undefined} onClick={() => ir(id)}>
            <span>{etiqueta}</span>
            {id === 'carrito' && unidades > 0 ? <span className="tienda-cuenta">{unidades}</span> : null}
          </button>
        ))}
      </nav>
    </div>
  );
}

function Inicio({ plantilla, tienda, productos, categorias, categoria, buscar, portada, titulo, texto, cta, slug, favoritos, onBuscar, onCategoria, onVerProductos, onAbrir, onFavorito, onSumar }) {
  const destacados = productos.filter((item) => {
    const texto = buscar.trim().toLowerCase();
    if (texto && !`${item.nombre || ''}`.toLowerCase().includes(texto)) return false;
    return categoria === 'Todas' || item.categoria === categoria;
  }).slice(0, 6);
  const bloques = {
    portada: (
      <Portada key="portada" bajoCero={plantilla.variante === 'under'} portada={portada} titulo={titulo} texto={texto} cta={cta} etiqueta={tienda?.heroEtiqueta} onVer={onVerProductos} />
    ),
    categorias: (
      <Categorias key="categorias" categorias={categorias} activa={categoria} onElegir={onCategoria} titulo={tienda?.explorar || 'Categorías'} />
    ),
    busqueda: (
      <label key="busqueda" className="tienda-buscar">
        <span className="sr-only">Buscar</span>
        <input value={buscar} placeholder={tienda?.buscar || 'Buscar productos'} onChange={(event) => onBuscar(event.target.value)} />
      </label>
    ),
    destacados: (
      <section key="destacados" className="tienda-seccion" aria-label="Productos destacados">
        <h2>{destacados.some((item) => item.servicio) && destacados.every((item) => item.servicio) ? 'Servicios' : 'Destacados'}</h2>
        <Grilla productos={destacados} slug={slug} favoritos={favoritos} onAbrir={onAbrir} onFavorito={onFavorito} onSumar={onSumar} />
      </section>
    ),
  };
  return <>{plantilla.secciones.map((id) => bloques[id])}</>;
}

function Portada({ bajoCero = false, portada, titulo, texto, cta, etiqueta, onVer }) {
  return (
    <section className={`tienda-hero ${bajoCero ? 'tienda-hero--bajo-cero' : ''}`} aria-label="Portada">
      <div className="tienda-foto">
        {portada ? <img src={portada} alt="" /> : <span>Foto de portada</span>}
      </div>
      {bajoCero ? (
        <>
          <div className="tienda-hero-papel" aria-hidden="true" />
          <span className="tienda-hero-corona" aria-hidden="true">♛</span>
          <span className="tienda-hero-rasgado" aria-hidden="true" />
        </>
      ) : null}
      <div className="tienda-hero-texto">
        {etiqueta ? <p style={{ marginBottom: 8, letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: 12 }}>{etiqueta}</p> : null}
        <h1>{titulo}</h1>
        {texto ? <p>{texto}</p> : null}
        <button type="button" className="tienda-cta" onClick={onVer}>{cta}</button>
      </div>
    </section>
  );
}

function Categorias({ categorias, activa, onElegir, titulo }) {
  if (categorias.length <= 1) return null;
  return (
    <section aria-label={titulo}>
      <h2 className="sr-only">{titulo}</h2>
      <ul className="tienda-categorias">
        {categorias.map((nombre) => (
          <li key={nombre}>
            <button type="button" aria-pressed={activa === nombre} onClick={() => onElegir(nombre)}>{nombre}</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Catalogo({ productos, categorias, categoria, buscar, placeholder, slug, favoritos, onBuscar, onCategoria, onAbrir, onFavorito, onSumar }) {
  return (
    <section className="tienda-seccion" aria-label="Productos">
      <h2>Productos</h2>
      <label className="tienda-buscar">
        <span className="sr-only">Buscar</span>
        <input value={buscar} placeholder={placeholder} onChange={(event) => onBuscar(event.target.value)} />
      </label>
      <Categorias categorias={categorias} activa={categoria} onElegir={onCategoria} titulo="Filtrar por categoría" />
      <Grilla productos={productos} slug={slug} favoritos={favoritos} onAbrir={onAbrir} onFavorito={onFavorito} onSumar={onSumar} />
    </section>
  );
}

function Favoritos({ productos, slug, favoritos, onAbrir, onFavorito, onSumar, onCatalogo }) {
  return (
    <section className="tienda-seccion" aria-label="Favoritos">
      <h2>Favoritos</h2>
      {productos.length === 0 ? (
        <div className="tienda-vacio">
          <p>Todavía no guardaste productos de esta tienda.</p>
          <button type="button" className="tienda-cta" onClick={onCatalogo}>Ver productos</button>
        </div>
      ) : (
        <Grilla productos={productos} slug={slug} favoritos={favoritos} onAbrir={onAbrir} onFavorito={onFavorito} onSumar={onSumar} />
      )}
    </section>
  );
}

function Carrito({ lineas, productos, slug, onCantidad, onQuitar, onCatalogo }) {
  const vivas = lineas.map((item) => {
    const producto = productos.find((actual) => actual.id === item.id);
    return {
      ...item,
      nombre: producto?.nombre || item.nombre,
      precio: producto ? precioDe(producto) : Number(item.precio) || 0,
      foto: producto ? fotoDe(producto, slug) : item.foto,
      disponible: producto ? stockDe(producto) > 0 : false,
    };
  });
  const total = vivas.reduce((suma, item) => suma + item.precio * item.cantidad, 0);
  return (
    <section className="tienda-seccion" aria-label="Carrito">
      <h2>Carrito</h2>
      {vivas.length === 0 ? (
        <div className="tienda-vacio">
          <p>El carrito de esta tienda está vacío.</p>
          <button type="button" className="tienda-cta" onClick={onCatalogo}>Ver productos</button>
        </div>
      ) : (
        <div className="tienda-carrito">
          {vivas.map((item) => (
            <article key={item.id} className="tienda-linea">
              {item.foto ? <img src={item.foto} alt="" /> : <span className="tienda-vacio-foto">{iniciales(item.nombre)}</span>}
              <div>
                <h3 style={{ margin: 0, fontSize: 15 }}>{item.nombre}</h3>
                <p className="tienda-precio">{plata(item.precio)}</p>
                {!item.disponible ? <p className="tienda-stock">Sin stock</p> : null}
                <div className="tienda-paso">
                  <button type="button" aria-label="Quitar uno" onClick={() => onCantidad(item.id, -1)}>−</button>
                  <span>{item.cantidad}</span>
                  <button type="button" aria-label="Sumar uno" onClick={() => onCantidad(item.id, 1)}>+</button>
                  <button type="button" className="tienda-quitar" onClick={() => onQuitar(item.id)}>Quitar</button>
                </div>
              </div>
            </article>
          ))}
          <p className="tienda-total"><span>Total</span><span>{plata(total)}</span></p>
          <button type="button" className="tienda-cta" disabled>Pedir</button>
          <p className="tienda-nota">El pedido desde la vidriera todavía no está conectado. El carrito queda guardado en este navegador y no se confirma una compra.</p>
        </div>
      )}
    </section>
  );
}

function Ficha({ producto, slug, favorito, onVolver, onFavorito, onSumar }) {
  const foto = fotoDe(producto, slug);
  const stock = stockDe(producto);
  return (
    <article className="tienda-ficha">
      <div>
        <button type="button" className="tienda-volver" onClick={onVolver}>Volver</button>
        {foto ? <img src={foto} alt="" /> : <span className="tienda-vacio-foto">{iniciales(producto.nombre)}</span>}
      </div>
      <div>
        <h1 style={{ margin: '0 0 8px', fontFamily: 'var(--display)', letterSpacing: '-0.03em' }}>{producto.nombre}</h1>
        <p className="tienda-precio">{plata(precioDe(producto))}</p>
        <p className="tienda-stock">{producto.servicio ? 'Servicio' : stock > 0 ? `${stock} disponibles` : 'Sin stock'}</p>
        {producto.descripcion ? <p>{producto.descripcion}</p> : null}
        <button type="button" className="tienda-corazon" aria-pressed={favorito} onClick={onFavorito}>{favorito ? 'En favoritos' : 'Guardar'}</button>
        <button type="button" className="tienda-sumar" disabled={stock <= 0} onClick={onSumar}>{stock <= 0 ? 'Sin stock' : 'Agregar'}</button>
      </div>
    </article>
  );
}

function Grilla({ productos, slug, favoritos, onAbrir, onFavorito, onSumar }) {
  if (!productos.length) {
    return <p className="tienda-vacio">No hay productos publicados para esta búsqueda.</p>;
  }
  return (
    <div className="tienda-grilla">
      {productos.map((producto) => {
        const foto = fotoDe(producto, slug);
        const stock = stockDe(producto);
        return (
          <article key={producto.id} className="tienda-card">
            <figure>
              <button type="button" onClick={() => onAbrir(producto.id)} style={{ display: 'block', width: '100%', height: '100%', padding: 0, border: 0, background: 'transparent' }}>
                {foto ? <img src={foto} alt="" /> : <span className="tienda-vacio-foto">{iniciales(producto.nombre)}</span>}
              </button>
              <button type="button" className="tienda-corazon" aria-pressed={favoritos.includes(producto.id)} aria-label="Favorito" onClick={() => onFavorito(producto.id)}>
                {favoritos.includes(producto.id) ? '♥' : '♡'}
              </button>
            </figure>
            <div className="tienda-meta">
              <h3>
                <button type="button" onClick={() => onAbrir(producto.id)} style={{ padding: 0, border: 0, background: 'none', textAlign: 'left' }}>{producto.nombre}</button>
              </h3>
              <p className="tienda-precio">{plata(precioDe(producto))}</p>
              <p className="tienda-stock">{producto.servicio ? 'Servicio' : stock > 0 ? 'Disponible' : 'Sin stock'}</p>
              <button type="button" className="tienda-sumar" disabled={stock <= 0} onClick={() => onSumar(producto)}>
                {stock <= 0 ? 'Sin stock' : 'Agregar'}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
