<script setup lang="ts">
import { Radar, Mail, ArrowRight, CheckCircle2 } from '@lucide/vue'

definePageMeta({ layout: false })

const supabase = useSupabaseClient()
const router = useRouter()

const email = ref('')
const loading = ref(false)
const magicLinkSent = ref(false)
const errorMsg = ref('')

const user = useSupabaseUser()
watch(user, (val) => {
  if (val) router.push('/')
}, { immediate: true })

const zulu = ref('--:--:--')
let clockTimer: ReturnType<typeof setInterval> | undefined
function tickClock() {
  zulu.value = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC',
  }).format(new Date())
}
onMounted(() => {
  document.documentElement.classList.add('dark')
  tickClock()
  clockTimer = setInterval(tickClock, 1000)
})
onUnmounted(() => clearInterval(clockTimer))

async function sendMagicLink() {
  if (!email.value) return
  loading.value = true
  errorMsg.value = ''

  const { error } = await supabase.auth.signInWithOtp({
    email: email.value,
    options: { emailRedirectTo: `${useRuntimeConfig().public.siteUrl ?? window.location.origin}/auth/confirm` },
  })

  loading.value = false
  if (error) {
    errorMsg.value = error.message
  } else {
    magicLinkSent.value = true
  }
}

async function signInWithGitHub() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: `${useRuntimeConfig().public.siteUrl ?? window.location.origin}/auth/confirm` },
  })
  if (error) errorMsg.value = error.message
}
</script>

<template>
  <div class="dark min-h-screen flex items-center justify-center bg-background text-foreground px-4 bg-radar relative overflow-hidden">
    <div class="bg-grid pointer-events-none absolute inset-0 opacity-60" />

    <div class="relative w-full max-w-sm space-y-7">

      <!-- Wordmark -->
      <div class="text-center space-y-4">
        <span class="relative mx-auto grid place-items-center size-16 rounded-xl border border-primary/40 bg-primary/10 text-primary radar-sweep overflow-hidden">
          <Radar class="size-7 text-glow relative z-10" />
        </span>
        <div class="space-y-1.5">
          <h1 class="font-mono text-2xl font-semibold tracking-[0.22em]">TRANSPONDER</h1>
          <p class="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">RSS · Intercept &amp; Decode</p>
        </div>
      </div>

      <div class="rounded-lg border border-border bg-card/80 backdrop-blur-sm shadow-xl overflow-hidden">
        <!-- Strip header -->
        <div class="flex items-center justify-between px-5 h-10 border-b border-border/80 bg-sidebar/50">
          <span class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Authentification</span>
          <span class="flex items-center gap-1.5 font-mono text-[10px] tabular-nums text-muted-foreground">
            <span class="size-1.5 rounded-full bg-signal signal-dot" /> {{ zulu }}Z
          </span>
        </div>

        <div class="px-5 py-6 space-y-5">

          <!-- Lien envoyé -->
          <template v-if="magicLinkSent">
            <div class="flex flex-col items-center text-center space-y-3 py-2">
              <CheckCircle2 class="size-9 text-signal" />
              <div class="space-y-1">
                <p class="font-medium text-sm">Lien transmis</p>
                <p class="text-sm text-muted-foreground leading-relaxed">
                  Un lien de connexion a été envoyé à<br><strong class="text-foreground">{{ email }}</strong>
                </p>
              </div>
            </div>
            <Button variant="ghost" class="w-full font-mono text-xs uppercase tracking-wider" @click="magicLinkSent = false">
              Changer d'adresse
            </Button>
          </template>

          <!-- Formulaire -->
          <template v-else>
            <div class="space-y-2">
              <label for="email" class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Identifiant email</label>
              <div class="relative">
                <Mail class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  v-model="email"
                  type="email"
                  placeholder="operateur@exemple.com"
                  autocomplete="email"
                  class="pl-9 font-mono text-sm"
                  @keyup.enter="sendMagicLink"
                />
              </div>
            </div>

            <p v-if="errorMsg" class="font-mono text-xs text-destructive">{{ errorMsg }}</p>

            <Button class="w-full gap-2 font-mono text-xs uppercase tracking-widest" :disabled="loading || !email" @click="sendMagicLink">
              <span v-if="loading">Transmission…</span>
              <template v-else>
                Envoyer le magic link <ArrowRight class="size-3.5" />
              </template>
            </Button>

            <div class="relative py-1">
              <div class="absolute inset-0 flex items-center"><Separator class="opacity-60" /></div>
              <div class="relative flex justify-center">
                <span class="bg-card px-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">ou</span>
              </div>
            </div>

            <Button variant="outline" class="w-full gap-2 font-mono text-xs uppercase tracking-wider" @click="signInWithGitHub">
              <svg viewBox="0 0 24 24" class="size-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
              </svg>
              Continuer avec GitHub
            </Button>
          </template>

        </div>
      </div>

      <p class="text-center font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground/60">
        Supabase Auth · Nuxt 4 · Edge RSS
      </p>

    </div>
  </div>
</template>
