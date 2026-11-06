import type { Browser } from '@e2e-dev/web';

/**
 * Espera a que Vue monte la app en el cliente.
 *
 * `app.open()` resuelve cuando la página cargó, pero no cuando terminó la
 * hidratación. Sin esto, una interacción temprana (subir un archivo, escribir
 * en el chat) puede perderse en un formulario que todavía es HTML del servidor.
 */
export async function waitForHydration(browser: Browser, timeout = 15_000) {
  await browser.evaluate((limit) => {
    return new Promise<void>((resolve) => {
      const deadline = Date.now() + limit;
      const check = () => {
        if ((window as Window & { __APP_READY__?: boolean }).__APP_READY__) resolve();
        else if (Date.now() > deadline) resolve();
        else requestAnimationFrame(check);
      };
      check();
    });
  }, timeout);
}
