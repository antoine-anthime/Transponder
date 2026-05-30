import {
  Cpu, Briefcase, Trophy, HeartPulse, FlaskConical, Clapperboard,
  Landmark, Gamepad2, Globe2, LineChart, Swords, Joystick,
  Cast, Play, Sparkle, Mic, Film, Tv, BookOpen, Music2, Radio,
} from '@lucide/vue'
import type { Component } from 'vue'

// Instrument-panel palette (oklch) — cycled deterministically per category.
const PALETTE = [
  'oklch(0.81 0.13 75)', // amber
  'oklch(0.75 0.13 210)', // cyan
  'oklch(0.83 0.17 150)', // radar green
  'oklch(0.72 0.16 305)', // magenta
  'oklch(0.7 0.18 12)', // caution red
  'oklch(0.78 0.12 250)', // nav blue
]

const ICONS: Record<string, Component> = {
  technology: Cpu,
  business: Briefcase,
  sports: Trophy,
  health: HeartPulse,
  science: FlaskConical,
  entertainment: Clapperboard,
  politics: Landmark,
  gaming: Gamepad2,
  'world-news': Globe2,
  finance: LineChart,
  jrpgs: Swords,
  crpgs: Joystick,
  twitch: Cast,
  youtube: Play,
  anime: Sparkle,
  podcasts: Mic,
  movies: Film,
  'tv-shows': Tv,
  comics: BookOpen,
  music: Music2,
}

export function useCategoryMeta() {
  function color(id: number) {
    return PALETTE[id % PALETTE.length] ?? PALETTE[0]
  }

  function icon(slug: string): Component {
    return ICONS[slug] ?? Radio
  }

  return { color, icon }
}
