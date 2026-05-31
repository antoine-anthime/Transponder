<script setup lang="ts">
import { Newspaper, Loader2, RefreshCw, Copy, Check, AlertCircle, Zap } from '@lucide/vue'
import type { Article } from '~/types'

const props = defineProps<{
  articles: Article[]
  feedName: string
  feedUrl: string
}>()

const open = defineModel<boolean>('open', { default: false })

// ── Period definitions ────────────────────────────────
type PeriodKey = 'today' | 'yesterday' | 'week' | 'month'

interface Period {
  key: PeriodKey
  label: string
  sublabel: string
  filter: (ageMs: number) => boolean
}

const PERIODS: Period[] = [
  {
    key: 'today',
    label: 'Aujourd\'hui',
    sublabel: '< 24h',
    filter: age => age >= 0 && age < 24 * 3600 * 1000,
  },
  {
    key: 'yesterday',
    label: 'Hier',
    sublabel: 'J-1',
    filter: age => age >= 24 * 3600 * 1000 && age < 48 * 3600 * 1000,
  },
  {
    key: 'week',
    label: '7 jours',
    sublabel: 'Semaine',
    filter: age => age >= 0 && age < 7 * 24 * 3600 * 1000,
  },
  {
    key: 'month',
    label: '30 jours',
    sublabel: 'Mois',
    filter: age => age >= 0 && age < 30 * 24 * 3600 * 1000,
  },
]

// ── State ─────────────────────────────────────────────
const selectedPeriod = ref<PeriodKey>('today')
const digestText = ref('')
const digestLoading = ref(false)
const digestError = ref('')
const digestCached = ref(false)
const digestArticleCount = ref(0)
const copied = ref(false)

// ── Computed ──────────────────────────────────────────
const periodArticles = computed(() => {
  const now = Date.now()
  const period = PERIODS.find(p => p.key === selectedPeriod.value)!
  return props.articles.filter(a => {
    if (!a.pubDate) return selectedPeriod.value === 'today'
    const age = now - new Date(a.pubDate).getTime()
    return period.filter(age)
  })
})

const canGenerate = computed(() => periodArticles.value.length > 0 && !digestLoading.value)

// Reset digest when period changes
watch(selectedPeriod, () => {
  digestText.value = ''
  digestError.value = ''
  digestCached.value = false
})

watch(open, (val) => {
  if (!val) {
    digestText.value = ''
    digestError.value = ''
    digestLoading.value = false
  }
})

// ── Generate ──────────────────────────────────────────
async function generate() {
  digestError.value = ''
  digestLoading.value = true
  digestText.value = ''

  try {
    const res = await $fetch<{ digest: string, articleCount: number, cached: boolean }>('/api/digest', {
      method: 'POST',
      body: {
        feedUrl: props.feedUrl,
        feedName: props.feedName,
        period: selectedPeriod.value,
        articles: periodArticles.value.map(a => ({
          title: a.title,
          contentSnippet: a.contentSnippet,
          link: a.link,
        })),
      },
    })
    digestText.value = res.digest
    digestArticleCount.value = res.articleCount
    digestCached.value = res.cached
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : ''
    digestError.value = msg || 'Le moteur IA est indisponible. Vérifie qu\'Ollama est en ligne.'
  } finally {
    digestLoading.value = false
  }
}

async function copyDigest() {
  await navigator.clipboard.writeText(digestText.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 1800)
}

// ── Digest renderer ───────────────────────────────────
interface DigestBlock {
  type: 'heading' | 'bullet' | 'article' | 'insight' | 'text'
  content?: string
  title?: string
  desc?: string
}

const digestBlocks = computed<DigestBlock[]>(() => {
  if (!digestText.value) return []
  return digestText.value
    .split('\n')
    .filter(l => l.trim())
    .map((line): DigestBlock => {
      if (line.startsWith('## '))
        return { type: 'heading', content: line.slice(3).trim() }
      if (line.startsWith('• '))
        return { type: 'bullet', content: line.slice(2).trim() }
      if (line.startsWith('💡'))
        return { type: 'insight', content: line.replace('💡', '').trim() }
      const articleMatch = line.match(/^\*\*(.+?)\*\*\s*[—–-]\s*(.+)$/)
      if (articleMatch)
        return { type: 'article', title: articleMatch[1].trim(), desc: articleMatch[2].trim() }
      return { type: 'text', content: line.trim() }
    })
})
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent side="right" class="w-full sm:max-w-lg flex flex-col gap-0 p-0 bg-card">

      <!-- ─── Header ──────────────────────────────────────── -->
      <div class="px-5 py-4 border-b border-border/80 shrink-0 bg-sidebar/50">
        <div class="flex items-center gap-2 mb-1.5">
          <Newspaper class="size-4 text-primary" />
          <SheetTitle class="font-mono text-xs font-semibold uppercase tracking-widest">Digest de flux</SheetTitle>
          <Badge
            v-if="digestCached"
            variant="outline"
            class="ml-auto font-mono text-[9px] uppercase tracking-wider border-signal/40 text-signal"
          >
            Cache
          </Badge>
        </div>
        <p class="text-sm font-medium leading-snug truncate text-foreground/80">{{ feedName }}</p>
      </div>

      <!-- ─── Period selector ────────────────────────────── -->
      <div class="px-5 py-3.5 border-b border-border/60 shrink-0 bg-sidebar/20">
        <p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2.5">Période d'analyse</p>
        <div class="grid grid-cols-4 gap-1.5">
          <button
            v-for="period in PERIODS"
            :key="period.key"
            class="flex flex-col items-center gap-0.5 px-2 py-2 rounded-md border transition-all font-mono text-center cursor-pointer"
            :class="selectedPeriod === period.key
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border/60 hover:border-border text-muted-foreground hover:text-foreground'"
            @click="selectedPeriod = period.key"
          >
            <span class="text-[12px] font-semibold leading-none">{{ period.label }}</span>
            <span class="text-[9px] uppercase tracking-wider opacity-70">{{ period.sublabel }}</span>
          </button>
        </div>

        <!-- Article count for selected period -->
        <div class="flex items-center gap-2 mt-3">
          <span
            class="size-1.5 rounded-full shrink-0"
            :class="periodArticles.length > 0 ? 'bg-signal signal-dot' : 'bg-muted-foreground/30'"
          />
          <span class="font-mono text-[11px] uppercase tracking-widest"
            :class="periodArticles.length > 0 ? 'text-foreground/70' : 'text-muted-foreground/50'"
          >
            <template v-if="periodArticles.length > 0">
              {{ periodArticles.length }} transmission{{ periodArticles.length > 1 ? 's' : '' }} interceptée{{ periodArticles.length > 1 ? 's' : '' }}
            </template>
            <template v-else>
              Aucune transmission dans cette période
            </template>
          </span>
          <span
            v-if="periodArticles.length > 20"
            class="ml-auto font-mono text-[9px] uppercase tracking-wider text-amber-400/80 border border-amber-400/30 rounded px-1.5 py-0.5"
          >
            20 analysés
          </span>
        </div>
      </div>

      <!-- ─── Body ───────────────────────────────────────── -->
      <div class="flex-1 overflow-y-auto px-5 py-5 bg-grid">

        <!-- Empty state -->
        <div v-if="!digestText && !digestLoading && !digestError" class="flex flex-col items-center justify-center h-full text-center gap-4 py-10">
          <div class="grid place-items-center size-16 rounded-full border border-primary/25 bg-primary/5">
            <Newspaper class="size-6 text-primary/60" />
          </div>
          <div class="space-y-1.5 max-w-[200px]">
            <p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
              Prêt à analyser
            </p>
            <p class="text-xs text-muted-foreground leading-relaxed">
              Sélectionne une période et génère le briefing de veille.
            </p>
          </div>
        </div>

        <!-- Loading -->
        <div v-else-if="digestLoading" class="space-y-4 py-4">
          <div class="flex items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-primary">
            <span class="size-2 rounded-full bg-primary animate-pulse" />
            Analyse de {{ periodArticles.length }} transmission{{ periodArticles.length > 1 ? 's' : '' }}…
          </div>
          <div class="space-y-2.5">
            <Skeleton class="h-3 w-32" />
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-5/6" />
            <Skeleton class="h-3 w-28 mt-4" />
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-4/5" />
            <Skeleton class="h-4 w-3/5" />
            <Skeleton class="h-3 w-36 mt-4" />
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-5/6" />
            <div class="mt-6 rounded-md border border-primary/20 bg-primary/5 p-3 space-y-2">
              <Skeleton class="h-3 w-24" />
              <Skeleton class="h-4 w-full" />
            </div>
          </div>
        </div>

        <!-- Error -->
        <div v-else-if="digestError" class="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3.5">
          <AlertCircle class="size-4 text-destructive shrink-0 mt-0.5" />
          <div class="space-y-1">
            <p class="font-mono text-[10px] uppercase tracking-widest text-destructive">Échec de l'analyse</p>
            <p class="text-sm text-muted-foreground leading-relaxed">{{ digestError }}</p>
          </div>
        </div>

        <!-- Digest result -->
        <div v-else-if="digestBlocks.length" class="space-y-1 text-sm">
          <template v-for="(block, i) in digestBlocks" :key="i">

            <!-- ## Heading -->
            <p
              v-if="block.type === 'heading'"
              class="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary mt-5 first:mt-0 pb-1.5 border-b border-primary/20"
            >
              {{ block.content }}
            </p>

            <!-- • Bullet -->
            <div v-else-if="block.type === 'bullet'" class="flex gap-2.5 py-0.5">
              <span class="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" />
              <span class="text-foreground/85 leading-relaxed">{{ block.content }}</span>
            </div>

            <!-- **Article** — desc -->
            <div v-else-if="block.type === 'article'" class="flex gap-2.5 py-1">
              <Zap class="size-3.5 text-amber-400/70 shrink-0 mt-0.5" />
              <div class="min-w-0">
                <span class="font-semibold text-foreground">{{ block.title }}</span>
                <span v-if="block.desc" class="text-muted-foreground"> — {{ block.desc }}</span>
              </div>
            </div>

            <!-- 💡 Insight block -->
            <div
              v-else-if="block.type === 'insight'"
              class="mt-4 rounded-md border border-primary/25 bg-primary/5 px-4 py-3.5 space-y-1.5"
            >
              <p class="font-mono text-[9px] uppercase tracking-widest text-primary">Signal faible</p>
              <p class="text-[13px] text-foreground/90 leading-relaxed">{{ block.content }}</p>
            </div>

            <!-- Plain text -->
            <p v-else class="text-muted-foreground leading-relaxed py-0.5">{{ block.content }}</p>

          </template>
        </div>

      </div>

      <!-- ─── Footer ──────────────────────────────────────── -->
      <div class="px-5 py-3.5 border-t border-border/80 shrink-0 bg-sidebar/50 flex gap-2">
        <Button
          class="flex-1 gap-2 font-mono text-xs uppercase tracking-wider"
          :disabled="!canGenerate"
          @click="generate"
        >
          <Loader2 v-if="digestLoading" class="size-3.5 animate-spin" />
          <Newspaper v-else class="size-3.5" />
          {{ digestText ? 'Régénérer' : 'Générer le briefing' }}
        </Button>

        <Button
          v-if="digestText"
          variant="outline"
          size="icon"
          class="size-9 shrink-0 text-muted-foreground hover:text-primary"
          :title="copied ? 'Copié !' : 'Copier le digest'"
          @click="copyDigest"
        >
          <Check v-if="copied" class="size-3.5 text-signal" />
          <Copy v-else class="size-3.5" />
        </Button>

        <Button
          v-if="digestText && !digestLoading"
          variant="outline"
          size="icon"
          class="size-9 shrink-0 text-muted-foreground hover:text-primary"
          title="Regénérer"
          @click="generate"
        >
          <RefreshCw class="size-3.5" />
        </Button>
      </div>

    </SheetContent>
  </Sheet>
</template>
