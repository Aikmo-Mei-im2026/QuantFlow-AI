/**
 * A practice profile lives in one browser and holds a nickname plus a starting capital. It is not a
 * session: any visitor can still open every page, and clearing the browser wipes the profile.
 */
export const DEMO_PROFILE_STORAGE_KEY = 'quantflow-demo-profile'
export const DEMO_PROFILE_EVENT = 'quantflow:demo-profile'
export const DEMO_NICKNAME_MAX = 24

/** Starting capitals offered by the login form, in cents. The engine replays from the chosen amount. */
export const DEMO_CASH_OPTIONS_CENTS = [1_000_000, 10_000_000, 50_000_000, 100_000_000] as const

export interface DemoProfile {
  nickname: string
  initialCashCents: number
  savedAt: string
}

export type DemoProfileError = 'nicknameEmpty' | 'nicknameTooLong' | 'cashNotAllowed'

export interface DemoStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export function normaliseDemoProfile(raw: unknown, savedAtFallback = ''): {
  profile: DemoProfile | null
  error: DemoProfileError | null
} {
  const source = (raw && typeof raw === 'object' ? raw : {}) as { nickname?: unknown, initialCashCents?: unknown, savedAt?: unknown }
  const nickname = typeof source.nickname === 'string' ? source.nickname.replace(/\s+/g, ' ').trim() : ''
  if (!nickname) {
    return { profile: null, error: 'nicknameEmpty' }
  }
  // Length is counted after collapsing runs of spaces so the chip cannot be padded out of the navbar.
  if (nickname.length > DEMO_NICKNAME_MAX) {
    return { profile: null, error: 'nicknameTooLong' }
  }
  const cash = source.initialCashCents
  if (typeof cash !== 'number' || !(DEMO_CASH_OPTIONS_CENTS as readonly number[]).includes(cash)) {
    return { profile: null, error: 'cashNotAllowed' }
  }
  return {
    profile: {
      nickname,
      initialCashCents: cash,
      savedAt: typeof source.savedAt === 'string' ? source.savedAt : savedAtFallback,
    },
    error: null,
  }
}

export function readDemoProfile(storage: DemoStorage | null): DemoProfile | null {
  if (!storage) {
    return null
  }
  let raw: unknown
  try {
    raw = JSON.parse(storage.getItem(DEMO_PROFILE_STORAGE_KEY) ?? '')
  }
  catch {
    return null
  }
  return normaliseDemoProfile(raw).profile
}

/** Returns false when the browser refuses the write, which happens in private mode and over quota. */
export function writeDemoProfile(storage: DemoStorage, profile: DemoProfile): boolean {
  try {
    storage.setItem(DEMO_PROFILE_STORAGE_KEY, JSON.stringify(profile))
    return true
  }
  catch {
    return false
  }
}

export function clearDemoProfile(storage: DemoStorage): void {
  try {
    storage.removeItem(DEMO_PROFILE_STORAGE_KEY)
  }
  catch {
    // A storage backend that cannot remove still leaves the profile unreadable for this tab.
  }
}

/** Other tabs write the same key, and this tab needs both signals to refresh its chip. */
export function subscribeDemoProfile(target: EventTarget, listener: () => void): () => void {
  target.addEventListener('storage', listener)
  target.addEventListener(DEMO_PROFILE_EVENT, listener)
  return () => {
    target.removeEventListener('storage', listener)
    target.removeEventListener(DEMO_PROFILE_EVENT, listener)
  }
}

export function announceDemoProfileChange(target: EventTarget): void {
  target.dispatchEvent(new Event(DEMO_PROFILE_EVENT))
}
