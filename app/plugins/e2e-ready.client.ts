/**
 * Expone en `window.__APP_READY__` el momento en que Nuxt terminó de hidratar
 * la app. La suite e2e espera esta señal antes de interactuar con formularios,
 * porque un `app.open()` puede resolver mientras la página todavía es HTML del
 * servidor.
 */
export default defineNuxtPlugin(() => {
  onNuxtReady(() => {
    (window as Window & { __APP_READY__?: boolean }).__APP_READY__ = true;
  });
});
