<script setup lang="ts">
definePageMeta({ layout: false })

const router = useRouter()
const user = useSupabaseUser()

// Supabase gère automatiquement l'échange du token depuis l'URL.
// Dès que l'utilisateur est authentifié, on le redirige vers l'app.
watch(user, (val) => {
  if (val) router.push('/')
}, { immediate: true })
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
    <div class="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    <p class="text-sm text-muted-foreground">Connexion en cours…</p>
  </div>
</template>
