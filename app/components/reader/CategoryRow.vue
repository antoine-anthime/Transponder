<script setup lang="ts">
import { Star } from '@lucide/vue'
import type { Category } from '~/types'

const props = defineProps<{
  category: Category
  selected: boolean
  bookmarked: boolean
}>()

defineEmits<{
  select: []
  toggleBookmark: []
}>()

const { color, icon } = useCategoryMeta()
const accent = computed(() => color(props.category.id))
const CatIcon = computed(() => icon(props.category.slug))
const feedCount = computed(() => props.category.feeds?.length ?? 0)
</script>

<template>
  <div
    class="group relative flex items-center gap-2.5 mx-1.5 px-2.5 py-2 rounded-md cursor-pointer transition-all duration-150"
    :class="selected ? 'bg-accent/70 hud-active' : 'hover:bg-accent/40'"
    @click="$emit('select')"
  >
    <span
      class="flex size-6 shrink-0 items-center justify-center rounded-[5px] border transition-colors"
      :style="{
        color: accent,
        borderColor: selected ? accent : 'color-mix(in oklab, var(--border) 100%, transparent)',
        background: selected ? `color-mix(in oklab, ${accent} 14%, transparent)` : 'transparent',
      }"
    >
      <component :is="CatIcon" class="size-3.5" />
    </span>

    <span
      class="flex-1 text-sm truncate transition-colors"
      :class="selected ? 'font-medium text-foreground' : 'text-foreground/80 group-hover:text-foreground'"
    >
      {{ category.name }}
    </span>

    <span
      v-if="feedCount"
      class="font-mono text-[10px] tabular-nums text-muted-foreground/70 transition-opacity"
      :class="bookmarked ? 'opacity-0' : 'group-hover:opacity-0'"
    >
      {{ feedCount.toString().padStart(2, '0') }}
    </span>

    <button
      class="absolute right-2 shrink-0 grid place-items-center size-5 rounded transition-all hover:bg-foreground/10"
      :class="bookmarked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
      :title="bookmarked ? 'Retirer du monitoring' : 'Monitorer cette fréquence'"
      @click.stop="$emit('toggleBookmark')"
    >
      <Star
        class="size-3.5 transition-colors"
        :class="bookmarked ? 'fill-primary text-primary' : 'text-muted-foreground'"
      />
    </button>
  </div>
</template>
