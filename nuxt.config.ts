import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  app: {
    head: {
      htmlAttrs: { lang: 'fr', class: 'dark' },
      title: 'Transponder — intercept terminal',
      meta: [
        { name: 'description', content: 'Transponder — reader RSS full-stack. Auth Supabase, curation par fréquence, parsing edge-side, briefings IA. Console de veille inspirée du cockpit.' },
        { name: 'theme-color', content: '#23211c' },
      ],
    },
  },

  runtimeConfig: {
    // Serveur uniquement (jamais exposé au client)
    openaiBaseUrl: 'http://localhost:11434/v1', // override via NUXT_OPENAI_BASE_URL
    openaiApiKey: 'ollama',                     // override via NUXT_OPENAI_API_KEY
    aiModel: 'llama3.2:3b',                     // override via NUXT_AI_MODEL
  },
  css: ['~/assets/css/tailwind.css'],

  vite: {
    plugins: [
      tailwindcss(),
    ],
  },

  modules: ['@nuxtjs/supabase', 'shadcn-nuxt'],

  supabase: {
    redirect: true,
    redirectOptions: {
      login: '/login',
      callback: '/auth/confirm',
      exclude: ['/login'],
    },
  },
  shadcn: {
    /**
     * Prefix for all the imported component.
     * @default "Ui"
     */
    prefix: '',
    /**
     * Directory that the component lives in.
     * Will respect the Nuxt aliases.
     * @link https://nuxt.com/docs/api/nuxt-config#alias
     * @default "@/components/ui"
     */
    componentDir: '@/components/ui'
  }
})