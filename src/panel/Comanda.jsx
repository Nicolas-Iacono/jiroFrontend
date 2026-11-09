import { useEffect, useRef, useState } from 'react';
import { api, sesion } from '../api.js';

const CODE39 = {
  0: 'nnnwwnwnn', 1: 'wnnwnnnnw', 2: 'nnwwnnnnw', 3: 'wnwwnnnnn', 4: 'nnnwwnnnw',
  5: 'wnnwwnnnn', 6: 'nnwwwnnnn', 7: 'nnnwnnwnw', 8: 'wnnwnnwnn', 9: 'nnwwnnwnn',
  A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn',
  F: 'nnwnwwnnn', G: 'nnnnnwwnw', H: 'wnnnnwwnn', I: 'nnwnnwwnn', J: 'nnnnwwwnn',
  K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn', N: 'nnnnwnnww', O: 'wnnnwnnwn',
  P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn', S: 'nnwnnnwwn', T: 'nnnnwnwwn',
  U: 'wwnnnnnnw', V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn', '-': 'nwnnnnwnw', '*': 'nwnnwnwnn',
};

function pesos(valor) {
  const texto = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(Number(valor) || 0));
  return `$ ${texto}`;
}

function fechaTicket(iso) {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(fecha);
}

function unidades(valor) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 }).format(Number(valor) || 0);
}

function barras(codigo) {
  const limpio = `*${String(codigo).toUpperCase().replace(/[^0-9A-Z-]/g, '')}*`;
  const trazos = [];
  let x = 0;
  for (const letra of limpio) {
    const patron = CODE39[letra];
    if (!patron) continue;
    for (let i = 0; i < patron.length; i += 1) {
      const ancho = patron[i] === 'w' ? 2.4 : 1;
      if (i % 2 === 0) trazos.push({ x, ancho });
      x += ancho;
    }
    x += 1;
  }
  return { ancho: x, trazos };
}

function Codigo({ valor }) {
  const { ancho, trazos } = barras(valor);
  return (
    <svg viewBox={`0 0 ${ancho} 42`} className="mx-auto h-10 w-48" role="img" aria-label={valor}>
      {trazos.map((trazo) => <rect key={`${trazo.x}`} x={trazo.x} y="0" width={trazo.ancho} height="42" fill="#0f172a" />)}
    </svg>
  );
}

function entregaTicket(pedido, local) {
  const calle = [pedido.direccion, pedido.altura].filter(Boolean).join(' ');
  const zona = [pedido.localidad, pedido.partido, pedido.provincia, pedido.codigoPostal].filter(Boolean).join(', ');
  const localLineas = [[local?.direccion, local?.altura].filter(Boolean).join(' '), [local?.localidad, local?.provincia].filter(Boolean).join(', ')].filter(Boolean);
  if (!pedido.entrega || pedido.entrega === 'LOCAL') {
    return { titulo: 'RETIRO EN EL LOCAL', lineas: localLineas };
  }
  if (pedido.entrega === 'PUNTO') {
    return { titulo: pedido.puntoNombre ? `PUNTO DE RETIRO · ${pedido.puntoNombre}` : 'PUNTO DE RETIRO', lineas: [calle, zona].filter(Boolean) };
  }
  return { titulo: 'ENTREGA A DOMICILIO', lineas: [calle, zona].filter(Boolean) };
}

export default function Comanda({ pedido, listos, onClose }) {
  const usuario = sesion();
  const ticket = useRef(null);
  const [local, setLocal] = useState(null);
  const [copias, setCopias] = useState(1);
  const [codigo, setCodigo] = useState(true);
  const [deposito, setDeposito] = useState(false);
  const items = pedido.items || [];
  const envio = Number(pedido.envio || 0);
  const prendas = Number(pedido.total || 0) - envio;
  const unidadesTotal = items.reduce((suma, item) => suma + Number(item.cantidad || 0), 0);
  const donde = entregaTicket(pedido, local);
  const cobrado = pedido.estado === 'ENTREGADO';
  const referencia = `ORD-${pedido.id}`;
  const chat = String(pedido.telefono || '').replace(/\D/g, '');

  useEffect(() => {
    let vivo = true;
    api('/api/envios').then((dato) => { if (vivo) setLocal(dato); }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  function imprimir() {
    const html = ticket.current?.innerHTML;
    if (!html) return;
    const cantidad = Math.min(5, Math.max(1, copias));
    const bloques = Array.from({ length: cantidad }, () => html);
    if (deposito) bloques.push(`<p style="text-align:center;font:700 10px ui-monospace,monospace;margin:0 0 8px">COPIA DEPÓSITO</p>${html}`);
    const ventana = window.open('', '_blank', 'noopener,width=420,height=720');
    if (!ventana) return;
    ventana.document.write(`<!doctype html><meta charset="utf-8"><title>Pedido #${pedido.id}</title><style>@page{size:80mm auto;margin:4mm}body{margin:0;width:72mm;font-family:ui-monospace,monospace;color:#0f172a}section{break-after:page}.text-center{text-align:center}.inline-block{display:inline-block}.rounded{border-radius:4px}.bg-black{background:#000;color:#fff}.font-black{font-weight:900}.font-bold{font-weight:700}.mt-1{margin-top:4px}.text-sm{font-size:14px}.text-base{font-size:16px}.text-xs{font-size:12px}.text-\\[11px\\]{font-size:11px}.text-\\[10px\\]{font-size:10px}.text-\\[9px\\]{font-size:9px}.tracking-widest{letter-spacing:.12em}.text-muted{color:#475569}.text-muted{color:#64748b}.text-faint{color:#94a3b8}.text-amber-900{color:#78350f}.text-amber-800{color:#92400e}.uppercase{text-transform:uppercase}.w-full{width:100%}.rounded-full{border-radius:999px}.rounded-lg{border-radius:8px}.border{border:1px solid #000}.border-b{border-bottom:1px solid #cbd5e1}.border-dashed{border-style:dashed}.bg-sunken{background:#f8fafc}.bg-amber-50\\/80{background:#fffbeb}.flex{display:flex}.justify-between{justify-content:space-between}.items-end{align-items:flex-end}.gap-2{gap:8px}.gap-3{gap:12px}.text-right{text-align:right}.italic{font-style:italic}.mx-auto{display:block;margin:6px auto}.p-2{padding:8px}.px-2{padding-left:8px;padding-right:8px}.py-0\\.5{padding-top:2px;padding-bottom:2px}.my-2{margin-top:8px;margin-bottom:8px}.my-2\\.5{margin-top:10px;margin-bottom:10px}.mt-1\\.5{margin-top:6px}.mt-2{margin-top:8px}.pb-1{padding-bottom:4px}svg{display:block;height:40px;width:180px}</style><body>${bloques.map((bloque) => `<section>${bloque}</section>`).join('')}<script>addEventListener('load',()=>print())<\/script>`);
    ventana.document.close();
  }

  function enviar() {
    if (chat.length < 8) return;
    const lineas = items.map((item) => `${unidades(item.cantidad)} x ${item.producto}${item.variante ? ` ${item.variante}` : ''}`).join('\n');
    const texto = [
      `${usuario?.comercio || 'GIRO'} · Pedido #${pedido.id}`,
      donde.titulo,
      donde.lineas.join(', '),
      lineas,
      envio > 0 ? `Envío ${pesos(envio)}` : '',
      `${cobrado ? 'Cobrado' : 'A cobrar'} ${pesos(pedido.total)}`,
    ].filter(Boolean).join('\n');
    window.open(`https://wa.me/${chat}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 p-4 pt-10 font-sans antialiased backdrop-blur-sm md:p-8" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-line bg-card shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-card px-7 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><Recibo /></span>
            <div className="min-w-0">
              <h2 className="text-xl font-black tracking-tight text-ink">Comanda de impresión térmica (80mm)</h2>
              <p className="mt-0.5 text-xs text-muted">Rotulado de paquete y remito de despacho · Pedido #{pedido.id}</p>
            </div>
          </div>
          <button type="button" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sunken text-faint hover:bg-raise hover:text-ink" onClick={onClose} aria-label="Cerrar"><Cerrar /></button>
        </header>

        <div className="grid grid-cols-1 items-start gap-8 overflow-y-auto p-6 md:grid-cols-12 md:p-8">
          <section className="md:col-span-7">
            <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-wider text-faint">Vista previa 80mm</p>
            <div className="ticket-paper mx-auto w-[80mm] max-w-full rounded-2xl border border-line/90 bg-card p-4 shadow-md">
              <div ref={ticket} className="font-mono text-ink">
                <p className="text-center"><span className="inline-block rounded bg-black px-2 py-0.5 text-[11px] font-black text-white">GIRO POS</span></p>
                <p className="mt-1 text-center text-sm font-black tracking-widest">{usuario?.comercio || 'GIRO'}</p>
                {local?.direccion && (
                  <p className="text-center text-[10px] text-muted">{[local.direccion, local.altura, local.localidad, local.provincia].filter(Boolean).join(', ')}</p>
                )}
                <p className="mx-auto mt-1 inline-block w-full text-center"><span className="inline-block rounded-full border border-black px-2 py-0.5 text-[10px] font-bold">TICKET DE DESPACHO</span></p>
                <div className="my-2 border-b border-dashed border-line" />
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[9px] uppercase text-faint">Identificador</p>
                    <p className="text-base font-black">ORDEN #{pedido.id}</p>
                  </div>
                  <p className="text-right text-[10px] text-muted">{fechaTicket(pedido.fecha)}</p>
                </div>
                <div className="my-2 border-b border-dashed border-line" />
                <Fila etiqueta="Cliente" valor={`${pedido.cliente || ((pedido.entrega === 'LOCAL' || !pedido.entrega) ? 'Compra en local' : 'Sin cliente')}${pedido.categoria && pedido.categoria !== 'ESTANDAR' ? ` (${pedido.categoria})` : ''}`} />
                <Fila etiqueta="Teléfono" valor={pedido.telefono || 'Sin teléfono'} />
                <div className="mt-1.5 rounded-lg border border-line/80 bg-sunken p-2">
                  <p className="text-[10px] font-black">{donde.titulo}</p>
                  {donde.lineas.map((linea) => <p key={linea} className="text-[10px] text-muted">{linea}</p>)}
                  {envio > 0 && <p className="text-[10px] font-bold">Envío {pesos(envio)}{pedido.distanciaKm != null ? ` · ${pedido.distanciaKm} km` : ''}</p>}
                </div>
                <div className="mt-2 flex justify-between border-b border-line pb-1 text-[9px] font-bold text-faint">
                  <span>CANT / ARTÍCULO / TALLE</span><span>ESTADO</span>
                </div>
                {items.map((item, indice) => {
                  const listo = pedido.estado === 'ENTREGADO' || listos?.has(indice);
                  return (
                    <div key={`${item.productoId}-${item.varianteId || indice}`} className="mt-1.5">
                      <div className="flex justify-between gap-2 text-[11px] font-black">
                        <span>[{unidades(item.cantidad)}x] {item.producto}{item.variante ? ` ${item.variante}` : ''}</span>
                        <span>{listo ? 'LISTO' : 'PENDIENTE'}</span>
                      </div>
                      <p className="text-[9px] text-muted">{item.sku ? `SKU ${item.sku}` : 'Sin SKU'}</p>
                    </div>
                  );
                })}
                <div className="my-2 border-b border-line" />
                <Fila etiqueta="Total prendas" valor={`${unidades(unidadesTotal)} ${unidadesTotal === 1 ? 'UNIDAD' : 'UNIDADES'}`} />
                <Fila etiqueta="Subtotal" valor={pesos(prendas)} />
                <Fila etiqueta={envio > 0 ? 'Envío' : 'Retiro en el local'} valor={envio > 0 ? pesos(envio) : '$ 0'} />
                <div className="mt-1 flex justify-between text-xs font-black">
                  <span>{cobrado ? 'TOTAL COBRADO' : 'A COBRAR'}</span>
                  <span>{pesos(pedido.total)}</span>
                </div>
                {pedido.nota && (
                  <div className="my-2.5 rounded-lg border border-amber-200 bg-amber-50/80 p-2">
                    <p className="text-[9px] font-black text-amber-900">NOTA</p>
                    <p className="mt-0.5 text-[9px] italic leading-tight text-amber-800">{pedido.nota}</p>
                  </div>
                )}
                {codigo && (
                  <div className="mt-2">
                    <Codigo valor={referencia} />
                    <p className="text-center text-[10px] tracking-widest text-muted">*{referencia}*</p>
                  </div>
                )}
                <p className="mt-1 text-center text-[9px] text-faint">Gracias por tu compra</p>
                {usuario?.slug && <p className="text-center font-mono text-[9px] text-faint">{usuario.slug}</p>}
              </div>
            </div>
          </section>

          <aside className="space-y-5 md:col-span-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Impresión</p>
              <p className="mt-2 rounded-2xl border border-line/90 p-3.5 text-xs leading-relaxed text-muted">La comanda se manda a la impresora que elijas en el navegador. Para una térmica, elegí el papel de 80 mm.</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Copias a imprimir</p>
              <div className="mt-2 flex items-center gap-3">
                <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-sunken text-sm font-bold text-ink hover:bg-sunken" onClick={() => setCopias((valor) => Math.max(1, valor - 1))} aria-label="Menos copias">−</button>
                <span className="w-12 text-center text-base font-black text-ink">{copias}</span>
                <button type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-sunken text-sm font-bold text-ink hover:bg-sunken" onClick={() => setCopias((valor) => Math.min(5, valor + 1))} aria-label="Más copias">+</button>
                <span className="text-xs text-faint">1 para el paquete</span>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Opciones</p>
              <label className="mt-2 flex items-center gap-2.5 text-xs font-semibold text-ink"><input type="checkbox" className="accent-fill" checked={codigo} onChange={(event) => setCodigo(event.target.checked)} />Incluir código de barras</label>
              <label className="mt-2 flex items-center gap-2.5 text-xs font-medium text-muted"><input type="checkbox" className="accent-fill" checked={deposito} onChange={(event) => setDeposito(event.target.checked)} />Imprimir una copia interna para depósito</label>
            </div>
            <div className="space-y-2.5 pt-2">
              <button type="button" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-fill py-3 text-sm font-bold text-onfill shadow-lg shadow-fill/25 hover:bg-fill-hover" onClick={imprimir}>Imprimir comanda (80mm)</button>
              {chat.length >= 8 && <button type="button" className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 py-2.5 text-sm font-bold text-emerald-800 hover:bg-emerald-100" onClick={enviar}>Enviar comanda por WhatsApp</button>}
              <button type="button" className="w-full py-1.5 text-center text-xs font-semibold text-muted hover:text-ink" onClick={onClose}>Cancelar</button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Fila({ etiqueta, valor }) {
  return (
    <div className="flex justify-between gap-3 text-[10px]">
      <span className="text-muted">{etiqueta}</span>
      <span className="text-right font-bold">{valor}</span>
    </div>
  );
}

function Recibo() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M7 3h10v18l-2-1.5L13 21l-2-1.5L9 21l-2-1.5L5 21V3h2z" />
      <path d="M9 8h6M9 12h6" />
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
