const VERSION = 'v27.0';
const ORIGENES = new Set([
  'https://www.facebook.com',
  'https://web.facebook.com',
  'https://business.facebook.com',
  'https://m.facebook.com',
]);

export function prepararMeta(appId) {
  if (!appId) return Promise.resolve(false);
  const iniciar = () => {
    window.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version: VERSION });
    return true;
  };
  if (window.FB) {
    try { return Promise.resolve(iniciar()); } catch { return Promise.resolve(false); }
  }
  return new Promise((resolve) => {
    const previo = window.fbAsyncInit;
    window.fbAsyncInit = () => {
      try { previo?.(); } catch { /* el SDK anterior no es de Giro */ }
      try { resolve(iniciar()); } catch { resolve(false); }
    };
    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.src = 'https://connect.facebook.net/es_LA/sdk.js';
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    }
    const reloj = window.setInterval(() => {
      if (!window.FB) return;
      window.clearInterval(reloj);
      try { resolve(iniciar()); } catch { resolve(false); }
    }, 400);
    window.setTimeout(() => {
      window.clearInterval(reloj);
      resolve(Boolean(window.FB));
    }, 15000);
  });
}

// El SDK debe abrirse sin esperar una petición de red: conserva el gesto del clic.
export function abrirAltaMeta(configId, { signal } = {}) {
  return new Promise((resolve, reject) => {
    if (!configId) return reject(new Error('Falta la configuración de coexistencia en el servidor.'));
    if (!window.FB) return reject(new Error('El SDK de Meta todavía no cargó. Recargá Ajustes e intentá de nuevo.'));
    let cerrado = false;
    let esperaSesion;
    let limite;
    let code;
    let terminado = false;
    const sesion = { phoneNumberId: '', wabaId: '', onboardingType: '' };
    const limpiar = () => {
      window.removeEventListener('message', oir);
      signal?.removeEventListener('abort', abortar);
      window.clearTimeout(limite);
      window.clearTimeout(esperaSesion);
    };
    const finalizar = (error) => {
      if (cerrado) return;
      cerrado = true;
      limpiar();
      if (error) reject(error);
      else resolve({ code, ...sesion });
    };
    const abortar = () => finalizar(new Error('Se canceló la conexión con Meta. Volvé a empezar.'));
    const oir = (event) => {
      if (cerrado || !ORIGENES.has(event.origin)) return;
      let data;
      try { data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; }
      catch { return; }
      if (data?.type !== 'WA_EMBEDDED_SIGNUP') return;
      if (['FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING', 'FINISH', 'FINISH_GRANT_ONLY_API_ACCESS'].includes(data.event)) {
        const payload = data.data || {};
        sesion.phoneNumberId = payload.phone_number_id || payload.phoneNumberId || '';
        sesion.wabaId = payload.waba_id || payload.wabaId || '';
        // FINISH genérico no demuestra coexistencia. El servidor verifica is_on_biz_app.
        sesion.onboardingType = data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING' ? 'COEXISTENCIA' : '';
        terminado = true;
        if (code) finalizar();
      } else if (data.event === 'FINISH_ONLY_WABA') {
        finalizar(new Error('Meta no vinculó un número. Elegí conectar tu WhatsApp Business existente.'));
      } else if (data.event === 'CANCEL') {
        const paso = data.data?.current_step ? ` (${data.data.current_step})` : '';
        finalizar(new Error(`Cancelaste la conexión con Meta${paso}`));
      } else if (data.event === 'ERROR') {
        finalizar(new Error(errorAltaMeta(data.data?.error_message, data.data?.error_code)));
      }
    };
    window.addEventListener('message', oir);
    signal?.addEventListener('abort', abortar, { once: true });
    if (signal?.aborted) return abortar();
    limite = window.setTimeout(() => finalizar(new Error('Meta no completó la conexión. Cerrá la ventana pendiente y volvé a intentar.')), 5 * 60 * 1000);
    try {
      window.FB.login((response) => {
        if (cerrado) return;
        code = response?.authResponse?.code;
        if (!code) {
          finalizar(new Error(response?.status === 'not_authorized'
            ? 'No autorizaste la app de Meta. Aceptá los permisos y volvé a intentar.'
            : 'No se completó el login de Meta. Permití las ventanas emergentes de jirohub.com y tocá Finalizar.'));
        } else if (terminado) finalizar();
        // Algunos navegadores no entregan el evento de sesión. El backend resolverá
        // únicamente recursos autorizados, sin adivinar el tipo de conexión.
        else esperaSesion = window.setTimeout(() => finalizar(), 8000);
      }, {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: 'whatsapp_business_app_onboarding',
          sessionInfoVersion: '3',
          version: 'v4',
        },
      });
    } catch {
      finalizar(new Error('No se pudo abrir Meta. Permití las ventanas emergentes e intentá de nuevo.'));
    }
  });
}

function errorAltaMeta(mensaje, codigo) {
  if (String(codigo) === '2655111' || String(mensaje || '').includes('2655111')) {
    return 'Meta exige aprobar whatsapp_business_messaging y whatsapp_business_management mediante Revisión de la app. Usá el número de prueba mientras se aprueban.';
  }
  return mensaje || 'Meta no pudo completar el alta. Revisá los permisos de la app y volvé a intentar.';
}
