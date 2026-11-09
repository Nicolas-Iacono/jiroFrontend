import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { abrirAltaMeta } from '../src/panel/metaWhatsapp.js';

let callback;
let opciones;
let timers;
let listeners;
beforeEach(() => {
  callback = null;
  timers = new Map();
  listeners = new Set();
  let id = 0;
  globalThis.window = {
    FB: { login(cb, opts) { callback = cb; opciones = opts; } },
    addEventListener(type, cb) { if (type === 'message') listeners.add(cb); },
    removeEventListener(type, cb) { listeners.delete(cb); },
    setTimeout(cb, ms) { const n = ++id; timers.set(n, { cb, ms }); return n; },
    clearTimeout(n) { timers.delete(n); },
  };
});
function evento(event, data = {}, origin = 'https://www.facebook.com') {
  for (const cb of [...listeners]) cb({ origin, data: JSON.stringify({ type: 'WA_EMBEDDED_SIGNUP', event, data }) });
}
function tiempo(ms) {
  for (const t of [...timers.values()]) if (t.ms === ms) t.cb();
}

test('abre inmediatamente; espera código y FINISH en cualquier orden', async () => {
  const p = abrirAltaMeta('config-jiro');
  assert.equal(typeof callback, 'function');
  assert.equal(opciones.extras.featureType, 'whatsapp_business_app_onboarding');
  evento('FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING', { waba_id: '222', phone_number_id: '111' });
  callback({ authResponse: { code: 'codigo' } });
  assert.deepEqual(await p, { code: 'codigo', wabaId: '222', phoneNumberId: '111', onboardingType: 'COEXISTENCIA' });
  assert.equal(listeners.size, 0);
  assert.equal(timers.size, 0);
});

test('rechaza eventos falsos; no adivina coexistencia con FINISH genérico', async () => {
  const p = abrirAltaMeta('config-jiro');
  callback({ authResponse: { code: 'codigo' } });
  evento('FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING', { waba_id: 'otra' }, 'https://facebook.com.ejemplo.test');
  evento('FINISH', { waba_id: '222', phone_number_id: '111' });
  assert.equal((await p).onboardingType, '');
  assert.equal(listeners.size, 0);
});

test('cancelación limpia timers y un callback tardío no reabre el alta', async () => {
  const p = abrirAltaMeta('config-jiro');
  const rechazado = assert.rejects(p, /Cancelaste/);
  evento('CANCEL');
  callback({ authResponse: { code: 'tardio' } });
  await rechazado;
  assert.equal(timers.size, 0);
  assert.equal(listeners.size, 0);
});

test('una ventana sin respuesta vence y permite reintentar', async () => {
  const p = abrirAltaMeta('config-jiro');
  const rechazado = assert.rejects(p, /no completó/);
  tiempo(300000);
  await rechazado;
  assert.equal(listeners.size, 0);
});

test('si falta FINISH el servidor recibe el código, sin inventar IDs', async () => {
  const p = abrirAltaMeta('config-jiro');
  callback({ authResponse: { code: 'codigo' } });
  tiempo(8000);
  assert.deepEqual(await p, { code: 'codigo', phoneNumberId: '', wabaId: '', onboardingType: '' });
  assert.equal(timers.size, 0);
});

test('abortar la preparación en backend cancela también el listener de Meta', async () => {
  const c = new AbortController();
  const p = abrirAltaMeta('config-jiro', { signal: c.signal });
  const rechazado = assert.rejects(p, /canceló/);
  c.abort();
  await rechazado;
  assert.equal(listeners.size, 0);
  assert.equal(timers.size, 0);
});

test('el error de acceso avanzado muestra la acción pendiente en Meta', async () => {
  const p = abrirAltaMeta('config-jiro');
  const rechazado = assert.rejects(p, /Revisión de la app/);
  evento('ERROR', { error_code: 2655111 });
  await rechazado;
});
