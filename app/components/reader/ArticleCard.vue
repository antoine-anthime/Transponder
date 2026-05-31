<script setup lang="ts">
import { ExternalLink, Share2, Sparkles, Check, CheckCheck } from '@lucide/vue'
import type { Article } from '~/types'

const props = defineProps<{ article: Article, index: number, read?: boolean }>()
const emit = defineEmits<{
  summarize: [article: Article]
  markRead: [article: Article]
}>()

const copied = ref(false)

function formatDate(dateStr: string) {
  if (!dateStr) return '—'
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    }).format(new Date(dateStr))
  } catch {
    return '—'
  }
}

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

async function shareArticle() {
  if (navigator.share) {
    await navigator.share({ title: props.article.title, url: props.article.link })
  } else {
    await navigator.clipboard.writeText(props.article.link)
    copied.value = true
    setTimeout(() => (copied.value = false), 1600)
  }
}

function handleOpen() {
  emit('markRead', props.article)
}
</script>

<template>
  <article
    class="group relative border-b border-border/60 transition-colors"
    :class="read ? 'bg-background/50 hover:bg-accent/15' : 'hover:bg-accent/25'"
  >
    <div class="flex gap-3.5 px-5 py-4">
      <!-- Signal index / lu indicator -->
      <div class="flex flex-col items-center pt-0.5 shrink-0 w-7">
        <span
          v-if="read"
          class="text-muted-foreground/30"
          :title="'Lu'"
        >
          <CheckCheck class="size-3" />
        </span>
        <span
          v-else
          class="font-mono text-[10px] tabular-nums text-muted-foreground/50 group-hover:text-primary transition-colors"
        >
          {{ (index + 1).toString().padStart(2, '0') }}
        </span>
      </div>

      <div class="min-w-0 flex-1">
        <a
          :href="article.link"
          target="_blank"
          rel="noopener noreferrer"
          class="text-[15px] font-semibold leading-snug transition-colors line-clamp-2"
          :class="read
            ? 'text-foreground/45 hover:text-foreground/70 font-normal'
            : 'text-foreground hover:text-primary'"
          @click="handleOpen"
        >
          {{ article.title }}
        </a>

        <p
          v-if="article.contentSnippet"
          class="text-[13px] mt-1.5 line-clamp-2 leading-relaxed"
          :class="read ? 'text-muted-foreground/50' : 'text-muted-foreground'"
        >
          {{ article.contentSnippet }}
        </p>

        <div class="flex items-center gap-3 mt-2.5">
          <span
            class="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide"
            :class="read ? 'text-muted-foreground/40' : 'text-muted-foreground/80'"
          >
            <span
              class="inline-block size-1.5 rounded-full"
              :class="read ? 'bg-muted-foreground/30' : 'bg-signal'"
            />
            <template v-if="article.creator">{{ article.creator }}</template>
            <template v-else>SIGNAL</template>
          </span>
          <span
            class="font-mono text-[11px] tabular-nums"
            :class="read ? 'text-muted-foreground/40' : 'text-muted-foreground/60'"
            :title="formatDate(article.pubDate)"
          >
            {{ relative(article.pubDate) }}
          </span>

          <div class="ml-auto flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon-sm"
              class="size-7 text-muted-foreground hover:text-primary"
              title="Briefing IA"
              @click="emit('summarize', article); emit('markRead', article)"
            >
              <Sparkles class="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" class="size-7 text-muted-foreground hover:text-primary" as-child>
              <a :href="article.link" target="_blank" rel="noopener noreferrer" title="Ouvrir la source" @click="handleOpen">
                <ExternalLink class="size-3.5" />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              class="size-7 text-muted-foreground hover:text-primary"
              title="Partager"
              @click="shareArticle"
            >
              <Check v-if="copied" class="size-3.5 text-signal" />
              <Share2 v-else class="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </article>
</template>
