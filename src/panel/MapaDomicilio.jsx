import { useEffect, useRef, useState } from 'react';

const puntos = new Map();

function textoDe(partes) {
  return [partes.direccion, partes.altura, partes.localidad, partes.partido, partes.provincia, partes.codigoPostal, 'Argentina']
    .map((valor) => String(valor || '').trim())
    .filter(Boolean)
    .join(', ');
}

function alcanza(partes) {
  return Boolean(String(partes.direccion || '').trim() && (String(partes.localidad || '').trim() || String(partes.provincia || '').trim()));
}

async function ubicar(partes, signal) {
  const consulta = textoDe(partes);
  if (puntos.has(consulta)) return puntos.get(consulta);
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ar&q=${encodeURIComponent(consulta)}`;
  const respuesta = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!respuesta.ok) throw new Error('mapa');
  const lista = await respuesta.json();
  const primero = Array.isArray(lista) ? lista[0] : null;
  const lat = Number(primero?.lat);
  const lon = Number(primero?.lon);
  const punto = Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
  puntos.set(consulta, punto);
  return punto;
}

function mosaico(lat, lon, zoom) {
  const n = 2 ** zoom;
  const x = ((lon + 180) / 360) * n;
  const rad = (lat * Math.PI) / 180;
  const y = (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * n;
  return { x, y, n };
}

function Lienzo({ lat, lon, marca }) {
  const marco = useRef(null);
  const [tamano, setTamano] = useState({ w: 0, h: 176 });
  useEffect(() => {
    const nodo = marco.current;
    if (!nodo) return undefined;
    const medir = () => setTamano({ w: nodo.clientWidth, h: nodo.clientHeight });
    medir();
    const observer = new ResizeObserver(medir);
    observer.observe(nodo);
    return () => observer.disconnect();
  }, []);

  const zoom = 16;
  const punto = mosaico(lat, lon, zoom);
  const origenX = tamano.w / 2 - punto.x * 256;
  const origenY = tamano.h / 2 - punto.y * 256;
  const baldosas = [];
  if (tamano.w > 0) {
    const x0 = Math.floor(-origenX / 256);
    const x1 = Math.floor((tamano.w - origenX) / 256);
    const y0 = Math.floor(-origenY / 256);
    const y1 = Math.floor((tamano.h - origenY) / 256);
    for (let x = x0; x <= x1; x += 1) {
      for (let y = y0; y <= y1; y += 1) {
        if (y < 0 || y >= punto.n) continue;
        const columna = ((x % punto.n) + punto.n) % punto.n;
        baldosas.push({ x, y, columna, left: origenX + x * 256, top: origenY + y * 256 });
      }
    }
  }
  const enlace = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;

  return (
    <div ref={marco} className="relative h-44 overflow-hidden rounded-xl bg-sunken">
      {baldosas.map((baldosa) => (
        <img
          key={`${baldosa.x}-${baldosa.y}`}
          alt=""
          className="absolute max-w-none"
          width="256"
          height="256"
          style={{ left: baldosa.left, top: baldosa.top }}
          src={`https://tile.openstreetmap.org/${zoom}/${baldosa.columna}/${baldosa.y}.png`}
        />
      ))}
      <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
        {marca === 'punto' ? <Punto /> : <Casa />}
      </span>
      <a className="absolute bottom-1 right-1 rounded bg-card/90 px-1.5 py-0.5 text-[10px] font-medium text-muted" href={enlace} target="_blank" rel="noreferrer">Mapa © OpenStreetMap</a>
    </div>
  );
}

function Casa() {
  return (
    <svg viewBox="0 0 36 48" className="h-12 w-9 drop-shadow-md" aria-hidden="true">
      <path fill="var(--fill-c)" d="M18 47c-7-9-15-17-15-26a15 15 0 0 1 30 0c0 9-8 17-15 26z" />
      <path fill="#fff" d="M10 24.5 18 17l8 7.5V32H10z" />
      <path fill="var(--fill-c)" d="M16 32v-5h4v5z" />
    </svg>
  );
}

function Punto() {
  return (
    <svg viewBox="0 0 36 48" className="h-12 w-9 drop-shadow-md" aria-hidden="true">
      <path fill="#0F172A" d="M18 47c-7-9-15-17-15-26a15 15 0 0 1 30 0c0 9-8 17-15 26z" />
      <rect x="11" y="18" width="14" height="12" rx="1.5" fill="#fff" />
      <path fill="#0F172A" d="M14 24h3v6h-3zM19 22h3v8h-3z" />
    </svg>
  );
}

export default function MapaDomicilio({ direccion, altura, localidad, partido, provincia, codigoPostal, lat, lon, marca = 'casa' }) {
  const fijo = Number.isFinite(Number(lat)) && Number.isFinite(Number(lon));
  const partes = { direccion, altura, localidad, partido, provincia, codigoPostal };
  const consulta = textoDe(partes);
  const [punto, setPunto] = useState(undefined);
  useEffect(() => {
    if (fijo || !alcanza(partes)) {
      setPunto(undefined);
      return undefined;
    }
    let vivo = true;
    setPunto(undefined);
    const control = new AbortController();
    const espera = setTimeout(() => {
      ubicar(partes, control.signal)
        .then((resultado) => { if (vivo) setPunto(resultado); })
        .catch((error) => {
          if (vivo && error.name !== 'AbortError') setPunto(null);
        });
    }, 450);
    return () => {
      vivo = false;
      clearTimeout(espera);
      control.abort();
    };
  }, [consulta, fijo]);

  if (fijo) return <Lienzo lat={Number(lat)} lon={Number(lon)} marca={marca} />;
  if (!alcanza(partes)) return null;
  if (punto === undefined) return <p className="rounded-xl bg-sunken px-3 py-6 text-center text-xs text-faint">Buscando el domicilio en el mapa…</p>;
  if (!punto) return <p className="rounded-xl bg-sunken px-3 py-6 text-center text-xs text-faint">No encontré ese domicilio en el mapa.</p>;
  return <Lienzo lat={punto.lat} lon={punto.lon} marca={marca} />;
}
