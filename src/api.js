const apiBase = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function urlApi(path) {
  return `${apiBase}${path}`;
}

export function urlVidriera(slug) {
  const base = String(import.meta.env.VITE_TIENDA_URL || '').replace(/\/$/, '');
  const origen = base || `${window.location.protocol}//${window.location.hostname}:5174`;
  return slug ? `${origen}/${slug}` : origen;
}

export function token() {
  return localStorage.getItem('giro_token');
}

export function sesion() {
  const raw = localStorage.getItem('giro_usuario');
  return raw ? JSON.parse(raw) : null;
}

export function guardarSesion(data) {
  localStorage.setItem('giro_token', data.token);
  if (data.usuario) localStorage.setItem('giro_usuario', JSON.stringify(data.usuario));
}

export function salir() {
  localStorage.removeItem('giro_token');
  localStorage.removeItem('giro_usuario');
}

let renovacion = null;

export function renovar() {
  if (!token()) return Promise.reject(new Error('Tenés que iniciar sesión'));
  if (!renovacion) {
    renovacion = fetch(urlApi('/api/auth/refresh'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}` },
    }).then(async (response) => {
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      if (!response.ok || !data?.token) {
        const error = new Error(data?.mensaje || 'Tenés que iniciar sesión');
        error.status = response.status;
        throw error;
      }
      guardarSesion(data);
      return data.token;
    }).finally(() => { renovacion = null; });
  }
  return renovacion;
}

export async function pedir(path, options = {}, reintento = true) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !(options.body instanceof FormData) && typeof options.body !== 'string') {
    headers['Content-Type'] = 'application/json';
  }
  if (token()) headers.Authorization = `Bearer ${token()}`;
  const response = await fetch(urlApi(path), {
    ...options,
    headers,
    body: options.body instanceof FormData || options.body == null || typeof options.body === 'string'
      ? options.body
      : JSON.stringify(options.body),
  });
  if (response.status === 401 && reintento && token() && path !== '/api/auth/refresh' && path !== '/api/auth/login' && path !== '/api/auth/registro') {
    await renovar();
    return pedir(path, options, false);
  }
  return response;
}

export async function api(path, options = {}) {
  const response = await pedir(path, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(data?.mensaje || 'No se pudo completar la operación');
    error.status = response.status;
    throw error;
  }
  return data;
}

export function urlFoto(producto, imagenId) {
  const fotos = producto?.fotos || [];
  const foto = fotos.find((item) => String(item.id) === String(imagenId)) || (imagenId == null ? fotos[0] : null);
  return foto?.url || '';
}

export function plata(valor) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(valor || 0));
}
