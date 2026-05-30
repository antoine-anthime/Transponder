<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()

async function signOut() {
  await supabase.auth.signOut()
  router.push('/login')
}

const userInitials = computed(() => {
  const email = user.value?.email ?? ''
  return email.slice(0, 2).toUpperCase()
})
</script>

<template>
  <div class="min-h-screen bg-background flex flex-col">

    <!-- Header -->
    <header class="h-14 border-b flex items-center justify-between px-4 shrink-0">
      <span class="font-semibold tracking-tight">Orbit News</span>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" class="rounded-full size-9 p-0">
            <Avatar class="size-8">
              <AvatarImage :src="user?.user_metadata?.avatar_url" />
              <AvatarFallback>{{ userInitials }}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-48">
          <DropdownMenuLabel class="text-xs text-muted-foreground font-normal truncate">
            {{ user?.email }}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem class="text-destructive cursor-pointer" @click="signOut">
            Se déconnecter
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>

    <!-- Contenu principal — Phase 3 -->
    <main class="flex-1 flex items-center justify-center">
      <div class="text-center space-y-2">
        <p class="text-2xl font-semibold">👋 Bienvenue !</p>
        <p class="text-muted-foreground text-sm">Tu es connecté en tant que <strong>{{ user?.email }}</strong></p>
        <p class="text-muted-foreground text-xs mt-4">Le reader RSS arrive en Phase 3.</p>
      </div>
    </main>

  </div>
</template>
