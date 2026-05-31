<script setup lang="ts">
import {
  Star, Menu, ChevronLeft, Sparkles, Radar, Radio,
  Sun, Moon, LogOut, ArrowUpRight, RefreshCw, Signal, CheckCheck, ArrowUp,
  Plus, Trash2, Rss, Newspaper,
} from '@lucide/vue'
import type { Category, Feed, Article } from '~/types'

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const { categories, fetchCategories } = useCategories()
const { isBookmarked, fetchBookmarks, toggleBookmark } = useBookmarks()
const { isRead, markRead, markAllRead, fetchReadArticles } = useReadArticles()
const { userFeeds, fetchUserFeeds, addUserFeed: _addUserFeed, removeUserFeed } = useUserFeeds()
const { color: categoryColor, icon: categoryIcon } = useCategoryMeta()

// ── Sources personnalisées ───────────────────────────────
const addFeedOpen = ref(false)

// ── Digest de flux ───────────────────────────────────────
const digestOpen = ref(false)

const personalCategory = computed<Category | null>(() => {
  if (!userFeeds.value.length) return null
  return {
    id: -1,
    name: 'Mes sources',
    slug: 'personal',
    description: null,
    feeds: userFeeds.value.map(f => ({
      id: f.id,
      category_id: -1,
      name: f.name,
      url: f.url,
      description: f.description,
      telex: false,
    })),
  }
})

// Keep selectedCategory in sync when user feeds change (e.g. after delete)
watch(userFeeds, () => {
  if (selectedCategory.value?.id !== -1) return
  if (personalCategory.value) {
    selectedCategory.value = personalCategory.value
  } else {
    selectedCategory.value = null
  }
})

async function handleRemoveUserFeed(feedId: number) {
  if (selectedFeed.value?.id === feedId) {
    selectedFeed.value = null
    articles.value = []
    pendingArticles.value = []
    stopPolling()
  }
  await removeUserFeed(feedId)
}

// Reader state
const selectedCategory = ref<Category | null>(null)
const selectedFeed = ref<Feed | null>(null)
const articles = ref<Article[]>([])
const articlesLoading = ref(false)
const articlesError = ref<string | null>(null)

// ── Polling ──────────────────────────────────────────────
const POLL_INTERVAL = 10 * 60 * 1000
const pendingArticles = ref<Article[]>([])
let pollingTimer: ReturnType<typeof setInterval> | undefined
let visibilityHandler: (() => void) | undefined

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
const totalFeeds = computed(() =>
  categories.value.reduce((acc, c) => acc + (c.feeds?.length ?? 0), 0),
)
const selectedAccent = computed(() =>
  selectedCategory.value ? categoryColor(selectedCategory.value.id) : 'var(--primary)',
)
const unreadCount = computed(() =>
  articles.value.filter(a => !isRead(a.link)).length,
)

function handleMarkRead(article: Article) {
  markRead(article.link)
}

onMounted(async () => {
  await Promise.all([fetchCategories(), fetchBookmarks(), fetchReadArticles(), fetchUserFeeds()])
})

function selectCategory(cat: Category) {
  selectedCategory.value = cat
  selectedFeed.value = null
  articles.value = []
  articlesError.value = null
  pendingArticles.value = []
  stopPolling()
  mobileView.value = 'feeds'
}

async function selectFeed(feed: Feed) {
  selectedFeed.value = feed
  drawerOpen.value = false
  articlesLoading.value = true
  articlesError.value = null
  articles.value = []
  pendingArticles.value = []
  stopPolling()

  try {
    const data = await $fetch<Article[]>('/api/news', { query: { url: feed.url } })
    articles.value = data
    startPolling()
  } catch {
    articlesError.value = 'Aucun signal. Le flux est peut-être indisponible ou son format n\'est pas supporté.'
  } finally {
    articlesLoading.value = false
  }
}

async function silentFetch() {
  if (!selectedFeed.value) return
  try {
    const data = await $fetch<Article[]>('/api/news', { query: { url: selectedFeed.value.url } })
    const currentLinks = new Set(articles.value.map(a => a.link))
    const fresh = data.filter(a => !currentLinks.has(a.link))
    if (fresh.length > 0) pendingArticles.value = fresh
  } catch {
    // silent — ne pas perturber l'UI
  }
}

function startPolling() {
  stopPolling()
  pollingTimer = setInterval(() => {
    if (document.visibilityState === 'visible') silentFetch()
  }, POLL_INTERVAL)
  visibilityHandler = () => {
    if (document.visibilityState === 'visible') silentFetch()
  }
  document.addEventListener('visibilitychange', visibilityHandler)
}

function stopPolling() {
  clearInterval(pollingTimer)
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler)
    visibilityHandler = undefined
  }
}

function applyNewArticles() {
  articles.value = [...pendingArticles.value, ...articles.value]
  pendingArticles.value = []
}

function openDrawer() {
  mobileView.value = selectedCategory.value ? 'feeds' : 'categories'
  drawerOpen.value = true
}

// ── Thème (jour / nuit cockpit) ─────────────────────────
const isDark = ref(true)
function applyTheme() {
  document.documentElement.classList.toggle('dark', isDark.value)
}
function toggleTheme() {
  isDark.value = !isDark.value
  applyTheme()
  localStorage.setItem('transponder-theme', isDark.value ? 'dark' : 'light')
}

// ── Horloge Zulu (UTC, convention aviation) ─────────────
const zulu = ref('--:--:--')
let clockTimer: ReturnType<typeof setInterval> | undefined
function tickClock() {
  zulu.value = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC',
  }).format(new Date())
}

onMounted(() => {
  const saved = localStorage.getItem('transponder-theme')
  isDark.value = saved ? saved === 'dark' : true
  applyTheme()
  tickClock()
  clockTimer = setInterval(tickClock, 1000)
})
onUnmounted(() => {
  clearInterval(clockTimer)
  stopPolling()
})

// ── Briefing IA ─────────────────────────────────────────
const summaryOpen = ref(false)
const summaryArticle = ref<Article | null>(null)
const summaryText = ref('')
const summaryLoading = ref(false)
const summaryError = ref('')
const summaryCached = ref(false)

async function openSummary(article: Article) {
  summaryArticle.value = article
  summaryText.value = ''
  summaryError.value = ''
  summaryCached.value = false
  summaryLoading.value = true
  summaryOpen.value = true
  markRead(article.link)

  try {
    const res = await $fetch<{ summary: string, cached: boolean }>('/api/summarize', {
      method: 'POST',
      body: {
        title: article.title,
        contentSnippet: article.contentSnippet,
        articleUrl: article.link,
      },
    })
    summaryText.value = res.summary
    summaryCached.value = res.cached
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : ''
    summaryError.value = msg || 'Décodage impossible. Vérifie que le moteur IA (Ollama) est en ligne.'
  } finally {
    summaryLoading.value = false
  }
}

async function signOut() {
  await supabase.auth.signOut()
  navigateTo('/login')
}
</script>

<template>
  <div class="h-screen flex flex-col overflow-hidden bg-background">

    <!-- ─── Barre cockpit ─────────────────────────────────────── -->
    <header class="relative h-14 border-b border-border/80 flex items-center px-3 sm:px-4 gap-3 shrink-0 bg-sidebar/60 backdrop-blur-sm">
      <div class="pointer-events-none absolute inset-x-0 bottom-0 h-px overflow-hidden">
        <div class="sweep-x h-full w-1/3 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      </div>

      <Button variant="ghost" size="icon" class="md:hidden -ml-1" @click="openDrawer">
        <Menu class="size-4" />
      </Button>

      <!-- Wordmark -->
      <div class="flex items-center gap-2.5">
        <span class="grid place-items-center size-8 rounded-md border border-primary/40 bg-primary/10 text-primary text-glow">
          <Radar class="size-4.5" />
        </span>
        <div class="leading-none">
          <span class="font-mono font-semibold tracking-[0.22em] text-[15px] text-foreground">TRANSPONDER</span>
          <p class="hidden sm:block font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mt-1">
            RSS · INTERCEPT &amp; DECODE
          </p>
        </div>
      </div>

      <!-- Status block -->
      <div class="hidden lg:flex items-center gap-4 ml-4 pl-4 border-l border-border/70 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span class="flex items-center gap-1.5">
          <span class="size-1.5 rounded-full bg-signal signal-dot" />
          <span class="text-signal">ONLINE</span>
        </span>
        <span class="flex items-center gap-1.5">
          <Signal class="size-3 text-primary" />
          {{ totalFeeds }} STATIONS
        </span>
      </div>

      <div class="flex-1" />

      <!-- Zulu clock -->
      <div class="hidden sm:flex flex-col items-end leading-none font-mono">
        <span class="text-[13px] font-semibold tabular-nums text-foreground tracking-wider">{{ zulu }}<span class="text-primary">Z</span></span>
        <span class="text-[8px] uppercase tracking-[0.25em] text-muted-foreground mt-1">UTC · ZULU</span>
      </div>

      <Button variant="ghost" size="icon" class="size-9 text-muted-foreground hover:text-foreground" :title="isDark ? 'Mode jour' : 'Mode nuit'" @click="toggleTheme">
        <Sun v-if="isDark" class="size-4" />
        <Moon v-else class="size-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" class="rounded-full size-9 p-0">
            <Avatar class="size-8 border border-border">
              <AvatarImage v-if="user?.user_metadata?.avatar_url" :src="user.user_metadata.avatar_url" />
              <AvatarFallback class="text-[10px] font-mono bg-secondary text-foreground">{{ userInitials }}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-56">
          <div class="px-2 py-1.5">
            <p class="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Opérateur</p>
            <p class="text-xs truncate mt-0.5">{{ user?.email }}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem class="text-destructive cursor-pointer gap-2" @click="signOut">
            <LogOut class="size-3.5" />
            Déconnexion
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>

    <!-- ─── Corps ──────────────────────────────────────────────── -->
    <div class="flex-1 flex overflow-hidden">

      <!-- Col 1 : Fréquences -->
      <aside class="hidden md:flex flex-col w-60 border-r border-border/80 bg-sidebar/30 shrink-0">
        <div class="flex items-center justify-between px-4 pt-4 pb-2">
          <span class="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">// Fréquences</span>
          <span class="font-mono text-[10px] tabular-nums text-muted-foreground/60">{{ categories.length }}</span>
        </div>

        <div class="flex-1 overflow-y-auto pb-3">

          <!-- Mes sources (custom user feeds) -->
          <template v-if="personalCategory">
            <div class="flex items-center justify-between px-4 py-1.5">
              <p class="font-mono text-[10px] font-semibold text-amber-400/90 uppercase tracking-widest flex items-center gap-1.5">
                <Rss class="size-3" /> Mes sources
              </p>
              <button
                class="grid place-items-center size-5 rounded hover:bg-foreground/10 text-muted-foreground hover:text-primary transition-colors"
                title="Ajouter une source"
                @click="addFeedOpen = true"
              >
                <Plus class="size-3" />
              </button>
            </div>
            <div
              class="group relative flex items-center gap-2.5 mx-1.5 px-2.5 py-2 rounded-md cursor-pointer transition-all duration-150"
              :class="selectedCategory?.id === -1 ? 'bg-accent/70' : 'hover:bg-accent/40'"
              @click="selectCategory(personalCategory)"
            >
              <span
                class="flex size-6 shrink-0 items-center justify-center rounded-[5px] border transition-colors"
                :style="{
                  color: 'oklch(0.81 0.13 75)',
                  borderColor: selectedCategory?.id === -1 ? 'oklch(0.81 0.13 75)' : 'var(--border)',
                  background: selectedCategory?.id === -1 ? 'color-mix(in oklab, oklch(0.81 0.13 75) 14%, transparent)' : 'transparent',
                }"
              >
                <Rss class="size-3.5" />
              </span>
              <span
                class="flex-1 text-sm truncate transition-colors"
                :class="selectedCategory?.id === -1 ? 'font-medium text-foreground' : 'text-foreground/80 group-hover:text-foreground'"
              >
                Mes sources
              </span>
              <span class="font-mono text-[10px] tabular-nums text-muted-foreground/70">
                {{ personalCategory.feeds.length.toString().padStart(2, '0') }}
              </span>
            </div>
            <Separator class="my-2.5 opacity-60" />
          </template>

          <template v-if="bookmarkedCategories.length">
            <p class="flex items-center gap-1.5 px-4 py-1.5 font-mono text-[10px] font-semibold text-primary/80 uppercase tracking-widest">
              <Star class="size-3 fill-primary text-primary" /> Monitoring
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
            <Separator class="my-2.5 opacity-60" />
          </template>

          <p class="px-4 py-1.5 font-mono text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Toutes bandes
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
        </div>

        <!-- Footer: add source button (always visible) -->
        <div class="px-3 py-2.5 border-t border-border/60 shrink-0">
          <button
            class="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-muted-foreground hover:text-primary hover:bg-accent/40 transition-colors font-mono text-[11px] uppercase tracking-wider"
            @click="addFeedOpen = true"
          >
            <Plus class="size-3.5 shrink-0" />
            Ajouter une source
          </button>
        </div>
      </aside>

      <!-- Col 2 : Stations -->
      <aside class="hidden md:flex flex-col w-64 border-r border-border/80 shrink-0 bg-background">
        <template v-if="selectedCategory">
          <div class="px-4 py-3.5 border-b border-border/80 shrink-0">
            <div class="flex items-start gap-2.5">
              <span
                class="grid place-items-center size-8 shrink-0 rounded-md border"
                :style="{ color: selectedAccent, borderColor: selectedAccent, background: `color-mix(in oklab, ${selectedAccent} 12%, transparent)` }"
              >
                <component :is="categoryIcon(selectedCategory.slug)" class="size-4" />
              </span>
              <div class="min-w-0">
                <p class="text-sm font-semibold leading-tight">{{ selectedCategory.name }}</p>
                <p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                  {{ selectedCategory.feeds?.length ?? 0 }} stations
                </p>
              </div>
            </div>
            <p v-if="selectedCategory.description" class="text-xs text-muted-foreground mt-2.5 leading-relaxed line-clamp-2">
              {{ selectedCategory.description }}
            </p>
          </div>

          <div class="flex-1 overflow-y-auto py-1">
            <button
              v-for="feed in selectedCategory.feeds"
              :key="feed.id"
              class="group w-full text-left px-4 py-2.5 cursor-pointer transition-colors relative"
              :class="selectedFeed?.id === feed.id ? 'bg-accent/60' : 'hover:bg-accent/30'"
              @click="selectFeed(feed)"
            >
              <span
                v-if="selectedFeed?.id === feed.id"
                class="absolute left-0 inset-y-1.5 w-0.5 rounded-r"
                :style="{ background: selectedAccent }"
              />
              <div class="flex items-center gap-2">
                <span
                  class="size-1.5 rounded-full shrink-0"
                  :class="feed.telex ? 'bg-signal signal-dot' : 'bg-muted-foreground/40'"
                />
                <span class="text-sm truncate flex-1" :class="selectedFeed?.id === feed.id ? 'font-medium text-foreground' : 'text-foreground/85'">
                  {{ feed.name }}
                </span>
                <span v-if="feed.telex" class="font-mono text-[8px] font-bold uppercase tracking-widest text-signal">LIVE</span>
                <!-- Delete button for personal feeds -->
                <button
                  v-if="selectedCategory.id === -1"
                  class="opacity-0 group-hover:opacity-100 grid place-items-center size-5 rounded hover:bg-destructive/15 text-muted-foreground/60 hover:text-destructive transition-all"
                  title="Supprimer cette source"
                  @click.stop="handleRemoveUserFeed(feed.id)"
                >
                  <Trash2 class="size-3" />
                </button>
              </div>
              <p v-if="feed.description" class="text-xs text-muted-foreground truncate mt-0.5 pl-3.5">{{ feed.description }}</p>
            </button>

            <!-- Add more button for personal feeds -->
            <button
              v-if="selectedCategory.id === -1"
              class="w-full flex items-center gap-2 px-4 py-2.5 text-muted-foreground hover:text-primary hover:bg-accent/30 transition-colors font-mono text-[11px] uppercase tracking-wider"
              @click="addFeedOpen = true"
            >
              <Plus class="size-3.5 shrink-0" />
              Ajouter une source
            </button>
          </div>
        </template>

        <div v-else class="flex-1 flex items-center justify-center p-6 bg-grid">
          <div class="text-center space-y-2">
            <Radio class="size-6 mx-auto text-muted-foreground/50" />
            <p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70 max-w-[12rem] leading-relaxed">
              Sélectionne une fréquence pour lister ses stations
            </p>
          </div>
        </div>
      </aside>

      <!-- Col 3 : Transmissions -->
      <main class="flex-1 overflow-y-auto bg-background">

        <!-- Accueil / état vide -->
        <div v-if="!selectedFeed && !articlesLoading && !articlesError" class="h-full flex items-center justify-center p-8 bg-radar">
          <div class="text-center space-y-5 max-w-sm">
            <div class="relative mx-auto size-20 grid place-items-center radar-sweep rounded-full border border-primary/25 bg-primary/5">
              <Radar class="size-7 text-primary text-glow" />
            </div>
            <div class="space-y-2">
              <h2 class="font-mono text-lg font-semibold tracking-[0.15em] text-foreground">TRANSPONDER</h2>
              <p class="text-sm text-muted-foreground leading-relaxed">
                Console de veille RSS. Choisis une <span class="text-foreground">fréquence</span>, accroche une <span class="text-foreground">station</span>, et intercepte ses transmissions.
              </p>
            </div>
            <div class="flex items-center justify-center gap-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70 pt-2">
              <span>{{ categories.length }} fréquences</span>
              <span class="size-1 rounded-full bg-border" />
              <span>{{ totalFeeds }} stations</span>
            </div>
          </div>
        </div>

        <!-- Chargement -->
        <div v-else-if="articlesLoading" class="max-w-2xl mx-auto py-2">
          <div class="px-5 py-3 border-b border-border/60 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span class="size-1.5 rounded-full bg-primary animate-pulse" />
            Acquisition du signal…
          </div>
          <div v-for="n in 7" :key="n" class="flex gap-3.5 px-5 py-4 border-b border-border/40">
            <Skeleton class="h-3 w-5 shrink-0" />
            <div class="flex-1 space-y-2">
              <Skeleton class="h-4 w-4/5" />
              <Skeleton class="h-3 w-full" />
              <Skeleton class="h-3 w-2/3" />
              <Skeleton class="h-2.5 w-28 mt-2" />
            </div>
          </div>
        </div>

        <!-- Erreur -->
        <div v-else-if="articlesError" class="h-full flex items-center justify-center p-8 bg-grid">
          <div class="text-center space-y-4 max-w-xs">
            <span class="grid place-items-center size-14 mx-auto rounded-full border border-destructive/40 bg-destructive/10">
              <Radio class="size-6 text-destructive" />
            </span>
            <div class="space-y-1.5">
              <p class="font-mono text-xs font-semibold uppercase tracking-widest text-destructive">No signal</p>
              <p class="text-sm text-muted-foreground leading-relaxed">{{ articlesError }}</p>
            </div>
            <Button variant="outline" size="sm" class="gap-1.5 font-mono text-xs uppercase tracking-wider" @click="selectFeed(selectedFeed!)">
              <RefreshCw class="size-3.5" /> Réessayer
            </Button>
          </div>
        </div>

        <!-- Liste des transmissions -->
        <div v-else-if="articles.length">
          <div class="px-5 py-3 border-b border-border/80 sticky top-0 bg-background/90 backdrop-blur-md z-10 flex items-center gap-3">
            <span class="size-1.5 rounded-full bg-signal signal-dot shrink-0" />
            <div class="min-w-0">
              <p class="font-semibold text-sm truncate leading-tight">{{ selectedFeed?.name }}</p>
              <p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
                <span v-if="unreadCount > 0" class="text-primary">{{ unreadCount }} non lu{{ unreadCount > 1 ? 's' : '' }}</span>
                <span v-else>Tout lu</span>
                <span class="text-muted-foreground/50 mx-1">·</span>
                {{ articles.length }} transmissions
              </p>
            </div>
            <div class="ml-auto flex items-center gap-1">
              <Button
                v-if="unreadCount > 0"
                variant="ghost"
                size="icon-sm"
                class="size-7 text-muted-foreground hover:text-primary"
                title="Tout marquer comme lu"
                @click="markAllRead(articles.map(a => a.link))"
              >
                <CheckCheck class="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                class="size-7 text-muted-foreground hover:text-primary"
                title="Digest IA — résumer ce flux"
                @click="digestOpen = true"
              >
                <Newspaper class="size-3.5" />
              </Button>
              <Button v-if="selectedFeed" variant="ghost" size="icon-sm" class="size-7 text-muted-foreground hover:text-primary" title="Rafraîchir" @click="selectFeed(selectedFeed)">
                <RefreshCw class="size-3.5" />
              </Button>
            </div>
          </div>
          <Transition
            enter-active-class="transition-all duration-300 ease-out overflow-hidden"
            enter-from-class="max-h-0 opacity-0"
            enter-to-class="max-h-16 opacity-100"
            leave-active-class="transition-all duration-200 ease-in overflow-hidden"
            leave-from-class="max-h-16 opacity-100"
            leave-to-class="max-h-0 opacity-0"
          >
            <button
              v-if="pendingArticles.length"
              class="w-full px-5 py-2.5 flex items-center gap-2.5 bg-primary/8 border-b border-primary/25 font-mono text-[11px] uppercase tracking-widest text-primary hover:bg-primary/15 transition-colors cursor-pointer"
              @click="applyNewArticles"
            >
              <span class="size-1.5 rounded-full bg-primary animate-pulse shrink-0" />
              <ArrowUp class="size-3 shrink-0" />
              {{ pendingArticles.length }} nouvelle{{ pendingArticles.length > 1 ? 's' : '' }} transmission{{ pendingArticles.length > 1 ? 's' : '' }}
              <span class="ml-auto text-primary/60">Charger</span>
            </button>
          </Transition>

          <ReaderArticleCard
            v-for="(article, i) in articles"
            :key="article.link"
            :article="article"
            :index="i"
            :read="isRead(article.link)"
            @summarize="openSummary"
            @mark-read="handleMarkRead"
          />
        </div>

      </main>
    </div>

    <!-- ─── Sheet mobile ──────────────────────────────────────── -->
    <Sheet v-model:open="drawerOpen">
      <SheetContent side="left" class="w-80 p-0 flex flex-col gap-0 bg-sidebar">
        <div class="h-14 border-b border-border/80 flex items-center px-3 gap-2 shrink-0">
          <Button
            v-if="mobileView === 'feeds'"
            variant="ghost"
            size="icon"
            class="size-8"
            @click="mobileView = 'categories'"
          >
            <ChevronLeft class="size-4" />
          </Button>
          <SheetTitle class="font-mono text-xs uppercase tracking-widest flex-1">
            {{ mobileView === 'feeds' ? selectedCategory?.name : 'Fréquences' }}
          </SheetTitle>
        </div>

        <div v-if="mobileView === 'categories'" class="flex-1 overflow-y-auto py-2">
          <template v-if="bookmarkedCategories.length">
            <p class="px-4 py-1.5 font-mono text-[10px] font-semibold text-primary/80 uppercase tracking-widest">Monitoring</p>
            <ReaderCategoryRow
              v-for="cat in bookmarkedCategories"
              :key="cat.id"
              :category="cat"
              :selected="selectedCategory?.id === cat.id"
              :bookmarked="true"
              @select="selectCategory(cat)"
              @toggle-bookmark="toggleBookmark(cat.id)"
            />
            <Separator class="my-2 opacity-60" />
          </template>
          <p class="px-4 py-1.5 font-mono text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Toutes bandes</p>
          <ReaderCategoryRow
            v-for="cat in otherCategories"
            :key="cat.id"
            :category="cat"
            :selected="selectedCategory?.id === cat.id"
            :bookmarked="false"
            @select="selectCategory(cat)"
            @toggle-bookmark="toggleBookmark(cat.id)"
          />
        </div>

        <div v-else class="flex-1 overflow-y-auto py-1">
          <button
            v-for="feed in selectedCategory?.feeds"
            :key="feed.id"
            class="w-full text-left px-4 py-3 cursor-pointer hover:bg-accent/40 border-b border-border/40"
            @click="selectFeed(feed)"
          >
            <div class="flex items-center gap-2">
              <span class="size-1.5 rounded-full shrink-0" :class="feed.telex ? 'bg-signal signal-dot' : 'bg-muted-foreground/40'" />
              <span class="text-sm font-medium flex-1">{{ feed.name }}</span>
              <span v-if="feed.telex" class="font-mono text-[8px] font-bold uppercase tracking-widest text-signal">LIVE</span>
            </div>
            <p v-if="feed.description" class="text-xs text-muted-foreground mt-0.5 pl-3.5">{{ feed.description }}</p>
          </button>
        </div>
      </SheetContent>
    </Sheet>

  </div>

  <!-- ─── Sheet ajout de source ───────────────────────────────── -->
  <ReaderAddFeedSheet v-model:open="addFeedOpen" @added="fetchUserFeeds" />

  <!-- ─── Sheet digest de flux ─────────────────────────────────── -->
  <ReaderDigestSheet
    v-model:open="digestOpen"
    :articles="articles"
    :feed-name="selectedFeed?.name ?? ''"
    :feed-url="selectedFeed?.url ?? ''"
  />

  <!-- ─── Sheet briefing IA ─────────────────────────────────── -->
  <Sheet v-model:open="summaryOpen">
    <SheetContent side="right" class="w-full sm:max-w-md flex flex-col gap-0 p-0 bg-card">

      <div class="px-5 py-4 border-b border-border/80 shrink-0 bg-sidebar/50">
        <div class="flex items-center gap-2 mb-2">
          <Sparkles class="size-4 text-primary" />
          <SheetTitle class="font-mono text-xs font-semibold uppercase tracking-widest">Briefing IA</SheetTitle>
          <Badge v-if="summaryCached" variant="outline" class="ml-auto font-mono text-[9px] uppercase tracking-wider border-signal/40 text-signal">
            Cache
          </Badge>
        </div>
        <p class="text-sm font-medium leading-snug line-clamp-2">{{ summaryArticle?.title }}</p>
      </div>

      <div class="flex-1 overflow-y-auto px-5 py-5 bg-grid">

        <!-- Chargement -->
        <div v-if="summaryLoading" class="space-y-3">
          <div class="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-5">
            <span class="size-2 rounded-full bg-primary animate-pulse" />
            Décodage en cours…
          </div>
          <Skeleton class="h-4 w-full" />
          <Skeleton class="h-4 w-5/6" />
          <Skeleton class="h-4 w-4/5" />
          <Skeleton class="h-12 w-full mt-5 rounded-md" />
        </div>

        <!-- Erreur -->
        <div v-else-if="summaryError" class="space-y-3">
          <p class="font-mono text-[10px] uppercase tracking-widest text-destructive">Échec du décodage</p>
          <p class="text-sm text-muted-foreground leading-relaxed">{{ summaryError }}</p>
          <Button variant="outline" size="sm" class="gap-1.5 font-mono text-xs uppercase tracking-wider" @click="openSummary(summaryArticle!)">
            <RefreshCw class="size-3.5" /> Réessayer
          </Button>
        </div>

        <!-- Résumé -->
        <div v-else-if="summaryText" class="space-y-3.5 text-sm leading-relaxed">
          <template v-for="(line, i) in summaryText.split('\n').filter(l => l.trim())" :key="i">
            <div v-if="line.startsWith('•')" class="flex gap-2.5">
              <span class="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              <span class="text-foreground/90">{{ line.slice(1).trim() }}</span>
            </div>
            <div v-else-if="line.startsWith('💡')" class="mt-4 rounded-md border border-primary/25 bg-primary/5 px-3.5 py-3">
              <p class="font-mono text-[9px] uppercase tracking-widest text-primary mb-1.5">Pourquoi ça compte</p>
              <p class="text-[13px] text-foreground/90">{{ line.replace('💡', '').trim() }}</p>
            </div>
          </template>
        </div>
      </div>

      <div class="px-5 py-3.5 border-t border-border/80 shrink-0 bg-sidebar/50">
        <Button variant="outline" size="sm" class="w-full gap-1.5 font-mono text-xs uppercase tracking-wider" as-child>
          <a :href="summaryArticle?.link" target="_blank" rel="noopener noreferrer">
            Lire la source <ArrowUpRight class="size-3.5" />
          </a>
        </Button>
      </div>

    </SheetContent>
  </Sheet>

</template>
