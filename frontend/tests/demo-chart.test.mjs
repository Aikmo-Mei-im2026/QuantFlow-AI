import assert from 'node:assert/strict'
// eslint-disable-next-line test/no-import-node-test
import test from 'node:test'
import { trailingMean } from '../src/lib/demo-chart.ts'

test('moving averages use only an inclusive trailing window and preserve warmup nulls', () => {
  assert.deepEqual(trailingMean([2, 4, 6, 10, 100], 3), [null, null, 4, 20 / 3, 116 / 3])
  assert.deepEqual(trailingMean([2, 4, 6], 3), trailingMean([2, 4, 6, 10, 100], 3).slice(0, 3))
  assert.deepEqual(trailingMean([10, 20], 5), [null, null])
})

test('invalid inputs invalidate only their windows and bad periods are rejected', () => {
  assert.deepEqual(trailingMean([2, Number.NaN, 6, 8], 2), [null, null, null, 7])
  assert.deepEqual(trailingMean([], 5), [])
  assert.throws(() => trailingMean([1, 2], 0))
  assert.throws(() => trailingMean([1, 2], 1.5))
})
