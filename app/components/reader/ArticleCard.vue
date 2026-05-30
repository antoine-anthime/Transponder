<script setup lang="ts">
import { ExternalLink, Share2 } from '@lucide/vue'
import type { Article } from '~/types'

const props = defineProps<{ article: Article }>()

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    }).format(new Date(dateStr))
  } catch {
    return ''
  }
}

async function shareArticle() {
  if (navigator.share) {
    await navigator.share({ title: props.article.title, url: props.article.link })
  } else {
    await navigator.clipboard.writeText(props.article.link)
  }
}
</script>

<template>
  <div class="px-4 py-4 border-b last:border-0 group hover:bg-muted/30 transition-colors">
    <a
      :href="article.link"
      target="_blank"
      rel="noopener noreferrer"
      class="text-base font-medium leading-snug hover:text-primary transition-colors line-clamp-2"
    >
      {{ article.title }}
    </a>

    <p v-if="article.contentSnippet" class="text-sm text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
      {{ article.contentSnippet }}
    </p>

    <div class="flex items-center justify-between mt-3">
      <span class="text-xs text-muted-foreground">
        <template v-if="article.creator">{{ article.creator }} · </template>
        {{ formatDate(article.pubDate) }}
      </span>
      <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" class="size-7" as-child>
          <a :href="article.link" target="_blank" rel="noopener noreferrer" title="Ouvrir">
            <ExternalLink class="size-3.5" />
          </a>
        </Button>
        <Button variant="ghost" size="icon" class="size-7" title="Partager" @click="shareArticle">
          <Share2 class="size-3.5" />
        </Button>
      </div>
    </div>
  </div>
</template>
