<script setup lang="ts">
import { Radar } from '@lucide/vue'

definePageMeta({ layout: false })

const router = useRouter()
const user = useSupabaseUser()

onMounted(() => document.documentElement.classList.add('dark'))

watch(user, (val) => {
  if (val) router.push('/')
}, { immediate: true })
</script>

<template>
  <div class="dark min-h-screen flex flex-col items-center justify-center gap-6 bg-background text-foreground bg-radar">
    <div class="relative grid place-items-center size-20 rounded-full border border-primary/30 bg-primary/5 radar-sweep overflow-hidden">
      <Radar class="size-7 text-primary text-glow relative z-10" />
    </div>
    <div class="text-center space-y-1.5">
      <p class="font-mono text-sm font-semibold uppercase tracking-[0.2em]">Liaison établie</p>
      <p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Authentification en cours…</p>
    </div>
  </div>
</template>
