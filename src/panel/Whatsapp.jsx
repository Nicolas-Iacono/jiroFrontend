import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

function hora(iso) {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function titulo(contacto) {
  return contacto?.nombre || contacto?.telefono || 'WhatsApp';
}

export default function WhatsappPage() {
  const [tab, setTab] = useState('mensajes');
  const [lista, setLista] = useState([]);
  const [elegido, setElegido] = useState(null);
  const [hilo, setHilo] = useState(null);
  const [texto, setTexto] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function cargar() {
    const data = await api('/api/whatsapp/conversaciones');
    setLista(data || []);
  }

  useEffect(() => {
    let vivo = true;
    cargar().catch((err) => vivo && setError(err.message));
    const reloj = window.setInterval(() => {
      cargar().catch(() => {});
      if (elegido) {
        api(`/api/whatsapp/conversaciones/${elegido}`).then((data) => vivo && setHilo(data)).catch(() => {});
      }
    }, 8000);
    return () => { vivo = false; window.clearInterval(reloj); };
  }, [elegido]);

  async function abrir(id) {
    setElegido(id);
    setError('');
    try {
      const data = await api(`/api/whatsapp/conversaciones/${id}`);
      setHilo(data);
      setLista((actual) => actual.map((item) => item.id === id ? { ...item, noLeidos: 0 } : item));
    } catch (err) {
      setError(err.message);
    }
  }

  async function enviar(event) {
    event.preventDefault();
    if (!elegido || !texto.trim()) return;
    setOcupado(true);
    setError('');
    try {
      const data = await api(`/api/whatsapp/conversaciones/${elegido}/mensajes`, { method: 'POST', body: { texto: texto.trim() } });
      setHilo(data);
      setTexto('');
      cargar().catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(false);
    }
  }

  async function bot(contacto) {
    try {
      const data = await api(`/api/whatsapp/conversaciones/${contacto.id}/bot`, { method: 'POST', body: { activo: !contacto.botActivo } });
      setLista((actual) => actual.map((item) => item.id === contacto.id ? { ...item, botActivo: data.botActivo } : item));
      setHilo((actual) => actual && actual.id === contacto.id ? { ...actual, botActivo: data.botActivo } : actual);
    } catch (err) {
      setError(err.message);
    }
  }

  const abierto = hilo && hilo.id === elegido ? hilo : null;

  return (
    <div className="flex h-[calc(100vh-8.5rem)] min-h-[520px] flex-col">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-ink">WhatsApp</h1>
          <p className="text-xs text-muted">Mensajes y contactos de este comercio.</p>
        </div>
        <div className="flex rounded-2xl bg-sunken p-1 text-sm font-bold">
          <button type="button" className={`rounded-xl px-3 py-1.5 ${tab === 'mensajes' ? 'bg-card text-ink shadow-sm' : 'text-muted'}`} onClick={() => setTab('mensajes')}>Mensajes</button>
          <button type="button" className={`rounded-xl px-3 py-1.5 ${tab === 'contactos' ? 'bg-card text-ink shadow-sm' : 'text-muted'}`} onClick={() => setTab('contactos')}>Contactos</button>
        </div>
      </div>
      {error && <p className="mb-2 text-sm font-semibold text-rose-600">{error}</p>}

      {tab === 'contactos' ? (
        <section className="min-h-0 flex-1 overflow-auto rounded-3xl border border-line bg-card">
          {lista.length === 0 ? <Vacio /> : lista.map((contacto) => (
            <button type="button" key={contacto.id} className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-0 hover:bg-sunken" onClick={() => { setTab('mensajes'); abrir(contacto.id); }}>
              <Avatar nombre={titulo(contacto)} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-ink">{titulo(contacto)}</span>
                <span className="block truncate text-xs text-muted">{contacto.telefono}</span>
              </span>
              <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${contacto.botActivo ? 'bg-emerald-50 text-emerald-700' : 'bg-sunken text-muted'}`} onClick={(event) => { event.stopPropagation(); bot(contacto); }}>
                {contacto.botActivo ? 'Bot' : 'Sin bot'}
              </span>
            </button>
          ))}
        </section>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-3xl border border-line bg-card md:grid-cols-[300px_1fr]">
          <aside className={`${abierto ? 'hidden md:block' : ''} overflow-auto border-r border-line`}>
            {lista.length === 0 ? <Vacio /> : lista.map((contacto) => (
              <button type="button" key={contacto.id} className={`flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left ${elegido === contacto.id ? 'bg-accent-soft' : 'hover:bg-sunken'}`} onClick={() => abrir(contacto.id)}>
                <Avatar nombre={titulo(contacto)} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-bold text-ink">{titulo(contacto)}</span>
                    <span className="shrink-0 text-[10px] text-faint">{hora(contacto.ultimoEn)}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted">{contacto.ultimoTexto || 'Sin mensajes'}</span>
                </span>
                {contacto.noLeidos > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-fill px-1 text-[10px] font-bold text-onfill">{contacto.noLeidos}</span>}
              </button>
            ))}
          </aside>
          <section className={`${abierto ? 'flex' : 'hidden md:flex'} min-h-0 flex-col`}>
            {!abierto ? (
              <div className="grid flex-1 place-items-center p-6 text-center text-sm text-muted">Elegí una conversación.</div>
            ) : (
              <>
                <header className="flex items-center gap-3 border-b border-line px-4 py-3">
                  <button type="button" className="text-sm font-bold text-accent md:hidden" onClick={() => { setElegido(null); setHilo(null); }}>Volver</button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-ink">{titulo(abierto)}</p>
                    <p className="text-[11px] text-muted">{abierto.telefono}</p>
                  </div>
                  <button type="button" className="rounded-full bg-sunken px-2.5 py-1 text-[11px] font-bold text-ink" onClick={() => bot(abierto)}>{abierto.botActivo ? 'Bot activo' : 'Bot apagado'}</button>
                </header>
                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto bg-sunken px-4 py-4">
                  {(abierto.mensajes || []).map((mensaje) => (
                    <div key={mensaje.id} className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mensaje.direccion === 'SALIENTE' ? 'ml-auto bg-fill text-onfill' : 'bg-card text-ink'}`}>
                      <p className="whitespace-pre-wrap">{mensaje.texto}</p>
                      <p className={`mt-1 text-[10px] ${mensaje.direccion === 'SALIENTE' ? 'text-white/70' : 'text-faint'}`}>{etiqueta(mensaje.origen)}{entrega(mensaje)} · {hora(mensaje.creadoEn)}</p>
                    </div>
                  ))}
                </div>
                <form className="flex gap-2 border-t border-line p-3" onSubmit={enviar}>
                  <input className="min-w-0 flex-1 rounded-xl border border-line bg-sunken px-3 py-2.5 text-sm outline-none focus:border-accent" placeholder="Escribí un mensaje" value={texto} onChange={(event) => setTexto(event.target.value)} />
                  <button type="submit" className="rounded-xl bg-fill px-4 py-2.5 text-sm font-bold text-onfill disabled:opacity-40" disabled={ocupado || !texto.trim()}>Enviar</button>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function entrega(mensaje) {
  if (mensaje.direccion !== 'SALIENTE' || !mensaje.estado) return '';
  if (mensaje.estado === 'LEIDO') return ' · Leído';
  if (mensaje.estado === 'ENTREGADO') return ' · Entregado';
  if (mensaje.estado === 'ENVIADO') return ' · Enviado';
  if (mensaje.estado === 'FALLIDO') return ' · Falló';
  if (mensaje.estado === 'ACEPTADO') return ' · Aceptado';
  return '';
}

function etiqueta(origen) {
  if (origen === 'BOT') return 'Bot';
  if (origen === 'TELEFONO') return 'Teléfono';
  if (origen === 'LOCAL') return 'Panel';
  if (origen === 'HISTORIAL') return 'Historial';
  return 'Cliente';
}

function Avatar({ nombre }) {
  const letras = String(nombre || 'W').trim().slice(0, 1).toUpperCase();
  return <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#25D366] text-sm font-black text-white">{letras}</span>;
}

function Vacio() {
  return (
    <div className="p-6 text-sm text-muted">
      <p>Todavía no hay conversaciones.</p>
      <p className="mt-1">Cuando alguien escriba al WhatsApp de este comercio, el chat aparece acá.</p>
      <Link to="/ajustes" className="mt-3 inline-block font-bold text-accent">Conectar el número en Ajustes</Link>
    </div>
  );
}
