<script setup lang="ts">
import { Star } from '@lucide/vue'
import type { Category } from '~/types'

defineProps<{
  category: Category
  selected: boolean
  bookmarked: boolean
}>()

defineEmits<{
  select: []
  toggleBookmark: []
}>()
</script>

<template>
  <div
    class="group flex items-center gap-1 mx-1 px-2 py-1.5 rounded-sm cursor-pointer hover:bg-accent transition-colors"
    :class="selected ? 'bg-accent' : ''"
    @click="$emit('select')"
  >
    <span class="flex-1 text-sm truncate" :class="selected ? 'font-medium' : ''">
      {{ category.name }}
    </span>
    <button
      class="shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent-foreground/10"
      :title="bookmarked ? 'Retirer des favoris' : 'Ajouter aux favoris'"
      @click.stop="$emit('toggleBookmark')"
    >
      <Star
        class="size-3.5 transition-colors"
        :class="bookmarked ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'"
      />
    </button>
  </div>
</template>
