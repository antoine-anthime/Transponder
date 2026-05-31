<script setup lang="ts">
import { Link, Loader2, CheckCircle2, AlertCircle, Rss } from '@lucide/vue'

const emit = defineEmits<{ added: [] }>()

const { addUserFeed } = useUserFeeds()

const open = defineModel<boolean>('open', { default: false })

type Step = 'input' | 'validated' | 'adding'

const step = ref<Step>('input')
const url = ref('')
const detectedName = ref('')
const detectedDescription = ref('')
const validating = ref(false)
const error = ref('')

async function validate() {
  const trimmed = url.value.trim()
  if (!trimmed) return
  error.value = ''
  validating.value = true
  try {
    const res = await $fetch<{ title: string, description: string }>('/api/feeds/validate', {
      method: 'POST',
      body: { url: trimmed },
    })
    detectedName.value = res.title
    detectedDescription.value = res.description
    step.value = 'validated'
  } catch {
    error.value = 'Impossible de lire ce flux. Vérifiez que l\'URL pointe vers un flux RSS ou Atom valide.'
  } finally {
    validating.value = false
  }
}

async function add() {
  step.value = 'adding'
  try {
    await addUserFeed(detectedName.value, url.value.trim(), detectedDescription.value || undefined)
    open.value = false
    emit('added')
    reset()
  } catch {
    error.value = 'Erreur lors de l\'ajout. Cette URL est peut-être déjà dans vos sources.'
    step.value = 'validated'
  }
}

function reset() {
  url.value = ''
  detectedName.value = ''
  detectedDescription.value = ''
  step.value = 'input'
  error.value = ''
}

watch(open, (val) => { if (!val) reset() })

function onUrlKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') validate()
}
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent side="right" class="w-full sm:max-w-md flex flex-col gap-0 p-0 bg-card">

      <!-- Header -->
      <div class="px-5 py-4 border-b border-border/80 shrink-0 bg-sidebar/50">
        <div class="flex items-center gap-2">
          <Rss class="size-4 text-primary" />
          <SheetTitle class="font-mono text-xs font-semibold uppercase tracking-widest">Nouvelle source</SheetTitle>
        </div>
        <p class="text-xs text-muted-foreground mt-1.5 leading-relaxed">
          Entrez l'URL d'un flux RSS ou Atom. Transponder détecte automatiquement le titre.
        </p>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto px-5 py-5 space-y-5">

        <!-- URL input -->
        <div class="space-y-2">
          <label class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">URL du flux</label>
          <div class="flex gap-2">
            <div class="relative flex-1">
              <Link class="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60" />
              <Input
                v-model="url"
                placeholder="https://example.com/feed.xml"
                class="pl-8 font-mono text-[13px]"
                :disabled="step === 'validated' || step === 'adding'"
                @keydown="onUrlKeydown"
              />
            </div>
            <Button
              v-if="step === 'input'"
              variant="outline"
              size="sm"
              class="font-mono text-xs uppercase tracking-wider shrink-0"
              :disabled="!url.trim() || validating"
              @click="validate"
            >
              <Loader2 v-if="validating" class="size-3.5 animate-spin" />
              <span v-else>Vérifier</span>
            </Button>
            <Button
              v-else
              variant="ghost"
              size="sm"
              class="font-mono text-xs uppercase tracking-wider shrink-0 text-muted-foreground"
              :disabled="step === 'adding'"
              @click="step = 'input'; error = ''"
            >
              Modifier
            </Button>
          </div>
        </div>

        <!-- Error -->
        <div v-if="error" class="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5">
          <AlertCircle class="size-3.5 text-destructive shrink-0 mt-0.5" />
          <p class="text-[13px] text-destructive leading-relaxed">{{ error }}</p>
        </div>

        <!-- Validated state -->
        <template v-if="step === 'validated' || step === 'adding'">
          <div class="rounded-md border border-primary/25 bg-primary/5 px-4 py-3.5 space-y-3">
            <div class="flex items-center gap-2">
              <CheckCircle2 class="size-3.5 text-primary shrink-0" />
              <span class="font-mono text-[10px] uppercase tracking-widest text-primary">Flux détecté</span>
            </div>

            <div class="space-y-1.5">
              <label class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Nom</label>
              <Input
                v-model="detectedName"
                class="font-mono text-[13px] bg-background/50"
                :disabled="step === 'adding'"
              />
            </div>

            <div v-if="detectedDescription" class="space-y-1">
              <label class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Description</label>
              <p class="text-xs text-muted-foreground leading-relaxed line-clamp-3">{{ detectedDescription }}</p>
            </div>
          </div>
        </template>

        <!-- Skeleton while validating -->
        <template v-if="validating">
          <div class="space-y-2">
            <Skeleton class="h-3 w-24" />
            <Skeleton class="h-9 w-full" />
            <Skeleton class="h-3 w-4/5" />
          </div>
        </template>

      </div>

      <!-- Footer -->
      <div class="px-5 py-3.5 border-t border-border/80 shrink-0 bg-sidebar/50">
        <Button
          class="w-full gap-2 font-mono text-xs uppercase tracking-wider"
          :disabled="step !== 'validated' || !detectedName.trim()"
          @click="add"
        >
          <Loader2 v-if="step === 'adding'" class="size-3.5 animate-spin" />
          <Rss v-else class="size-3.5" />
          Ajouter la source
        </Button>
      </div>

    </SheetContent>
  </Sheet>
</template>
