import tailwindcss from '@tailwindcss/vite';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: 'latest',
  // El overlay de DevTools inyecta nodos y recargas que ensucian la suite e2e.
  devtools: { enabled: !process.env.E2E_TEST },
  vite: {
    plugins: [tailwindcss()],
    // Evita que Vite descubra estas dependencias en el primer render y recargue
    // la página en medio de un test e2e.
    optimizeDeps: {
      include: ['@lucide/vue', '@tanstack/ai-vue', '@tanstack/vue-table'],
    },
  },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    tavilyApiKey: '',
    openaiApiKey: '',
    anthropicApiKey: '',
    baseUrl: '',
    modelApiKey: '',
    defaultModel: '',
  },
});
