import { useEffect, useState } from 'react';
import { api } from '../api.js';

const atajos = {
  INGRESO: [2000, 5000, 10000, 15000, 20000],
  EGRESO: [1000, 2000, 5000, 10000, 20000],
};

const conceptos = {
  INGRESO: [
    { id: 'cambio', label: 'Aporte de cambio / sencillo', icono: 'alcancia' },
    { id: 'cobranza', label: 'Cobranza manual / cobro cta. cte.', icono: 'billete' },
    { id: 'tesoreria', label: 'Fondo adicional de tesorería', icono: 'banco' },
    { id: 'reintegro', label: 'Reintegro de gasto', icono: 'volver' },
    { id: 'otro', label: 'Otro concepto', icono: 'puntos' },
  ],
  EGRESO: [
    { id: 'insumos', label: 'Insumos / librería', icono: 'bolsa' },
    { id: 'proveedor', label: 'Pago a proveedor', icono: 'camion' },
    { id: 'retiro', label: 'Retiro de efectivo', icono: 'billetera' },
    { id: 'servicios', label: 'Limpieza / envíos', icono: 'chispas' },
    { id: 'otro', label: 'Otro concepto', icono: 'puntos' },
  ],
};

function pesos(valor) {
  const texto = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(Number(valor) || 0));
  return `$ ${texto}`;
}

function cuando(iso) {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  const dia = fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  const hora = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  return `${dia} ${hora} hs`;
}

function mostrar(digitos) {
  if (!digitos) return '';
  return Number(digitos).toLocaleString('es-AR');
}

export default function MovimientoCaja({ saldo, cajero, abiertaEn, onClose, onListo }) {
  const [tipo, setTipo] = useState('INGRESO');
  const [monto, setMonto] = useState('');
  const [conceptoId, setConceptoId] = useState('');
  const [otro, setOtro] = useState('');
  const [detalle, setDetalle] = useState('');
  const [comprobante, setComprobante] = useState('');
  const [falla, setFalla] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const ingreso = tipo === 'INGRESO';
  const valor = monto ? Number(monto) : 0;
  const nuevo = ingreso ? Number(saldo || 0) + valor : Number(saldo || 0) - valor;
  const elegido = conceptos[tipo].find((item) => item.id === conceptoId);
  const motivo = conceptoId === 'otro' ? otro.trim() : (elegido?.label || '');

  useEffect(() => {
    function tecla(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onClose]);

  function cambiarTipo(id) {
    setTipo(id);
    setConceptoId('');
    setOtro('');
    setFalla('');
  }

  async function guardar(event) {
    event.preventDefault();
    if (!(valor > 0)) {
      setFalla('El monto tiene que ser mayor a cero.');
      return;
    }
    if (!motivo) {
      setFalla('Elegí el concepto.');
      return;
    }
    const partes = [motivo, detalle.trim(), comprobante.trim()].filter(Boolean);
    const concepto = partes.join(' · ');
    if (concepto.length > 200) {
      setFalla('El detalle es demasiado largo. Acortalo para poder guardarlo.');
      return;
    }
    setOcupado(true);
    setFalla('');
    try {
      await api('/api/caja/movimientos', { method: 'POST', body: { tipo, concepto, monto: valor } });
      onListo();
    } catch (err) {
      setFalla(err.message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 pt-10 backdrop-blur-sm md:p-8" onClick={onClose}>
      <form className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-line bg-card font-sans text-ink shadow-2xl antialiased" onClick={(event) => event.stopPropagation()} onSubmit={guardar}>
        <header className="flex items-center justify-between border-b border-line bg-card px-7 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
              <Flechas className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black tracking-tight">+ Ingreso / Egreso de efectivo</h2>
                <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent">Caja de hoy</span>
              </div>
              <p className="mt-0.5 text-xs text-muted">
                El efectivo entra o sale del cajón de hoy{abiertaEn ? ` · abrió ${cuando(abiertaEn)}` : ''}.
              </p>
            </div>
          </div>
          <button type="button" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sunken text-faint transition-colors hover:bg-raise hover:text-ink" onClick={onClose} aria-label="Cerrar">
            <Cruz className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-5 overflow-y-auto px-7 py-6">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-sunken/90 p-1.5">
            <button type="button" className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors ${ingreso ? 'border border-emerald-500/20 bg-card font-black text-emerald-800 shadow-sm' : 'font-bold text-muted hover:text-ink'}`} onClick={() => cambiarTipo('INGRESO')}>
              <FlechaAbajo className={`h-4 w-4 ${ingreso ? 'text-emerald-600' : ''}`} />
              Ingreso de efectivo (+)
              {ingreso && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
            </button>
            <button type="button" className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors ${!ingreso ? 'border border-rose-500/20 bg-card font-black text-rose-700 shadow-sm' : 'font-bold text-muted hover:text-ink'}`} onClick={() => cambiarTipo('EGRESO')}>
              <FlechaArriba className={`h-4 w-4 ${!ingreso ? 'text-rose-600' : ''}`} />
              Egreso de efectivo (−)
              {!ingreso && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />}
            </button>
          </div>

          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-faint">
              {ingreso ? 'Monto a ingresar en el cajón' : 'Monto a retirar del cajón'}
            </p>
            <div className="mt-3 flex items-center justify-center">
              <span className="mr-2 text-2xl font-black text-faint">$</span>
              <input
                inputMode="numeric"
                className={`w-56 rounded-2xl border-2 px-5 py-2 text-center font-mono text-3xl font-black tracking-tight outline-none ${ingreso ? 'border-emerald-500/80 bg-emerald-50/20 text-emerald-600' : 'border-rose-500/80 bg-rose-50/20 text-rose-600'}`}
                value={mostrar(monto)}
                onChange={(event) => setMonto(event.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, ''))}
                aria-label={ingreso ? 'Monto a ingresar' : 'Monto a retirar'}
              />
              <span className="ml-2 text-xs font-bold text-faint">ARS</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs font-semibold text-faint">Atajos rápidos:</span>
              {atajos[tipo].map((atajo) => {
                const activo = valor === atajo;
                return (
                  <button
                    key={atajo}
                    type="button"
                    className={`rounded-full border px-2.5 py-1 text-xs ${activo
                      ? (ingreso ? 'border-emerald-400 bg-emerald-100 font-black text-emerald-800' : 'border-rose-400 bg-rose-100 font-black text-rose-800')
                      : 'border-line bg-card font-semibold text-muted hover:bg-sunken'}`}
                    onClick={() => setMonto(String(atajo))}
                  >
                    +{pesos(atajo)}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                {ingreso ? 'Concepto / motivo de entrada' : 'Concepto / motivo de salida'}
              </p>
              <p className="text-[11px] text-faint">Categoría obligatoria</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {conceptos[tipo].map((item) => {
                const activo = conceptoId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${activo ? 'border-2 border-accent bg-accent-soft font-bold text-accent' : 'border border-line font-medium text-ink hover:bg-sunken'}`}
                    onClick={() => setConceptoId(item.id)}
                  >
                    <Trazo nombre={item.icono} />
                    {item.label}
                  </button>
                );
              })}
            </div>
            {conceptoId === 'otro' && (
              <input
                className="mt-2 w-full rounded-xl border border-line bg-sunken px-3.5 py-2.5 text-xs text-ink outline-none transition-all placeholder:text-faint focus:border-accent focus:bg-card"
                placeholder="Escribí el concepto"
                value={otro}
                onChange={(event) => setOtro(event.target.value)}
              />
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-ink">Detalle / observación</span>
              <input
                className="mt-1 w-full rounded-xl border border-line bg-sunken px-3.5 py-2.5 text-xs text-ink outline-none transition-all placeholder:text-faint focus:border-accent focus:bg-card"
                placeholder={ingreso ? 'Por ejemplo, billetes chicos para cambio' : 'Por ejemplo, qué se pagó'}
                value={detalle}
                onChange={(event) => setDetalle(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink">Nº comprobante / recibo <span className="text-[10px] font-normal text-faint">(opcional)</span></span>
              <input
                className="mt-1 w-full rounded-xl border border-line bg-sunken px-3.5 py-2.5 text-xs text-ink outline-none transition-all placeholder:text-faint focus:border-accent focus:bg-card"
                placeholder="Si tenés un número, anotalo"
                value={comprobante}
                onChange={(event) => setComprobante(event.target.value)}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line/90 bg-sunken/90 p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
                <Calculadora className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold">Impacto estimado en el cajón</p>
                {cajero && <p className="mt-0.5 text-[11px] text-muted">Cajero: {cajero}</p>}
              </div>
            </div>
            <div className="flex flex-wrap items-center">
              <span className="text-xs font-medium text-muted">Saldo actual: {pesos(saldo)}</span>
              <span className="mx-2 font-bold text-faint">→</span>
              <span className={`rounded-lg border px-2.5 py-1 text-sm font-black ${ingreso ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-rose-200 bg-rose-50 text-rose-600'}`}>
                Nuevo saldo {valor > 0 ? `(${ingreso ? '+' : '−'} ${pesos(valor)}) ` : ''}{pesos(nuevo)}
              </span>
            </div>
          </div>

          {falla && <p className="text-sm font-semibold text-rose-600">{falla}</p>}
        </div>

        <footer className="flex items-center justify-between border-t border-line bg-card px-7 py-4">
          <p className="text-xs text-muted">Queda en el turno de hoy.</p>
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-xl px-4 py-2 text-sm font-semibold text-muted transition-colors hover:text-ink" onClick={onClose}>Cancelar</button>
            <button
              type="submit"
              disabled={ocupado || !(valor > 0) || !motivo}
              className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all disabled:opacity-40 ${ingreso ? 'bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700' : 'bg-rose-600 shadow-rose-600/20 hover:bg-rose-700'}`}
            >
              <CheckMini className="h-4 w-4" />
              {ingreso ? `Confirmar ingreso${valor > 0 ? ` (+ ${pesos(valor)})` : ''}` : `Confirmar egreso${valor > 0 ? ` (− ${pesos(valor)})` : ''}`}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

function Mini({ children, className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

function Flechas(props) {
  return <Mini {...props}><path d="M7 3v12" /><path d="M4 6l3-3 3 3" /><path d="M17 21V9" /><path d="M14 18l3 3 3-3" /></Mini>;
}
function Cruz(props) {
  return <Mini {...props}><path d="M6 6l12 12M18 6 6 18" /></Mini>;
}
function FlechaAbajo(props) {
  return <Mini {...props}><path d="M17 7 7 17" /><path d="M17 17H7V7" /></Mini>;
}
function FlechaArriba(props) {
  return <Mini {...props}><path d="M7 17 17 7" /><path d="M7 7h10v10" /></Mini>;
}
function Calculadora(props) {
  return <Mini {...props}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" /></Mini>;
}
function CheckMini(props) {
  return <Mini {...props}><path d="M5 12.5 10 17l9-10" /></Mini>;
}

function Trazo({ nombre }) {
  if (nombre === 'alcancia') return <Mini><path d="M5 11a7 7 0 0 1 14 0v5H5z" /><path d="M12 8V5M9 14h6" /></Mini>;
  if (nombre === 'billete') return <Mini><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2" /></Mini>;
  if (nombre === 'banco') return <Mini><path d="M4 10h16M6 10v7M10 10v7M14 10v7M18 10v7M4 17h16M12 4l8 6H4z" /></Mini>;
  if (nombre === 'volver') return <Mini><path d="M4 12a8 8 0 1 0 2.3-5.7" /><path d="M4 4v5h5" /></Mini>;
  if (nombre === 'bolsa') return <Mini><path d="M6 8h12l-1 12H7L6 8z" /><path d="M9 8V7a3 3 0 0 1 6 0v1" /></Mini>;
  if (nombre === 'camion') return <Mini><path d="M3 7h11v8H3z" /><path d="M14 10h4l3 3v2h-7" /><circle cx="7" cy="17.5" r="1.4" /><circle cx="17" cy="17.5" r="1.4" /></Mini>;
  if (nombre === 'billetera') return <Mini><rect x="3" y="7" width="18" height="12" rx="2" /><path d="M3 11h18" /><circle cx="16" cy="14" r="0.8" fill="currentColor" stroke="none" /></Mini>;
  if (nombre === 'chispas') return <Mini><path d="M12 3v4M12 17v4M4.5 6.5l2.8 2.8M16.7 16.7l2.8 2.8M3 12h4M17 12h4M4.5 17.5l2.8-2.8M16.7 7.3l2.8-2.8" /></Mini>;
  return <Mini><path d="M6 12h.01M12 12h.01M18 12h.01" /></Mini>;
}
