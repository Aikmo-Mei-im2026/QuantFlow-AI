'use client'

import type { DemoProfile } from '@/lib/demo-profile'
import { useSyncExternalStore } from 'react'
import { DEMO_PROFILE_STORAGE_KEY, readDemoProfile, subscribeDemoProfile } from '@/lib/demo-profile'

const subscribe = (onStoreChange: () => void) => subscribeDemoProfile(window, onStoreChange)

// localStorage hands back a fresh string on every read, so the parsed profile is cached against the raw text.
let cachedRaw: string | null | undefined
let cachedProfile: DemoProfile | null = null

function getSnapshot(): DemoProfile | null {
  const raw = window.localStorage.getItem(DEMO_PROFILE_STORAGE_KEY)
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedProfile = readDemoProfile(window.localStorage)
  }
  return cachedProfile
}

// undefined means "rendered before hydration", which keeps a browser-only nickname out of the static markup.
function getServerSnapshot(): DemoProfile | undefined {
  return undefined
}

export function useDemoProfile(): DemoProfile | null | undefined {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
