import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, token, urlApi, urlFoto, urlVidriera } from '../api.js';

const temas = [
  { id: 'giro', nombre: 'GIRO Violeta', detalle: 'Acentos violeta', nota: 'Firma GIRO', color: '#7c3aed', fondo: 'blanco', texto: 'oscuro', muestras: ['#7C3AED', '#4C1D95', '#EDE9FE', '#FFFFFF'] },
  { id: 'oscuro', nombre: 'Oscuro urbano', detalle: 'Grafito y blanco', nota: 'Nocturno', color: '#111827', fondo: 'oscuro', texto: 'claro', muestras: ['#111827', '#374151', '#F9FAFB', '#FFFFFF'] },
  { id: 'esmeralda', nombre: 'Esmeralda', detalle: 'Verde y menta', nota: 'Natural', color: '#059669', fondo: 'blanco', texto: 'oscuro', muestras: ['#059669', '#6EE7B7', '#ECFDF5', '#FFFFFF'] },
  { id: 'terracota', nombre: 'Terracota', detalle: 'Arcilla y crema', nota: 'Cálido', color: '#ea580c', fondo: 'calido', texto: 'oscuro', muestras: ['#EA580C', '#FDBA74', '#FFF7ED', '#FFFFFF'] },
  { id: 'pastel', nombre: 'Pastel', detalle: 'Rosa y lila', nota: 'Suave', color: '#db2777', fondo: 'calido', texto: 'oscuro', muestras: ['#DB2777', '#F9A8D4', '#FDF2F8', '#FFFFFF'] },
  { id: 'neon', nombre: 'Neón', detalle: 'Cian sobre noche', nota: 'Intenso', color: '#0284c7', fondo: 'oscuro', texto: 'claro', muestras: ['#0284C7', '#22D3EE', '#0F172A', '#082F49'] },
];
const fondos = [
  ['blanco', 'Blanco', '#FFFFFF'],
  ['gris', 'Gris tenue', '#F4F5F9'],
  ['calido', 'Cálido', '#FFF7ED'],
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
const anclas = [
  ['identidad', 'Identidad'],
  ['composicion', 'Vidriera'],
  ['paleta', 'Paleta y tema'],
  ['catalogo', 'Catálogo'],
  ['portada', 'Portada'],
  ['tipo', 'Tipografía'],
];

function normalizar(data) {
  const radio = Number(data?.radio);
  return {
    titulo: data?.titulo || '',
    descripcion: data?.descripcion || '',
    color: data?.color || '#7c3aed',
    publicada: data?.publicada !== false,
    tema: data?.tema || 'giro',
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

function pesos(valor) {
  return `$ ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(Number(valor) || 0))}`;
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
  const [dispositivo, setDispositivo] = useState('movil');
  const [subiendo, setSubiendo] = useState(false);
  const [rubros, setRubros] = useState([]);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      api('/api/vidriera'),
      api('/api/productos').catch(() => []),
      api('/api/categorias').catch(() => []),
    ]).then(([vidriera, catalogo, categorias]) => {
      if (!vivo) return;
      const siguiente = normalizar(vidriera);
      setForm(siguiente);
      setBase(siguiente);
      setProductos(catalogo.filter((item) => item.publicado && item.activo !== false));
      setRubros(Array.isArray(categorias) ? categorias : []);
    }).catch((err) => vivo && setError(err.message));
    return () => { vivo = false; };
  }, []);

  const sucio = form && base ? firma(form) !== firma(base) : false;

  function cambiar(parcial) {
    setForm((actual) => ({ ...actual, ...parcial }));
    setAviso('');
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
    const cuerpo = normalizar({ ...form, publicada: publicar ? true : form.publicada });
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/" className="text-xs font-bold text-accent">← Volver al inicio</Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-[22px] font-bold tracking-tight text-ink">Diseño y personalización de vidriera</h1>
            {sucio && <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />Cambios sin guardar</span>}
          </div>
          <p className="mt-0.5 max-w-xl text-xs text-muted">Identidad, ficha de marca, portada, pastillas y cómo se ven los productos en la tienda pública.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="rounded-xl border border-line bg-card px-3.5 py-2 text-xs font-bold text-muted hover:bg-sunken disabled:opacity-40" disabled={!sucio || guardando} onClick={() => { setForm(base); setAviso(''); }}>Descartar cambios</button>
          <button type="button" className="rounded-xl bg-fill px-4 py-2 text-xs font-bold text-onfill shadow-md shadow-fill/20 hover:bg-fill-hover disabled:opacity-60" disabled={guardando || !form.titulo.trim()} onClick={() => guardar(false)}>{guardando ? 'Guardando…' : form.publicada ? 'Guardar y publicar' : 'Guardar sin publicar'}</button>
        </div>
      </div>
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {aviso && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{aviso}</p>}

      <div className="grid items-start gap-4 xl:grid-cols-12">
        <div className={`space-y-4 ${dispositivo === 'tablet' ? 'xl:order-2 xl:col-span-12' : 'xl:col-span-7'}`}>
          <div className="sticky top-0 z-10 flex flex-wrap gap-1.5 rounded-2xl border border-line/80 bg-card/95 p-1.5 shadow-sm backdrop-blur">
            {anclas.map(([id, etiqueta]) => (
              <button key={id} type="button" className="rounded-xl px-3 py-1.5 text-xs font-bold text-muted hover:bg-accent-soft hover:text-accent" onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{etiqueta}</button>
            ))}
          </div>

          <Seccion id="identidad" paso="1" titulo="Identidad">
            <div className="flex items-center gap-3">
              <span className={`grid h-24 w-24 overflow-hidden text-2xl font-black text-white ${claseForma(form.logoForma, true)}`} style={{ background: form.color }}>
                {form.logoUrl ? <img src={form.logoUrl} alt="" className="h-full w-full object-cover" /> : iniciales(form.titulo)}
              </span>
              <div className="space-y-2">
                <p className="max-w-xs text-xs text-muted">Este logo es el avatar del header y de la tienda. Si no subís uno, se usan las iniciales del nombre.</p>
                <div className="flex flex-wrap items-center gap-2">
                  <label className={`rounded-xl bg-fill px-3 py-1.5 text-xs font-bold text-white ${subiendo ? 'opacity-60' : 'cursor-pointer'}`}>
                    {subiendo ? 'Subiendo…' : 'Subir logo'}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={subiendo} onChange={subirLogo} />
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

          <Seccion id="composicion" paso="2" titulo="Vidriera">
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

          <Seccion id="paleta" paso="3" titulo="Paleta y tema">
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
                Color {form.color.toUpperCase()}
              </label>
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

          <Seccion id="catalogo" paso="4" titulo="Catálogo">
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

          <Seccion id="portada" paso="5" titulo="Portada">
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
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={subiendo || form.portadas.length >= 8} onChange={subirPortada} />
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

          <Seccion id="tipo" paso="6" titulo="Tipografía">
            <div className="grid gap-2 sm:grid-cols-2">
              {fuentes.map(([id, nombre, detalle, css]) => (
                <button key={id} type="button" className={`rounded-2xl border p-3 text-left ${form.fuente === id ? 'border-accent bg-accent-soft' : 'border-line'}`} onClick={() => cambiar({ fuente: id })}>
                  <span className="block text-lg text-ink" style={{ fontFamily: css }}>{nombre}</span>
                  <span className="text-[11px] text-muted">{detalle}</span>
                </button>
              ))}
            </div>
          </Seccion>
        </div>

        <Preview form={form} productos={productos} rubros={rubros} dispositivo={dispositivo} onDispositivo={setDispositivo} />
      </div>
    </div>
  );
}

function Seccion({ id, paso, titulo, children }) {
  return (
    <section id={id} className="scroll-mt-16 space-y-3 rounded-2xl border border-line/90 bg-card p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wider text-accent">Paso {paso} de 6</p>
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
    <button type="button" className="flex items-center justify-between gap-3 rounded-xl bg-sunken px-3 py-2 text-left text-sm font-semibold text-ink" onClick={onClick}>
      {children}
      <span className={`relative h-6 w-11 rounded-full ${activo ? 'bg-fill' : 'bg-raise'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-card transition-all ${activo ? 'left-5' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

const campo = 'w-full rounded-xl border border-line bg-sunken px-3 py-2 text-sm text-ink outline-none focus:border-accent';

function Preview({ form, productos, rubros, dispositivo, onDispositivo }) {
  const [buscar, setBuscar] = useState('');
  const [categoria, setCategoria] = useState('Todas');
  const [publico, setPublico] = useState('');
  const [soloSinMarca, setSoloSinMarca] = useState(false);
  const [pagina, setPagina] = useState('inicio');
  const [ficha, setFicha] = useState(null);
  const [abierto, setAbierto] = useState(false);
  const movil = dispositivo === 'movil';
  const css = fuentes.find((item) => item[0] === form.fuente)?.[3] || 'Inter, sans-serif';
  const fondo = fondos.find((item) => item[0] === form.fondo)?.[2] || '#FFFFFF';
  const tinta = form.texto === 'claro' ? '#F8FAFC' : '#0F172A';
  const suave = form.texto === 'claro' ? 'rgba(248,250,252,0.72)' : '#64748B';
  const lugar = [form.localidad, form.partido].filter(Boolean).join(', ');
  const enlace = form.slug ? urlVidriera(form.slug) : '';
  const visibles = productos.filter((item) => {
    const texto = buscar.trim().toLowerCase();
    const entra = !texto || `${item.nombre} ${item.sku || ''}`.toLowerCase().includes(texto);
    if (!entra) return false;
    if (pagina === 'carrito') return true;
    if (publico && item.publico !== publico) return false;
    if (soloSinMarca && item.publico) return false;
    return categoria === 'Todas' || item.categoria === categoria;
  }).slice(0, movil ? 4 : 6);
  const destacados = form.mostrarRubros ? (form.rubros || []).map((id) => rubros.find((item) => String(item.id) === String(id))).filter(Boolean) : [];
  const oscuro = form.texto === 'claro';
  const superficie = oscuro ? 'rgba(255,255,255,0.06)' : '#FFFFFF';
  const precio = colorLegible(form.color, oscuro);
  const borde = oscuro ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.08)';

  async function copiar() {
    if (!enlace) return;
    await navigator.clipboard.writeText(enlace);
  }

  return (
    <aside className={`space-y-3 rounded-2xl border border-line/90 bg-card p-4 shadow-sm ${dispositivo === 'tablet' ? 'xl:order-1 xl:col-span-12' : 'xl:sticky xl:top-0 xl:col-span-5'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-black text-ink"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />Vista previa</h2>
        <div className="flex rounded-xl bg-sunken p-1">
          {[['movil', 'Móvil'], ['tablet', 'Tablet']].map(([id, etiqueta]) => (
            <button key={id} type="button" className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${dispositivo === id ? 'bg-card text-ink shadow-sm' : 'text-muted'}`} onClick={() => onDispositivo(id)}>{etiqueta}</button>
          ))}
        </div>
        {enlace && <a className="text-xs font-bold text-accent" href={enlace} target="_blank" rel="noreferrer">Abrir</a>}
      </div>

      <div className={`mx-auto overflow-hidden shadow-xl transition-all duration-300 ${movil ? 'w-[300px] rounded-[28px]' : 'w-full'}`} style={{ background: fondo, color: tinta, fontFamily: css }}>
        {form.marquesina && <p className="truncate px-3 py-1.5 text-center text-[10px] font-semibold tracking-wide text-white" style={{ background: form.color }}>{form.marquesina}</p>}
        <BarraMenu form={form} detalle={form.estado || lugar} productos={productos} tinta={tinta} suave={suave} borde={borde} movil={movil} pagina={pagina} categoria={categoria} publico={publico} onPagina={(id) => { setFicha(null); setPagina(id); }} onCategoria={setCategoria} onPublico={setPublico} onSinMarca={setSoloSinMarca} abierto={abierto} onAbierto={setAbierto} />
        {ficha && <DetalleMini amplia={!movil} item={ficha} form={form} productos={productos} tinta={tinta} suave={suave} borde={borde} precio={precio} oscuro={oscuro} onVolver={() => setFicha(null)} onAbrir={setFicha} />}
        {!ficha && pagina === 'productos' && (
          <div className="mx-3 mt-2 flex items-center gap-1.5 rounded-full border px-2.5 py-1.5" style={{ borderColor: borde, background: oscuro ? 'rgba(255,255,255,0.06)' : '#fff' }}>
            <LupaMini />
            <input className="w-full bg-transparent text-[11px] outline-none" style={{ color: tinta }} placeholder={form.buscar || 'Buscar en la tienda'} value={buscar} onChange={(event) => setBuscar(event.target.value)} />
          </div>
        )}
        {!ficha && pagina === 'inicio' && (
          <div className={movil ? '' : 'grid grid-cols-[minmax(210px,280px)_1fr] items-start gap-x-3 px-3 pt-2'}>
            <div className={`${movil ? 'mx-3 mt-2' : 'col-start-1'} flex items-center gap-1.5 rounded-full border px-2.5 py-1.5`} style={{ borderColor: borde, background: oscuro ? 'rgba(255,255,255,0.06)' : '#fff' }}>
              <LupaMini />
              <input className="w-full bg-transparent text-[11px] outline-none" style={{ color: tinta }} placeholder={form.buscar || 'Buscar en la tienda'} value={buscar} onChange={(event) => setBuscar(event.target.value)} />
            </div>
            <div className={movil ? '' : 'col-start-1'}><FichaMini form={form} tinta={tinta} suave={suave} lugar={lugar} oscuro={oscuro} /></div>
            <Portada form={form} tinta={tinta} suave={suave} amplia={!movil} />
            {destacados.length > 0 && (
          form.rubroForma === 'pastilla' ? (
            <div className={movil ? 'px-3 pt-3' : 'col-start-1 pt-3'}>
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <p className="text-[11px] font-black" style={{ color: tinta }}>{form.explorar || 'Explorar'}</p>
                <p className="text-[9px]" style={{ color: suave }}>{destacados.length} categorías</p>
              </div>
              <div className="flex gap-1.5 overflow-x-auto">
                <button type="button" className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold" style={pastillaPreview(categoria === 'Todas', form)} onClick={() => { setPagina('inicio'); setCategoria('Todas'); setPublico(''); setSoloSinMarca(false); }}>Todas</button>
                {destacados.map((item) => (
                  <button key={item.id} type="button" className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold" style={pastillaPreview(categoria === item.nombre, form)} onClick={() => { setPagina('inicio'); setCategoria(item.nombre); setPublico(''); setSoloSinMarca(false); }}>{item.nombre}</button>
                ))}
              </div>
            </div>
          ) : (
            <div className={`flex flex-wrap justify-center gap-4 py-3 ${movil ? 'px-3' : 'col-start-1'}`}>
              {destacados.map((item) => (
                <button key={item.id} type="button" className="flex w-20 flex-col items-center gap-1.5 text-center text-[11px] font-medium tracking-wide" style={{ color: tinta, fontFamily: css }} onClick={() => { setPagina('inicio'); setCategoria(item.nombre); setPublico(''); setSoloSinMarca(false); }}>
                  <IconoRubro nombre={item.nombre} color={form.rubroColor || form.color} forma={form.rubroForma} />
                  {item.nombre}
                </button>
              ))}
            </div>
          )
        )}
            {form.aviso && (
          <p className={`mt-2 flex items-start gap-1.5 text-[10px] ${movil ? 'mx-3' : 'col-start-1'}`} style={{ color: suave }}>
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: form.color }} />
            {form.aviso}
          </p>
            )}
          </div>
        )}
        {!ficha && pagina === 'inicio' && (form.secciones || []).map((seccion) => {
          if (seccion.tipo === 'texto') {
            if (!seccion.titulo && !seccion.texto) return null;
            return (
              <div key={seccion.id} className="px-3 pt-3">
                {seccion.titulo && <p className="text-sm font-black" style={{ color: tinta }}>{seccion.titulo}</p>}
                {seccion.texto && <p className="text-[11px]" style={{ color: suave }}>{seccion.texto}</p>}
              </div>
            );
          }
          const categoria = rubros.find((item) => String(item.id) === String(seccion.categoriaId));
          const prendas = categoria ? productos.filter((item) => item.categoria === categoria.nombre).slice(0, 4) : [];
          if (!categoria) return null;
          return (
            <div key={seccion.id} className="px-3 pt-3">
              <p className="mb-2 text-sm font-black" style={{ color: tinta }}>{seccion.titulo || categoria.nombre}</p>
              {prendas.length === 0 ? <p className="text-[11px]" style={{ color: suave }}>No hay prendas publicadas en esta categoría.</p> : (
                <div className={`grid gap-2.5 ${movil ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {prendas.map((item) => <Tarjeta key={item.id} item={item} form={form} tinta={tinta} suave={suave} superficie={superficie} precioColor={precio} borde={borde} onAbrir={() => setFicha(item)} />)}
                </div>
              )}
            </div>
          );
        })}
        {!ficha && <div className="space-y-3 px-3 py-3">
          {pagina === 'carrito' ? (
            <CarritoMini amplia={!movil} form={form} productos={productos} tinta={tinta} suave={suave} borde={borde} precio={precio} oscuro={oscuro} onAbrir={setFicha} />
          ) : visibles.length === 0 ? (
            <p className="rounded-xl px-3 py-6 text-center text-xs" style={{ color: suave }}>No hay prendas publicadas para esta búsqueda.</p>
          ) : (
            <div className={form.catalogo === 'lista' ? 'space-y-2' : `grid gap-2.5 ${movil ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {visibles.map((item) => <Tarjeta key={item.id} item={item} form={form} tinta={tinta} suave={suave} superficie={superficie} precioColor={precio} borde={borde} onAbrir={() => setFicha(item)} />)}
            </div>
          )}
        </div>}
      </div>

      {enlace && (
        <div className="rounded-2xl bg-accent-soft p-3">
          <p className="text-xs font-bold text-accent">Enlace de la tienda</p>
          <p className="mt-1 break-all text-[11px] text-muted">{enlace}</p>
          <button type="button" className="mt-2 text-xs font-bold text-accent" onClick={copiar}>Copiar enlace</button>
        </div>
      )}
    </aside>
  );
}

function BolsaMini() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M6 8h12l-1 12H7L6 8z" />
      <path d="M9 8V7a3 3 0 0 1 6 0v1" />
    </svg>
  );
}

function claseForma(forma, grande) {
  if (forma === 'cuadrado') return 'rounded-none';
  if (forma === 'curvo') return grande ? 'rounded-2xl' : 'rounded-lg';
  return 'rounded-full';
}

function Avatar({ logo, nombre, color, forma, chico }) {
  const medida = chico ? 'h-6 w-6 text-[9px]' : 'h-7 w-7 text-[10px]';
  const radio = claseForma(forma);
  if (logo) return <img src={logo} alt="" className={`${medida} shrink-0 object-cover ${radio}`} />;
  return <span className={`grid ${medida} shrink-0 place-items-center font-black text-white ${radio}`} style={{ background: color }}>{iniciales(nombre)}</span>;
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

function BarraMenu({ form, detalle, productos, tinta, suave, borde, movil, pagina, categoria, publico, onPagina, onCategoria, onPublico, onSinMarca, abierto, onAbierto }) {
  const modo = form.menu || 'lados';
  const menu = menuPublico(productos);
  const paginas = [['inicio', 'Inicio'], ['productos', 'Productos'], ['carrito', 'Carrito']];
  const ir = (id, filtro) => {
    onPagina(id);
    onAbierto(false);
    onCategoria(filtro?.categoria || 'Todas');
    onPublico(filtro?.publico || '');
    onSinMarca(Boolean(filtro?.soloSinMarca));
  };
  const links = (
    <span className={`items-center gap-2 ${movil ? 'hidden' : 'flex'}`}>
      {paginas.map(([id, etiqueta]) => (
        <button key={id} type="button" className="text-[11px] font-bold" style={{ color: pagina === id && !publico ? form.color : tinta }} onClick={() => ir(id)}>{etiqueta}</button>
      ))}
      {menu.hombre.length > 0 && <button type="button" className="text-[11px] font-bold" style={{ color: publico === 'hombre' ? form.color : tinta }} onClick={() => ir('productos', { publico: 'hombre' })}>Hombre</button>}
      {menu.mujer.length > 0 && <button type="button" className="text-[11px] font-bold" style={{ color: publico === 'mujer' ? form.color : tinta }} onClick={() => ir('productos', { publico: 'mujer' })}>Mujer</button>}
      {menu.sueltos.map((item) => (
        <button key={item} type="button" className="text-[11px] font-bold" style={{ color: categoria === item && !publico ? form.color : tinta }} onClick={() => ir('productos', { categoria: item, soloSinMarca: true })}>{item}</button>
      ))}
    </span>
  );
  const nombre = (
    <span className="min-w-0">
      <span className="block truncate text-xs font-black leading-tight">{form.titulo || 'Sin nombre'}</span>
      {detalle && <span className="block truncate text-[9px] font-semibold" style={{ color: suave }}>{detalle}</span>}
    </span>
  );
  const marca = (
    <span className="flex min-w-0 items-center gap-1.5">
      <Avatar logo={form.logoUrl} nombre={form.titulo} color={form.color} forma={form.logoForma} />
      {modo !== 'esquinas' && nombre}
    </span>
  );
  const bolsa = <button type="button" aria-label="Carrito" className="grid h-7 w-7 place-items-center" style={{ color: tinta }} onClick={() => ir('carrito')}><BolsaMini /></button>;
  const burger = movil && (
    <button type="button" className="grid h-7 w-7 place-items-center rounded-lg border text-sm" style={{ borderColor: borde, color: tinta }} aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'} onClick={() => onAbierto(!abierto)}>{abierto ? '×' : '☰'}</button>
  );
  let barra;
  if (modo === 'centro') barra = <div className="flex flex-wrap items-center justify-center gap-2 px-2 py-2">{burger}{marca}{links}{bolsa}</div>;
  else if (modo === 'esquinas') {
    barra = (
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-2 py-2">
        <span className="flex items-center gap-1">{burger}<Avatar logo={form.logoUrl} nombre={form.titulo} color={form.color} forma={form.logoForma} /></span>
        <span className="min-w-0 text-center">{nombre}</span>
        <span className="flex items-center gap-2">{links}{bolsa}</span>
      </div>
    );
  } else barra = <div className="flex items-center justify-between gap-2 px-2 py-2">{burger}{marca}<span className="flex items-center gap-2">{links}{bolsa}</span></div>;
  return (
    <div className="border-b" style={{ borderColor: borde }}>
      {barra}
      {movil && abierto && (
        <div className="space-y-1 px-3 pb-3">
          {paginas.map(([id, etiqueta]) => (
            <button key={id} type="button" className="block w-full py-1 text-left text-xs font-bold" style={{ color: pagina === id && !publico ? form.color : tinta }} onClick={() => ir(id)}>{etiqueta}</button>
          ))}
          {menu.hombre.length > 0 && (
            <details className="pt-1">
              <summary className="cursor-pointer text-xs font-bold" style={{ color: publico === 'hombre' ? form.color : tinta }}>Hombre</summary>
              <button type="button" className="block py-1 pl-3 text-left text-[11px]" style={{ color: tinta }} onClick={() => ir('productos', { publico: 'hombre' })}>Todo hombre</button>
              {menu.hombre.map((item) => <button key={item} type="button" className="block py-1 pl-3 text-left text-[11px]" style={{ color: tinta }} onClick={() => ir('productos', { categoria: item, publico: 'hombre' })}>{item}</button>)}
            </details>
          )}
          {menu.mujer.length > 0 && (
            <details className="pt-1">
              <summary className="cursor-pointer text-xs font-bold" style={{ color: publico === 'mujer' ? form.color : tinta }}>Mujer</summary>
              <button type="button" className="block py-1 pl-3 text-left text-[11px]" style={{ color: tinta }} onClick={() => ir('productos', { publico: 'mujer' })}>Todo mujer</button>
              {menu.mujer.map((item) => <button key={item} type="button" className="block py-1 pl-3 text-left text-[11px]" style={{ color: tinta }} onClick={() => ir('productos', { categoria: item, publico: 'mujer' })}>{item}</button>)}
            </details>
          )}
          {menu.sueltos.map((item) => (
            <button key={item} type="button" className="block w-full py-1 text-left text-xs font-bold" style={{ color: tinta }} onClick={() => ir('productos', { categoria: item, soloSinMarca: true })}>{item}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function claseRubro(forma) {
  if (forma === 'recto') return 'rounded-none';
  if (forma === 'redondeado') return 'rounded-xl';
  return 'rounded-full';
}

function IconoRubro({ nombre, color, forma }) {
  return (
    <span className={`grid h-10 w-10 place-items-center ${claseRubro(forma)}`} style={{ background: `${color}22`, color }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
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

function LupaMini() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function pastillaPreview(activa, form) {
  return {
    background: activa ? form.color : `color-mix(in srgb, ${form.color} 14%, transparent)`,
    color: activa ? '#fff' : 'inherit',
  };
}

function FichaMini({ form, tinta, suave, lugar, oscuro }) {
  if (!form.descripcion && !form.sello && !form.etiqueta) return null;
  const fondo = `color-mix(in srgb, ${form.color} ${oscuro ? '24%' : '12%'}, ${oscuro ? '#111827' : '#ffffff'})`;
  const segunda = form.estado && lugar ? lugar : '';
  return (
    <section className="mx-3 mt-2 rounded-2xl p-2.5" style={{ background: fondo, color: tinta }}>
      <div className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <Avatar logo={form.logoUrl} nombre={form.titulo} color={form.color} forma={form.logoForma} chico />
          <span className="min-w-0">
            <span className="block truncate text-[10px] font-black uppercase tracking-wide">{form.titulo || 'Tu vidriera'}</span>
            <span className="mt-1 flex flex-wrap gap-1">
              {form.etiqueta && <span className="rounded-full px-1.5 py-0.5 text-[8px] font-bold" style={{ background: `color-mix(in srgb, ${form.color} 18%, transparent)` }}>{form.etiqueta}</span>}
              {segunda && <span className="rounded-full px-1.5 py-0.5 text-[8px] font-bold" style={{ background: `color-mix(in srgb, ${form.color} 18%, transparent)` }}>{segunda}</span>}
            </span>
          </span>
        </span>
        {form.sello && <span className="shrink-0 rounded-full px-1.5 py-1 text-[8px] font-bold text-white" style={{ background: form.color }}>{form.sello}</span>}
      </div>
      {form.descripcion && <p className="mt-1.5 text-[10px] leading-snug" style={{ color: suave }}>{form.descripcion}</p>}
    </section>
  );
}

function CopiaPortada({ form, clara }) {
  if (!form.heroEtiqueta && !form.heroTitulo && !form.heroTexto && !form.heroCta) return null;
  return (
    <div className={`absolute inset-0 flex flex-col justify-end p-3 ${clara ? 'bg-gradient-to-t from-black/75 via-black/25 to-black/10 text-white' : ''}`}>
      {form.heroEtiqueta && <span className="mb-1 w-fit rounded-full bg-white/20 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider">{form.heroEtiqueta}</span>}
      {form.heroTitulo && <p className="text-[13px] font-black leading-tight">{form.heroTitulo}</p>}
      {form.heroTexto && <p className="text-[9px] leading-snug text-white/80">{form.heroTexto}</p>}
      {form.heroCta && <span className="mt-1.5 w-fit rounded-full bg-white px-2 py-0.5 text-[9px] font-bold text-black">{form.heroCta} →</span>}
    </div>
  );
}

function Portada({ form, tinta, suave, amplia }) {
  if (form.hero === 'ninguno') return null;
  const radio = Math.max(Number(form.radio) || 0, 16);
  const esFoto = form.hero === 'foto' && form.portadaUrl;
  if (form.hero === 'tipografico') {
    return (
      <div className={amplia ? 'col-start-2 row-start-1 row-span-4' : 'mx-3 mt-3'}>
        {form.heroEtiqueta && <p className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: suave }}>{form.heroEtiqueta}</p>}
        <p className="text-base font-black leading-tight" style={{ color: tinta }}>{form.heroTitulo || form.titulo || 'Tu vidriera'}</p>
        {form.heroTexto && <p className="text-[10px]" style={{ color: suave }}>{form.heroTexto}</p>}
      </div>
    );
  }
  if (form.hero === 'foto' && !esFoto) {
    return <p className={`px-4 py-8 text-center text-[11px] ${amplia ? 'col-start-2 row-start-1 row-span-4' : ''}`} style={{ color: suave }}>Elegí una foto para la portada.</p>;
  }
  const fotos = form.portadas?.length ? form.portadas : [form.portadaUrl];
  return (
    <div className={amplia ? 'relative col-start-2 row-start-1 row-span-4 h-full min-h-56 overflow-hidden' : 'relative mx-3 mt-3 h-36 overflow-hidden'} style={{ borderRadius: radio, background: `linear-gradient(145deg, ${form.color}, #1e1b4b)` }}>
      {esFoto && <img src={fotos[0]} alt="" className="h-full w-full object-cover" />}
      <CopiaPortada form={form} clara />
    </div>
  );
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

function DetalleMini({ amplia, item, form, productos, tinta, suave, borde, precio, oscuro, onVolver, onAbrir }) {
  const valor = Number(item.precioVigente ?? item.precio) || 0;
  const variantes = item.usaVariantes ? (item.variantes || []).slice(0, 6) : [];
  const foto = urlFoto(item);
  const otros = productos.filter((otro) => otro.id !== item.id && otro.categoria && otro.categoria === item.categoria).slice(0, amplia ? 4 : 2);
  const radio = Math.max(Number(form.radio) || 0, 14);
  return (
    <div className={amplia ? 'grid grid-cols-2 items-start gap-4 px-4 py-3' : 'px-3 pb-3 pt-2'}>
      <div className={`relative overflow-hidden ${amplia ? 'h-72' : 'h-36'}`} style={{ borderRadius: radio, border: `1px solid ${borde}`, background: oscuro ? 'rgba(255,255,255,0.06)' : '#fff' }}>
        {foto ? <img src={foto} alt="" className="h-full w-full object-cover" /> : <FotoBlob id={item.id} imagen={item.imagenes?.[0]} nombre={item.nombre} />}
        <button type="button" className="absolute left-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-white text-[11px] font-black text-black" onClick={onVolver} aria-label="Volver">←</button>
      </div>
      <div>
        {item.categoria && <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: form.color }}>{item.categoria}</p>}
        <p className="text-sm font-black leading-tight" style={{ color: tinta }}>{item.nombre}</p>
        {item.sku && <p className="text-[10px]" style={{ color: suave }}>{item.sku}</p>}
        <p className="mt-1 text-base font-black" style={{ color: precio }}>{pesos(valor)}</p>
        {form.cuotas && valor > 0 && <p className="text-[10px]" style={{ color: suave }}>3 x {pesos(valor / 3)} s/int</p>}
        {variantes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {variantes.map((opcion, indice) => (
              <span key={opcion.id || opcion.nombre} className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: indice === 0 ? form.color : 'transparent', color: indice === 0 ? '#fff' : tinta, border: indice === 0 ? 'none' : `1px solid ${borde}` }}>{opcion.nombre}</span>
            ))}
          </div>
        )}
        <p className="mt-2 text-[10px] font-bold" style={{ color: Number(item.stock) <= 0 ? suave : tinta }}>{Number(item.stock) <= 0 ? 'Agotado' : 'En stock'}</p>
        <p className="mt-2 rounded-full py-1.5 text-center text-[11px] font-black text-white" style={{ background: Number(item.stock) <= 0 ? '#94a3b8' : form.color }}>{Number(item.stock) <= 0 ? 'Sin stock' : `Agregar · ${pesos(valor)}`}</p>
      </div>
      {otros.length > 0 && (
        <div className={amplia ? 'col-span-2' : 'mt-3'}>
          <p className="mb-1.5 text-[11px] font-black" style={{ color: tinta }}>También en {item.categoria}</p>
          <div className={`grid gap-2 ${amplia ? 'grid-cols-4' : 'grid-cols-2'}`}>
            {otros.map((otro) => <Tarjeta key={otro.id} item={otro} form={form} tinta={tinta} suave={suave} superficie="transparent" precioColor={precio} borde={borde} onAbrir={() => onAbrir(otro)} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function CarritoMini({ amplia, form, productos, tinta, suave, borde, precio, oscuro, onAbrir }) {
  const muestra = productos.slice(0, 2);
  const radio = Math.max(Number(form.radio) || 0, 12);
  if (!muestra.length) {
    return (
      <div className="px-2 py-6 text-center">
        <p className="text-sm font-black" style={{ color: tinta }}>El carrito está vacío</p>
        <p className="mt-1 text-[11px]" style={{ color: suave }}>Cuando alguien agrega un producto, lo ve así.</p>
      </div>
    );
  }
  const lineas = muestra.map((item, indice) => ({ item, cantidad: indice + 1, valor: Number(item.precioVigente ?? item.precio) || 0 }));
  const total = lineas.reduce((suma, linea) => suma + linea.valor * linea.cantidad, 0);
  return (
    <div className={amplia ? 'grid grid-cols-[minmax(0,1.4fr)_minmax(180px,0.7fr)] items-start gap-4' : ''}>
      <div className={`mb-2 flex items-baseline justify-between ${amplia ? 'col-span-2 mb-0' : ''}`}>
        <p className="text-sm font-black" style={{ color: tinta }}>Carrito</p>
        <p className="text-[10px]" style={{ color: suave }}>Ejemplo</p>
      </div>
      <div className="space-y-2">
        {lineas.map(({ item, cantidad, valor }) => (
          <button key={item.id} type="button" className="grid w-full grid-cols-[52px_1fr] items-center gap-2 text-left" onClick={() => onAbrir(item)}>
            <span className="block h-[52px] overflow-hidden bg-black/5" style={{ borderRadius: radio, border: `1px solid ${borde}` }}>
              {urlFoto(item) ? <img src={urlFoto(item)} alt="" className="h-full w-full object-cover" /> : <FotoBlob id={item.id} imagen={item.imagenes?.[0]} nombre={item.nombre} />}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[11px] font-bold" style={{ color: tinta }}>{item.nombre}</span>
              <span className="mt-1 flex items-center justify-between gap-1">
                <span className="rounded-full px-1.5 text-[10px] font-bold" style={{ border: `1px solid ${borde}`, color: tinta }}>{cantidad}</span>
                <span className="text-[12px] font-black" style={{ color: precio }}>{pesos(valor * cantidad)}</span>
              </span>
            </span>
          </button>
        ))}
      </div>
      <div className={`rounded-2xl p-2.5 ${amplia ? '' : 'mt-2'}`} style={{ background: `color-mix(in srgb, ${form.color} ${oscuro ? '24%' : '12%'}, ${oscuro ? '#111827' : '#fff'})` }}>
        <p className="flex justify-between text-[10px]" style={{ color: suave }}><span>Subtotal</span><span>{pesos(total)}</span></p>
        {form.cuotas && <p className="mt-0.5 text-[10px]" style={{ color: suave }}>o 3 cuotas de {pesos(total / 3)}</p>}
        <p className="mt-1 flex justify-between text-xs font-black" style={{ color: tinta }}><span>Total</span><span style={{ color: precio }}>{pesos(total)}</span></p>
      </div>
    </div>
  );
}

function Tarjeta({ item, form, tinta, suave, superficie, precioColor, borde, onAbrir }) {
  const precio = Number(item.precioVigente ?? item.precio) || 0;
  const horizontal = form.catalogo === 'lista';
  const agotado = Number(item.stock) <= 0;
  const foto = urlFoto(item);
  const placa = form.texto === 'claro' ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.92)';
  const placaTexto = form.texto === 'claro' ? '#fff' : '#0F172A';
  return (
    <article className={horizontal ? 'flex gap-2' : ''} onClick={onAbrir} style={{ background: 'transparent', borderRadius: form.radio, cursor: onAbrir ? 'pointer' : 'default' }}>
      <span className={`relative block overflow-hidden bg-black/5 ${horizontal ? 'h-20 w-20 shrink-0' : 'aspect-square w-full'}`} style={{ borderRadius: form.radio, border: `1px solid ${borde}` }}>
        {foto ? <img src={foto} alt="" className="h-full w-full object-cover" /> : <FotoBlob id={item.id} imagen={item.imagenes?.[0]} nombre={item.nombre} />}
        {item.categoria && !agotado && <span className="absolute left-1.5 top-1.5 max-w-[80%] truncate rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide" style={{ background: placa, color: placaTexto }}>{item.categoria}</span>}
        {agotado && <span className="absolute left-1.5 top-1.5 rounded-full bg-black/75 px-1.5 py-0.5 text-[9px] font-bold text-white">Agotado</span>}
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center px-0.5 py-1.5">
        <span className="line-clamp-2 text-[11px] font-semibold leading-snug" style={{ color: tinta }}>{item.nombre}</span>
        {item.sku && <span className="truncate text-[9px]" style={{ color: suave }}>{item.sku}</span>}
        <span className="mt-0.5 text-[13px] font-black" style={{ color: precioColor }}>{pesos(precio)}</span>
        {form.cuotas && precio > 0 && <span className="text-[9px]" style={{ color: suave }}>3 x {pesos(precio / 3)} s/int</span>}
      </span>
    </article>
  );
}

function FotoBlob({ id, imagen, nombre }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!imagen) return undefined;
    let vivo = true;
    let objeto = '';
    fetch(urlApi(`/api/productos/${id}/imagenes/${imagen}`), { headers: token() ? { Authorization: `Bearer ${token()}` } : {} })
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
  }, [id, imagen]);
  if (!url) return <span className="grid h-full w-full place-items-center text-xs font-black text-faint">{(nombre || '?').slice(0, 1)}</span>;
  return <img src={url} alt="" className="h-full w-full object-cover" />;
}
