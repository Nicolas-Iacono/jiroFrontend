import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, pedir, urlVidriera } from '../api.js';
import { Etiqueta, Filtro, Icono } from './Iconos.jsx';
import referencias from './referencias-vidriera.png';
import './vidriera.css';
import { plantillaDe, plantillas } from '@tienda/registro.js';

const temas = [
  { id: 'giro', nombre: 'GIRO Violeta', detalle: 'Acentos violeta', nota: 'Firma GIRO', color: '#7c3aed', fondo: 'blanco', texto: 'oscuro', muestras: ['#7C3AED', '#4C1D95', '#EDE9FE', '#FFFFFF'] },
  { id: 'oscuro', nombre: 'Oscuro urbano', detalle: 'Grafito y blanco', nota: 'Nocturno', color: '#111827', fondo: 'oscuro', texto: 'claro', muestras: ['#111827', '#374151', '#F9FAFB', '#FFFFFF'] },
  { id: 'esmeralda', nombre: 'Esmeralda', detalle: 'Verde y menta', nota: 'Natural', color: '#059669', fondo: 'blanco', texto: 'oscuro', muestras: ['#059669', '#6EE7B7', '#ECFDF5', '#FFFFFF'] },
  { id: 'terracota', nombre: 'Terracota', detalle: 'Arcilla y crema', nota: 'Cálido', color: '#ea580c', fondo: 'calido', texto: 'oscuro', muestras: ['#EA580C', '#FDBA74', '#FFF7ED', '#FFFFFF'] },
  { id: 'pastel', nombre: 'Pastel', detalle: 'Rosa y lila', nota: 'Suave', color: '#db2777', fondo: 'calido', texto: 'oscuro', muestras: ['#DB2777', '#F9A8D4', '#FDF2F8', '#FFFFFF'] },
  { id: 'neon', nombre: 'Neón', detalle: 'Cian sobre noche', nota: 'Intenso', color: '#0284c7', fondo: 'oscuro', texto: 'claro', muestras: ['#0284C7', '#22D3EE', '#0F172A', '#082F49'] },
  { id: 'barrio', nombre: 'Estilo de barrio', detalle: 'Papel, título enorme y acento', nota: 'Vidriera editorial', color: '#7C2F3B', fondo: 'crema', texto: 'oscuro', muestras: ['#7C2F3B', '#1A1614', '#F6F1E8', '#FFFFFF'] },
];
const fondos = [
  ['blanco', 'Blanco', '#FFFFFF'],
  ['gris', 'Gris tenue', '#F4F5F9'],
  ['calido', 'Cálido', '#FFF7ED'],
  ['crema', 'Papel', '#F6F1E8'],
  ['oscuro', 'Oscuro', '#111827'],
];
const fuentes = [
  ['jakarta', 'Plus Jakarta Sans', 'Moderna y limpia', '"Plus Jakarta Sans", Inter, sans-serif'],
  ['inter', 'Inter', 'Neutra y legible', 'Inter, sans-serif'],
  ['playfair', 'Playfair Display', 'Elegante, para moda', '"Playfair Display", Georgia, serif'],
  ['grotesk', 'Space Grotesk', 'Urbana y directa', '"Space Grotesk", Inter, sans-serif'],
];
const heroes = [
  ['foto', 'Foto propia'],
  ['gradiente', 'Color'],
  ['tipografico', 'Solo título'],
  ['ninguno', 'Sin portada'],
];
const secciones = [
  ['plantillas', 'Plantillas', Ventana],
  ['marca', 'Marca', Etiqueta],
  ['estilo', 'Estilo', Filtro],
  ['contenido', 'Contenido', Imagen],
];

const recortes = {
  'ropa-under': [48, 163],
  perfumeria: [155, 163],
  'ropa-lujo': [48, 305],
  electronica: [155, 305],
};

const descripciones = {
  'ropa-under': 'Editorial, moderna y con protagonismo visual. Ideal para moda urbana.',
  perfumeria: 'Liviana, ordenada y versátil. Resalta tus productos.',
};

const primeras = Object.keys(recortes);
const galeria = [...primeras.map(plantillaDe), ...plantillas.filter(({ id }) => !primeras.includes(id))];

function normalizar(data) {
  const radio = Number(data?.radio);
  return {
    titulo: data?.titulo || '',
    descripcion: data?.descripcion || '',
    color: data?.color || '#7c3aed',
    publicada: data?.publicada !== false,
    tema: data?.tema || 'giro',
    plantillaId: plantillas.some((item) => item.id === data?.plantillaId) ? data.plantillaId : 'giro',
    estiloPropio: data?.estiloPropio !== false,
    fondo: data?.fondo || 'blanco',
    texto: data?.texto || 'oscuro',
    catalogo: data?.catalogo || 'grilla',
    radio: radio === 0 || radio === 8 || radio === 16 ? radio : 16,
    cuotas: Boolean(data?.cuotas),
    marquesina: data?.marquesina || '',
    hero: data?.hero || 'gradiente',
    fuente: data?.fuente || 'jakarta',
    portadaUrl: data?.portadaUrl || '',
    logoUrl: data?.logoUrl || '',
    menu: data?.menu || 'lados',
    logoForma: data?.logoForma === 'cuadrado' || data?.logoForma === 'curvo' ? data.logoForma : 'circular',
    estado: data?.estado || '',
    etiqueta: data?.etiqueta || '',
    sello: data?.sello || '',
    heroEtiqueta: data?.heroEtiqueta || '',
    heroTitulo: data?.heroTitulo || '',
    heroTexto: data?.heroTexto || '',
    heroCta: data?.heroCta || '',
    buscar: data?.buscar || '',
    aviso: data?.aviso || '',
    explorar: data?.explorar || '',
    portadas: Array.isArray(data?.portadas) && data.portadas.length ? data.portadas.filter(Boolean) : (data?.portadaUrl ? [data.portadaUrl] : []),
    mostrarRubros: Boolean(data?.mostrarRubros),
    rubroForma: data?.rubroForma === 'recto' || data?.rubroForma === 'redondeado' || data?.rubroForma === 'pastilla' ? data.rubroForma : 'circular',
    rubroColor: /^#[0-9A-Fa-f]{6}$/.test(data?.rubroColor || '') ? data.rubroColor : '',
    rubros: [...new Set((Array.isArray(data?.rubros) ? data.rubros : String(data?.rubros || '').split(',')).map((item) => String(item?.id ?? item).trim()).filter(Boolean))].sort(),
    secciones: (Array.isArray(data?.secciones) ? data.secciones : []).filter((item) => item && (item.tipo === 'texto' || item.tipo === 'productos')).map((item) => ({
      id: String(item.id || ''),
      tipo: item.tipo,
      titulo: String(item.titulo || ''),
      texto: String(item.texto || ''),
      categoriaId: item.categoriaId ? String(item.categoriaId) : '',
      categoria: item.categoria || '',
    })),
    sumar: data?.sumar || '',
    sumarForma: data?.sumarForma || 'circular',
    sumarColor: data?.sumarColor || '',
    sumarVisible: data?.sumarVisible !== false,
    slug: data?.slug || '',
    localidad: data?.localidad || '',
    partido: data?.partido || '',
  };
}

function firma(valor) {
  const item = normalizar(valor);
  delete item.slug;
  delete item.localidad;
  delete item.partido;
  return JSON.stringify(item);
}

function iniciales(nombre) {
  const partes = String(nombre || 'GI').trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] || 'G') + (partes[1]?.[0] || '')).toUpperCase();
}

export default function Vidriera() {
  const [form, setForm] = useState(null);
  const [base, setBase] = useState(null);
  const [productos, setProductos] = useState([]);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [dispositivo, setDispositivo] = useState('escritorio');
  const [modo, setModo] = useState('editar');
  const [ajustes, setAjustes] = useState(null);
  const panelEdicion = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [rubros, setRubros] = useState([]);
  const [anticipada, setAnticipada] = useState('');
  const [seccion, setSeccion] = useState('plantillas');
  const catalogoVista = useFotosPrivadas(productos, base?.publicada === false);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      api('/api/vidriera'),
      api('/api/productos').catch(() => []),
      api('/api/categorias').catch(() => []),
      api('/api/ajustes').catch(() => null),
    ]).then(([vidriera, catalogo, categorias, configuracion]) => {
      if (!vivo) return;
      const siguiente = normalizar(vidriera);
      setForm(siguiente);
      setBase(siguiente);
      setProductos(catalogo.filter((item) => item.publicado && item.activo !== false));
      setRubros(Array.isArray(categorias) ? categorias : []);
      setAjustes(configuracion);
    }).catch((err) => vivo && setError(err.message));
    return () => { vivo = false; };
  }, []);

  const sucio = form && base ? firma(form) !== firma(base) : false;

  const prueba = anticipada && anticipada !== form?.plantillaId ? plantillaDe(anticipada) : null;
  const borrador = useMemo(() => {
    if (!form) return null;
    const datos = prueba ? { ...form, ...estiloPlantilla(form, prueba), plantillaId: prueba.id } : form;
    return {
      ...datos,
      oferta: ajustes?.oferta,
      detalles: ajustes?.detalles,
      productos: catalogoVista,
      rubros: datos.rubros.map((id) => rubros.find((rubro) => String(rubro.id) === id)).filter(Boolean),
      secciones: datos.secciones.map((item) => ({
        ...item,
        categoria: rubros.find((rubro) => String(rubro.id) === item.categoriaId)?.nombre || item.categoria,
      })),
    };
  }, [form, prueba, ajustes, catalogoVista, rubros]);

  function cambiar(parcial) {
    const tocaEstilo = ['color', 'fondo', 'texto', 'fuente'].some((clave) => Object.prototype.hasOwnProperty.call(parcial, clave));
    setForm((actual) => ({
      ...actual,
      ...parcial,
      estiloPropio: Object.prototype.hasOwnProperty.call(parcial, 'estiloPropio') ? parcial.estiloPropio : (tocaEstilo ? true : actual.estiloPropio),
    }));
    setAviso('');
  }

  function usarPlantilla(plantilla) {
    setAnticipada('');
    cambiar({ plantillaId: plantilla.id, ...estiloPlantilla(form, plantilla), estiloPropio: form.estiloPropio });
  }

  function restaurarEstilo() {
    const plantilla = plantillaDe(form.plantillaId);
    cambiar({
      color: plantilla.color,
      fondo: plantilla.fondo,
      texto: plantilla.texto,
      fuente: plantilla.fuente,
      estiloPropio: false,
    });
  }

  function editarSeccion(id, parcial) {
    cambiar({ secciones: (form.secciones || []).map((item) => (item.id === id ? { ...item, ...parcial } : item)) });
  }

  function moverSeccion(indice, delta) {
    const lista = [...(form.secciones || [])];
    const destino = indice + delta;
    if (destino < 0 || destino >= lista.length) return;
    const [item] = lista.splice(indice, 1);
    lista.splice(destino, 0, item);
    cambiar({ secciones: lista });
  }

  function agregarSeccion(tipo) {
    cambiar({
      secciones: [...(form.secciones || []), {
        id: `s${Date.now()}`,
        tipo,
        titulo: '',
        texto: '',
        categoriaId: tipo === 'productos' ? String(rubros[0]?.id || '') : '',
        categoria: '',
      }],
    });
  }

  function aplicarTema(tema) {
    cambiar({ tema: tema.id, color: tema.color, fondo: tema.fondo, texto: tema.texto });
  }

  async function subirPortada(event) {
    const archivo = event.target.files?.[0];
    event.target.value = '';
    if (!archivo) return;
    const cuerpo = new FormData();
    cuerpo.append('archivo', archivo);
    setSubiendo(true);
    setError('');
    try {
      const guardada = await api('/api/vidriera/portada', { method: 'POST', body: cuerpo });
      const fotos = guardada.portadas || [];
      const parcial = { portadas: fotos, portadaUrl: guardada.portadaUrl || fotos[0] || '', hero: guardada.hero || 'foto' };
      setForm((actual) => normalizar({ ...actual, ...parcial }));
      setBase((actual) => (actual ? normalizar({ ...actual, ...parcial }) : actual));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendo(false);
    }
  }

  async function quitarPortada(url) {
    setSubiendo(true);
    setError('');
    try {
      const guardada = await api('/api/vidriera/portada/quitar', { method: 'POST', body: url ? { url } : {} });
      const fotos = guardada.portadas || [];
      const parcial = { portadas: fotos, portadaUrl: guardada.portadaUrl || '' };
      setForm((actual) => normalizar({ ...actual, ...parcial }));
      setBase((actual) => (actual ? normalizar({ ...actual, ...parcial }) : actual));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendo(false);
    }
  }

  function publicarLogo(url) {
    setForm((actual) => ({ ...actual, logoUrl: url }));
    setBase((actual) => (actual ? { ...actual, logoUrl: url } : actual));
    window.dispatchEvent(new CustomEvent('giro-logo', { detail: url }));
  }

  async function subirLogo(event) {
    const archivo = event.target.files?.[0];
    event.target.value = '';
    if (!archivo) return;
    const cuerpo = new FormData();
    cuerpo.append('archivo', archivo);
    setSubiendo(true);
    setError('');
    try {
      const guardada = await api('/api/vidriera/logo', { method: 'POST', body: cuerpo });
      publicarLogo(guardada.logoUrl || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendo(false);
    }
  }

  async function quitarLogo() {
    setSubiendo(true);
    setError('');
    try {
      await api('/api/vidriera/logo/quitar', { method: 'POST' });
      publicarLogo('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendo(false);
    }
  }

  async function guardar(publicar) {
    if (guardando || subiendo || !form.titulo.trim()) return;
    const cuerpo = normalizar({ ...form, publicada: publicar });
    setGuardando(true);
    setError('');
    try {
      const guardada = await api('/api/vidriera', {
        method: 'PUT',
        body: {
          titulo: cuerpo.titulo.trim(),
          descripcion: cuerpo.descripcion.trim(),
          color: cuerpo.color,
          publicada: cuerpo.publicada,
          tema: cuerpo.tema,
          fondo: cuerpo.fondo,
          texto: cuerpo.texto,
          catalogo: cuerpo.catalogo,
          radio: cuerpo.radio,
          cuotas: cuerpo.cuotas,
          marquesina: cuerpo.marquesina.trim(),
          hero: cuerpo.hero,
          fuente: cuerpo.fuente,
          plantillaId: cuerpo.plantillaId,
          estiloPropio: cuerpo.estiloPropio,
          menu: cuerpo.menu,
          logoForma: cuerpo.logoForma,
          mostrarRubros: cuerpo.mostrarRubros,
          rubros: cuerpo.rubros.join(','),
          rubroForma: cuerpo.rubroForma,
          rubroColor: cuerpo.rubroColor || '',
          estado: cuerpo.estado.trim(),
          etiqueta: cuerpo.etiqueta.trim(),
          sello: cuerpo.sello.trim(),
          heroEtiqueta: cuerpo.heroEtiqueta.trim(),
          heroTitulo: cuerpo.heroTitulo.trim(),
          heroTexto: cuerpo.heroTexto.trim(),
          heroCta: cuerpo.heroCta.trim(),
          buscar: cuerpo.buscar.trim(),
          aviso: cuerpo.aviso.trim(),
          explorar: cuerpo.explorar.trim(),
          secciones: JSON.stringify(cuerpo.secciones.map((item) => ({
            id: item.id,
            tipo: item.tipo,
            titulo: item.titulo,
            texto: item.tipo === 'texto' ? item.texto : '',
            categoriaId: item.tipo === 'productos' && item.categoriaId ? Number(item.categoriaId) : null,
          }))),
        },
      });
      const siguiente = normalizar({ ...guardada, localidad: form.localidad, partido: form.partido });
      setForm(siguiente);
      setBase(siguiente);
      window.dispatchEvent(new CustomEvent('giro-logo', { detail: { url: siguiente.logoUrl || '', forma: siguiente.logoForma } }));
      setAviso(siguiente.publicada ? 'La vidriera quedó publicada.' : 'Los cambios quedaron guardados.');
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  if (error && !form) return <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>;
  if (!form) return <p className="text-sm text-muted">Cargando la vidriera…</p>;

  const enlace = form.slug ? urlVidriera(form.slug) : '';
  const ocupado = guardando || subiendo;
  const estado = sucio ? 'Cambios sin publicar' : base.publicada ? 'Publicada' : 'Sin publicar';
  const publicar = (
    <button type="button" className="vidriera-publicar" disabled={ocupado || !form.titulo.trim()} onClick={() => guardar(true)}>
      {guardando ? 'Guardando…' : 'Guardar y publicar'}
    </button>
  );
  const estadoCambios = <span className="vidriera-estado" data-pendiente={sucio}>{estado}</span>;
  const aplicar = prueba && (
    <div className="vidriera-prueba">
      <span>Probando <strong>{prueba.nombre}</strong></span>
      <button type="button" disabled={ocupado} onClick={() => usarPlantilla(prueba)}>Usar plantilla</button>
      <button type="button" onClick={() => setAnticipada('')}>Cancelar prueba</button>
    </div>
  );

  return (
    <div className="vidriera" data-modo={modo}>
      <header className="vidriera-barra">
        <Link to="/" className="vidriera-volver" aria-label="Volver al inicio">←</Link>
        <h1><span className="vidriera-titulo-compacto">Mi vidriera</span><span className="vidriera-titulo-amplio">Diseño de la vidriera</span></h1>
        <div className="vidriera-estado-amplio">{estadoCambios}</div>
        {enlace && <a className="vidriera-enlace" href={enlace} target="_blank" rel="noreferrer"><Externo />Ver tienda</a>}
        <div className="vidriera-publicar-amplio">{publicar}</div>
      </header>

      <div className="vidriera-modos vidriera-segmentos" role="group" aria-label="Vista del editor">
        <button type="button" aria-pressed={modo === 'editar'} onClick={() => setModo('editar')}>Editar</button>
        <button type="button" aria-pressed={modo === 'previa'} onClick={() => setModo('previa')}>Vista previa</button>
      </div>

      {error && <p role="alert" className="vidriera-mensaje bg-rose-50 text-rose-800">{error}</p>}
      {aviso && <p role="status" className="vidriera-mensaje bg-emerald-50 text-emerald-800">{aviso}</p>}

      <div className="vidriera-columnas">
        <section className="vidriera-edicion" aria-label="Personalización">
          <div className="vidriera-intro">
            <h2>Personalizá tu tienda</h2>
            <p>Elegí una plantilla y ajustá la identidad, el estilo y el contenido de tu tienda.</p>
          </div>
          <nav className="vidriera-secciones" aria-label="Secciones de la vidriera">
            {secciones.map(([id, etiqueta, IconoSeccion]) => (
              <button key={id} type="button" aria-pressed={seccion === id} onClick={() => {
                setSeccion(id);
                panelEdicion.current.scrollTop = 0;
              }}><IconoSeccion />{etiqueta}</button>
            ))}
          </nav>
          <div className="vidriera-campos" ref={panelEdicion}>
            <fieldset disabled={ocupado} className="min-w-0 space-y-4">
              {seccion === 'plantillas' && (
                <section className="vidriera-galeria">
                  <h2><span className="vidriera-titulo-compacto">Plantillas</span><span className="vidriera-titulo-amplio">Elegí una plantilla</span></h2>
                  <p>Elegí una composición. El nombre, el logo, las fotos y los productos siguen siendo los de este comercio.</p>
                  <div className="vidriera-tarjetas">
                    {galeria.map((plantilla) => {
                      const activa = form.plantillaId === plantilla.id;
                      const probando = prueba?.id === plantilla.id;
                      return (
                        <article key={plantilla.id} className="vidriera-tarjeta" data-activa={activa} data-probando={probando}>
                          <button type="button" className="vidriera-tarjeta-boton" aria-pressed={probando || (!prueba && activa)}
                            aria-label={activa ? plantilla.nombre + ', en uso' : 'Probar ' + plantilla.nombre}
                            onClick={() => setAnticipada(activa ? '' : plantilla.id)}>
                            <Miniatura plantilla={plantilla} />
                            <span className="vidriera-tarjeta-texto">
                              <strong>{plantilla.nombre}</strong>
                              <span>{descripciones[plantilla.id] || plantilla.estructura}</span>
                            </span>
                            <span className="vidriera-radio" aria-hidden="true">{activa ? '✓' : probando ? '●' : ''}</span>
                          </button>
                          {probando && (
                            <div className="vidriera-tarjeta-acciones">
                              <button type="button" onClick={() => setModo('previa')}>Ver prueba</button>
                              <button type="button" onClick={() => usarPlantilla(plantilla)}>Usar plantilla</button>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}

          <Seccion id="identidad" visible={seccion === 'marca'} titulo="Identidad">
            <div className="flex items-center gap-3">
              <span className={`grid h-24 w-24 overflow-hidden text-2xl font-black text-white ${claseForma(form.logoForma, true)}`} style={{ background: form.color }}>
                {form.logoUrl ? <img src={form.logoUrl} alt="" className="h-full w-full object-cover" /> : iniciales(form.titulo)}
              </span>
              <div className="space-y-2">
                <p className="max-w-xs text-xs text-muted">Este logo es el avatar del header y de la tienda. Si no subís uno, se usan las iniciales del nombre.</p>
                <div className="flex flex-wrap items-center gap-2">
                  <label className={`rounded-xl bg-fill px-3 py-1.5 text-xs font-bold text-white ${subiendo ? 'opacity-60' : 'cursor-pointer'}`}>
                    {subiendo ? 'Subiendo…' : 'Subir logo'}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={subiendo} onChange={subirLogo} />
                  </label>
                  {form.logoUrl && <button type="button" className="text-xs font-bold text-muted" disabled={subiendo} onClick={quitarLogo}>Quitar logo</button>}
                </div>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-faint">Forma del logo</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {[['cuadrado', 'Cuadrado'], ['curvo', 'Bordes curvos'], ['circular', 'Circular']].map(([id, titulo]) => (
                  <button key={id} type="button" className={`flex items-center gap-2 rounded-2xl border p-3 text-left ${form.logoForma === id ? 'border-accent bg-accent-soft' : 'border-line'}`} onClick={() => cambiar({ logoForma: id })}>
                    <span className={`h-8 w-8 shrink-0 bg-fill ${claseForma(id)}`} />
                    <span className="text-sm font-black">{titulo}</span>
                  </button>
                ))}
              </div>
            </div>
            <Campo etiqueta="Nombre en la vidriera">
              <input className={campo} value={form.titulo} maxLength={160} onChange={(event) => cambiar({ titulo: event.target.value })} />
            </Campo>
            <Campo etiqueta="Texto de la ficha">
              <input className={campo} value={form.descripcion} maxLength={2000} placeholder="Una frase sobre el taller, los materiales o la colección" onChange={(event) => cambiar({ descripcion: event.target.value })} />
            </Campo>
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-faint">Menú del header</p>
              <p className="mb-2 text-[11px] text-muted">En el celular el menú es una hamburguesa. Adentro están Inicio, Productos y Carrito. Hombre y Mujer arman un submenú con las prendas marcadas. Lo que no marques queda afuera de ese submenú.</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {[['centro', 'Centrado', 'Logo y menú juntos, al medio'], ['lados', 'A los lados', 'Logo a un lado y menú al otro'], ['esquinas', 'En las esquinas', 'Logo en una esquina, nombre al centro y menú en la otra']].map(([id, titulo, detalle]) => (
                  <button key={id} type="button" className={`rounded-2xl border p-3 text-left ${form.menu === id ? 'border-accent bg-accent-soft' : 'border-line'}`} onClick={() => cambiar({ menu: id })}>
                    <span className="block text-sm font-black">{titulo}</span>
                    <span className="text-[11px] text-muted">{detalle}</span>
                  </button>
                ))}
              </div>
            </div>
            <Interruptor activo={form.publicada} onClick={() => cambiar({ publicada: !form.publicada })}>Tienda publicada</Interruptor>
          </Seccion>

          <Seccion id="composicion" visible={seccion === 'contenido'} titulo="Vidriera">
            <p className="text-[11px] text-muted">Estos textos arman la ficha de marca, la portada y la fila de categorías. Con un tema cálido, oscuro o verde, y las categorías en pastillas, la tienda queda como las tres vidrieras de referencia.</p>
            <Campo etiqueta="Línea bajo el nombre">
              <input className={campo} value={form.estado} maxLength={120} placeholder="Abierto hoy · Villa Crespo" onChange={(event) => cambiar({ estado: event.target.value })} />
            </Campo>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="Etiqueta de la ficha">
                <input className={campo} value={form.etiqueta} maxLength={80} placeholder="Objetos de autor" onChange={(event) => cambiar({ etiqueta: event.target.value })} />
              </Campo>
              <Campo etiqueta="Sello">
                <input className={campo} value={form.sello} maxLength={80} placeholder="100% artesanal" onChange={(event) => cambiar({ sello: event.target.value })} />
              </Campo>
            </div>
            <Campo etiqueta="Texto del buscador">
              <input className={campo} value={form.buscar} maxLength={80} placeholder="Buscar vajilla, mantas, cerámica…" onChange={(event) => cambiar({ buscar: event.target.value })} />
            </Campo>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="Etiqueta sobre la portada">
                <input className={campo} value={form.heroEtiqueta} maxLength={80} placeholder="Serie 2026" onChange={(event) => cambiar({ heroEtiqueta: event.target.value })} />
              </Campo>
              <Campo etiqueta="Botón de la portada">
                <input className={campo} value={form.heroCta} maxLength={40} placeholder="Explorar" onChange={(event) => cambiar({ heroCta: event.target.value })} />
              </Campo>
            </div>
            <Campo etiqueta="Título sobre la portada">
              <input className={campo} value={form.heroTitulo} maxLength={140} placeholder="Colección Arcillas & Lino" onChange={(event) => cambiar({ heroTitulo: event.target.value })} />
            </Campo>
            <Campo etiqueta="Texto sobre la portada">
              <input className={campo} value={form.heroTexto} maxLength={240} placeholder="Texturas minerales, pastas y lino." onChange={(event) => cambiar({ heroTexto: event.target.value })} />
            </Campo>
            <Campo etiqueta="Título de las categorías">
              <input className={campo} value={form.explorar} maxLength={60} placeholder="Explorar el catálogo" onChange={(event) => cambiar({ explorar: event.target.value })} />
            </Campo>
            <Campo etiqueta="Aviso bajo las categorías">
              <input className={campo} value={form.aviso} maxLength={180} placeholder="Packaging seguro en papel craft y envíos a todo el país" onChange={(event) => cambiar({ aviso: event.target.value })} />
            </Campo>
          </Seccion>

          <Seccion id="paleta" visible={seccion === 'estilo'} titulo="Paleta y tema">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted">Los colores y la tipografía son de esta vidriera. La plantilla conserva el orden de las secciones.</p>
              <button type="button" className="rounded-xl border border-line bg-card px-3 py-1.5 text-xs font-bold text-ink" onClick={restaurarEstilo}>Restaurar estilo de la plantilla</button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {temas.map((tema) => {
                const activo = form.tema === tema.id;
                return (
                  <button key={tema.id} type="button" className={`rounded-2xl border p-3 text-left ${activo ? 'border-accent bg-accent-soft' : 'border-line bg-card hover:border-line'}`} onClick={() => aplicarTema(tema)}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-black text-ink">{tema.nombre}</span>
                      {activo && <span className="grid h-5 w-5 place-items-center rounded-full bg-fill text-[10px] text-onfill">✓</span>}
                    </span>
                    <span className="mt-2 flex gap-1">{tema.muestras.map((muestra) => <span key={muestra} className="h-5 w-5 rounded-full border border-black/10" style={{ background: muestra }} />)}</span>
                    <span className="mt-2 block text-[11px] text-muted">{tema.detalle}</span>
                    <span className="mt-1 inline-flex rounded-full bg-card px-2 py-0.5 text-[10px] font-bold text-muted">{tema.nota}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 text-xs font-bold text-ink">
                <input type="color" className="h-7 w-7 cursor-pointer border-0 bg-transparent" value={form.color} onChange={(event) => cambiar({ color: event.target.value })} />
                {form.tema === 'barrio' ? 'Acento' : 'Color'} {form.color.toUpperCase()}
              </label>
              {form.tema === 'barrio' && <p className="text-[11px] text-muted">El acento pinta precios, botones, corazones y el ítem activo. El fondo es el papel de la tienda.</p>}
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-faint">Fondo</p>
              <div className="flex flex-wrap gap-2">
                {fondos.map(([id, etiqueta]) => (
                  <button key={id} type="button" className={`rounded-xl px-3 py-1.5 text-xs font-bold ${form.fondo === id ? 'bg-fill text-onfill' : 'bg-sunken text-muted'}`} onClick={() => cambiar({ fondo: id })}>{etiqueta}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-faint">Texto</p>
              <div className="flex gap-2">
                {[['oscuro', 'Oscuro'], ['claro', 'Claro']].map(([id, etiqueta]) => (
                  <button key={id} type="button" className={`rounded-xl px-3 py-1.5 text-xs font-bold ${form.texto === id ? 'bg-fill text-onfill' : 'bg-sunken text-muted'}`} onClick={() => cambiar({ texto: id })}>{etiqueta}</button>
                ))}
              </div>
            </div>
          </Seccion>

          <Seccion id="catalogo" visible={seccion === 'contenido'} titulo="Catálogo">
            <div className="grid gap-2 sm:grid-cols-2">
              {[['grilla', '2 columnas', 'Grilla táctil'], ['lista', 'Lista', 'Una prenda por fila']].map(([id, titulo, detalle]) => (
                <button key={id} type="button" className={`rounded-2xl border p-3 text-left ${form.catalogo === id ? 'border-accent bg-accent-soft' : 'border-line'}`} onClick={() => cambiar({ catalogo: id })}>
                  <span className="block text-sm font-black">{titulo}</span>
                  <span className="text-[11px] text-muted">{detalle}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {[[0, 'Rectas'], [8, 'Sutil'], [16, 'Curvas']].map(([radio, etiqueta]) => (
                <button key={radio} type="button" className={`rounded-xl px-3 py-1.5 text-xs font-bold ${form.radio === radio ? 'bg-fill text-onfill' : 'bg-sunken text-muted'}`} onClick={() => cambiar({ radio })}>{etiqueta}</button>
              ))}
            </div>
            <Interruptor activo={form.cuotas} onClick={() => cambiar({ cuotas: !form.cuotas })}>Mostrar el precio dividido en 3</Interruptor>
          </Seccion>

          <Seccion id="portada" visible={seccion === 'contenido'} titulo="Portada">
            <Campo etiqueta="Anuncio de la barra superior">
              <input className={campo} value={form.marquesina} maxLength={180} placeholder="Un aviso corto para quien entra a la tienda" onChange={(event) => cambiar({ marquesina: event.target.value })} />
            </Campo>
            <div className="grid gap-2 sm:grid-cols-2">
              {heroes.map(([id, etiqueta]) => (
                <button key={id} type="button" className={`rounded-2xl border px-3 py-3 text-sm font-bold ${form.hero === id ? 'border-accent bg-accent-soft text-accent' : 'border-line text-ink'}`} onClick={() => cambiar({ hero: id })}>{etiqueta}</button>
              ))}
            </div>
            <div className="overflow-hidden rounded-2xl border border-dashed border-line bg-sunken">
              {form.portadas?.length ? (
                <div className="grid grid-cols-3 gap-1 p-1">
                  {form.portadas.map((url) => (
                    <div key={url} className="relative">
                      <img src={url} alt="" className="h-24 w-full object-cover" />
                      <button type="button" className="absolute right-1 top-1 rounded-full bg-black/70 px-1.5 text-[10px] font-bold text-white" disabled={subiendo} onClick={() => quitarPortada(url)}>Quitar</button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-4 py-8 text-center text-xs text-muted">Todavía no hay fotos de portada.</p>
              )}
              <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2">
                <label className={`rounded-xl bg-fill px-3 py-1.5 text-xs font-bold text-white ${(subiendo || form.portadas.length >= 8) ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}>
                  {subiendo ? 'Subiendo…' : 'Subir foto'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={subiendo || form.portadas.length >= 8} onChange={subirPortada} />
                </label>
                <span className="text-[11px] text-faint">Hasta 8 fotos. Con más de una, la portada es un carrusel.</span>
              </div>
            </div>
            <Interruptor activo={form.mostrarRubros} onClick={() => cambiar({ mostrarRubros: !form.mostrarRubros })}>Mostrar categorías debajo de la portada</Interruptor>
            {form.mostrarRubros && (
              <>
                <div>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-faint">Fondo del ícono</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[['recto', 'Recto'], ['redondeado', 'Redondeado'], ['circular', 'Circular'], ['pastilla', 'Pastillas']].map(([id, titulo]) => (
                      <button key={id} type="button" className={`flex items-center gap-2 rounded-2xl border p-3 text-left ${form.rubroForma === id ? 'border-accent bg-accent-soft' : 'border-line'}`} onClick={() => cambiar({ rubroForma: id })}>
                        <span className={`shrink-0 bg-fill ${id === 'pastilla' ? 'h-6 w-10 rounded-full' : `h-8 w-8 ${claseRubro(id)}`}`} />
                        <span className="text-sm font-black">{titulo}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-ink">
                  <input type="color" className="h-7 w-7 cursor-pointer border-0 bg-transparent" value={form.rubroColor || form.color} onChange={(event) => cambiar({ rubroColor: event.target.value })} />
                  Color de los íconos {(form.rubroColor || form.color).toUpperCase()}
                </label>
                {form.rubroColor && <button type="button" className="text-xs font-bold text-muted" onClick={() => cambiar({ rubroColor: '' })}>Usar el color de la tienda</button>}
                {rubros.length ? (
                  <div className="flex flex-wrap gap-2">
                    {rubros.map((item) => {
                      const activo = form.rubros.includes(String(item.id));
                      return (
                        <button key={item.id} type="button" className={`rounded-xl px-3 py-1.5 text-xs font-bold ${activo ? 'bg-fill text-onfill' : 'bg-sunken text-muted'}`} onClick={() => cambiar({ rubros: activo ? form.rubros.filter((id) => id !== String(item.id)) : [...form.rubros, String(item.id)].sort() })}>{item.nombre}</button>
                      );
                    })}
                  </div>
                ) : <p className="text-xs text-muted">Todavía no hay categorías en el stock.</p>}
              </>
            )}
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-faint">Secciones de inicio</p>
              <p className="mb-2 text-[11px] text-muted">Se ven debajo de la portada, antes del catálogo. Un texto que escribas, o las prendas de una categoría de tu stock.</p>
              <div className="space-y-2">
                {(form.secciones || []).map((item, indice) => (
                  <div key={item.id} className="space-y-2 rounded-2xl border border-line p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-ink">{item.tipo === 'texto' ? 'Texto' : 'Productos'}</span>
                      <span className="flex gap-2 text-[11px] font-bold text-muted">
                        <button type="button" disabled={indice === 0} onClick={() => moverSeccion(indice, -1)}>Subir</button>
                        <button type="button" disabled={indice === (form.secciones || []).length - 1} onClick={() => moverSeccion(indice, 1)}>Bajar</button>
                        <button type="button" onClick={() => cambiar({ secciones: form.secciones.filter((seccion) => seccion.id !== item.id) })}>Quitar</button>
                      </span>
                    </div>
                    <input className={campo} maxLength={80} placeholder={item.tipo === 'texto' ? 'Título' : 'Título, si querés otro que el de la categoría'} value={item.titulo} onChange={(event) => editarSeccion(item.id, { titulo: event.target.value })} />
                    {item.tipo === 'texto' ? (
                      <textarea className={campo} maxLength={400} rows={3} placeholder="El texto de esta sección" value={item.texto} onChange={(event) => editarSeccion(item.id, { texto: event.target.value })} />
                    ) : (
                      <select className={campo} value={item.categoriaId} onChange={(event) => editarSeccion(item.id, { categoriaId: event.target.value })}>
                        <option value="">Elegí una categoría</option>
                        {rubros.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}
                      </select>
                    )}
                  </div>
                ))}
              </div>
              { (form.secciones || []).length < 6 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className="rounded-xl bg-sunken px-3 py-1.5 text-xs font-bold text-ink" onClick={() => agregarSeccion('texto')}>Agregar texto</button>
                  <button type="button" className="rounded-xl bg-sunken px-3 py-1.5 text-xs font-bold text-ink" disabled={!rubros.length} onClick={() => agregarSeccion('productos')}>Agregar productos</button>
                </div>
              )}
            </div>
          </Seccion>

          <Seccion id="tipo" visible={seccion === 'estilo'} titulo="Tipografía">
            <div className="grid gap-2 sm:grid-cols-2">
              {fuentes.map(([id, nombre, detalle, css]) => (
                <button key={id} type="button" className={`rounded-2xl border p-3 text-left ${form.fuente === id ? 'border-accent bg-accent-soft' : 'border-line'}`} onClick={() => cambiar({ fuente: id })}>
                  <span className="block text-lg text-ink" style={{ fontFamily: css }}>{nombre}</span>
                  <span className="text-[11px] text-muted">{detalle}</span>
                </button>
              ))}
            </div>
          </Seccion>
            </fieldset>
          </div>
          <div className="vidriera-edicion-pie">
            <div className="vidriera-opciones">
              {sucio && <button type="button" disabled={ocupado} onClick={() => {
                setForm(base);
                setAnticipada('');
                setAviso('');
                setError('');
              }}>Descartar cambios</button>}
              {!form.publicada && <button type="button" disabled={ocupado || !form.titulo.trim()} onClick={() => guardar(false)}>Guardar sin publicar</button>}
            </div>
            <div className="vidriera-publicar-compacto">{estadoCambios}{publicar}</div>
          </div>
        </section>
        <section className="vidriera-previa" aria-label="Vista previa">
          <div className="vidriera-previa-barra">
            <h2><Ojo />Vista previa</h2>
            <div className="vidriera-segmentos" role="group" aria-label="Ancho de la tienda">
              <button type="button" aria-pressed={dispositivo === 'escritorio'} onClick={() => setDispositivo('escritorio')}><Pantalla />Escritorio</button>
              <button type="button" aria-pressed={dispositivo === 'movil'} onClick={() => setDispositivo('movil')}><Celular />Celular</button>
            </div>
          </div>
          {aplicar}
          <VistaPrevia tienda={borrador} dispositivo={dispositivo} />
        </section>
      </div>
    </div>
  );
}

function Seccion({ id, titulo, visible, children }) {
  if (!visible) return null;
  return (
    <section id={id} className="space-y-3 rounded-xl border border-line bg-card p-4">
      <h2 className="text-base font-black text-ink">{titulo}</h2>
      {children}
    </section>
  );
}

function Campo({ etiqueta, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-faint">{etiqueta}</span>
      {children}
    </label>
  );
}

function Interruptor({ activo, onClick, children }) {
  return (
    <button type="button" role="switch" aria-checked={activo} className="flex items-center justify-between gap-3 rounded-xl bg-sunken px-3 py-2 text-left text-sm font-semibold text-ink" onClick={onClick}>
      {children}
      <span className={`relative h-6 w-11 rounded-full ${activo ? 'bg-fill' : 'bg-raise'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-card transition-all ${activo ? 'left-5' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

const campo = 'w-full rounded-xl border border-line bg-sunken px-3 py-2 text-sm text-ink outline-none focus:border-accent';

function VistaPrevia({ tienda, dispositivo }) {
  const marco = useRef(null);
  function actualizar() {
    marco.current?.contentWindow?.postMessage({ tipo: 'giro-vista-tienda', tienda }, window.location.origin);
  }

  useEffect(actualizar, [tienda]);

  return <iframe ref={marco} src={import.meta.env.BASE_URL + 'vista-tienda.html'} title="Vista previa interactiva de la tienda"
    className="vidriera-marco" data-dispositivo={dispositivo} onLoad={actualizar} />;
}

function useFotosPrivadas(productos, sinPublicar) {
  const [fotos, setFotos] = useState({});

  useEffect(() => {
    if (!sinPublicar) return;
    const controller = new AbortController();
    const urls = [];

    // Las fotos antiguas sin URL directa requieren autorización si la tienda no está publicada.
    for (const producto of productos) {
      const existentes = new Map((producto.fotos || []).map((foto) => [foto.id, foto.url]));
      for (const id of producto.imagenes || []) {
        if (existentes.get(id)) continue;
        pedir('/api/productos/' + producto.id + '/imagenes/' + id, { signal: controller.signal })
          .then((respuesta) => respuesta.ok ? respuesta.blob() : null)
          .then((blob) => {
            if (!blob || controller.signal.aborted) return;
            const url = URL.createObjectURL(blob);
            urls.push(url);
            setFotos((actuales) => ({ ...actuales, [id]: url }));
          })
          .catch(() => {});
      }
    }

    return () => {
      controller.abort();
      urls.forEach((url) => URL.revokeObjectURL(url));
      setFotos({});
    };
  }, [productos, sinPublicar]);

  return useMemo(() => {
    if (!sinPublicar) return productos;
    return productos.map((producto) => {
      const existentes = new Map((producto.fotos || []).map((foto) => [foto.id, foto.url]));
      if (!producto.imagenes?.some((id) => fotos[id])) return producto;
      return { ...producto, fotos: producto.imagenes.map((id) => ({ id, url: existentes.get(id) || fotos[id] })) };
    });
  }, [productos, sinPublicar, fotos]);
}

function Miniatura({ plantilla }) {
  const recorte = recortes[plantilla.id];
  if (recorte) {
    const [x, y] = recorte;
    return <span className="vidriera-miniatura" aria-hidden="true" style={{
      backgroundImage: 'url(' + referencias + ')',
      backgroundSize: (707 / 91 * 100) + '% ' + (445 / 102 * 100) + '%',
      backgroundPosition: (x / (707 - 91) * 100) + '% ' + (y / (445 - 102) * 100) + '%',
    }} />;
  }

  return (
    <span className="vidriera-miniatura vidriera-miniatura-esquema" aria-hidden="true"
      data-portada={plantilla.portada} data-catalogo={plantilla.catalogo}
      style={{ '--mini-papel': fondos.find(([id]) => id === plantilla.fondo)[2], '--mini-acento': plantilla.color }}>
      <span className="vidriera-miniatura-marca">{plantilla.ejemplo}</span>
      {plantilla.secciones[0] === 'busqueda' && <span className="vidriera-miniatura-buscar">Buscar productos</span>}
      <span className="vidriera-miniatura-portada"><b>{plantilla.ejemplo}</b><small>Ver productos</small></span>
      <span className="vidriera-miniatura-catalogo"><i /><i /><i /></span>
    </span>
  );
}

function estiloPlantilla(form, plantilla) {
  if (form.estiloPropio) return {};
  const { color, fondo, texto, fuente } = plantilla;
  return { color, fondo, texto, fuente };
}

function Ventana() {
  return <Icono><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18" /></Icono>;
}
function Imagen() {
  return <Icono><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="9" r="1.5" /><path d="m3 16 4-3 3 2 5-5 6 6" /></Icono>;
}
function Ojo() {
  return <Icono><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="2.5" /></Icono>;
}
function Pantalla() {
  return <Icono><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M12 17v4m-5 0h10" /></Icono>;
}
function Celular() {
  return <Icono><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></Icono>;
}
function Externo() {
  return <Icono><path d="M13 4h7v7m0-7-9 9m7 0v7H4V6h7" /></Icono>;
}

function claseForma(forma, grande) {
  if (forma === 'cuadrado') return 'rounded-none';
  if (forma === 'curvo') return grande ? 'rounded-2xl' : 'rounded-lg';
  return 'rounded-full';
}

function claseRubro(forma) {
  if (forma === 'recto') return 'rounded-none';
  if (forma === 'redondeado') return 'rounded-xl';
  return 'rounded-full';
}
