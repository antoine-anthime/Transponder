<script setup lang="ts">
import { Star, Menu, ChevronLeft } from '@lucide/vue'
import type { Category, Feed, Article } from '~/types'

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const { categories, fetchCategories } = useCategories()
const { isBookmarked, fetchBookmarks, toggleBookmark } = useBookmarks()

// Reader state
const selectedCategory = ref<Category | null>(null)
const selectedFeed = ref<Feed | null>(null)
const articles = ref<Article[]>([])
const articlesLoading = ref(false)
const articlesError = ref<string | null>(null)

// Mobile drawer
const drawerOpen = ref(false)
const mobileView = ref<'categories' | 'feeds'>('categories')

// Computed
const bookmarkedCategories = computed(() =>
  categories.value.filter(c => isBookmarked(c.id)),
)
const otherCategories = computed(() =>
  categories.value.filter(c => !isBookmarked(c.id)),
)
const userInitials = computed(() =>
  (user.value?.email ?? '').slice(0, 2).toUpperCase(),
)

onMounted(async () => {
  await Promise.all([fetchCategories(), fetchBookmarks()])
})

function selectCategory(cat: Category) {
  selectedCategory.value = cat
  selectedFeed.value = null
  articles.value = []
  articlesError.value = null
  mobileView.value = 'feeds'
}

async function selectFeed(feed: Feed) {
  selectedFeed.value = feed
  drawerOpen.value = false
  articlesLoading.value = true
  articlesError.value = null
  articles.value = []

  try {
    const data = await $fetch<Article[]>('/api/news', { query: { url: feed.url } })
    articles.value = data
  } catch {
    articlesError.value = 'Impossible de charger ce flux. Il est peut-être indisponible ou le format n\'est pas supporté.'
  } finally {
    articlesLoading.value = false
  }
}

function openDrawer() {
  mobileView.value = selectedCategory.value ? 'feeds' : 'categories'
  drawerOpen.value = true
}

async function signOut() {
  await supabase.auth.signOut()
  navigateTo('/login')
}
</script>

<template>
  <div class="h-screen flex flex-col overflow-hidden bg-background">

    <!-- ─── Header ──────────────────────────────────────────── -->
    <header class="h-14 border-b flex items-center px-3 gap-2 shrink-0">
      <Button variant="ghost" size="icon" class="md:hidden" @click="openDrawer">
        <Menu class="size-4" />
      </Button>

      <span class="font-semibold tracking-tight text-sm flex-1">Orbit News</span>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" class="rounded-full size-9 p-0">
            <Avatar class="size-8">
              <AvatarImage :src="user?.user_metadata?.avatar_url" />
              <AvatarFallback class="text-xs">{{ userInitials }}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-52">
          <DropdownMenuLabel class="text-xs font-normal text-muted-foreground truncate">
            {{ user?.email }}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem class="text-destructive cursor-pointer" @click="signOut">
            Se déconnecter
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>

    <!-- ─── Body ─────────────────────────────────────────────── -->
    <div class="flex-1 flex overflow-hidden">

      <!-- Desktop Col 1 : Catégories -->
      <aside class="hidden md:flex flex-col w-56 border-r overflow-y-auto shrink-0 py-2">
        <template v-if="bookmarkedCategories.length">
          <p class="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Favoris
          </p>
          <ReaderCategoryRow
            v-for="cat in bookmarkedCategories"
            :key="cat.id"
            :category="cat"
            :selected="selectedCategory?.id === cat.id"
            :bookmarked="true"
            @select="selectCategory(cat)"
            @toggle-bookmark="toggleBookmark(cat.id)"
          />
          <Separator class="my-2" />
        </template>

        <p class="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Catégories
        </p>
        <ReaderCategoryRow
          v-for="cat in otherCategories"
          :key="cat.id"
          :category="cat"
          :selected="selectedCategory?.id === cat.id"
          :bookmarked="false"
          @select="selectCategory(cat)"
          @toggle-bookmark="toggleBookmark(cat.id)"
        />
      </aside>

      <!-- Desktop Col 2 : Sources -->
      <aside class="hidden md:flex flex-col w-56 border-r overflow-y-auto shrink-0">
        <template v-if="selectedCategory">
          <div class="px-3 py-3 border-b shrink-0">
            <p class="text-sm font-semibold">{{ selectedCategory.name }}</p>
            <p class="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {{ selectedCategory.description }}
            </p>
          </div>
          <div
            v-for="feed in selectedCategory.feeds"
            :key="feed.id"
            class="px-3 py-2.5 cursor-pointer hover:bg-accent transition-colors border-b border-border/40"
            :class="selectedFeed?.id === feed.id ? 'bg-accent' : ''"
            @click="selectFeed(feed)"
          >
            <p class="text-sm truncate" :class="selectedFeed?.id === feed.id ? 'font-medium' : ''">
              {{ feed.name }}
            </p>
            <p class="text-xs text-muted-foreground truncate mt-0.5">{{ feed.description }}</p>
          </div>
        </template>
        <div v-else class="flex-1 flex items-center justify-center p-4">
          <p class="text-xs text-muted-foreground text-center">← Choisis une catégorie</p>
        </div>
      </aside>

      <!-- Col 3 : Articles -->
      <main class="flex-1 overflow-y-auto">

        <!-- État vide / accueil -->
        <div v-if="!selectedFeed && !articlesLoading" class="h-full flex items-center justify-center p-8">
          <div class="text-center space-y-3 max-w-xs">
            <p class="text-5xl">📡</p>
            <h2 class="text-xl font-semibold tracking-tight">Orbit News</h2>
            <p class="text-sm text-muted-foreground leading-relaxed">
              Choisis une catégorie dans la barre de gauche, puis une source pour lire les dernières actualités.
            </p>
          </div>
        </div>

        <!-- Skeleton de chargement -->
        <div v-else-if="articlesLoading" class="max-w-2xl mx-auto py-6 px-4 space-y-5">
          <div v-for="n in 6" :key="n" class="space-y-2 border-b pb-5">
            <Skeleton class="h-5 w-4/5" />
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-2/3" />
            <Skeleton class="h-3 w-28 mt-2" />
          </div>
        </div>

        <!-- Erreur -->
        <div v-else-if="articlesError" class="h-full flex items-center justify-center p-8">
          <div class="text-center space-y-3">
            <p class="text-3xl">⚠️</p>
            <p class="text-sm text-muted-foreground max-w-xs leading-relaxed">{{ articlesError }}</p>
            <Button variant="outline" size="sm" @click="selectFeed(selectedFeed!)">
              Réessayer
            </Button>
          </div>
        </div>

        <!-- Liste d'articles -->
        <div v-else-if="articles.length">
          <div class="px-4 py-3 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
            <p class="font-semibold text-sm">{{ selectedFeed?.name }}</p>
            <p class="text-xs text-muted-foreground">{{ articles.length }} articles</p>
          </div>
          <ReaderArticleCard
            v-for="article in articles"
            :key="article.link"
            :article="article"
          />
        </div>

      </main>
    </div>

    <!-- ─── Mobile Sheet ──────────────────────────────────────── -->
    <Sheet v-model:open="drawerOpen">
      <SheetContent side="left" class="w-80 p-0 flex flex-col gap-0">

        <!-- Sheet header -->
        <div class="h-12 border-b flex items-center px-3 gap-2 shrink-0">
          <Button
            v-if="mobileView === 'feeds'"
            variant="ghost"
            size="icon"
            class="size-8"
            @click="mobileView = 'categories'"
          >
            <ChevronLeft class="size-4" />
          </Button>
          <span class="text-sm font-medium flex-1">
            {{ mobileView === 'feeds' ? selectedCategory?.name : 'Catégories' }}
          </span>
        </div>

        <!-- Vue catégories -->
        <div v-if="mobileView === 'categories'" class="flex-1 overflow-y-auto py-2">
          <template v-if="bookmarkedCategories.length">
            <p class="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase">Favoris</p>
            <div
              v-for="cat in bookmarkedCategories"
              :key="cat.id"
              class="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-accent"
              @click="selectCategory(cat)"
            >
              <Star class="size-3 shrink-0 fill-amber-400 text-amber-400" />
              <span class="text-sm">{{ cat.name }}</span>
            </div>
            <Separator class="my-2" />
          </template>
          <p class="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase">Toutes</p>
          <div
            v-for="cat in otherCategories"
            :key="cat.id"
            class="px-3 py-2.5 text-sm cursor-pointer hover:bg-accent"
            @click="selectCategory(cat)"
          >
            {{ cat.name }}
          </div>
        </div>

        <!-- Vue sources -->
        <div v-else class="flex-1 overflow-y-auto">
          <div
            v-for="feed in selectedCategory?.feeds"
            :key="feed.id"
            class="px-3 py-3 cursor-pointer hover:bg-accent border-b border-border/50"
            @click="selectFeed(feed)"
          >
            <p class="text-sm font-medium">{{ feed.name }}</p>
            <p class="text-xs text-muted-foreground mt-0.5">{{ feed.description }}</p>
          </div>
        </div>

      </SheetContent>
    </Sheet>

  </div>
</template>
