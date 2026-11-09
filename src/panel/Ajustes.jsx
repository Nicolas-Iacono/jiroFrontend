import { useEffect, useMemo, useState } from 'react';
import { api, guardarSesion, sesion } from '../api.js';
import { provincias } from '../provincias.js';
import { DETALLES, RUBROS } from './detalles.jsx';
import { abrirAltaMeta, prepararMeta } from './metaWhatsapp.js';

const vacio = {
  nombre: '',
  calle: '',
  altura: '',
  localidad: '',
  partido: '',
  provincia: '',
  codigoPostal: '',
  canal: 'FISICA',
  rubros: [],
  rubroNuevo: '',
  oferta: 'PRODUCTOS',
  detalles: [],
  mpTitular: '',
  mpAlias: '',
  mpCvu: '',
  mpCbu: '',
  waPhoneNumberId: '',
  waWabaId: '',
  waAccessToken: '',
  waSaludo: '',
  waActivo: false,
  waTokenEnmascarado: '',
  waNumero: '',
  waNombre: '',
  waConectado: false,
  waEstado: 'DESCONECTADO',
  waTipo: '',
  waHistorial: '',
  waAviso: '',
  webhookUrl: '',
  webhookRuta: '/api/public/whatsapp',
  metaAppId: '',
  metaConfigId: '',
  mensajeTransferencia: '',
};

function valor(datos, clave) {
  return (event) => ({ ...datos, [clave]: event.target.value });
}

export default function Ajustes() {
  const [datos, setDatos] = useState(vacio);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [notaWa, setNotaWa] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [listo, setListo] = useState(false);
  const [metaListo, setMetaListo] = useState(false);
  const [fase, setFase] = useState('');

  useEffect(() => {
    let vivo = true;
    api('/api/ajustes').then((ajuste) => {
      if (!vivo) return;
      const guardados = Array.isArray(ajuste.rubros) ? ajuste.rubros : [];
      setDatos({
        ...vacio,
        ...ajuste,
        calle: ajuste.calle || '',
        altura: ajuste.altura || '',
        localidad: ajuste.localidad || '',
        partido: ajuste.partido || '',
        provincia: ajuste.provincia || '',
        codigoPostal: ajuste.codigoPostal || '',
        rubros: guardados,
        rubroNuevo: '',
        detalles: ajuste.detalles || [],
        mpTitular: ajuste.mpTitular || '',
        mpAlias: ajuste.mpAlias || '',
        mpCvu: ajuste.mpCvu || '',
        mpCbu: ajuste.mpCbu || '',
        waPhoneNumberId: ajuste.waPhoneNumberId || '',
        waWabaId: ajuste.waWabaId || '',
        waAccessToken: '',
        waSaludo: ajuste.waSaludo || '',
        waTokenEnmascarado: ajuste.waTokenEnmascarado || '',
        waNumero: ajuste.waNumero || '',
        mensajeTransferencia: ajuste.mensajeTransferencia || '',
      });
      setListo(true);
    }).catch((err) => vivo && setError(err.message));
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    if (!datos.metaAppId) return undefined;
    let vivo = true;
    prepararMeta(datos.metaAppId).then((ok) => { if (vivo) setMetaListo(ok); });
    return () => { vivo = false; };
  }, [datos.metaAppId]);

  const estadoWa = fase || datos.waEstado || (datos.waConectado ? 'CONECTADO' : 'DESCONECTADO');
  const vendeProductos = datos.oferta !== 'SERVICIOS';
  const rubrosPropios = datos.rubros.filter((id) => !RUBROS.some(([preset]) => preset === id));
  const mensaje = useMemo(() => armarTransferencia(datos), [datos]);

  function set(clave) {
    return (event) => setDatos((actual) => valor(actual, clave)(event));
  }

  function alternarRubro(id) {
    setDatos((actual) => {
      if (actual.rubros.some((item) => item.toLowerCase() === id.toLowerCase())) {
        return { ...actual, rubros: actual.rubros.filter((item) => item.toLowerCase() !== id.toLowerCase()) };
      }
      const sugerido = RUBROS.find((item) => item[0] === id)?.[2] || [];
      return { ...actual, rubros: [...actual.rubros, id], detalles: [...new Set([...actual.detalles, ...sugerido])] };
    });
  }

  function agregarRubro() {
    const texto = datos.rubroNuevo.trim();
    if (!texto) return;
    const preset = RUBROS.find((item) => item[0] === texto.toLowerCase() || item[1].toLowerCase() === texto.toLowerCase());
    const id = preset ? preset[0] : texto;
    const sugerido = preset?.[2] || [];
    setDatos((actual) => {
      if (actual.rubros.some((item) => item.toLowerCase() === id.toLowerCase())) return { ...actual, rubroNuevo: '' };
      return { ...actual, rubroNuevo: '', rubros: [...actual.rubros, id], detalles: [...new Set([...actual.detalles, ...sugerido])] };
    });
  }

  function alternarDetalle(id) {
    setDatos((actual) => ({
      ...actual,
      detalles: actual.detalles.includes(id) ? actual.detalles.filter((item) => item !== id) : [...actual.detalles, id],
    }));
  }

  async function guardar(event) {
    event.preventDefault();
    setOcupado(true);
    setError('');
    setAviso('');
    try {
      const guardado = await api('/api/ajustes', { method: 'PUT', body: cuerpo(datos) });
      const actual = sesion();
      if (actual) {
        guardarSesion({ token: localStorage.getItem('giro_token'), usuario: { ...actual, comercio: guardado.nombre } });
        window.dispatchEvent(new CustomEvent('giro-comercio', { detail: guardado.nombre }));
      }
      setDatos((previo) => ({
        ...previo,
        waAccessToken: '',
        waTokenEnmascarado: guardado.waTokenEnmascarado || '',
        waConectado: guardado.waConectado,
        waActivo: guardado.waActivo,
        waNumero: guardado.waNumero || previo.waNumero,
        mensajeTransferencia: guardado.mensajeTransferencia || '',
        webhookUrl: guardado.webhookUrl,
        waEstado: guardado.waEstado || previo.waEstado,
        waAviso: guardado.waAviso || '',
      }));
      setFase('');
      setAviso('Ajustes guardados');
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(false);
    }
  }

  async function conectar() {
    setOcupado(true);
    setFase('CONECTANDO');
    setError('');
    setAviso('');
    const cancelacion = new AbortController();
    try {
      const [preparacion, alta] = await Promise.all([
        api('/api/ajustes/whatsapp/preparar', { method: 'POST', body: {} }),
        abrirAltaMeta(datos.metaConfigId, { signal: cancelacion.signal }),
      ]);
      let guardado = await api('/api/ajustes/whatsapp/conectar', { method: 'POST', body: { ...alta, state: preparacion.state } });
      if (guardado.waEstado === 'CONECTADO' && guardado.waTipo === 'COEXISTENCIA') {
        try {
          guardado = await api('/api/ajustes/whatsapp/sincronizar', { method: 'POST', body: {} });
        } catch (err) {
          guardado = { ...guardado, waAviso: `La conexión se guardó, pero no se pudo iniciar la sincronización: ${err.message}` };
        }
      }
      setDatos((previo) => ({
        ...previo,
        ...guardado,
        waAccessToken: '',
        waPhoneNumberId: guardado.waPhoneNumberId || '',
        waWabaId: guardado.waWabaId || '',
        waNumero: guardado.waNumero || '',
        waNombre: guardado.waNombre || '',
        waSaludo: guardado.waSaludo || previo.waSaludo,
      }));
      setFase('');
      setAviso(guardado.waEstado === 'CONECTADO'
        ? 'WhatsApp Business quedó conectado con coexistencia.'
        : guardado.waAviso || 'La cuenta quedó guardada; falta completar el webhook para recibir mensajes.');
    } catch (err) {
      setFase('ERROR');
      setError(err.message);
    } finally {
      cancelacion.abort();
      setOcupado(false);
    }
  }

  async function probar() {
    setOcupado(true);
    setError('');
    setAviso('');
    setNotaWa('');
    try {
      const resultado = await api('/api/ajustes/whatsapp/probar', {
        method: 'POST',
        body: {
          phoneNumberId: datos.waPhoneNumberId,
          accessToken: datos.waAccessToken || undefined,
        },
      });
      setDatos((actual) => ({ ...actual, waNumero: resultado.displayPhoneNumber || actual.waNumero }));
      const texto = resultado.verifiedName ? `${resultado.mensaje} (${resultado.verifiedName})` : (resultado.mensaje || 'Giro se conectó con este número de WhatsApp');
      setAviso(texto);
      setNotaWa(texto);
    } catch (err) {
      setError(err.message);
      setNotaWa(err.message);
    } finally {
      setOcupado(false);
    }
  }

  async function suscribir() {
    setOcupado(true);
    setError('');
    setAviso('');
    setNotaWa('');
    try {
      const resultado = await api('/api/ajustes/whatsapp/suscribir', {
        method: 'POST',
        body: {
          wabaId: datos.waWabaId,
          accessToken: datos.waAccessToken || undefined,
        },
      });
      if (resultado.ajustes) {
        setDatos((actual) => ({ ...actual, ...resultado.ajustes, waAccessToken: '' }));
        setFase('');
      }
      const texto = resultado.mensaje || 'El número quedó suscripto a la app de Giro';
      setAviso(texto);
      setNotaWa(resultado.aviso ? `${texto} ${resultado.aviso}` : texto);
      if (resultado.aviso) setError(resultado.aviso);
    } catch (err) {
      setError(err.message);
      setNotaWa(err.message);
    } finally {
      setOcupado(false);
    }
  }

  async function sincronizar() {
    setOcupado(true);
    setError('');
    try {
      const guardado = await api('/api/ajustes/whatsapp/sincronizar', { method: 'POST', body: {} });
      setDatos((actual) => ({ ...actual, ...guardado, waAccessToken: '' }));
      setAviso(guardado.waHistorial === 'PENDIENTE' ? 'Sincronización solicitada a Meta.' : guardado.waAviso);
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(false);
    }
  }

  async function desconectar() {
    setOcupado(true);
    setError('');
    setAviso('');
    try {
      const guardado = await api('/api/ajustes', { method: 'PUT', body: { ...cuerpo(datos), desconectarWhatsapp: true, waActivo: false } });
      setDatos((previo) => ({
        ...previo,
        waPhoneNumberId: '',
        waWabaId: '',
        waAccessToken: '',
        waTokenEnmascarado: '',
        waNumero: guardado.waNumero || previo.waNumero,
        waNombre: guardado.waNombre || '',
        waActivo: false,
        waConectado: false,
        waEstado: guardado.waEstado || 'DESCONECTADO',
        waAviso: guardado.waAviso || '',
        webhookUrl: guardado.webhookUrl,
      }));
      setFase('');
      setAviso(guardado.waAviso || 'WhatsApp desconectado de este comercio');
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(false);
    }
  }

  async function copiar(texto) {
    try {
      await navigator.clipboard.writeText(texto);
      setAviso('Copiado');
    } catch {
      setError('No se pudo copiar');
    }
  }

  if (!listo && !error) return <p className="text-sm text-muted">Cargando ajustes…</p>;

  return (
    <form className="mx-auto flex max-w-3xl flex-col gap-4" onSubmit={guardar}>
      <div>
        <h1 className="text-2xl font-black tracking-tight text-ink">Ajustes</h1>
        <p className="mt-1 text-sm text-muted">El nombre, la dirección, qué vendés y cómo te pagan o te escriben.</p>
      </div>
      {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}
      {aviso && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{aviso}</p>}

      <section className="rounded-3xl border border-line bg-card p-5">
        <h2 className="text-sm font-black text-ink">Negocio</h2>
        <label className="mt-4 block text-xs font-semibold text-muted">Nombre
          <input className="mt-1 w-full rounded-xl border border-line bg-sunken px-3 py-2.5 text-sm font-medium text-ink outline-none focus:border-accent" value={datos.nombre} onChange={set('nombre')} required />
        </label>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
          <label className="text-xs font-semibold text-muted">Calle
            <input className="mt-1 w-full rounded-xl border border-line bg-sunken px-3 py-2.5 text-sm outline-none focus:border-accent" value={datos.calle} onChange={set('calle')} />
          </label>
          <label className="text-xs font-semibold text-muted">Altura
            <input className="mt-1 w-full rounded-xl border border-line bg-sunken px-3 py-2.5 text-sm outline-none focus:border-accent" value={datos.altura} onChange={set('altura')} />
          </label>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-muted">Localidad
            <input className="mt-1 w-full rounded-xl border border-line bg-sunken px-3 py-2.5 text-sm outline-none focus:border-accent" value={datos.localidad} onChange={set('localidad')} />
          </label>
          <label className="text-xs font-semibold text-muted">Partido
            <input className="mt-1 w-full rounded-xl border border-line bg-sunken px-3 py-2.5 text-sm outline-none focus:border-accent" value={datos.partido} onChange={set('partido')} />
          </label>
          <label className="text-xs font-semibold text-muted">Provincia
            <select className="mt-1 w-full rounded-xl border border-line bg-sunken px-3 py-2.5 text-sm outline-none focus:border-accent" value={datos.provincia} onChange={set('provincia')}>
              <option value="">Sin elegir</option>
              {provincias.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted">Código postal
            <input className="mt-1 w-full rounded-xl border border-line bg-sunken px-3 py-2.5 text-sm outline-none focus:border-accent" value={datos.codigoPostal} onChange={set('codigoPostal')} />
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-card p-5">
        <h2 className="text-sm font-black text-ink">Cómo vendés</h2>
        <p className="mt-1 text-xs text-muted">Tipo de tienda, rubros y si el catálogo es de productos, servicios o los dos.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[['FISICA', 'Local físico'], ['ONLINE', 'Online'], ['AMBAS', 'Local y online']].map(([id, etiqueta]) => (
            <button key={id} type="button" className={`rounded-xl px-3 py-2 text-xs font-bold ${datos.canal === id ? 'bg-fill text-onfill' : 'bg-sunken text-muted'}`} onClick={() => setDatos({ ...datos, canal: id })}>{etiqueta}</button>
          ))}
        </div>
        <p className="mb-2 mt-4 text-xs font-semibold text-muted">Rubros</p>
        <p className="mb-2 text-[11px] text-faint">Podés marcar más de uno. Si el tuyo no está, escribilo y agregalo.</p>
        <div className="flex flex-wrap gap-2">
          {RUBROS.map(([id, etiqueta]) => (
            <button key={id} type="button" className={`rounded-xl px-3 py-2 text-xs font-bold ${datos.rubros.includes(id) ? 'bg-fill text-onfill' : 'bg-sunken text-muted'}`} onClick={() => alternarRubro(id)}>{etiqueta}</button>
          ))}
          {rubrosPropios.map((nombre) => (
            <button key={nombre} type="button" className="rounded-xl bg-fill px-3 py-2 text-xs font-bold text-onfill" onClick={() => alternarRubro(nombre)}>{nombre} ×</button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input className="w-full rounded-xl border border-line bg-sunken px-3 py-2.5 text-sm outline-none focus:border-accent" placeholder="Agregar un rubro" value={datos.rubroNuevo} maxLength={40} onChange={set('rubroNuevo')} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); agregarRubro(); } }} />
          <button type="button" className="shrink-0 rounded-xl bg-sunken px-3 text-xs font-bold text-ink" onClick={agregarRubro}>Agregar</button>
        </div>
        <p className="mb-2 mt-4 text-xs font-semibold text-muted">Qué ofrecés</p>
        <div className="flex flex-wrap gap-2">
          {[['PRODUCTOS', 'Productos'], ['SERVICIOS', 'Servicios'], ['AMBAS', 'Productos y servicios']].map(([id, etiqueta]) => (
            <button key={id} type="button" className={`rounded-xl px-3 py-2 text-xs font-bold ${datos.oferta === id ? 'bg-fill text-onfill' : 'bg-sunken text-muted'}`} onClick={() => setDatos({ ...datos, oferta: id })}>{etiqueta}</button>
          ))}
        </div>
        {vendeProductos && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-muted">Datos para personalizar cada producto</p>
            <p className="mb-2 text-[11px] text-faint">Estos campos aparecen al cargar o editar un producto. Talle y calzado arman las variantes de stock.</p>
            <div className="flex flex-wrap gap-2">
              {DETALLES.map(([id, etiqueta]) => (
                <button key={id} type="button" className={`rounded-xl px-3 py-2 text-xs font-bold ${datos.detalles.includes(id) ? 'bg-accent-soft text-accent' : 'bg-sunken text-muted'}`} onClick={() => alternarDetalle(id)}>{etiqueta}</button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-line bg-card p-5">
        <h2 className="text-sm font-black text-ink">Mercado Pago</h2>
        <p className="mt-1 text-xs text-muted">Alias, CVU o CBU para pasarlos por WhatsApp cuando te tienen que transferir. No cobra la venta: solo comparte los datos.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-muted sm:col-span-2">Titular
            <input className="mt-1 w-full rounded-xl border border-line bg-sunken px-3 py-2.5 text-sm outline-none focus:border-accent" value={datos.mpTitular} onChange={set('mpTitular')} />
          </label>
          <label className="text-xs font-semibold text-muted">Alias
            <input className="mt-1 w-full rounded-xl border border-line bg-sunken px-3 py-2.5 text-sm outline-none focus:border-accent" placeholder="nombre.apellido.mp" value={datos.mpAlias} onChange={set('mpAlias')} />
          </label>
          <label className="text-xs font-semibold text-muted">CVU
            <input className="mt-1 w-full rounded-xl border border-line bg-sunken px-3 py-2.5 text-sm outline-none focus:border-accent" inputMode="numeric" value={datos.mpCvu} onChange={set('mpCvu')} />
          </label>
          <label className="text-xs font-semibold text-muted">CBU
            <input className="mt-1 w-full rounded-xl border border-line bg-sunken px-3 py-2.5 text-sm outline-none focus:border-accent" inputMode="numeric" value={datos.mpCbu} onChange={set('mpCbu')} />
          </label>
        </div>
        {mensaje && (
          <div className="mt-4 rounded-2xl bg-sunken p-3">
            <p className="whitespace-pre-wrap text-sm text-ink">{mensaje}</p>
            <button type="button" className="mt-2 text-xs font-bold text-accent" onClick={() => copiar(mensaje)}>Copiar para WhatsApp</button>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-line bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-ink">WhatsApp</h2>
            <p className="mt-1 text-xs text-muted">Usá tu WhatsApp Business desde el celular y desde Jiro.</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${estadoWa === 'CONECTADO' ? 'bg-emerald-50 text-emerald-700' : estadoWa === 'ERROR' || estadoWa === 'RECONEXION' ? 'bg-rose-50 text-rose-700' : 'bg-sunken text-muted'}`}>{textoEstado(estadoWa)}</span>
        </div>
        {(datos.waNumero || datos.waNombre) && <p className="mt-3 text-xs font-semibold text-ink">{datos.waNombre ? `${datos.waNombre} · ` : ''}{datos.waNumero}</p>}
        {datos.waAviso && <p className="mt-2 text-xs text-muted">{datos.waAviso}</p>}
        <div className="mt-4 rounded-2xl bg-sunken p-3">
          <button type="button" className="rounded-xl bg-[#1877f2] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40" disabled={ocupado || !datos.metaAppId || !datos.metaConfigId || !metaListo} onClick={conectar}>{estadoWa === 'CONECTADO' || estadoWa === 'RECONEXION' ? 'Reconectar' : 'Conectar WhatsApp Business'}</button>
          <p className="mt-2 text-xs text-muted">Cada comercio vincula su propio número. El alta no borra la cuenta del celular.</p>
          {!datos.metaAppId && <p className="mt-2 text-xs font-semibold text-rose-600">Falta GIRO_WHATSAPP_APP_ID en el servidor de Giro.</p>}
          {datos.metaAppId && !datos.metaConfigId && <p className="mt-2 text-xs text-muted">Falta GIRO_WHATSAPP_ELS_CONFIG_ID para abrir la coexistencia.</p>}
          {datos.metaAppId && !metaListo && <p className="mt-2 text-xs text-muted">Cargando Meta…</p>}
        </div>
        <p className="mt-4 text-xs text-muted">Configuración manual para pruebas: usá los IDs y el token del número de prueba de Meta. Esto no activa coexistencia de un número real.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-muted">Phone Number ID
            <input className="mt-1 w-full rounded-xl border border-line bg-sunken px-3 py-2.5 font-mono text-sm outline-none focus:border-accent" value={datos.waPhoneNumberId} onChange={set('waPhoneNumberId')} />
          </label>
          <label className="text-xs font-semibold text-muted">WABA ID
            <input className="mt-1 w-full rounded-xl border border-line bg-sunken px-3 py-2.5 font-mono text-sm outline-none focus:border-accent" value={datos.waWabaId} onChange={set('waWabaId')} />
          </label>
          <label className="text-xs font-semibold text-muted sm:col-span-2">Access Token de la app de Giro
            <input className="mt-1 w-full rounded-xl border border-line bg-sunken px-3 py-2.5 font-mono text-sm outline-none focus:border-accent" type="password" placeholder={datos.waTokenEnmascarado || 'Pegá el token'} value={datos.waAccessToken} onChange={set('waAccessToken')} autoComplete="off" />
          </label>
          <label className="text-xs font-semibold text-muted sm:col-span-2">Saludo del bot
            <textarea className="mt-1 w-full rounded-xl border border-line bg-sunken px-3 py-2.5 text-sm outline-none focus:border-accent" rows={2} placeholder="Hola, soy el asistente del local." value={datos.waSaludo} onChange={set('waSaludo')} />
          </label>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-sunken px-3 py-2">
          <span className="text-sm font-semibold text-ink">Responder mensajes entrantes</span>
          <button type="button" role="switch" aria-checked={datos.waActivo} className={`relative h-6 w-11 rounded-full ${datos.waActivo ? 'bg-fill' : 'bg-raise'}`} onClick={() => setDatos({ ...datos, waActivo: !datos.waActivo })}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-card transition ${datos.waActivo ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="rounded-xl border border-line px-3 py-2 text-xs font-bold text-ink" disabled={ocupado} onClick={probar}>Probar conexión</button>
          <button type="button" className="rounded-xl border border-line px-3 py-2 text-xs font-bold text-ink" disabled={ocupado} onClick={suscribir}>Suscribir a la app de Giro</button>
          {estadoWa === 'CONECTADO' && datos.waTipo === 'COEXISTENCIA' && <button type="button" className="rounded-xl border border-line px-3 py-2 text-xs font-bold text-ink" disabled={ocupado} onClick={sincronizar}>Sincronizar contactos e historial</button>}
          {notaWa && <p className={`w-full text-xs font-semibold ${error ? 'text-rose-600' : 'text-emerald-700'}`}>{notaWa}</p>}
          {(['CONECTADO', 'RECONEXION', 'PENDIENTE_WEBHOOK', 'VALIDADO'].includes(estadoWa)) && <button type="button" className="rounded-xl px-3 py-2 text-xs font-bold text-rose-600" disabled={ocupado} onClick={desconectar}>Desconectar</button>}
        </div>
        <div className="mt-4 space-y-2 rounded-2xl border border-line p-3 text-xs text-muted">
          <p className="font-bold text-ink">Webhook de Giro</p>
          <p>En la app de Meta de Giro, la callback URL es esta. El token de verificación tiene que ser el de Giro, no el de Tuinmo.</p>
          <p className="break-all font-mono text-ink">{datos.webhookUrl || `Falta GIRO_PUBLIC_URL. La ruta es ${datos.webhookRuta}`}</p>
          {datos.webhookUrl && <button type="button" className="font-bold text-accent" onClick={() => copiar(datos.webhookUrl)}>Copiar URL</button>}
          <p>El token de verificación y el App Secret quedan solo en el servidor. «Suscribir a la app de Giro» registra messages, history, smb_app_state_sync, smb_message_echoes y account_update. Si pegaste el WABA y el token, también engancha ese número.</p>
          <p className="break-all font-mono text-ink">https://jirohub.com/privacidad</p>
          <button type="button" className="font-bold text-accent" onClick={() => copiar('https://jirohub.com/privacidad')}>Copiar política de privacidad</button>
          <p>Cuando alguien escribe, el bot puede mandar el catálogo, la dirección o los datos de transferencia.</p>
        </div>
      </section>

      <div className="sticky bottom-20 z-10 flex justify-end md:bottom-0">
        <button type="submit" className="rounded-xl bg-fill px-5 py-2.5 text-sm font-bold text-onfill shadow-md disabled:opacity-40" disabled={ocupado}>Guardar ajustes</button>
      </div>
    </form>
  );
}

function textoEstado(estado) {
  if (estado === 'CONECTADO') return 'Conectado';
  if (estado === 'CONECTANDO') return 'Conectando';
  if (estado === 'PENDIENTE_WEBHOOK') return 'Falta configurar recepción';
  if (estado === 'VALIDADO') return 'Credenciales verificadas';
  if (estado === 'RECONEXION') return 'Requiere reconexión';
  if (estado === 'ERROR') return 'Error';
  return 'Desconectado';
}

function cuerpo(datos) {
  return {
    nombre: datos.nombre.trim(),
    calle: datos.calle,
    altura: datos.altura,
    localidad: datos.localidad,
    partido: datos.partido,
    provincia: datos.provincia || null,
    codigoPostal: datos.codigoPostal,
    canal: datos.canal,
    rubros: datos.rubros,
    oferta: datos.oferta,
    detalles: datos.detalles,
    mpTitular: datos.mpTitular,
    mpAlias: datos.mpAlias,
    mpCvu: datos.mpCvu,
    mpCbu: datos.mpCbu,
    waPhoneNumberId: datos.waPhoneNumberId,
    waWabaId: datos.waWabaId,
    waAccessToken: datos.waAccessToken || null,
    waSaludo: datos.waSaludo,
    waActivo: Boolean(datos.waActivo),
    desconectarWhatsapp: false,
  };
}

function armarTransferencia(datos) {
  if (!datos.mpAlias && !datos.mpCvu && !datos.mpCbu) return '';
  const lineas = ['Datos para transferir' + (datos.nombre ? ` a ${datos.nombre}` : '') + ':'];
  if (datos.mpTitular) lineas.push(`Titular: ${datos.mpTitular}`);
  if (datos.mpAlias) lineas.push(`Alias: ${datos.mpAlias}`);
  if (datos.mpCvu) lineas.push(`CVU: ${datos.mpCvu}`);
  if (datos.mpCbu) lineas.push(`CBU: ${datos.mpCbu}`);
  lineas.push('Mercado Pago');
  return lineas.join('\n');
}
