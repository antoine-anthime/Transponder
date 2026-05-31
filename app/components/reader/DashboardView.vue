<script setup lang="ts">
import { ExternalLink, Share2, Sparkles, Check, LayoutGrid } from '@lucide/vue'
import type { DashboardArticle, DashboardSection } from '~/composables/useDashboard'

defineProps<{
  sections: DashboardSection[]
  loading: boolean
  pinnedCount: number
  maxPinned: number
}>()

const emit = defineEmits<{
  summarize: [article: DashboardArticle]
  markRead: [link: string]
}>()

const { color: categoryColor, icon: categoryIcon } = useCategoryMeta()
const copiedLink = ref<string | null>(null)

function relative(dateStr: string) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  if (Number.isNaN(diff)) return ''
  const m = Math.round(diff / 60000)
  if (m < 1) return 'maintenant'
  if (m < 60) return `${m}m`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.round(h / 24)}j`
}

async function share(article: DashboardArticle) {
  if (navigator.share) {
    await navigator.share({ title: article.title, url: article.link })
  } else {
    await navigator.clipboard.writeText(article.link)
    copiedLink.value = article.link
    setTimeout(() => (copiedLink.value = null), 1600)
  }
}
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">

    <!-- Header -->
    <div class="px-5 py-3 border-b border-border/80 shrink-0 bg-background/90 backdrop-blur-md sticky top-0 z-10 flex items-center gap-3">
      <LayoutGrid class="size-4 text-amber-400 shrink-0" />
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-sm leading-tight">Dashboard</p>
        <p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
          {{ pinnedCount }}/{{ maxPinned }} journaux épinglés
        </p>
      </div>
    </div>

    <!-- Loading skeletons -->
    <div v-if="loading" class="flex-1 overflow-y-auto">
      <div class="px-5 py-3 border-b border-border/60 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span class="size-1.5 rounded-full bg-primary animate-pulse" />
        Réception des signaux…
      </div>
      <div v-for="n in 8" :key="n" class="flex gap-3.5 px-5 py-4 border-b border-border/40">
        <Skeleton class="h-3 w-16 shrink-0 mt-1" />
        <div class="flex-1 space-y-2">
          <Skeleton class="h-4 w-4/5" />
          <Skeleton class="h-3 w-2/3" />
          <Skeleton class="h-2.5 w-28 mt-1" />
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!sections.length" class="flex-1 flex items-center justify-center p-8 bg-radar">
      <div class="text-center space-y-4 max-w-xs">
        <div class="grid place-items-center size-16 mx-auto rounded-full border border-amber-400/25 bg-amber-400/5">
          <LayoutGrid class="size-6 text-amber-400/60" />
        </div>
        <div class="space-y-1.5">
          <p class="font-mono text-xs font-semibold uppercase tracking-widest text-amber-400/80">Dashboard vide</p>
          <p class="text-sm text-muted-foreground leading-relaxed">
            Épingle jusqu'à {{ maxPinned }} journaux depuis la colonne "Stations" — l'icône <LayoutGrid class="size-3 inline" /> apparaît au survol de chaque flux.
          </p>
        </div>
      </div>
    </div>

    <!-- Grouped sections -->
    <div v-else class="flex-1 overflow-y-auto">
      <section
        v-for="section in sections"
        :key="section.categoryId"
      >
        <!-- Section header -->
        <div
          class="flex items-center gap-2.5 px-5 py-2.5 border-b border-border/60 sticky top-0 bg-background/95 backdrop-blur-sm z-[5]"
          :style="{ borderLeftColor: categoryColor(section.categoryId), borderLeftWidth: '3px' }"
        >
          <component
            :is="categoryIcon(section.categorySlug)"
            class="size-3.5 shrink-0"
            :style="{ color: categoryColor(section.categoryId) }"
          />
          <span
            class="font-mono text-[11px] font-semibold uppercase tracking-widest"
            :style="{ color: categoryColor(section.categoryId) }"
          >
            {{ section.categoryName }}
          </span>
          <span class="font-mono text-[10px] text-muted-foreground/50 ml-auto">
            {{ section.articles.length }} articles
          </span>
        </div>

        <!-- Articles in section -->
        <article
          v-for="article in section.articles"
          :key="article.link + article.feedId"
          class="group border-b border-border/50 hover:bg-accent/20 transition-colors"
        >
          <div class="flex gap-3 px-5 py-3">
            <!-- Feed label -->
            <div class="shrink-0 pt-0.5 w-[72px]">
              <span class="font-mono text-[9px] text-muted-foreground/60 truncate block" :title="article.feedName">
                {{ article.feedName.slice(0, 10) }}
              </span>
              <span class="font-mono text-[9px] tabular-nums text-muted-foreground/40">
                {{ relative(article.pubDate) }}
              </span>
            </div>

            <div class="min-w-0 flex-1">
              <a
                :href="article.link"
                target="_blank"
                rel="noopener noreferrer"
                class="text-[14px] font-medium leading-snug text-foreground hover:text-primary transition-colors line-clamp-2"
                @click="emit('markRead', article.link)"
              >
                {{ article.title }}
              </a>

              <div class="flex items-center gap-1 mt-1.5">
                <div class="ml-auto flex gap-0.5 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    class="size-6 text-muted-foreground hover:text-primary"
                    title="Briefing IA"
                    @click="emit('summarize', article); emit('markRead', article.link)"
                  >
                    <Sparkles class="size-3" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" class="size-6 text-muted-foreground hover:text-primary" as-child>
                    <a :href="article.link" target="_blank" rel="noopener noreferrer" title="Ouvrir" @click="emit('markRead', article.link)">
                      <ExternalLink class="size-3" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    class="size-6 text-muted-foreground hover:text-primary"
                    title="Partager"
                    @click="share(article)"
                  >
                    <Check v-if="copiedLink === article.link" class="size-3 text-signal" />
                    <Share2 v-else class="size-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>
    </div>

  </div>
</template>
