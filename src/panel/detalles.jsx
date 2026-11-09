export const RUBROS = [
  ['indumentaria', 'Indumentaria', ['talle', 'color', 'marca']],
  ['calzado', 'Calzado', ['calzado', 'marca', 'color']],
  ['alimentos', 'Alimentos', ['peso', 'marca']],
  ['electronica', 'Electrónica', ['marca', 'modelo']],
  ['ferreteria', 'Ferretería', ['medidas', 'peso', 'marca']],
  ['belleza', 'Belleza', ['marca', 'peso']],
  ['kiosco', 'Kiosco', ['marca']],
  ['servicios', 'Servicios', []],
];

export const DETALLES = [
  ['talle', 'Talle de ropa'],
  ['calzado', 'Número de calzado'],
  ['medidas', 'Medidas'],
  ['peso', 'Peso'],
  ['marca', 'Marca'],
  ['modelo', 'Modelo'],
  ['color', 'Color'],
  ['material', 'Material'],
];

export const CAMPOS = [
  ['marca', 'Marca', 'Ej: Nike'],
  ['modelo', 'Modelo', 'Ej: Air Max'],
  ['color', 'Color', 'Ej: Negro'],
  ['material', 'Material', 'Ej: Algodón'],
  ['medidas', 'Medidas', 'Ej: 40 x 30 cm'],
  ['peso', 'Peso', 'Ej: 500 g'],
];

export function camposDe(origen) {
  return {
    marca: origen?.marca || '',
    modelo: origen?.modelo || '',
    color: origen?.color || '',
    material: origen?.material || '',
    medidas: origen?.medidas || '',
    peso: origen?.peso || '',
  };
}

export function payloadDetalles(datos) {
  const cuerpo = {};
  for (const [id] of CAMPOS) cuerpo[id] = datos?.[id] ? String(datos[id]).trim() : null;
  return cuerpo;
}

export function CamposDetalle({ datos, onChange, activos }) {
  const visibles = CAMPOS.filter(([id]) => (activos || []).includes(id));
  if (!visibles.length) return null;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {visibles.map(([id, etiqueta, placeholder]) => (
        <label key={id} className="text-xs font-semibold text-muted">
          {etiqueta}
          <input
            className="mt-1 w-full rounded-xl border border-line bg-sunken px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
            placeholder={placeholder}
            value={datos[id] || ''}
            onChange={(event) => onChange(id, event.target.value)}
          />
        </label>
      ))}
    </div>
  );
}
