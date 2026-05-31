<script setup lang="ts">
import { Radar, Lock, ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, AlertCircle } from '@lucide/vue'

definePageMeta({ layout: false })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()

const password = ref('')
const confirm = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMsg = ref('')
const done = ref(false)

// La session de récupération s'établit via le lien email. Si après un court
// délai aucun utilisateur n'est détecté, le lien est invalide ou expiré.
const sessionReady = ref(false)
const linkInvalid = ref(false)

onMounted(() => {
  document.documentElement.classList.add('dark')
  setTimeout(() => {
    if (user.value) sessionReady.value = true
    else linkInvalid.value = true
  }, 1500)
})

watch(user, (val) => {
  if (val) {
    sessionReady.value = true
    linkInvalid.value = false
  }
}, { immediate: true })

const canSubmit = computed(() =>
  password.value.length >= 6 && password.value === confirm.value && !loading.value,
)

const mismatch = computed(() =>
  confirm.value.length > 0 && password.value !== confirm.value,
)

async function updatePassword() {
  if (!canSubmit.value) return
  loading.value = true
  errorMsg.value = ''

  const { error } = await supabase.auth.updateUser({ password: password.value })
  loading.value = false

  if (error) {
    errorMsg.value = error.message.toLowerCase().includes('should be at least')
      ? 'Le mot de passe doit contenir au moins 6 caractères.'
      : error.message
    return
  }

  done.value = true
  setTimeout(() => router.push('/'), 1400)
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
          <p class="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Nouveau mot de passe</p>
        </div>
      </div>

      <div class="rounded-lg border border-border bg-card/80 backdrop-blur-sm shadow-xl overflow-hidden">
        <div class="flex items-center justify-between px-5 h-10 border-b border-border/80 bg-sidebar/50">
          <span class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Réinitialisation</span>
          <span class="size-1.5 rounded-full bg-signal signal-dot" />
        </div>

        <div class="px-5 py-6 space-y-5">

          <!-- Succès -->
          <template v-if="done">
            <div class="flex flex-col items-center text-center space-y-3 py-3">
              <CheckCircle2 class="size-9 text-signal" />
              <div class="space-y-1">
                <p class="font-medium text-sm">Mot de passe mis à jour</p>
                <p class="text-sm text-muted-foreground leading-relaxed">Redirection vers la console…</p>
              </div>
            </div>
          </template>

          <!-- Lien invalide -->
          <template v-else-if="linkInvalid">
            <div class="flex flex-col items-center text-center space-y-3 py-3">
              <AlertCircle class="size-9 text-destructive" />
              <div class="space-y-1">
                <p class="font-medium text-sm">Lien invalide ou expiré</p>
                <p class="text-sm text-muted-foreground leading-relaxed">
                  Ce lien de réinitialisation n'est plus valide. Demande-en un nouveau.
                </p>
              </div>
            </div>
            <Button variant="outline" class="w-full font-mono text-xs uppercase tracking-wider" @click="router.push('/login')">
              Retour à la connexion
            </Button>
          </template>

          <!-- Chargement session -->
          <template v-else-if="!sessionReady">
            <div class="flex flex-col items-center text-center space-y-3 py-5">
              <Loader2 class="size-7 text-primary animate-spin" />
              <p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Vérification du lien…</p>
            </div>
          </template>

          <!-- Formulaire -->
          <template v-else>
            <div class="space-y-2">
              <label for="new-password" class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Nouveau mot de passe</label>
              <div class="relative">
                <Lock class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="new-password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="••••••••"
                  autocomplete="new-password"
                  class="pl-9 pr-9 font-mono text-sm"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  @click="showPassword = !showPassword"
                >
                  <EyeOff v-if="showPassword" class="size-4" />
                  <Eye v-else class="size-4" />
                </button>
              </div>
              <p class="font-mono text-[10px] text-muted-foreground/70">Minimum 6 caractères.</p>
            </div>

            <div class="space-y-2">
              <label for="confirm-password" class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Confirmer</label>
              <div class="relative">
                <Lock class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="confirm-password"
                  v-model="confirm"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="••••••••"
                  autocomplete="new-password"
                  class="pl-9 font-mono text-sm"
                  @keyup.enter="updatePassword"
                />
              </div>
              <p v-if="mismatch" class="font-mono text-[10px] text-destructive">Les mots de passe ne correspondent pas.</p>
            </div>

            <p v-if="errorMsg" class="font-mono text-xs text-destructive leading-relaxed">{{ errorMsg }}</p>

            <Button class="w-full gap-2 font-mono text-xs uppercase tracking-widest" :disabled="!canSubmit" @click="updatePassword">
              <Loader2 v-if="loading" class="size-3.5 animate-spin" />
              <template v-else>
                Mettre à jour <ArrowRight class="size-3.5" />
              </template>
            </Button>
          </template>

        </div>
      </div>

    </div>
  </div>
</template>
