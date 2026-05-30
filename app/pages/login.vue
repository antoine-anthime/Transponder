<script setup lang="ts">
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
  <div class="min-h-screen flex items-center justify-center bg-background px-4">
    <div class="w-full max-w-sm space-y-6">

      <!-- Logo / titre -->
      <div class="text-center space-y-1">
        <h1 class="text-2xl font-bold tracking-tight">Orbit News</h1>
        <p class="text-sm text-muted-foreground">Ton reader RSS personnel</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle class="text-lg">Connexion</CardTitle>
          <CardDescription>Via magic link email ou GitHub</CardDescription>
        </CardHeader>

        <CardContent class="space-y-4">

          <!-- État : lien envoyé -->
          <template v-if="magicLinkSent">
            <div class="rounded-md bg-muted p-4 text-sm text-center space-y-1">
              <p class="font-medium">Vérifie ta boîte mail ✉️</p>
              <p class="text-muted-foreground">Un lien de connexion a été envoyé à <strong>{{ email }}</strong></p>
            </div>
            <Button variant="ghost" class="w-full" @click="magicLinkSent = false">
              Utiliser une autre adresse
            </Button>
          </template>

          <!-- Formulaire -->
          <template v-else>
            <div class="space-y-2">
              <label for="email" class="text-sm font-medium">Email</label>
              <Input
                id="email"
                v-model="email"
                type="email"
                placeholder="toi@exemple.com"
                autocomplete="email"
                @keyup.enter="sendMagicLink"
              />
            </div>

            <p v-if="errorMsg" class="text-sm text-destructive">{{ errorMsg }}</p>

            <Button class="w-full" :disabled="loading || !email" @click="sendMagicLink">
              <span v-if="loading">Envoi en cours…</span>
              <span v-else>Envoyer un magic link</span>
            </Button>

            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div class="relative flex justify-center text-xs uppercase">
                <span class="bg-card px-2 text-muted-foreground">ou</span>
              </div>
            </div>

            <Button variant="outline" class="w-full gap-2" @click="signInWithGitHub">
              <svg viewBox="0 0 24 24" class="size-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
              </svg>
              Continuer avec GitHub
            </Button>
          </template>

        </CardContent>
      </Card>

    </div>
  </div>
</template>
