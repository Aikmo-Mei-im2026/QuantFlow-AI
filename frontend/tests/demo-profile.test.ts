import assert from 'node:assert/strict'
// eslint-disable-next-line test/no-import-node-test
import test from 'node:test'
import { announceDemoProfileChange, clearDemoProfile, DEMO_CASH_OPTIONS_CENTS, DEMO_PROFILE_EVENT, DEMO_PROFILE_STORAGE_KEY, normaliseDemoProfile, readDemoProfile, subscribeDemoProfile, writeDemoProfile } from '../src/lib/demo-profile.ts'

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
    removeItem: (key: string) => {
      data.delete(key)
    },
  }
}

function throwingStorage(error: Error) {
  return {
    getItem: () => null,
    setItem: () => {
      throw error
    },
    removeItem: () => {
      throw error
    },
  }
}

test('a nickname is trimmed, collapsed and paired with an allowed capital', () => {
  const result = normaliseDemoProfile({ nickname: '  小张   选手 ', initialCashCents: 10_000_000 }, '2026-11-14T00:00:00.000Z')
  assert.deepEqual(result, {
    profile: { nickname: '小张 选手', initialCashCents: 10_000_000, savedAt: '2026-11-14T00:00:00.000Z' },
    error: null,
  })
})

test('every offered capital is accepted and the default one is among them', () => {
  for (const cents of DEMO_CASH_OPTIONS_CENTS) {
    assert.equal(normaliseDemoProfile({ nickname: '张三', initialCashCents: cents }).error, null)
  }
  assert.ok(DEMO_CASH_OPTIONS_CENTS.includes(10_000_000))
})

test('an empty or over-long nickname is rejected without inventing one', () => {
  assert.equal(normaliseDemoProfile({ nickname: '   ', initialCashCents: 10_000_000 }).error, 'nicknameEmpty')
  assert.equal(normaliseDemoProfile({ initialCashCents: 10_000_000 }).error, 'nicknameEmpty')
  assert.equal(normaliseDemoProfile({ nickname: '名'.repeat(24), initialCashCents: 10_000_000 }).error, null)
  assert.equal(normaliseDemoProfile({ nickname: '名'.repeat(25), initialCashCents: 10_000_000 }).error, 'nicknameTooLong')
})

test('a capital outside the offered list never reaches the engine', () => {
  for (const cash of [999_999, 0, -10_000_000, Number.NaN, '10000000', undefined, null]) {
    assert.equal(normaliseDemoProfile({ nickname: '张三', initialCashCents: cash }).error, 'cashNotAllowed')
  }
})

test('a stored profile round-trips and a broken payload reads as signed out', () => {
  const storage = memoryStorage()
  const profile = normaliseDemoProfile({ nickname: '张三', initialCashCents: 50_000_000 }, 'now').profile!
  assert.equal(writeDemoProfile(storage, profile), true)
  assert.equal(storage.data.get(DEMO_PROFILE_STORAGE_KEY), JSON.stringify(profile))
  assert.deepEqual(readDemoProfile(storage), profile)

  for (const payload of ['', 'not json', 'null', '[]', '{"nickname":"张三"}', '{"nickname":"","initialCashCents":10000000}']) {
    assert.equal(readDemoProfile(memoryStorage({ [DEMO_PROFILE_STORAGE_KEY]: payload })), null, payload)
  }
  assert.equal(readDemoProfile(null), null)
})

test('storage failures are reported instead of pretending the profile was saved', () => {
  const blocked = throwingStorage(new Error('quota'))
  const profile = normaliseDemoProfile({ nickname: '张三', initialCashCents: 10_000_000 }, 'now').profile!
  assert.equal(writeDemoProfile(blocked, profile), false)
  assert.equal(readDemoProfile(blocked), null)
  assert.doesNotThrow(() => clearDemoProfile(blocked))

  const storage = memoryStorage({ [DEMO_PROFILE_STORAGE_KEY]: '{}' })
  clearDemoProfile(storage)
  assert.equal(storage.data.has(DEMO_PROFILE_STORAGE_KEY), false)
})

test('the chip refreshes on this tab and on other tabs, then stops after unsubscribe', () => {
  const target = new EventTarget()
  let seen = 0
  const unsubscribe = subscribeDemoProfile(target, () => {
    seen += 1
  })

  announceDemoProfileChange(target)
  assert.equal(seen, 1)
  // Other tabs only fire the native storage event, which carries no dispatch from this tab.
  target.dispatchEvent(new Event('storage'))
  assert.equal(seen, 2)

  unsubscribe()
  announceDemoProfileChange(target)
  target.dispatchEvent(new Event('storage'))
  assert.equal(seen, 2)
  assert.equal(DEMO_PROFILE_EVENT, 'quantflow:demo-profile')
})
