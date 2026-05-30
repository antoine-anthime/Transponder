import ws from 'ws'
import { createClient } from '@supabase/supabase-js'

export default defineNitroPlugin(() => {
  // Fournit le support WebSocket pour Supabase Realtime sous Node.js < 22
  if (!globalThis.WebSocket) {
    // @ts-expect-error ws est une implémentation Node.js de WebSocket
    globalThis.WebSocket = ws
  }
})
