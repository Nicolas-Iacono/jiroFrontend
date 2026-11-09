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

export function abrirAltaMeta(configId) {
  return new Promise((resolve, reject) => {
    if (!configId) {
      reject(new Error('Falta la configuración de coexistencia en el servidor.'));
      return;
    }
    if (!window.FB) {
      reject(new Error('El SDK de Meta todavía no cargó. Recargá Ajustes e intentá de nuevo.'));
      return;
    }
    const sesion = { phoneNumberId: '', wabaId: '', onboardingType: '', terminado: false, error: '' };
    const oir = (event) => {
      if (!ORIGENES.has(event.origin)) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type !== 'WA_EMBEDDED_SIGNUP') return;
        if (data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING' || data.event === 'FINISH' || data.event === 'FINISH_GRANT_ONLY_API_ACCESS') {
          const payload = data.data || {};
          sesion.phoneNumberId = payload.phone_number_id || payload.phoneNumberId || sesion.phoneNumberId;
          sesion.wabaId = payload.waba_id || payload.wabaId || sesion.wabaId;
          sesion.onboardingType = data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING' ? 'COEXISTENCIA' : 'ESTANDAR';
          sesion.terminado = true;
        } else if (data.event === 'FINISH_ONLY_WABA') {
          sesion.error = 'Meta no vinculó un número. La coexistencia necesita el WhatsApp Business del celular.';
        } else if (data.event === 'CANCEL') {
          window.removeEventListener('message', oir);
          const paso = data.data?.current_step ? ` (${data.data.current_step})` : '';
          reject(new Error(`Cancelaste la conexión con Meta${paso}`));
        } else if (data.event === 'ERROR') {
          window.removeEventListener('message', oir);
          reject(new Error(data.data?.error_message || 'Meta no pudo completar el alta'));
        }
      } catch { /* mensajes que no son del alta */ }
    };
    window.addEventListener('message', oir);
    const terminar = (response) => {
      const code = response?.authResponse?.code;
      if (!code) {
        window.removeEventListener('message', oir);
        if (response?.status === 'not_authorized') {
          reject(new Error('No autorizaste la app de Meta. Aceptá los permisos y volvé a intentar.'));
          return;
        }
        reject(new Error(sesion.error || 'No se completó el login de Meta. Permití las ventanas emergentes de jirohub.com y tocá Finalizar.'));
        return;
      }
      let intentos = 0;
      const esperar = () => {
        if (sesion.error) {
          window.removeEventListener('message', oir);
          reject(new Error(sesion.error));
          return;
        }
        if (sesion.terminado || intentos >= 8) {
          window.removeEventListener('message', oir);
          resolve({ code, phoneNumberId: sesion.phoneNumberId, wabaId: sesion.wabaId, onboardingType: sesion.onboardingType || 'COEXISTENCIA' });
          return;
        }
        intentos += 1;
        window.setTimeout(esperar, 350);
      };
      esperar();
    };
    try {
      window.FB.login(terminar, {
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
      window.removeEventListener('message', oir);
      reject(new Error('No se pudo abrir Meta. Probá con Chrome.'));
    }
  });
}
