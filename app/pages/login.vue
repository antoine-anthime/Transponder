<script setup lang="ts">
import { Radar, Mail, Lock, ArrowRight, CheckCircle2, Eye, EyeOff, Loader2 } from '@lucide/vue'

definePageMeta({ layout: false })

const supabase = useSupabaseClient()
const router = useRouter()

const user = useSupabaseUser()
watch(user, (val) => {
  if (val) router.push('/')
}, { immediate: true })

// ── Vues : auth (signin/signup) · forgot · forgot-sent ──
type View = 'auth' | 'forgot' | 'forgot-sent'
const view = ref<View>('auth')
const mode = ref<'signin' | 'signup'>('signin')

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMsg = ref('')
const infoMsg = ref('')

const siteUrl = computed(() =>
  (useRuntimeConfig().public.siteUrl as string) || (import.meta.client ? window.location.origin : ''),
)

const isSignup = computed(() => mode.value === 'signup')
const submitLabel = computed(() => (isSignup.value ? 'Créer le compte' : 'Se connecter'))
const canSubmit = computed(() =>
  email.value.trim().length > 3 && password.value.length >= 6 && !loading.value,
)

// ── Horloge Zulu ─────────────────────────────────────────
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

// ── Mapping des erreurs Supabase → FR ────────────────────
function frenchError(raw: string): string {
  const m = raw.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Identifiants incorrects. Vérifie ton email et ton mot de passe.'
  if (m.includes('user already registered')) return 'Un compte existe déjà avec cet email. Connecte-toi.'
  if (m.includes('password should be at least')) return 'Le mot de passe doit contenir au moins 6 caractères.'
  if (m.includes('email not confirmed')) return 'Email non confirmé. Vérifie ta boîte de réception.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Trop de tentatives. Réessaie dans quelques minutes.'
  if (m.includes('unable to validate email')) return 'Adresse email invalide.'
  return raw
}

function resetMessages() {
  errorMsg.value = ''
  infoMsg.value = ''
}

function switchMode(next: 'signin' | 'signup') {
  mode.value = next
  resetMessages()
}

// ── Soumission email + mot de passe ──────────────────────
async function submit() {
  if (!canSubmit.value) return
  loading.value = true
  resetMessages()

  if (isSignup.value) {
    const { data, error } = await supabase.auth.signUp({
      email: email.value.trim(),
      password: password.value,
      options: { emailRedirectTo: `${siteUrl.value}/auth/confirm` },
    })
    loading.value = false
    if (error) {
      errorMsg.value = frenchError(error.message)
      return
    }
    // Si la confirmation email est désactivée → session immédiate → watch redirige.
    // Sinon, pas de session : on informe l'utilisateur.
    if (!data.session) {
      infoMsg.value = 'Compte créé. Vérifie ton email pour confirmer ton inscription.'
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value,
    })
    loading.value = false
    if (error) errorMsg.value = frenchError(error.message)
  }
}

// ── GitHub OAuth ─────────────────────────────────────────
async function signInWithGitHub() {
  resetMessages()
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: `${siteUrl.value}/auth/confirm` },
  })
  if (error) errorMsg.value = frenchError(error.message)
}

// ── Mot de passe oublié ──────────────────────────────────
function openForgot() {
  view.value = 'forgot'
  resetMessages()
}
function backToAuth() {
  view.value = 'auth'
  resetMessages()
}
async function sendReset() {
  if (!email.value.trim()) return
  loading.value = true
  resetMessages()
  const { error } = await supabase.auth.resetPasswordForEmail(email.value.trim(), {
    redirectTo: `${siteUrl.value}/auth/reset-password`,
  })
  loading.value = false
  if (error) {
    errorMsg.value = frenchError(error.message)
  } else {
    view.value = 'forgot-sent'
  }
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
          <span class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {{ view === 'auth' ? 'Authentification' : 'Récupération' }}
          </span>
          <span class="flex items-center gap-1.5 font-mono text-[10px] tabular-nums text-muted-foreground">
            <span class="size-1.5 rounded-full bg-signal signal-dot" /> {{ zulu }}Z
          </span>
        </div>

        <div class="px-5 py-6 space-y-5">

          <!-- ─── Vue AUTH (connexion / inscription) ─────────── -->
          <template v-if="view === 'auth'">
            <!-- Toggle -->
            <div class="grid grid-cols-2 gap-1 p-1 rounded-md bg-secondary/50 border border-border/60">
              <button
                class="py-1.5 rounded font-mono text-[11px] uppercase tracking-wider transition-colors cursor-pointer"
                :class="!isSignup ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'"
                @click="switchMode('signin')"
              >
                Connexion
              </button>
              <button
                class="py-1.5 rounded font-mono text-[11px] uppercase tracking-wider transition-colors cursor-pointer"
                :class="isSignup ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'"
                @click="switchMode('signup')"
              >
                Inscription
              </button>
            </div>

            <!-- Email -->
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
                  @keyup.enter="submit"
                />
              </div>
            </div>

            <!-- Mot de passe -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label for="password" class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Mot de passe</label>
                <button
                  v-if="!isSignup"
                  type="button"
                  class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  @click="openForgot"
                >
                  Oublié ?
                </button>
              </div>
              <div class="relative">
                <Lock class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="••••••••"
                  :autocomplete="isSignup ? 'new-password' : 'current-password'"
                  class="pl-9 pr-9 font-mono text-sm"
                  @keyup.enter="submit"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  :title="showPassword ? 'Masquer' : 'Afficher'"
                  @click="showPassword = !showPassword"
                >
                  <EyeOff v-if="showPassword" class="size-4" />
                  <Eye v-else class="size-4" />
                </button>
              </div>
              <p v-if="isSignup" class="font-mono text-[10px] text-muted-foreground/70">Minimum 6 caractères.</p>
            </div>

            <p v-if="errorMsg" class="font-mono text-xs text-destructive leading-relaxed">{{ errorMsg }}</p>
            <p v-if="infoMsg" class="flex items-start gap-2 font-mono text-xs text-signal leading-relaxed">
              <CheckCircle2 class="size-3.5 shrink-0 mt-0.5" /> {{ infoMsg }}
            </p>

            <Button class="w-full gap-2 font-mono text-xs uppercase tracking-widest" :disabled="!canSubmit" @click="submit">
              <Loader2 v-if="loading" class="size-3.5 animate-spin" />
              <template v-else>
                {{ submitLabel }} <ArrowRight class="size-3.5" />
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

          <!-- ─── Vue FORGOT (saisie email) ──────────────────── -->
          <template v-else-if="view === 'forgot'">
            <div class="space-y-1.5">
              <p class="font-medium text-sm">Réinitialiser le mot de passe</p>
              <p class="text-xs text-muted-foreground leading-relaxed">
                Entre ton email : un lien de réinitialisation te sera envoyé.
              </p>
            </div>

            <div class="space-y-2">
              <label for="forgot-email" class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Identifiant email</label>
              <div class="relative">
                <Mail class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="forgot-email"
                  v-model="email"
                  type="email"
                  placeholder="operateur@exemple.com"
                  autocomplete="email"
                  class="pl-9 font-mono text-sm"
                  @keyup.enter="sendReset"
                />
              </div>
            </div>

            <p v-if="errorMsg" class="font-mono text-xs text-destructive leading-relaxed">{{ errorMsg }}</p>

            <Button class="w-full gap-2 font-mono text-xs uppercase tracking-widest" :disabled="loading || !email" @click="sendReset">
              <Loader2 v-if="loading" class="size-3.5 animate-spin" />
              <template v-else>
                Envoyer le lien <ArrowRight class="size-3.5" />
              </template>
            </Button>
            <Button variant="ghost" class="w-full font-mono text-xs uppercase tracking-wider" @click="backToAuth">
              Retour
            </Button>
          </template>

          <!-- ─── Vue FORGOT-SENT ────────────────────────────── -->
          <template v-else>
            <div class="flex flex-col items-center text-center space-y-3 py-2">
              <CheckCircle2 class="size-9 text-signal" />
              <div class="space-y-1">
                <p class="font-medium text-sm">Lien transmis</p>
                <p class="text-sm text-muted-foreground leading-relaxed">
                  Si un compte existe pour<br><strong class="text-foreground">{{ email }}</strong>,<br>un lien de réinitialisation vient d'être envoyé.
                </p>
              </div>
            </div>
            <Button variant="ghost" class="w-full font-mono text-xs uppercase tracking-wider" @click="backToAuth">
              Retour à la connexion
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
